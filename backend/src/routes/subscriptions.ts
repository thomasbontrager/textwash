import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Configuration
const TRIAL_PERIOD_DAYS = 14;

// Initialize Stripe
let stripe: Stripe | null = null;

async function getStripe(): Promise<Stripe | null> {
  if (stripe) return stripe;
  
  // Get Stripe keys from admin profile
  const adminProfile = await prisma.adminProfile.findFirst();
  
  if (adminProfile?.stripeSecretKey) {
    stripe = new Stripe(adminProfile.stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
    return stripe;
  }
  
  return null;
}

// All subscription routes require authentication
router.use(authenticateToken);

// POST /subscriptions/create-checkout-session - Create Stripe checkout session
router.post('/create-checkout-session', async (req: AuthRequest, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user!.id;
    
    if (!plan || !['STARTER', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    const stripeClient = await getStripe();
    if (!stripeClient) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let customerId = user.stripeId;
    
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        metadata: { userId }
      });
      
      customerId = customer.id;
      
      await prisma.user.update({
        where: { id: userId },
        data: { stripeId: customerId }
      });
    }
    
    // Price mapping (in cents)
    const priceMap: Record<string, { amount: number; name: string }> = {
      STARTER: { amount: 2900, name: 'Starter Plan' },
      PRO: { amount: 9900, name: 'Pro Plan' },
      ENTERPRISE: { amount: 29900, name: 'Enterprise Plan' }
    };
    
    const planInfo = priceMap[plan];
    
    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planInfo.name,
              description: `TextWash ${plan} subscription`
            },
            recurring: {
              interval: 'year'
            },
            unit_amount: planInfo.amount
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/pricing?canceled=true`,
      metadata: {
        userId,
        plan
      },
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          userId,
          plan
        }
      }
    });
    
    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /subscriptions/cancel-subscription - Cancel subscription
router.post('/cancel-subscription', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    const stripeClient = await getStripe();
    if (!stripeClient) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    // Cancel at period end
    await stripeClient.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });
    
    // Update subscription status
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELED'
      }
    });
    
    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// POST /subscriptions/webhook - Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).json({ error: 'Missing signature' });
    }
    
    const stripeClient = await getStripe();
    const adminProfile = await prisma.adminProfile.findFirst();
    
    if (!stripeClient || !adminProfile?.stripeWebhookSecret) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    let event: Stripe.Event;
    
    try {
      event = stripeClient.webhooks.constructEvent(
        req.body,
        sig,
        adminProfile.stripeWebhookSecret
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as string;
        
        if (userId && plan) {
          await prisma.subscription.update({
            where: { userId },
            data: {
              plan: plan as any,
              status: 'ACTIVE',
              stripeSubscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
              trialEndsAt: session.subscription ? undefined : null,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
            }
          });
        }
        break;
        
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        const subUserId = subscription.metadata?.userId;
        
        if (subUserId) {
          await prisma.subscription.update({
            where: { userId: subUserId },
            data: {
              status: subscription.status === 'active' ? 'ACTIVE' : 
                     subscription.status === 'canceled' ? 'CANCELED' :
                     subscription.status === 'past_due' ? 'PAST_DUE' :
                     subscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            }
          });
        }
        break;
        
      case 'customer.subscription.deleted':
        const deletedSub = event.data.object as Stripe.Subscription;
        const deletedUserId = deletedSub.metadata?.userId;
        
        if (deletedUserId) {
          await prisma.subscription.update({
            where: { userId: deletedUserId },
            data: {
              plan: 'FREE',
              status: 'CANCELED',
              stripeSubscriptionId: null
            }
          });
        }
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
