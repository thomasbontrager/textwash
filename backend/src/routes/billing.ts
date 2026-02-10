/**
 * Billing Routes
 * 
 * Public-facing billing endpoints for customers.
 * Handles checkout sessions and billing portal access.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as stripeService from '../services/stripe';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * Create Stripe Checkout Session
 * 
 * Initiates a new subscription purchase.
 */
router.post('/checkout-session', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { priceId, successUrl, cancelUrl, trialDays } = req.body;

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields: priceId, successUrl, cancelUrl' 
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has an active subscription
    if (user.subscription?.status === 'ACTIVE') {
      return res.status(400).json({ 
        error: 'User already has an active subscription. Use upgrade/downgrade instead.' 
      });
    }

    // Create or get Stripe customer
    let customerId = user.stripeId;

    if (!customerId) {
      const customer = await stripeService.createCustomer({
        email: user.email,
        userId: user.id,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripeService.createCheckoutSession({
      priceId,
      customerId,
      successUrl,
      cancelUrl,
      trialDays,
      metadata: {
        userId: user.id,
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create Billing Portal Session
 * 
 * Allows customers to manage their subscriptions, payment methods, and invoices.
 */
router.post('/portal-session', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: 'returnUrl is required' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeId) {
      return res.status(400).json({ 
        error: 'No Stripe customer found. Please create a subscription first.' 
      });
    }

    // Create portal session
    const session = await stripeService.createBillingPortalSession(
      user.stripeId,
      returnUrl
    );

    res.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ 
      error: 'Failed to create portal session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get Current Subscription
 * 
 * Returns the current user's subscription details.
 */
router.get('/subscription', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.json({ subscription: null });
    }

    res.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ 
      error: 'Failed to fetch subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cancel Subscription
 * 
 * Cancels the current user's subscription.
 */
router.post('/subscription/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { immediate = false } = req.body;

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No Stripe subscription found' });
    }

    // Cancel in Stripe
    const canceledSubscription = await stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      immediate
    );

    // Update local database
    if (immediate) {
      await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELED',
        },
      });
    }

    res.json({
      success: true,
      subscription: canceledSubscription,
      message: immediate 
        ? 'Subscription canceled immediately' 
        : 'Subscription will be canceled at the end of the billing period',
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ 
      error: 'Failed to cancel subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get Invoices
 * 
 * Returns the current user's invoices.
 */
router.get('/invoices', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.stripeId) {
      return res.json({ invoices: [] });
    }

    // Get invoices from database
    const invoices = await prisma.invoice.findMany({
      where: { stripeCustomerId: user.stripeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoices',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
