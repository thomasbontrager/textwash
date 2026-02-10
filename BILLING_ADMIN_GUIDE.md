# 💳 Stripe Admin Billing System - Complete Guide

## Overview

This guide covers the complete Stripe-integrated admin billing system for TextWash. The system provides full control over products, prices, subscriptions, customers, and billing operations.

## 🎯 Features

### Admin Dashboard Features
- **Real-time Metrics**: MRR, ARR, active subscriptions, trial users
- **Product Management**: Create and manage Stripe products and prices
- **Subscription Control**: View, upgrade, downgrade, and cancel subscriptions
- **Customer Management**: Search customers and view billing history
- **Invoice Tracking**: Monitor all invoices and payment status
- **Webhook Monitor**: Track and retry webhook events
- **Audit Logging**: Complete audit trail for all billing operations

### Customer Features
- **Checkout Flow**: Stripe Checkout for new subscriptions
- **Billing Portal**: Stripe Customer Portal for self-service
- **Subscription Management**: View and cancel subscriptions
- **Invoice Access**: Download invoices and payment history

## 🚀 Setup Instructions

### 1. Get Stripe API Keys

1. Create a Stripe account at https://stripe.com
2. Navigate to **Developers** → **API Keys**
3. Copy your **Publishable Key** (starts with `pk_`)
4. Copy your **Secret Key** (starts with `sk_`)

### 2. Configure Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing Secret** (starts with `whsec_`)

### 3. Configure in Admin Panel

1. Log in to TextWash as an admin
2. Navigate to **Admin** → **Stripe Config**
3. Enter your Stripe keys:
   - Publishable Key
   - Secret Key
   - Webhook Secret
4. Click **Save Configuration**

### 4. Create Products and Prices

1. Go to **Admin** → **Products**
2. Click **Create Product**
3. Enter product name and description
4. Click **Add Price** to create pricing:
   - Amount (in cents, e.g., 2999 for $29.99)
   - Billing interval (monthly, yearly, etc.)
   - Trial days (optional)

## 📊 Admin Operations

### Managing Products

**Create a Product:**
```javascript
POST /api/admin/billing/products
{
  "name": "Pro Plan",
  "description": "Professional features for power users"
}
```

**Update a Product:**
```javascript
PATCH /api/admin/billing/products/:productId
{
  "name": "Updated Name",
  "active": true
}
```

### Managing Prices

**Create a Price:**
```javascript
POST /api/admin/billing/prices
{
  "productId": "prod_xxx",
  "amount": 2999,  // $29.99 in cents
  "interval": "month",
  "trialDays": 14
}
```

### Managing Subscriptions

**View All Subscriptions:**
```javascript
GET /api/admin/billing/subscriptions?status=ACTIVE
```

**Update Subscription (Upgrade/Downgrade):**
```javascript
PATCH /api/admin/billing/subscriptions/:subscriptionId
{
  "priceId": "price_xxx",
  "prorationBehavior": "create_prorations"
}
```

**Cancel Subscription:**
```javascript
POST /api/admin/billing/subscriptions/:subscriptionId/cancel
{
  "immediate": false  // Cancel at period end
}
```

### Viewing Customers

**List All Customers:**
```javascript
GET /api/admin/billing/customers?limit=100
```

**Get Customer Details:**
```javascript
GET /api/admin/billing/customers/:customerId
```

### Invoice Management

**List Invoices:**
```javascript
GET /api/admin/billing/invoices?status=paid
```

**Get Invoice Details:**
```javascript
GET /api/admin/billing/invoices/:invoiceId
```

### Webhook Monitoring

**List Webhook Events:**
```javascript
GET /api/admin/billing/webhook-events?processed=false
```

**Retry Failed Webhook:**
```javascript
POST /api/webhooks/stripe/retry/:eventId
```

### Billing Metrics

**Get Dashboard Metrics:**
```javascript
GET /api/admin/billing/metrics
```

**Response:**
```json
{
  "mrr": 5000,
  "arr": 60000,
  "activeSubscriptions": 100,
  "trialingSubscriptions": 15,
  "pastDueSubscriptions": 3,
  "canceledSubscriptions": 10,
  "subscriptionsByPlan": [
    { "plan": "PRO", "_count": 75 },
    { "plan": "STARTER", "_count": 25 }
  ],
  "failedPayments": 2
}
```

## 🔐 Security Features

### Authentication & Authorization
- All billing endpoints require authentication
- Admin-only endpoints require admin role
- JWT token-based authentication

### Webhook Security
- Stripe signature verification **mandatory**
- Raw body parsing for signature validation
- Event idempotency (duplicate prevention)
- Automatic retry on failure

### Audit Logging
All billing operations are logged with:
- Action performed
- Resource affected
- Admin user who performed action
- Timestamp
- IP address and user agent

**View Audit Logs:**
```javascript
GET /api/admin/billing/audit-logs?action=subscription_canceled
```

### Data Protection
- Stripe keys stored encrypted in database
- No credit card data stored locally (PCI handled by Stripe)
- Read-only views for sensitive data
- Confirmation required for destructive actions

## 🔄 Webhook Event Handling

### Supported Events

#### `checkout.session.completed`
- Creates or updates subscription in database
- Links Stripe customer to user account
- Sets subscription plan and trial period

#### `customer.subscription.created`
- Creates subscription record
- Updates user subscription status

#### `customer.subscription.updated`
- Updates subscription plan and status
- Updates billing period dates
- Handles plan changes

#### `customer.subscription.deleted`
- Marks subscription as canceled
- Downgrades user to free plan

#### `invoice.paid`
- Records successful payment
- Saves invoice details
- Updates payment history

#### `invoice.payment_failed`
- Marks invoice as failed
- Updates subscription to past_due
- Triggers payment failure notification

### Webhook Retry Logic
- Failed webhooks are automatically logged
- Manual retry available in admin panel
- Retry count tracked
- Error messages stored for debugging

## 💡 Best Practices

### 1. Test with Stripe Test Mode
Always test billing flows with Stripe test keys before going live.

### 2. Monitor Webhook Events
Regularly check the webhook monitor for failed events and retry them promptly.

### 3. Review Audit Logs
Periodically review audit logs for suspicious activity or errors.

### 4. Use Proration for Plan Changes
When upgrading or downgrading, use `create_prorations` to charge/credit proportionally.

### 5. Handle Failed Payments Gracefully
Set up email notifications for failed payments (via Stripe Dashboard).

### 6. Backup Billing Data
Regularly backup the database, especially billing-related tables.

### 7. Set Up Stripe Radar
Enable Stripe Radar for fraud prevention (available on paid Stripe plans).

## 🧪 Testing

### Test with Stripe CLI

1. Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
# or download from https://stripe.com/docs/stripe-cli
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Trigger test events:
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

### Test Cards

Use these test card numbers in Stripe Checkout:

| Card Number         | Result                |
|--------------------|-----------------------|
| 4242 4242 4242 4242 | Success              |
| 4000 0000 0000 0002 | Card declined        |
| 4000 0000 0000 9995 | Insufficient funds   |
| 4000 0025 0000 3155 | Requires authentication (3D Secure) |

## 📈 Monitoring & Analytics

### Key Metrics to Track

1. **MRR (Monthly Recurring Revenue)**
   - Total monthly subscription revenue
   - Excludes one-time charges

2. **ARR (Annual Recurring Revenue)**
   - MRR × 12
   - Projected annual revenue

3. **Churn Rate**
   - Canceled subscriptions / Total active subscriptions
   - Monitor monthly for trends

4. **Failed Payment Rate**
   - Failed payments / Total payment attempts
   - High rate indicates payment issues

5. **Trial Conversion Rate**
   - Trialing → Active / Total trials started
   - Optimize onboarding based on this

## 🚨 Troubleshooting

### Webhook Not Processing

**Problem:** Webhook events showing as "unprocessed"

**Solutions:**
1. Check webhook signature verification
2. Verify webhook secret is correct
3. Check server logs for errors
4. Use "Retry" button in admin panel
5. Ensure server is publicly accessible

### Subscription Not Updating

**Problem:** User subscription not reflecting Stripe status

**Solutions:**
1. Check webhook events for errors
2. Manually trigger webhook event from Stripe Dashboard
3. Verify database connection
4. Check Prisma schema is up to date

### Payment Failing

**Problem:** Customer reports payment is failing

**Solutions:**
1. Check Stripe Dashboard for error details
2. Verify customer has valid payment method
3. Check for declined card in Stripe Radar
4. Ask customer to update payment method in billing portal

## 📚 Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [PCI Compliance](https://stripe.com/docs/security)

## 🔗 API Endpoints Reference

### Public Endpoints
- `POST /api/billing/checkout-session` - Create checkout session
- `POST /api/billing/portal-session` - Create billing portal session
- `GET /api/billing/subscription` - Get current subscription
- `POST /api/billing/subscription/cancel` - Cancel subscription
- `GET /api/billing/invoices` - List user invoices

### Admin Endpoints
- `GET /api/admin/billing/config` - Get Stripe configuration status
- `POST /api/admin/billing/config` - Update Stripe configuration
- `GET /api/admin/billing/products` - List products
- `POST /api/admin/billing/products` - Create product
- `PATCH /api/admin/billing/products/:id` - Update product
- `GET /api/admin/billing/prices` - List prices
- `POST /api/admin/billing/prices` - Create price
- `GET /api/admin/billing/subscriptions` - List all subscriptions
- `GET /api/admin/billing/subscriptions/:id` - Get subscription details
- `PATCH /api/admin/billing/subscriptions/:id` - Update subscription
- `POST /api/admin/billing/subscriptions/:id/cancel` - Cancel subscription
- `GET /api/admin/billing/customers` - List customers
- `GET /api/admin/billing/customers/:id` - Get customer details
- `GET /api/admin/billing/invoices` - List all invoices
- `GET /api/admin/billing/invoices/:id` - Get invoice details
- `GET /api/admin/billing/webhook-events` - List webhook events
- `GET /api/admin/billing/metrics` - Get billing metrics
- `GET /api/admin/billing/audit-logs` - Get audit logs

### Webhook Endpoint
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/stripe/retry/:eventId` - Retry failed webhook

## ✅ Production Checklist

Before going live:

- [ ] Switch to Stripe live keys
- [ ] Update webhook URL to production domain
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Test complete checkout flow
- [ ] Test subscription cancellation
- [ ] Test billing portal access
- [ ] Verify webhook events are processing
- [ ] Enable Stripe Radar for fraud prevention
- [ ] Set up email notifications for failed payments
- [ ] Configure backup schedule for database
- [ ] Review and test error handling
- [ ] Set up monitoring and alerts
- [ ] Document internal procedures
- [ ] Train support team on billing operations

## 🎉 Success!

Your Stripe billing system is now fully operational. You have:

✅ Complete admin control over billing
✅ Real-time metrics and analytics
✅ Secure webhook processing
✅ Full audit trail
✅ Customer self-service portal
✅ Production-ready safety features

For questions or issues, refer to this guide or Stripe's excellent documentation.
