# Stripe Integration Guide

## Complete Stripe Setup for TextWash

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Click "Sign up"
3. Complete verification
4. Go to Dashboard

### 2. Get API Keys

In Stripe Dashboard:

**Test Keys** (for development):
1. Go to Developers → API Keys
2. Copy "Publishable key" starting with `pk_test_`
3. Copy "Secret key" starting with `sk_test_`

**Live Keys** (for production):
1. Go to Settings → API Keys
2. Reveal and copy "Publishable key" starting with `pk_live_`
3. Copy "Secret key" starting with `sk_live_`

### 3. Create Products

#### Product 1: CleanText Starter

1. Go to Products → New Product
2. Name: `CleanText Starter`
3. Description: `Professional text cleaning with priority support`
4. Add price:
   - Billing period: Yearly
   - Price: $29.00 USD
   - Trial period: 14 days
   - Recurring: Yes
5. Save product

Copy Price ID: `price_xxxxx` (starts with `starter_yearly_29usd`)

#### Product 2: CleanText Pro

1. Go to Products → New Product
2. Name: `CleanText Pro`
3. Description: `Professional text cleaning with AI features`
4. Add price:
   - Billing period: Yearly
   - Price: $99.00 USD
   - Trial period: 14 days
   - Recurring: Yes
5. Save product

Copy Price ID: `price_xxxxx` (starts with `pro_yearly_99usd`)

### 4. Setup Webhooks

#### Create Webhook Endpoint

1. Go to Developers → Webhooks
2. Click "Add an endpoint"
3. Endpoint URL: `https://yourdomain.com/api/webhooks/webhook`
4. Events to send:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Create endpoint

#### Get Webhook Secret

1. Click on created endpoint
2. Copy "Signing secret" (starts with `whsec_`)
3. Add to backend `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 5. Update Backend Configuration

Add to `backend/.env`:

```env
# Test Mode
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Or Production
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx
```

### 6. Setup Customer Portal

Allow customers to manage subscriptions:

1. Go to Settings → Billing portal settings
2. Enable "Billing portal"
3. Configure return URL: `https://yourdomain.com/dashboard`
4. Save

### 7. Test Checkout Flow

#### Use Test Cards

| Card Number | Result |
|---|---|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 2000 | Declined |
| 4000 0025 0000 3155 | Requires authentication |

#### Test Subscription

1. Go to `http://localhost:3001/pricing`
2. Sign up or login
3. Click "Start Free Trial"
4. Use test card `4242 4242 4242 4242`
5. Expiry: Any future date
6. CVC: Any 3 digits
7. Complete payment

#### Verify Webhook

1. Go to Stripe Dashboard → Webhooks
2. Click your endpoint
3. Scroll to "Events"
4. Verify events are received:
   - `customer.subscription.created` ✅
   - `customer.subscription.updated` ✅

### 8. Admin Panel Configuration

#### Add Stripe Keys to Admin Panel

1. Login as admin user
2. Go to http://localhost:3001 (if admin)
3. Click "Admin Control Panel"
4. Go to "Stripe Config" tab
5. Enter:
   - Publishable Key: `pk_test_xxxxx`
   - Secret Key: `sk_test_xxxxx`
   - Webhook Secret: `whsec_xxxxx`
6. Click "Save Configuration"

### 9. Feature Gating Configuration

TextWash automatically gates features based on Stripe subscription status:

**Free Users:**
- ✅ Basic text cleaning
- ❌ No AI features
- ❌ No priority support

**Starter Users:**
- ✅ Everything in Free
- ✅ Enhanced cleaning
- ✅ Priority support
- ❌ No AI features

**Pro Users:**
- ✅ Everything in Starter
- ✅ AI spelling & grammar
- ✅ AI rewrite modes
- ✅ Context-aware AI

### 10. Handle Different Subscription Statuses

Stripe subscription statuses are automatically handled:

| Status | User Access | Action |
|---|---|---|
| active | ✅ Full access | - |
| trialing | ✅ Trial access | Show trial ending date |
| past_due | ⚠️ Limited | Retry payment |
| canceled | ❌ Revoked | Move to Free plan |

### 11. Transition to Live Mode

When ready for production:

1. **Complete Stripe Verification**
   - Verify business details
   - Add bank account
   - Enable live mode

2. **Update Environment Variables**
   ```env
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx
   ```

3. **Update Frontend**
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   ```

4. **Test Live Mode**
   - Use real test card (create in Stripe dashboard)
   - Verify webhook endpoints updated
   - Monitor live events

### 12. Troubleshooting Stripe Integration

#### Webhook Not Received

1. Check endpoint is publicly accessible:
   ```bash
   curl https://yourdomain.com/api/webhooks/webhook
   ```

2. Verify webhook secret in code and Stripe match:
   ```bash
   echo $STRIPE_WEBHOOK_SECRET
   ```

3. Monitor webhook attempts in Stripe dashboard

#### Subscription Not Updating

1. Check database logs
2. Verify webhook is being called
3. Check subscription status in Stripe dashboard
4. Monitor backend logs for errors

#### Checkout Session Fails

1. Verify Stripe API keys are correct
2. Check customer email is valid
3. Verify products exist in Stripe
4. Check frontend has correct publishable key

### 13. Monitoring & Analytics

Track subscriptions in Stripe Dashboard:

1. **Revenue**
   - Recurring Revenue chart
   - Failed charge trends

2. **Customers**
   - Active subscriptions
   - Churn rate
   - LTV

3. **Invoices**
   - Payment history
   - Failed payments
   - Refunds

### 14. Customer Communication

#### Trial Ending Email

Implement email via SendGrid or similar:

```javascript
const trialEndsAt = subscription.trialEndsAt;
// Send email reminder 3 days before
```

#### Payment Failed Email

Stripe automatically sends, but you can customize:

1. Go to Settings → Email Settings
2. Customize payment failure email
3. Include support contact

### 15. Pricing Changes

To update pricing:

1. **Don't modify existing prices** (breaks existing subscriptions)
2. **Create new products** with new pricing
3. **Migrate existing customers** if needed via API

```typescript
// Example: Migrate customer to new plan
const subscription = await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: subscriptionItemId, price: newPriceId }],
  proration_behavior: 'create_prorations'
});
```

### 16. Support Resources

- **Stripe Docs**: [stripe.com/docs](https://stripe.com/docs)
- **API Reference**: [stripe.com/docs/api](https://stripe.com/docs/api)
- **Testing**: [stripe.com/docs/testing](https://stripe.com/docs/testing)
- **Support**: [support.stripe.com](https://support.stripe.com)

## Security Best Practices

✅ **Do:**
- Store Secret Key only on backend
- Use environment variables for keys
- Verify webhook signatures
- Use HTTPS everywhere
- Rotate API keys quarterly

❌ **Don't:**
- Expose Secret Key in frontend/client code
- Commit `.env` files to git
- Use same keys in test and production
- Trust webhook data without verifying signature
- Store payment card data

## Next Steps

1. Complete Stripe setup above
2. Test in test mode with test cards
3. Deploy backend and frontend
4. Update to live keys
5. Monitor first live transactions
6. Celebrate! 🎉
