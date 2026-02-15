import express from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Constants
const STRIPE_API_VERSION = '2023-10-16' as const;
const DEFAULT_BASE_DOMAIN = 'textwash.app';

// GET /subscriptions/plan - Get user's subscription details
router.get('/plan', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id }
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
      include: { subscription: true }
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
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.plan === 'FREE') {
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

export default router;
