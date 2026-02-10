/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe webhook events with signature verification.
 * Critical for maintaining billing state synchronization.
 * 
 * Security:
 * - Signature verification is MANDATORY
 * - Raw body parsing required for signature validation
 * - All events are logged for audit trail
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as stripeService from '../services/stripe';

const router = Router();
const prisma = new PrismaClient();

/**
 * Stripe Webhook Endpoint
 * 
 * IMPORTANT: This endpoint requires raw body parsing for signature verification.
 * The body parser middleware should be configured to preserve raw body for this route.
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    console.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    // Get webhook secret from admin profile
    // In production, you might want to cache this or use environment variables
    const adminProfile = await prisma.adminProfile.findFirst({
      where: { stripeWebhookSecret: { not: null } },
    });

    if (!adminProfile || !adminProfile.stripeWebhookSecret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature and construct event
    const event = stripeService.constructWebhookEvent(
      req.body,
      signature,
      adminProfile.stripeWebhookSecret
    );

    console.log(`Received webhook event: ${event.type} (${event.id})`);

    // Process the event
    await stripeService.processWebhookEvent(event);

    // Return 200 to acknowledge receipt
    res.json({ received: true, eventId: event.id });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return 400 for signature verification failures
    if (error instanceof Error && error.message.includes('signature')) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Return 500 for processing errors (Stripe will retry)
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Retry failed webhook event (Admin only)
 */
router.post('/stripe/retry/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Get the webhook event
    const webhookEvent = await prisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId: eventId },
    });

    if (!webhookEvent) {
      return res.status(404).json({ error: 'Webhook event not found' });
    }

    if (webhookEvent.processed) {
      return res.status(400).json({ error: 'Event already processed' });
    }

    // Reconstruct the Stripe event from stored data
    const event = {
      id: webhookEvent.stripeEventId,
      type: webhookEvent.type,
      data: { object: webhookEvent.data },
    } as any;

    // Process the event
    await stripeService.processWebhookEvent(event);

    res.json({ 
      success: true,
      message: 'Event reprocessed successfully',
      eventId: webhookEvent.stripeEventId
    });
  } catch (error) {
    console.error('Error retrying webhook event:', error);
    res.status(500).json({ 
      error: 'Failed to retry event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * List webhook events (Admin only)
 */
router.get('/stripe/events', async (req: Request, res: Response) => {
  try {
    const { 
      processed, 
      type,
      limit = '50',
      offset = '0'
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

    res.json({
      events,
      total,
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

export default router;
