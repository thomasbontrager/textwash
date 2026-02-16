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

// Constants
const STRIPE_API_VERSION = '2023-10-16' as const;
const DEFAULT_BASE_DOMAIN = 'textwash.app';

// GET /subscriptions/plan - Get user's subscription details
router.get('/plan', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      include: { plan: true }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// POST /subscriptions/create-checkout-session - Create Stripe checkout session
router.post('/create-checkout-session', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !['STARTER', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be STARTER or PRO' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION
    });

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscriptions: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    let customerId = user.stripeId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeId: customerId }
      });
    }

    // Get price ID based on plan
    const priceId = plan === 'STARTER' 
      ? process.env.STRIPE_STARTER_PRICE_ID 
      : process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return res.status(500).json({ error: `Price ID for ${plan} not configured` });
    }

    // Determine return URLs based on environment
    const baseDomain = process.env.BASE_DOMAIN || DEFAULT_BASE_DOMAIN;
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : `${protocol}://${baseDomain}`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${baseUrl}?canceled=true`,
      metadata: {
        userId: user.id,
        plan: plan
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

// POST /subscriptions/cancel-subscription - Cancel user's subscription
router.post('/cancel-subscription', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      include: { plan: true }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.plan.name === 'FREE') {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No Stripe subscription found' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION
    });

    // Cancel at period end (so user keeps access until end of billing cycle)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    res.json({ success: true, message: 'Subscription will be canceled at period end' });
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
