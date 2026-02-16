# Subscription Type Errors Fixed

## Summary

Fixed all type errors related to Prisma subscription queries after the schema was updated. The main issue was that the `Subscription` model changed from having a direct `plan` field to using a `planId` foreign key with a relation to the `Plan` model, and `userId` is no longer a unique field.

## Changes Made

### 1. **src/middleware/auth.ts**
- ✅ Changed `include: { subscription: true }` → `include: { subscriptions: true }`
- ✅ Changed `subscription.findUnique({ where: { userId }})` → `subscription.findFirst({ where: { userId, status: 'ACTIVE' }, include: { plan: true }})`
- ✅ Updated `requirePlan()` middleware to access `subscription.plan.name` instead of `subscription.plan`

### 2. **src/routes/auth.ts**
- ✅ Changed `include: { subscription: true }` → `include: { subscriptions: true }` (lines 114, 154)
- ✅ Updated signup to find/create a `Plan` record and use `planId` instead of setting `plan: 'FREE'`
- ✅ Changed `user.subscription` → `user.subscriptions?.find(s => s.status === 'ACTIVE') || user.subscriptions?.[0]`
- ✅ Added logic to create FREE plan if it doesn't exist during signup

### 3. **src/routes/api.ts**
- ✅ Changed `subscription.findUnique({ where: { userId }})` → `subscription.findFirst({ where: { userId, status: 'ACTIVE' }, include: { plan: true }})` (2 occurrences)
- ✅ Updated all references from `subscription?.plan` → `subscription?.plan.name`

### 4. **src/routes/billing.ts**
- ✅ Changed `include: { subscription: true }` → `include: { subscriptions: true }`

### 5. **src/routes/subscriptions.ts**
- ✅ Changed `subscription.findUnique({ where: { userId }})` → `subscription.findFirst({ where: { userId, status: 'ACTIVE' }, include: { plan: true }})` (2 occurrences)
- ✅ Updated reference from `subscription.plan` → `subscription.plan.name`

### 6. **src/routes/stripe.ts**
- ✅ Replaced `subscription.upsert({ where: { userId }})` with logic to find existing active subscription and update or create (2 occurrences)
- ✅ Changed from setting `plan: 'STARTER'` to finding the Plan record and using `planId: plan.id`
- ✅ Updated subscription cancellation to find active subscription, cancel it, and create a new FREE subscription
- ✅ Added proper Plan lookups for all Stripe webhook handlers

## Key Changes Explained

### Before (Incorrect):
```typescript
// This fails because userId is not unique on Subscription
const subscription = await prisma.subscription.findUnique({
  where: { userId: req.user.id }
});

// This fails because subscription.plan doesn't exist
const planName = subscription.plan; // Type error!

// This fails because there's no 'plan' field, only 'planId'
await prisma.subscription.create({
  data: {
    userId: user.id,
    plan: 'FREE', // Type error!
    status: 'ACTIVE'
  }
});
```

### After (Correct):
```typescript
// Use findFirst with status filter to get active subscription
const subscription = await prisma.subscription.findFirst({
  where: { userId: req.user.id, status: 'ACTIVE' },
  include: { plan: true } // Include the Plan relation
});

// Access plan name through the relation
const planName = subscription?.plan.name;

// Find/create a Plan and use its ID
const freePlan = await prisma.plan.findFirst({
  where: { name: 'FREE' }
});

await prisma.subscription.create({
  data: {
    userId: user.id,
    planId: freePlan.id, // Use planId foreign key
    status: 'ACTIVE'
  },
  include: { plan: true }
});
```

## Files Already Correct

These files were already using the correct patterns:
- ✅ `src/services/metricsService.ts` - Already using `findMany` with status filter and plan include
- ✅ `src/middleware/featureFlag.ts` - Already using `findFirst` with status filter and plan include
- ✅ `src/routes/featureExamples.ts` - Already using `findFirst` with status filter and plan include

## Verification

All subscription-related type errors have been resolved. Remaining compilation errors are unrelated to subscriptions:
- AI service files (memory.service.ts, anthropic.provider.ts, openai.provider.ts)
- Auth middleware's `requirePermission` function (references commented-out UserRole model)

## Schema Changes

The Subscription model now:
- Uses `planId` (String) as a foreign key to the Plan model
- Has a `plan` relation to access plan details
- Users can have multiple subscriptions (historical records)
- Active subscriptions should be queried with `status: 'ACTIVE'` filter
- No unique constraint on userId (must use `findFirst` or `findMany`, not `findUnique`)

## Testing

To test these changes:
1. Sign up a new user - should create FREE plan if needed and subscription with planId
2. Check that active subscriptions are correctly queried
3. Verify Stripe webhooks properly update subscriptions with Plan records
4. Test subscription cancellation creates new FREE subscription
