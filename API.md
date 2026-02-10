# API Documentation

## Authentication Endpoints

### POST /api/auth/signup

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "cuid123",
    "email": "user@example.com",
    "role": "USER",
    "subscription": {
      "plan": "FREE",
      "status": "ACTIVE"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- 400: Email already registered
- 400: Invalid email/password format

### POST /api/auth/login

Authenticate and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "user": {...},
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- 401: Invalid credentials

### GET /api/auth/me

Get current user profile (requires auth).

**Header:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": "cuid123",
  "email": "user@example.com",
  "role": "USER",
  "subscription": {
    "id": "sub123",
    "plan": "FREE",
    "status": "ACTIVE",
    "trialEndsAt": null,
    "currentPeriodEnd": null
  }
}
```

**Errors:**
- 401: No/invalid token

## Subscription Endpoints

### GET /api/subscriptions/plan

Get user's subscription details (requires auth).

**Response (200):**
```json
{
  "id": "sub123",
  "userId": "user123",
  "plan": "FREE",
  "status": "ACTIVE",
  "stripeSubscriptionId": null,
  "trialEndsAt": null,
  "currentPeriodStart": null,
  "currentPeriodEnd": null
}
```

### POST /api/subscriptions/create-checkout-session

Start Stripe checkout for subscription upgrade.

**Request:**
```json
{
  "plan": "PRO"
}
```

**Response (200):**
```json
{
  "sessionId": "cs_live_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

**Errors:**
- 400: Invalid plan
- 404: User not found

### POST /api/subscriptions/cancel-subscription

Cancel active subscription.

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- 400: No active subscription
- 400: Already canceled

## Admin Endpoints

All admin endpoints require `Authorization: Bearer {admin-token}`

### GET /api/admin/users

List all users with subscription details.

**Response (200):**
```json
[
  {
    "id": "user123",
    "email": "user@example.com",
    "role": "USER",
    "subscription": {
      "plan": "PRO",
      "status": "ACTIVE"
    }
  }
]
```

### GET /api/admin/users/:userId

Get specific user details.

**Response (200):**
```json
{
  "id": "user123",
  "email": "user@example.com",
  "subscription": {...}
}
```

### POST /api/admin/users/:userId/grant-pro

Manually grant Pro access to user.

**Response (200):**
```json
{
  "userId": "user123",
  "plan": "PRO",
  "status": "ACTIVE"
}
```

### POST /api/admin/users/:userId/revoke-access

Revoke Pro access, move to Free.

**Response (200):**
```json
{
  "userId": "user123",
  "plan": "FREE",
  "status": "ACTIVE"
}
```

### GET /api/admin/stripe-config

Get current Stripe configuration (showing only publication key status).

**Response (200):**
```json
{
  "publishableKey": "pk_test_xxx",
  "hasSecretKey": true
}
```

### POST /api/admin/stripe-config

Update Stripe API keys.

**Request:**
```json
{
  "publishableKey": "pk_test_xxx",
  "secretKey": "sk_test_xxx",
  "webhookSecret": "whsec_xxx"
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- 400: Invalid keys

## Webhook Endpoints

### POST /api/webhooks/webhook

Receive Stripe webhook events.

**Handled Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

**Response (200):**
```json
{
  "received": true
}
```

**Errors:**
- 400: Invalid signature
- 400: Processing error

## Health Check

### GET /api/health

Check if API is running.

**Response (200):**
```json
{
  "status": "ok"
}
```

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message here"
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / Validation error |
| 401 | Unauthorized / Invalid token |
| 403 | Forbidden / Insufficient permissions |
| 404 | Not found |
| 500 | Server error |

## Authentication

Include JWT token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Tokens expire after 30 days. Get new token by logging in again.

## Rate Limiting

Not currently implemented. To add:

```typescript
// Install: npm install express-rate-limit
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

## Example Usage

### Frontend Signup

```javascript
const response = await fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword'
  })
});

const { user, token } = await response.json();
localStorage.setItem('token', token);
```

### Authenticated Request

```javascript
const response = await fetch('http://localhost:3000/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const user = await response.json();
```

### Start Checkout

```javascript
const response = await fetch(
  'http://localhost:3000/api/subscriptions/create-checkout-session',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ plan: 'PRO' })
  }
);

const { url } = await response.json();
window.location.href = url;
```

## Webhook Verification

Webhooks are verified using Stripe's signing secret. Backend automatically verifies:

```typescript
const sig = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  request.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

## CORS Configuration

Frontend can be on different domain:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## Database Queries

### Find user by email

```prisma
user = await prisma.user.findUnique({
  where: { email: "user@example.com" },
  include: { subscription: true }
});
```

### List all Pro users

```prisma
users = await prisma.user.findMany({
  where: {
    subscription: {
      plan: "PRO"
    }
  }
});
```

## Troubleshooting

**"Invalid token"**
- Token may be expired
- Token may be malformed
- JWT_SECRET may be wrong

**"User not found"**
- User was deleted
- Email is case-sensitive
- Check database directly

**"Webhook signature verification failed"**
- Wrong STRIPE_WEBHOOK_SECRET
- Request body was modified
- Using test secret with live endpoint
