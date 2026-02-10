# ✅ Stripe Customer Portal - Setup Complete

**Status: READY TO TEST** (After enabling in Stripe Dashboard)

---

## 🎉 What Was Implemented

### Backend (Express/TypeScript)
- ✅ **New Route**: `/api/billing/create-portal-session`
- ✅ **Updated Webhook**: Now saves `stripeCustomerId` automatically on subscription creation/update
- ✅ **Auto-mounted**: Billing routes already added to server

### Frontend (Vanilla JS)
- ✅ **Function**: `openStripePortal()` implemented in [app.js](app.js)
- ✅ **Button**: "Open Billing Portal" on [Account page](index.html#accountPage) already wired up
- ✅ **Redirect**: Opens Stripe-hosted Customer Portal and returns to `/account`

### Database
- ✅ **Field**: `stripeCustomerId` already exists in `Subscription` model
- ✅ **Webhook**: Saves customer ID on first subscription payment

---

## 🔧 REQUIRED: Enable Customer Portal in Stripe Dashboard

**⚠️ DO THIS BEFORE TESTING**

### Step 1: Go to Customer Portal Settings

Open: https://dashboard.stripe.com/test/settings/billing/portal

### Step 2: Enable Customer Actions

Turn ON:
- ✅ **"Allow customers to cancel subscriptions"**
- ✅ **"Allow customers to update subscriptions"**

### Step 3: Configure Product Switching

Under **"Products"** section, click **"Add products"** and select:
- ✅ Starter Plan: `price_1SzDbEDfms6cxY4GkvZBTxXy` ($29/year)
- ✅ Pro Plan: `price_1SzDirDfms6cxY4GGTvYGEYu` ($99/year)

This allows:
- Starter → Pro upgrade (prorated immediately)
- Pro → Starter downgrade (takes effect next billing cycle)

### Step 4: Save Changes

Click **"Save changes"** at the bottom of the page.

---

## 🎯 What Stripe Customer Portal Handles (Zero Code Needed)

Once enabled, your users can:

✅ **Cancel subscription** (continues until period end)  
✅ **Resume subscription** (if canceled but still active)  
✅ **Upgrade** Starter → Pro (prorated automatically)  
✅ **Downgrade** Pro → Starter (takes effect next cycle)  
✅ **Update payment method** (credit card, billing details)  
✅ **View invoices** (download receipts)  
✅ **Update billing address**

**Zero PCI scope. Zero billing bugs. Stripe handles everything.**

---

## 🧪 How to Test

### 1. Start Frontend Server

```powershell
npx http-server -p 3001
```

Or use VS Code's "Live Server" extension.

### 2. Sign Up & Create Subscription

1. Sign up for an account
2. Go to Pricing page
3. Click "Start Free Trial" on Starter or Pro
4. Complete checkout with test card: `4242 4242 4242 4242`
5. Redirected back to dashboard

### 3. Open Customer Portal

1. Click **"Account"** button in dashboard
2. Click **"Open Billing Portal"** button
3. You'll be redirected to Stripe's portal (looks like this):

```
https://billing.stripe.com/p/session/test_...
```

### 4. Test Portal Features

Try:
- ✅ View subscription details
- ✅ Update payment method
- ✅ View past invoices
- ✅ Upgrade/downgrade plan
- ✅ Cancel subscription

### 5. Verify Webhooks Update Database

After making changes in the portal:
- Changes sync back via webhook
- Database updated automatically
- Your app reflects new subscription status

---

## 🔄 How It Works (Behind the Scenes)

```
User clicks "Open Billing Portal"
         ↓
Frontend calls: POST /api/billing/create-portal-session
         ↓
Backend creates Stripe portal session with stripeCustomerId
         ↓
Returns Stripe-hosted URL
         ↓
User redirected to Stripe Customer Portal
         ↓
User makes changes (cancel, upgrade, update card, etc.)
         ↓
Stripe sends webhook to: /api/webhooks/webhook
         ↓
Webhook updates subscription in database
         ↓
User clicks "Return to account" in portal
         ↓
Redirect back to: http://localhost:3001/account
         ↓
Dashboard shows updated subscription status
```

---

## 📝 Implementation Details

### Backend Route
**File**: [backend/src/routes/billing.ts](backend/src/routes/billing.ts)

```typescript
router.post('/create-portal-session', authMiddleware, async (req, res) => {
  const stripeCustomerId = user.subscription?.stripeCustomerId || user.stripeId;
  
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/account`,
  });

  res.json({ url: session.url });
});
```

### Frontend Function
**File**: [app.js](app.js)

```javascript
async function openStripePortal() {
  const response = await fetch(`${API_URL}/billing/create-portal-session`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const { url } = await response.json();
  window.location.href = url; // Redirect to Stripe portal
}
```

### Webhook Updates
**File**: [backend/src/routes/webhooks.ts](backend/src/routes/webhooks.ts)

Automatically saves `stripeCustomerId` when subscription is created/updated:

```typescript
case 'customer.subscription.created':
case 'customer.subscription.updated':
  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      stripeCustomerId: customerId, // ← Saved here
      plan: ...,
      status: ...,
    },
  });
```

---

## ➕ Optional: Remove Cancel Button (Recommended)

Since Customer Portal handles cancellation, you can simplify your Account page:

**Option 1: Hide the "Cancel Subscription" button**
```html
<!-- In index.html, comment out or remove: -->
<!-- <button id="cancelSubBtn" class="btn btn-danger" onclick="cancelSubscription()">Cancel Subscription</button> -->
```

**Option 2: Replace with Portal button only**
```html
<h2>Manage Subscription</h2>
<p>Cancel, upgrade, update billing, and view invoices</p>
<button class="btn btn-primary" onclick="openStripePortal()">Manage Billing</button>
```

This gives users one unified experience for ALL billing operations.

---

## 🎯 Testing Checklist

- [ ] Enabled Customer Portal in Stripe Dashboard
- [ ] Added both price IDs (Starter & Pro) to portal products
- [ ] Backend server running on `localhost:3000`
- [ ] Frontend server running on `localhost:3001`
- [ ] Created test subscription with card `4242 4242 4242 4242`
- [ ] Clicked "Open Billing Portal" button
- [ ] Successfully redirected to Stripe portal
- [ ] Viewed subscription details in portal
- [ ] Made a change (e.g., update payment method)
- [ ] Returned to app after change
- [ ] Verified webhook updated database

---

## 🚨 Troubleshooting

### "No Stripe customer ID found"
- Subscription hasn't been created yet
- User must complete checkout first before accessing portal

### Portal shows no products to switch to
- Make sure you added both price IDs in Stripe Dashboard settings
- Check you're using TEST mode price IDs (start with `price_test_...` or use test dashboard)

### Changes in portal don't reflect in app
- Check webhook is receiving events: `stripe listen --forward-to localhost:3000/api/webhooks/webhook`
- Verify `STRIPE_WEBHOOK_SECRET` matches the one from Stripe CLI

### "Return to account" link doesn't work
- Update `FRONTEND_URL` in `backend/.env` to match your frontend server URL
- Default is `http://localhost:3001` - change if using different port

---

## 📦 What's Next

1. ✅ Enable Customer Portal in Stripe Dashboard
2. ✅ Test complete flow (signup → checkout → portal → changes → webhook)
3. ✅ Set up database (PostgreSQL) - see [PRE_LAUNCH_STATUS.md](PRE_LAUNCH_STATUS.md)
4. ✅ Run end-to-end testing before production
5. ✅ Switch to LIVE mode Stripe keys for production deployment

---

**All code is deployed and ready to test!** 🎉

Just enable the Customer Portal in Stripe Dashboard and you're good to go.
