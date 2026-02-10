/**
 * Admin Billing Routes
 * 
 * Admin-only endpoints for managing Stripe billing:
 * - Products and prices
 * - Customer management
 * - Subscription operations (upgrade, downgrade, cancel)
 * - Webhook monitoring
 * - Billing metrics and analytics
 * 
 * Security: All routes require admin authentication
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as stripeService from '../services/stripe';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All admin billing routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================================================
// STRIPE CONFIGURATION
// ============================================================================

/**
 * Get Stripe Configuration Status
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    const adminProfile = await prisma.adminProfile.findUnique({
      where: { userId },
      select: {
        stripePublishableKey: true,
        stripeSecretKey: true,
        stripeWebhookSecret: true,
      },
    });

    const configured = !!(
      adminProfile?.stripePublishableKey &&
      adminProfile?.stripeSecretKey &&
      adminProfile?.stripeWebhookSecret
    );

    res.json({
      configured,
      hasPublishableKey: !!adminProfile?.stripePublishableKey,
      hasSecretKey: !!adminProfile?.stripeSecretKey,
      hasWebhookSecret: !!adminProfile?.stripeWebhookSecret,
    });
  } catch (error) {
    console.error('Error checking Stripe config:', error);
    res.status(500).json({ error: 'Failed to check configuration' });
  }
});

/**
 * Update Stripe Configuration
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { publishableKey, secretKey, webhookSecret } = req.body;

    if (!publishableKey || !secretKey || !webhookSecret) {
      return res.status(400).json({ 
        error: 'All keys are required: publishableKey, secretKey, webhookSecret' 
      });
    }

    // Initialize Stripe with the new secret key
    stripeService.initializeStripe(secretKey);

    // Update admin profile
    await prisma.adminProfile.upsert({
      where: { userId },
      create: {
        userId,
        stripePublishableKey: publishableKey,
        stripeSecretKey: secretKey,
        stripeWebhookSecret: webhookSecret,
      },
      update: {
        stripePublishableKey: publishableKey,
        stripeSecretKey: secretKey,
        stripeWebhookSecret: webhookSecret,
      },
    });

    res.json({ success: true, message: 'Stripe configuration updated' });
  } catch (error) {
    console.error('Error updating Stripe config:', error);
    res.status(500).json({ 
      error: 'Failed to update configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// PRODUCTS
// ============================================================================

/**
 * List all Stripe products
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const products = await stripeService.listProducts();
    res.json({ products });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({ 
      error: 'Failed to list products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a new product
 */
router.post('/products', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name, description, metadata } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const result = await stripeService.createProduct({
      name,
      description,
      metadata,
      adminUserId: userId,
    });

    res.json({ 
      success: true,
      product: result.stripe,
      dbProduct: result.db,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      error: 'Failed to create product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update a product
 */
router.patch('/products/:productId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { productId } = req.params;
    const { name, description, active, metadata } = req.body;

    const result = await stripeService.updateProduct(
      productId,
      { name, description, active, metadata },
      userId
    );

    res.json({ 
      success: true,
      product: result.stripe,
      dbProduct: result.db,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// PRICES
// ============================================================================

/**
 * List prices (optionally filtered by product)
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const { productId } = req.query;
    const prices = await stripeService.listPrices(productId as string | undefined);
    res.json({ prices });
  } catch (error) {
    console.error('Error listing prices:', error);
    res.status(500).json({ 
      error: 'Failed to list prices',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a new price
 */
router.post('/prices', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { 
      productId, 
      amount, 
      currency, 
      interval, 
      intervalCount, 
      trialDays,
      metadata 
    } = req.body;

    if (!productId || !amount) {
      return res.status(400).json({ 
        error: 'productId and amount are required' 
      });
    }

    const result = await stripeService.createPrice({
      productId,
      amount,
      currency,
      interval,
      intervalCount,
      trialDays,
      metadata,
      adminUserId: userId,
    });

    res.json({ 
      success: true,
      price: result.stripe,
      dbPrice: result.db,
    });
  } catch (error) {
    console.error('Error creating price:', error);
    res.status(500).json({ 
      error: 'Failed to create price',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// CUSTOMERS
// ============================================================================

/**
 * List all customers
 */
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const customers = await stripeService.listCustomers(parseInt(limit as string));
    res.json({ customers: customers.data });
  } catch (error) {
    console.error('Error listing customers:', error);
    res.status(500).json({ 
      error: 'Failed to list customers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get customer details
 */
router.get('/customers/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const customer = await stripeService.getCustomer(customerId);
    res.json({ customer });
  } catch (error) {
    console.error('Error retrieving customer:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve customer',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Search users and their billing info
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { email, plan, status, limit = 50, offset = 0 } = req.query;

    const where: any = {};

    if (email) {
      where.email = { contains: email as string, mode: 'insensitive' };
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        subscription: true,
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    });

    // Filter by subscription criteria if provided
    let filteredUsers = users;
    if (plan) {
      filteredUsers = filteredUsers.filter(u => u.subscription?.plan === plan);
    }
    if (status) {
      filteredUsers = filteredUsers.filter(u => u.subscription?.status === status);
    }

    res.json({ 
      users: filteredUsers,
      total: filteredUsers.length,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ 
      error: 'Failed to search users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * List all subscriptions
 */
router.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    const { customerId, status, limit = 50, offset = 0 } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.subscription.count({ where });

    res.json({ 
      subscriptions,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    res.status(500).json({ 
      error: 'Failed to list subscriptions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get subscription details
 */
router.get('/subscriptions/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    
    // Try to find in database first
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Get from Stripe
    const stripeSubscription = await stripeService.getSubscription(subscriptionId);

    res.json({ 
      db: dbSubscription,
      stripe: stripeSubscription,
    });
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update subscription (upgrade/downgrade)
 */
router.patch('/subscriptions/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { subscriptionId } = req.params;
    const { priceId, cancelAtPeriodEnd, prorationBehavior } = req.body;

    const subscription = await stripeService.updateSubscription({
      subscriptionId,
      priceId,
      cancelAtPeriodEnd,
      prorationBehavior,
      adminUserId: userId,
    });

    res.json({ 
      success: true,
      subscription,
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to update subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cancel subscription
 */
router.post('/subscriptions/:subscriptionId/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { subscriptionId } = req.params;
    const { immediate = false } = req.body;

    const subscription = await stripeService.cancelSubscription(
      subscriptionId,
      immediate,
      userId
    );

    res.json({ 
      success: true,
      subscription,
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

// ============================================================================
// INVOICES
// ============================================================================

/**
 * List invoices
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { customerId, status, limit = 50, offset = 0 } = req.query;

    const where: any = {};

    if (customerId) {
      where.stripeCustomerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.invoice.count({ where });

    res.json({ 
      invoices,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error listing invoices:', error);
    res.status(500).json({ 
      error: 'Failed to list invoices',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get invoice details
 */
router.get('/invoices/:invoiceId', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    
    // Get from database
    const dbInvoice = await prisma.invoice.findUnique({
      where: { stripeInvoiceId: invoiceId },
    });

    // Get from Stripe
    const stripeInvoice = await stripeService.getInvoice(invoiceId);

    res.json({ 
      db: dbInvoice,
      stripe: stripeInvoice,
    });
  } catch (error) {
    console.error('Error retrieving invoice:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve invoice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * List webhook events (already handled in webhooks.ts, but included here for completeness)
 */
router.get('/webhook-events', async (req: Request, res: Response) => {
  try {
    const { 
      processed, 
      type,
      limit = 50,
      offset = 0
    } = req.query;

    const where: any = {};

    if (processed !== undefined) {
      where.processed = processed === 'true';
    }

    if (type) {
      where.type = type;
    }

    const events = await prisma.stripeWebhookEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.stripeWebhookEvent.count({ where });

    // Get event type counts
    const eventCounts = await prisma.stripeWebhookEvent.groupBy({
      by: ['type'],
      _count: true,
      orderBy: {
        _count: {
          type: 'desc',
        },
      },
    });

    res.json({
      events,
      total,
      eventCounts,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error listing webhook events:', error);
    res.status(500).json({ 
      error: 'Failed to list webhook events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// METRICS & ANALYTICS
// ============================================================================

/**
 * Get billing metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await stripeService.getBillingMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting billing metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get billing metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * Get billing audit logs
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { 
      action, 
      resourceType,
      adminUserId,
      limit = 100,
      offset = 0
    } = req.query;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (adminUserId) {
      where.adminUserId = adminUserId;
    }

    const logs = await prisma.billingAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.billingAuditLog.count({ where });

    res.json({ 
      logs,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error listing audit logs:', error);
    res.status(500).json({ 
      error: 'Failed to list audit logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
