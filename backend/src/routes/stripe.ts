import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Stripe webhook - requires raw body
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received webhook event:', event.type);

  // Store webhook event in database with unique event ID
  let webhookEventId: string | null = null;
  try {
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: 'stripe',
        eventType: event.type,
        payload: event as any,
        status: 'pending',
        attempts: 1
      }
    });
    webhookEventId = webhookEvent.id;
  } catch (dbError: any) {
    console.error('Failed to store webhook event:', dbError);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        
        // Find user by Stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeId: customerId }
        });

        if (!user) {
          console.error('User not found for customer:', customerId);
          return res.status(404).send('User not found');
        }

        // Get subscription details
        if (session.subscription) {
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2023-10-16'
          });
          
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Determine plan from price ID
          const priceId = subscription.items.data[0]?.price.id;
          
          // Find the Plan record by comparing with env variables
          let planName = 'FREE';
          if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
            planName = 'STARTER';
          } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
            planName = 'PRO';
          }
          
          const plan = await prisma.plan.findFirst({
            where: { name: planName }
          });
          
          if (!plan) {
            console.error(`Plan ${planName} not found in database`);
            return res.status(500).send('Plan configuration error');
          }

          // Determine subscription status
          const status = subscription.status === 'active' ? 'ACTIVE' :
                        subscription.status === 'canceled' ? 'CANCELED' :
                        subscription.status === 'past_due' ? 'PAST_DUE' :
                        subscription.status === 'trialing' ? 'TRIALING' :
                        'ACTIVE';

          // Find existing active subscription or create new one
          const existingSubscription = await prisma.subscription.findFirst({
            where: { userId: user.id, status: 'ACTIVE' }
          });

          if (existingSubscription) {
            await prisma.subscription.update({
              where: { id: existingSubscription.id },
              data: {
                planId: plan.id,
                status,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customerId,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                currentPeriodStart: new Date(subscription.current_period_start * 1000)
              }
            });
          } else {
            await prisma.subscription.create({
              data: {
                userId: user.id,
                planId: plan.id,
                status,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customerId,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                currentPeriodStart: new Date(subscription.current_period_start * 1000)
              }
            });
          }

          console.log(`Checkout completed for user ${user.email}, subscription ${subscription.id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Find user by Stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeId: customerId }
        });

        if (user) {
          // Update subscription status to ACTIVE on successful payment
          await prisma.subscription.updateMany({
            where: { userId: user.id },
            data: {
              status: 'ACTIVE'
            }
          });

          console.log(`Payment succeeded for user ${user.email}`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find user by Stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeId: customerId }
        });

        if (!user) {
          console.error('User not found for customer:', customerId);
          return res.status(404).send('User not found');
        }

        // Determine plan from price ID
        const priceId = subscription.items.data[0]?.price.id;
        
        // Find the Plan record by comparing with env variables
        let planName = 'FREE';
        if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
          planName = 'STARTER';
        } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
          planName = 'PRO';
        }
        
        const plan = await prisma.plan.findFirst({
          where: { name: planName }
        });
        
        if (!plan) {
          console.error(`Plan ${planName} not found in database`);
          return res.status(500).send('Plan configuration error');
        }

        // Determine subscription status
        const status = subscription.status === 'active' ? 'ACTIVE' :
                      subscription.status === 'canceled' ? 'CANCELED' :
                      subscription.status === 'past_due' ? 'PAST_DUE' :
                      subscription.status === 'trialing' ? 'TRIALING' :
                      'ACTIVE';

        // Find existing active subscription or create new one
        const existingSubscription = await prisma.subscription.findFirst({
          where: { userId: user.id, status: 'ACTIVE' }
        });

        if (existingSubscription) {
          await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              planId: plan.id,
              status,
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: customerId,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              currentPeriodStart: new Date(subscription.current_period_start * 1000)
            }
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              planId: plan.id,
              status,
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: customerId,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              currentPeriodStart: new Date(subscription.current_period_start * 1000)
            }
          });
        }

        console.log(`Subscription ${subscription.id} updated for user ${user.email}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find user by Stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeId: customerId }
        });

        if (!user) {
          console.error('User not found for customer:', customerId);
          return res.status(404).send('User not found');
        }

        // Get FREE plan
        const freePlan = await prisma.plan.findFirst({
          where: { name: 'FREE' }
        });

        if (!freePlan) {
          console.error('FREE plan not found in database');
          return res.status(500).send('Plan configuration error');
        }

        // Cancel active subscription and create free one
        const activeSubscription = await prisma.subscription.findFirst({
          where: { userId: user.id, status: 'ACTIVE' }
        });

        if (activeSubscription) {
          await prisma.subscription.update({
            where: { id: activeSubscription.id },
            data: {
              status: 'CANCELED',
              canceledAt: new Date()
            }
          });
        }

        // Create new free subscription
        await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: freePlan.id,
            status: 'ACTIVE',
            stripeSubscriptionId: null,
            currentPeriodEnd: null
          }
        });

        console.log(`Subscription canceled for user ${user.email}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Find user by Stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeId: customerId }
        });

        if (user) {
          // Update subscription status
          await prisma.subscription.updateMany({
            where: { userId: user.id },
            data: {
              status: 'PAST_DUE'
            }
          });

          console.log(`Payment failed for user ${user.email}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark webhook event as processed
    if (webhookEventId) {
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { 
          status: 'processed',
          processedAt: new Date()
        }
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Mark webhook as failed
    if (webhookEventId) {
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { 
          status: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          attempts: { increment: 1 }
        }
      });
    }
    
    res.status(500).send('Webhook processing failed');
  }
});

export default router;
