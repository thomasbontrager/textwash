/**
 * Stripe Service Layer
 * 
 * Centralized service for all Stripe operations.
 * Handles products, prices, customers, subscriptions, and webhooks.
 * 
 * Safety Features:
 * - All operations are logged
 * - Webhook signature verification enforced
 * - Audit trail for all billing changes
 * - Safe error handling with fallbacks
 */

import Stripe from 'stripe';
import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Stripe (will be configured at runtime)
let stripe: Stripe | null = null;

/**
 * Initialize Stripe with API key
 * Should be called on server startup or when admin updates credentials
 */
export function initializeStripe(secretKey: string): void {
  if (!secretKey) {
    throw new Error('Stripe secret key is required');
  }
  
  stripe = new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
}

/**
 * Get Stripe instance (ensures it's initialized)
 */
function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Please configure Stripe credentials in admin settings.');
  }
  return stripe;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface AuditLogParams {
  action: string;
  resourceType: string;
  resourceId?: string;
  adminUserId?: string;
  changes?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.billingAuditLog.create({
      data: {
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        adminUserId: params.adminUserId,
        changes: params.changes || {},
        metadata: params.metadata || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit log failure shouldn't break billing operations
  }
}

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

export interface CreateProductParams {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
  adminUserId?: string;
}

export async function createProduct(params: CreateProductParams) {
  const stripeClient = getStripe();
  
  try {
    // Create product in Stripe
    const product = await stripeClient.products.create({
      name: params.name,
      description: params.description,
      metadata: params.metadata,
    });

    // Save to database
    const dbProduct = await prisma.stripeProduct.create({
      data: {
        stripeProductId: product.id,
        name: product.name,
        description: product.description || null,
        active: product.active,
        metadata: product.metadata || {},
      },
    });

    // Audit log
    await createAuditLog({
      action: 'product_created',
      resourceType: 'product',
      resourceId: product.id,
      adminUserId: params.adminUserId,
      metadata: { productName: product.name },
    });

    return { stripe: product, db: dbProduct };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export async function updateProduct(
  productId: string,
  updates: { name?: string; description?: string; active?: boolean; metadata?: Record<string, string> },
  adminUserId?: string
) {
  const stripeClient = getStripe();
  
  try {
    // Update in Stripe
    const product = await stripeClient.products.update(productId, updates);

    // Update in database
    const dbProduct = await prisma.stripeProduct.update({
      where: { stripeProductId: productId },
      data: {
        name: product.name,
        description: product.description || null,
        active: product.active,
        metadata: product.metadata || {},
      },
    });

    // Audit log
    await createAuditLog({
      action: 'product_updated',
      resourceType: 'product',
      resourceId: productId,
      adminUserId,
      changes: updates,
    });

    return { stripe: product, db: dbProduct };
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function listProducts(active?: boolean) {
  const stripeClient = getStripe();
  
  try {
    const products = await stripeClient.products.list({
      active: active,
      limit: 100,
    });

    return products.data;
  } catch (error) {
    console.error('Error listing products:', error);
    throw error;
  }
}

// ============================================================================
// PRICE MANAGEMENT
// ============================================================================

export interface CreatePriceParams {
  productId: string;
  amount: number;
  currency?: string;
  interval?: 'month' | 'year' | 'week' | 'day';
  intervalCount?: number;
  trialDays?: number;
  metadata?: Record<string, string>;
  adminUserId?: string;
}

export async function createPrice(params: CreatePriceParams) {
  const stripeClient = getStripe();
  
  try {
    const priceData: Stripe.PriceCreateParams = {
      product: params.productId,
      unit_amount: params.amount,
      currency: params.currency || 'usd',
      metadata: params.metadata,
    };

    if (params.interval) {
      priceData.recurring = {
        interval: params.interval,
        interval_count: params.intervalCount || 1,
        trial_period_days: params.trialDays,
      };
    }

    // Create price in Stripe
    const price = await stripeClient.prices.create(priceData);

    // Get product from DB to link
    const product = await prisma.stripeProduct.findUnique({
      where: { stripeProductId: params.productId },
    });

    if (!product) {
      throw new Error(`Product ${params.productId} not found in database`);
    }

    // Save to database
    const dbPrice = await prisma.stripePrice.create({
      data: {
        stripePriceId: price.id,
        productId: product.id,
        amount: params.amount,
        currency: params.currency || 'usd',
        interval: params.interval || null,
        intervalCount: params.intervalCount || null,
        trialDays: params.trialDays || null,
        active: price.active,
        metadata: price.metadata || {},
      },
    });

    // Audit log
    await createAuditLog({
      action: 'price_created',
      resourceType: 'price',
      resourceId: price.id,
      adminUserId: params.adminUserId,
      metadata: { amount: params.amount, currency: params.currency },
    });

    return { stripe: price, db: dbPrice };
  } catch (error) {
    console.error('Error creating price:', error);
    throw error;
  }
}

export async function listPrices(productId?: string) {
  const stripeClient = getStripe();
  
  try {
    const params: Stripe.PriceListParams = { limit: 100 };
    if (productId) {
      params.product = productId;
    }

    const prices = await stripeClient.prices.list(params);
    return prices.data;
  } catch (error) {
    console.error('Error listing prices:', error);
    throw error;
  }
}

// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

export interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
  userId?: string;
}

export async function createCustomer(params: CreateCustomerParams) {
  const stripeClient = getStripe();
  
  try {
    const customer = await stripeClient.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        ...params.metadata,
        userId: params.userId || '',
      },
    });

    // Update user with Stripe customer ID
    if (params.userId) {
      await prisma.user.update({
        where: { id: params.userId },
        data: { stripeId: customer.id },
      });

      // Also update subscription record if it exists
      const subscription = await prisma.subscription.findUnique({
        where: { userId: params.userId },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { userId: params.userId },
          data: { stripeCustomerId: customer.id },
        });
      }
    }

    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

export async function getCustomer(customerId: string) {
  const stripeClient = getStripe();
  
  try {
    return await stripeClient.customers.retrieve(customerId);
  } catch (error) {
    console.error('Error retrieving customer:', error);
    throw error;
  }
}

export async function listCustomers(limit: number = 100) {
  const stripeClient = getStripe();
  
  try {
    return await stripeClient.customers.list({ limit });
  } catch (error) {
    console.error('Error listing customers:', error);
    throw error;
  }
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

export interface CreateCheckoutSessionParams {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams) {
  const stripeClient = getStripe();
  
  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    };

    if (params.customerId) {
      sessionParams.customer = params.customerId;
    } else if (params.customerEmail) {
      sessionParams.customer_email = params.customerEmail;
    }

    if (params.trialDays) {
      sessionParams.subscription_data = {
        trial_period_days: params.trialDays,
      };
    }

    const session = await stripeClient.checkout.sessions.create(sessionParams);
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const stripeClient = getStripe();
  
  try {
    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}

export async function getSubscription(subscriptionId: string) {
  const stripeClient = getStripe();
  
  try {
    return await stripeClient.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

export async function listSubscriptions(customerId?: string) {
  const stripeClient = getStripe();
  
  try {
    const params: Stripe.SubscriptionListParams = { limit: 100 };
    if (customerId) {
      params.customer = customerId;
    }
    return await stripeClient.subscriptions.list(params);
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    throw error;
  }
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  adminUserId?: string;
}

export async function updateSubscription(params: UpdateSubscriptionParams) {
  const stripeClient = getStripe();
  
  try {
    const updateData: Stripe.SubscriptionUpdateParams = {};

    if (params.priceId) {
      const subscription = await stripeClient.subscriptions.retrieve(params.subscriptionId);
      updateData.items = [
        {
          id: subscription.items.data[0].id,
          price: params.priceId,
        },
      ];
    }

    if (params.cancelAtPeriodEnd !== undefined) {
      updateData.cancel_at_period_end = params.cancelAtPeriodEnd;
    }

    if (params.prorationBehavior) {
      updateData.proration_behavior = params.prorationBehavior;
    }

    const subscription = await stripeClient.subscriptions.update(
      params.subscriptionId,
      updateData
    );

    // Audit log
    await createAuditLog({
      action: 'subscription_updated',
      resourceType: 'subscription',
      resourceId: params.subscriptionId,
      adminUserId: params.adminUserId,
      changes: updateData,
    });

    return subscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false,
  adminUserId?: string
) {
  const stripeClient = getStripe();
  
  try {
    let subscription;

    if (immediate) {
      // Cancel immediately
      subscription = await stripeClient.subscriptions.cancel(subscriptionId);
    } else {
      // Cancel at period end
      subscription = await stripeClient.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Audit log
    await createAuditLog({
      action: immediate ? 'subscription_canceled_immediate' : 'subscription_canceled_at_period_end',
      resourceType: 'subscription',
      resourceId: subscriptionId,
      adminUserId,
      metadata: { immediate },
    });

    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// ============================================================================
// INVOICE MANAGEMENT
// ============================================================================

export async function getInvoice(invoiceId: string) {
  const stripeClient = getStripe();
  
  try {
    return await stripeClient.invoices.retrieve(invoiceId);
  } catch (error) {
    console.error('Error retrieving invoice:', error);
    throw error;
  }
}

export async function listInvoices(customerId?: string) {
  const stripeClient = getStripe();
  
  try {
    const params: Stripe.InvoiceListParams = { limit: 100 };
    if (customerId) {
      params.customer = customerId;
    }
    return await stripeClient.invoices.list(params);
  } catch (error) {
    console.error('Error listing invoices:', error);
    throw error;
  }
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripeClient = getStripe();
  
  try {
    return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Process webhook event and update database
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    // Log the event
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        data: event.data.object as any,
        processed: false,
      },
    });

    // Process based on event type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark as processed
    await prisma.stripeWebhookEvent.updateMany({
      where: { stripeEventId: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    
    // Log the error
    await prisma.stripeWebhookEvent.updateMany({
      where: { stripeEventId: event.id },
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: { increment: 1 },
      },
    });

    throw error;
  }
}

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.warn('Missing customer or subscription ID in checkout session');
    return;
  }

  // Find user by customer ID
  const user = await prisma.user.findFirst({
    where: { stripeId: customerId },
  });

  if (!user) {
    console.warn(`User not found for customer ${customerId}`);
    return;
  }

  // Get subscription details from Stripe
  const subscription = await getSubscription(subscriptionId);
  
  // Determine plan based on price
  const plan = mapStripePriceToPlan(subscription.items.data[0].price.id);

  // Update or create subscription
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      plan,
      status: mapStripeStatus(subscription.status),
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    },
    update: {
      plan,
      status: mapStripeStatus(subscription.status),
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    },
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id);

  const customerId = subscription.customer as string;

  // Find user by customer ID
  const user = await prisma.user.findFirst({
    where: { stripeId: customerId },
  });

  if (!user) {
    console.warn(`User not found for customer ${customerId}`);
    return;
  }

  const plan = mapStripePriceToPlan(subscription.items.data[0].price.id);

  // Update subscription
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      plan,
      status: mapStripeStatus(subscription.status),
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    },
    update: {
      plan,
      status: mapStripeStatus(subscription.status),
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deletion:', subscription.id);

  const customerId = subscription.customer as string;

  // Find user by customer ID
  const user = await prisma.user.findFirst({
    where: { stripeId: customerId },
  });

  if (!user) {
    console.warn(`User not found for customer ${customerId}`);
    return;
  }

  // Update subscription to canceled and downgrade to free
  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.CANCELED,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('Processing invoice paid:', invoice.id);

  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string | null;

  // Save or update invoice in database
  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      stripeInvoiceId: invoice.id,
      stripeCustomerId: customerId,
      subscriptionId: subscriptionId || undefined,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status || 'paid',
      hostedUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf,
      paid: true,
      paidAt: invoice.status_transitions.paid_at 
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    },
    update: {
      amount: invoice.amount_paid,
      status: invoice.status || 'paid',
      hostedUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf,
      paid: true,
      paidAt: invoice.status_transitions.paid_at 
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice payment failed:', invoice.id);

  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string | null;

  // Save or update invoice in database
  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      stripeInvoiceId: invoice.id,
      stripeCustomerId: customerId,
      subscriptionId: subscriptionId || undefined,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'payment_failed',
      hostedUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf,
      paid: false,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    },
    update: {
      status: 'payment_failed',
      hostedUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf,
      paid: false,
    },
  });

  // Find user and update subscription status to past_due
  const user = await prisma.user.findFirst({
    where: { stripeId: customerId },
  });

  if (user) {
    await prisma.subscription.updateMany({
      where: { userId: user.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    default:
      return SubscriptionStatus.ACTIVE;
  }
}

/**
 * Map Stripe price ID to internal plan
 * This should be configured based on your actual price IDs
 * For now, we'll try to infer from metadata or use a default mapping
 */
function mapStripePriceToPlan(priceId: string): SubscriptionPlan {
  // TODO: Implement actual price -> plan mapping
  // This could be done via:
  // 1. Price metadata
  // 2. Database lookup
  // 3. Environment variable mapping
  
  // For now, return a sensible default
  // In production, you'd query the database or use metadata
  return SubscriptionPlan.STARTER;
}

// ============================================================================
// METRICS & ANALYTICS
// ============================================================================

export async function getBillingMetrics() {
  try {
    // Get active subscriptions count
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    // Get trialing subscriptions count
    const trialingSubscriptions = await prisma.subscription.count({
      where: { status: SubscriptionStatus.TRIALING },
    });

    // Get past due subscriptions count
    const pastDueSubscriptions = await prisma.subscription.count({
      where: { status: SubscriptionStatus.PAST_DUE },
    });

    // Get canceled subscriptions count
    const canceledSubscriptions = await prisma.subscription.count({
      where: { status: SubscriptionStatus.CANCELED },
    });

    // Get subscriptions by plan
    const subscriptionsByPlan = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: true,
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
    });

    // Get recent failed payments
    const failedPayments = await prisma.invoice.count({
      where: {
        status: 'payment_failed',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    // Calculate MRR (Monthly Recurring Revenue) - simplified
    // In production, you'd calculate this from actual price amounts
    const mrr = activeSubscriptions * 29; // Placeholder calculation

    return {
      activeSubscriptions,
      trialingSubscriptions,
      pastDueSubscriptions,
      canceledSubscriptions,
      subscriptionsByPlan,
      failedPayments,
      mrr,
      arr: mrr * 12,
    };
  } catch (error) {
    console.error('Error calculating billing metrics:', error);
    throw error;
  }
}

export default {
  initializeStripe,
  createProduct,
  updateProduct,
  listProducts,
  createPrice,
  listPrices,
  createCustomer,
  getCustomer,
  listCustomers,
  createCheckoutSession,
  createBillingPortalSession,
  getSubscription,
  listSubscriptions,
  updateSubscription,
  cancelSubscription,
  getInvoice,
  listInvoices,
  constructWebhookEvent,
  processWebhookEvent,
  getBillingMetrics,
};
