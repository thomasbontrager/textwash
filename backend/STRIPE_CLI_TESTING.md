# Stripe CLI Testing Guide

This guide explains how to test the Stripe billing integration using the Stripe CLI.

## Prerequisites

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI: `stripe login`
3. Have backend running on port 3000

## Setup

### 1. Get Webhook Signing Secret for Local Testing

When you use Stripe CLI to forward webhooks, it provides a unique webhook signing secret:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This command will output something like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### 2. Update Backend .env

Add the webhook secret from the previous step to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 3. Start Backend Server

```bash
cd backend
npm run dev
```

## Testing Webhook Events

With the Stripe CLI listening and your backend running, you can test webhook events.

### Test 1: Checkout Session Completed

Simulate a successful checkout:

```bash
stripe trigger checkout.session.completed
```

**Expected Result:**
- Backend logs: "Received webhook event: checkout.session.completed"
- Backend logs: "Checkout completed for user..."
- Database: WebhookEvent record created with `eventType: 'checkout.session.completed'`
- Database: Subscription updated with new plan

### Test 2: Invoice Payment Succeeded

Simulate a successful payment:

```bash
stripe trigger invoice.payment_succeeded
```

**Expected Result:**
- Backend logs: "Received webhook event: invoice.payment_succeeded"
- Backend logs: "Payment succeeded for user..."
- Database: WebhookEvent record created
- Database: Subscription status updated to ACTIVE

### Test 3: Invoice Payment Failed

Simulate a failed payment:

```bash
stripe trigger invoice.payment_failed
```

**Expected Result:**
- Backend logs: "Received webhook event: invoice.payment_failed"
- Backend logs: "Payment failed for user..."
- Database: WebhookEvent record created
- Database: Subscription status updated to PAST_DUE

### Test 4: Subscription Updated

Simulate a subscription change:

```bash
stripe trigger customer.subscription.updated
```

**Expected Result:**
- Backend logs: "Received webhook event: customer.subscription.updated"
- Backend logs: "Subscription xxxxx updated for user..."
- Database: WebhookEvent record created
- Database: Subscription record updated

### Test 5: Subscription Deleted

Simulate subscription cancellation:

```bash
stripe trigger customer.subscription.deleted
```

**Expected Result:**
- Backend logs: "Received webhook event: customer.subscription.deleted"
- Backend logs: "Subscription canceled for user..."
- Database: WebhookEvent record created
- Database: Subscription downgraded to FREE plan

## Verify Webhook Storage

Check that all webhook events are being stored:

```sql
SELECT * FROM "WebhookEvent" ORDER BY "createdAt" DESC LIMIT 10;
```

All events should have:
- Unique `eventId`
- Correct `eventType`
- Full event data in `data` field
- `processed` set to `true` after successful processing

## Manual Testing Flow

### Test Complete Signup to Subscription Flow

1. **Create User**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Verify:** User has `stripeId` populated in database

2. **Create Checkout Session**
```bash
curl -X POST http://localhost:3000/api/subscriptions/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"plan":"STARTER"}'
```

**Verify:** Returns checkout session URL

3. **Trigger Checkout Completion** (in separate terminal)
```bash
stripe trigger checkout.session.completed
```

**Verify:** Subscription created/updated in database

4. **Test Customer Portal**
```bash
curl -X POST http://localhost:3000/api/billing/create-portal-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Verify:** Returns portal session URL

## Debugging

### Check Backend Logs

```bash
cd backend
npm run dev
```

Look for:
- "Stripe customer created: cus_xxxxx for email@example.com"
- "Received webhook event: [event_type]"
- Event processing confirmations

### Check Database State

```sql
-- Check webhook events
SELECT "eventType", "processed", "createdAt" 
FROM "WebhookEvent" 
ORDER BY "createdAt" DESC;

-- Check subscriptions
SELECT u.email, s.plan, s.status, s."stripeSubscriptionId"
FROM "User" u
JOIN "Subscription" s ON u.id = s."userId";
```

### Common Issues

**Issue: "Webhook signature verification failed"**
- Solution: Make sure `STRIPE_WEBHOOK_SECRET` in `.env` matches the one from `stripe listen`

**Issue: "User not found for customer: cus_xxxxx"**
- Solution: Ensure user was created with Stripe customer ID during signup
- Or use a real checkout flow to ensure proper customer linking

**Issue: Webhook not received**
- Solution: Ensure `stripe listen` is running and forwarding to correct URL
- Check that backend is accessible on specified port

## Production Testing

Before deploying to production:

1. Test all webhook events in test mode
2. Verify webhook event storage is working
3. Test complete user journey (signup → checkout → subscription)
4. Verify subscription status updates correctly
5. Test customer portal access
6. Monitor Stripe dashboard for successful events

## Security Checklist

- [x] Webhook signature verification enabled
- [x] All webhook events stored in database
- [x] Stripe Secret Key not exposed in frontend
- [x] Customer IDs properly linked to users
- [x] Subscription status updated server-side only
- [x] No frontend-only subscription checks
