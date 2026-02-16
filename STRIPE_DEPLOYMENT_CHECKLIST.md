# Stripe Integration - Deployment Checklist

Use this checklist when deploying the Stripe integration to production.

## Pre-Deployment (Development/Staging)

### Database Setup
- [ ] Run migration: `npm run prisma:migrate` in backend directory
- [ ] Verify `WebhookEvent` table exists in database
- [ ] Verify all indexes are created properly
- [ ] Run `npx prisma generate` to update Prisma client

### Stripe Account Setup
- [ ] Create Stripe account (or use existing)
- [ ] Complete business verification in Stripe
- [ ] Enable test mode for initial testing
- [ ] Create STARTER product with price
- [ ] Create PRO product with price
- [ ] Copy price IDs for both products

### Environment Variables
- [ ] Copy `.env.example` to `.env` in backend directory
- [ ] Set `STRIPE_SECRET_KEY` (test key: sk_test_...)
- [ ] Set `STRIPE_PUBLISHABLE_KEY` (test key: pk_test_...)
- [ ] Set `STRIPE_STARTER_PRICE_ID` (from Stripe dashboard)
- [ ] Set `STRIPE_PRO_PRICE_ID` (from Stripe dashboard)
- [ ] Set `STRIPE_WEBHOOK_SECRET` (from Stripe CLI or webhook endpoint)
- [ ] Set `DATABASE_URL` (PostgreSQL connection string)
- [ ] Set `JWT_SECRET` (secure random string)

### Local Testing with Stripe CLI

#### Install Stripe CLI
- [ ] Install Stripe CLI: https://stripe.com/docs/stripe-cli
- [ ] Run `stripe login` to authenticate

#### Test Webhook Flow
- [ ] Start backend: `npm run dev` in backend directory
- [ ] Start Stripe webhook forwarding: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- [ ] Copy webhook secret (whsec_...) from Stripe CLI output
- [ ] Update `STRIPE_WEBHOOK_SECRET` in `.env`
- [ ] Restart backend to load new webhook secret

#### Test Each Event
- [ ] Test signup creates Stripe customer: `curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'`
- [ ] Verify Stripe customer created in Stripe dashboard
- [ ] Test checkout.session.completed: `stripe trigger checkout.session.completed`
- [ ] Test invoice.payment_succeeded: `stripe trigger invoice.payment_succeeded`
- [ ] Test invoice.payment_failed: `stripe trigger invoice.payment_failed`
- [ ] Test customer.subscription.updated: `stripe trigger customer.subscription.updated`
- [ ] Test customer.subscription.deleted: `stripe trigger customer.subscription.deleted`

#### Verify Database
- [ ] Check `WebhookEvent` table has entries
- [ ] Verify all events have `processed: true`
- [ ] Check `User` table has `stripeId` populated
- [ ] Check `Subscription` table has correct data
- [ ] Verify subscription status updates correctly

### Code Review
- [ ] Review auth.ts changes (Stripe customer creation)
- [ ] Review stripe.ts changes (webhook handlers)
- [ ] Review schema.prisma changes (WebhookEvent model)
- [ ] Verify no Stripe keys in code (only env variables)
- [ ] Check error handling in all webhook handlers
- [ ] Verify logging is adequate for debugging

### Run Verification Script
- [ ] Run `./verify-stripe.sh` from repository root
- [ ] Address any warnings or errors
- [ ] Verify all checkmarks are green

## Production Deployment

### Stripe Production Setup
- [ ] Complete Stripe business verification
- [ ] Enable live mode in Stripe dashboard
- [ ] Create production STARTER product/price
- [ ] Create production PRO product/price
- [ ] Copy production price IDs
- [ ] Configure webhook endpoint in Stripe dashboard
  - URL: `https://yourdomain.com/api/stripe/webhook`
  - Events: checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
- [ ] Copy production webhook secret (whsec_live_...)

### Production Environment Variables
- [ ] Update `STRIPE_SECRET_KEY` with live key (sk_live_...)
- [ ] Update `STRIPE_PUBLISHABLE_KEY` with live key (pk_live_...)
- [ ] Update `STRIPE_WEBHOOK_SECRET` with production secret (whsec_live_...)
- [ ] Update `STRIPE_STARTER_PRICE_ID` with production price ID
- [ ] Update `STRIPE_PRO_PRICE_ID` with production price ID
- [ ] Verify `DATABASE_URL` points to production database
- [ ] Verify `JWT_SECRET` is production-secure
- [ ] Set `NODE_ENV=production`
- [ ] Set `BASE_DOMAIN` (e.g., textwash.app)

### Frontend Updates
- [ ] Update frontend `.env` with production Stripe publishable key
- [ ] Verify checkout flow uses correct API endpoints
- [ ] Test subscription purchase flow end-to-end
- [ ] Test customer portal access

### Database Migration
- [ ] Backup production database
- [ ] Run migration on production: `npm run prisma:migrate deploy`
- [ ] Verify migration completed successfully
- [ ] Check `WebhookEvent` table exists in production DB

### Deployment
- [ ] Deploy backend with all changes
- [ ] Verify backend is running: `curl https://yourdomain.com/health`
- [ ] Monitor logs for startup errors
- [ ] Check database connection is working

### Post-Deployment Testing

#### Test Webhook Endpoint
- [ ] Send test webhook from Stripe dashboard
- [ ] Verify webhook received (check backend logs)
- [ ] Check webhook appears in Stripe dashboard as successful
- [ ] Verify event stored in `WebhookEvent` table

#### Test Complete User Journey
1. **Signup**
   - [ ] Create new user account
   - [ ] Check Stripe dashboard for new customer
   - [ ] Verify `User.stripeId` populated in database
   
2. **Checkout**
   - [ ] Create checkout session
   - [ ] Complete payment with test card (4242 4242 4242 4242)
   - [ ] Verify redirect to success page
   - [ ] Check subscription created in Stripe
   - [ ] Verify subscription in database matches Stripe
   
3. **Subscription Status**
   - [ ] Login and check subscription plan
   - [ ] Verify correct plan displayed (STARTER or PRO)
   - [ ] Check subscription status is ACTIVE
   
4. **Customer Portal**
   - [ ] Access customer portal
   - [ ] Verify billing details load
   - [ ] Test updating payment method
   - [ ] Test canceling subscription
   - [ ] Verify cancellation reflected in database

#### Monitor Webhooks
- [ ] Monitor webhook events in Stripe dashboard (first hour)
- [ ] Check for any failed webhook deliveries
- [ ] Verify all events are processed successfully
- [ ] Review `WebhookEvent` table for any unprocessed events

### Monitoring Setup

#### Application Monitoring
- [ ] Set up error alerting for webhook failures
- [ ] Monitor webhook processing times
- [ ] Alert on failed Stripe API calls
- [ ] Track subscription creation/cancellation rates

#### Database Monitoring
- [ ] Monitor `WebhookEvent` table growth
- [ ] Alert on unprocessed events older than 1 hour
- [ ] Monitor subscription status distribution
- [ ] Track customer counts

#### Stripe Dashboard
- [ ] Enable email notifications for important events
- [ ] Set up revenue alerts
- [ ] Monitor failed payment rates
- [ ] Review churn metrics weekly

### Security Verification
- [ ] Confirm webhook signature verification is active
- [ ] Verify Stripe secret key not exposed in logs
- [ ] Check CORS settings for API endpoints
- [ ] Verify customer data is properly isolated
- [ ] Confirm SSL/TLS enabled on all endpoints
- [ ] Review API rate limiting is working

### Documentation
- [ ] Update team wiki with Stripe configuration
- [ ] Document webhook event handling process
- [ ] Create runbook for common Stripe issues
- [ ] Document customer support procedures
- [ ] Share Stripe dashboard access with relevant team members

### Backup Plan
- [ ] Document rollback procedure
- [ ] Keep backup of previous deployment
- [ ] Have database backup before migration
- [ ] Test rollback process in staging

## Post-Launch (First Week)

### Daily Checks
- [ ] Review webhook success rates
- [ ] Check for error spikes in logs
- [ ] Monitor new subscriptions
- [ ] Review customer feedback

### Weekly Review
- [ ] Analyze subscription conversion rates
- [ ] Review failed payment rates
- [ ] Check customer portal usage
- [ ] Identify any recurring issues

### Optimization
- [ ] Review webhook processing performance
- [ ] Optimize slow database queries
- [ ] Archive old webhook events if needed
- [ ] Update documentation based on learnings

## Success Metrics

Track these metrics to measure integration success:

- [ ] Webhook success rate > 99%
- [ ] Average webhook processing time < 500ms
- [ ] Failed payment rate < 2%
- [ ] Customer portal access rate > 50%
- [ ] Support tickets related to billing < 5/week

## Support Resources

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Support**: https://support.stripe.com
- **Documentation**: See `backend/STRIPE_CLI_TESTING.md`
- **Implementation Details**: See `STRIPE_IMPLEMENTATION.md`
- **Verification Script**: Run `./verify-stripe.sh`

## Emergency Contacts

- Stripe Support: https://support.stripe.com/contact
- Team Lead: [Add contact]
- DevOps: [Add contact]
- Database Admin: [Add contact]

---

**Note**: Complete each section in order. Do not skip any steps. If you encounter issues, refer to the troubleshooting section in `backend/STRIPE_CLI_TESTING.md`.
