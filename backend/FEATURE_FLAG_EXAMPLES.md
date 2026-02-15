# Feature Flag System - Usage Examples

This document provides practical examples of how to use the feature flag system.

## Example 1: Protecting a Route with Feature Flag

### Scenario
You want to add a new "Advanced Analytics" feature that should only be available to PRO and ENTERPRISE users, and you want to roll it out gradually.

### Implementation

#### 1. Create the Feature Flag

Using the Admin UI (`/admin-features.html`) or via API:

```bash
curl -X POST http://localhost:3000/api/admin/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "advanced_analytics",
    "description": "Advanced analytics dashboard with real-time metrics",
    "isEnabled": true,
    "rolloutPercentage": 50,
    "planAccess": ["PRO", "ENTERPRISE"],
    "userOverrides": {}
  }'
```

#### 2. Protect Your Route

```typescript
// backend/src/routes/analytics.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkFeature } from '../middleware/featureFlag';

const router = express.Router();

// Protected route - only accessible to users with the feature enabled
router.get('/api/analytics/advanced',
  authenticateToken,  // Require authentication
  checkFeature('advanced_analytics'),  // Check feature flag
  async (req, res) => {
    // This code only runs if:
    // 1. User is authenticated
    // 2. Feature flag 'advanced_analytics' is globally enabled
    // 3. User's plan is PRO or ENTERPRISE
    // 4. User is in the 50% rollout cohort
    
    res.json({
      data: {
        dailyActiveUsers: 1234,
        conversionRate: 3.5,
        revenue: 45678
      }
    });
  }
);

export default router;
```

#### 3. Test the Feature

**User in PRO plan, in rollout cohort:**
```bash
curl -X GET http://localhost:3000/api/analytics/advanced \
  -H "Authorization: Bearer USER_TOKEN"

# Response: 200 OK
{
  "data": {
    "dailyActiveUsers": 1234,
    "conversionRate": 3.5,
    "revenue": 45678
  }
}
```

**User in FREE plan:**
```bash
curl -X GET http://localhost:3000/api/analytics/advanced \
  -H "Authorization: Bearer USER_TOKEN"

# Response: 403 Forbidden
{
  "error": "Feature not available",
  "feature": "advanced_analytics",
  "reason": "PLAN_NOT_ALLOWED"
}
```

**User in PRO plan, NOT in rollout cohort:**
```bash
curl -X GET http://localhost:3000/api/analytics/advanced \
  -H "Authorization: Bearer USER_TOKEN"

# Response: 403 Forbidden
{
  "error": "Feature not available",
  "feature": "advanced_analytics",
  "reason": "NOT_IN_ROLLOUT"
}
```

## Example 2: Conditional Logic in Code

### Scenario
You want to use AI-powered text processing for some users, but fall back to basic processing for others.

### Implementation

```typescript
// backend/src/services/textProcessor.ts
import { isFeatureEnabled } from '../middleware/featureFlag';

export async function processText(
  text: string,
  userId: string,
  userPlan: string
): Promise<string> {
  // Check if AI features are enabled for this user
  const hasAI = await isFeatureEnabled('ai_processing', userId, userPlan);
  
  if (hasAI) {
    // Use advanced AI processing
    console.log('Using AI processing for user:', userId);
    return await aiEnhancedProcessing(text);
  } else {
    // Fall back to basic processing
    console.log('Using basic processing for user:', userId);
    return basicProcessing(text);
  }
}

async function aiEnhancedProcessing(text: string): Promise<string> {
  // AI-powered text enhancement
  // More expensive but higher quality
  return text; // Placeholder
}

function basicProcessing(text: string): Promise<string> {
  // Simple text cleanup
  // Fast and free
  return text.trim().replace(/\s+/g, ' ');
}
```

### Create the Flag

```json
{
  "name": "ai_processing",
  "description": "AI-powered text processing",
  "isEnabled": true,
  "rolloutPercentage": 100,
  "planAccess": ["PRO", "ENTERPRISE"]
}
```

## Example 3: Progressive Rollout Strategy

### Scenario
You're launching a completely new feature and want to ensure it's stable before releasing to everyone.

### Phase 1: Internal Testing (Week 1)

```bash
# Create flag with 0% rollout, but enable for your team
curl -X POST http://localhost:3000/api/admin/feature-flags \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "new_text_editor",
    "description": "New React-based text editor",
    "isEnabled": true,
    "rolloutPercentage": 0,
    "userOverrides": {
      "user_alice": true,
      "user_bob": true,
      "user_charlie": true
    }
  }'
```

Result: Only Alice, Bob, and Charlie can use the new editor. Everyone else uses the old one.

### Phase 2: Beta Users (Week 2)

```bash
# Increase rollout to 10% after successful internal testing
curl -X PUT http://localhost:3000/api/admin/feature-flags/FLAG_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rolloutPercentage": 10
  }'
```

Result: 10% of all users + your team see the new editor.

### Phase 3: Increase Rollout (Week 3-4)

```bash
# Week 3: Increase to 25%
curl -X PUT http://localhost:3000/api/admin/feature-flags/FLAG_ID \
  -H "Content-Type: application/json" \
  -d '{"rolloutPercentage": 25}'

# Week 4: Increase to 50%
curl -X PUT http://localhost:3000/api/admin/feature-flags/FLAG_ID \
  -H "Content-Type: application/json" \
  -d '{"rolloutPercentage": 50}'
```

### Phase 4: Full Release (Week 5)

```bash
# Deploy to everyone
curl -X PUT http://localhost:3000/api/admin/feature-flags/FLAG_ID \
  -H "Content-Type: application/json" \
  -d '{"rolloutPercentage": 100}'
```

### Phase 5: Cleanup (Week 6+)

After the feature is stable at 100% for a while:
1. Remove feature flag checks from code
2. Delete the feature flag
3. Deploy code without conditional logic

## Example 4: Emergency Kill Switch

### Scenario
You discovered a critical bug in a feature that's already deployed.

### Immediate Action

```bash
# Disable the feature for everyone immediately
curl -X PUT http://localhost:3000/api/admin/feature-flags/FLAG_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isEnabled": false
  }'
```

Result: Feature is instantly disabled for all users. No code deployment needed.

### After Fix

```bash
# Re-enable with lower rollout to verify fix
curl -X PUT http://localhost:3000/api/admin/feature-flags/FLAG_ID \
  -H "Content-Type: application/json" \
  -d '{
    "isEnabled": true,
    "rolloutPercentage": 10
  }'
```

## Example 5: User-Specific Override

### Scenario
A VIP customer wants early access to a feature that's still in beta.

### Grant Access

```bash
curl -X PUT http://localhost:3000/api/admin/feature-flags/FLAG_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userOverrides": {
      "vip_customer_123": true
    }
  }'
```

Result: User `vip_customer_123` gets access regardless of plan or rollout percentage.

### Troubleshooting: Disable for Problematic User

```bash
# User is experiencing issues with a feature
curl -X PUT http://localhost:3000/api/admin/feature-flags/FLAG_ID \
  -H "Content-Type: application/json" \
  -d '{
    "userOverrides": {
      "problematic_user_456": false
    }
  }'
```

Result: Feature is disabled for `problematic_user_456` even if they're in the rollout.

## Example 6: Plan-Based Feature

### Scenario
You want to offer a "Priority Support" feature only to PRO and ENTERPRISE customers.

### Create Flag

```bash
curl -X POST http://localhost:3000/api/admin/feature-flags \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "priority_support",
    "description": "24/7 priority support access",
    "isEnabled": true,
    "rolloutPercentage": 100,
    "planAccess": ["PRO", "ENTERPRISE"]
  }'
```

### Implementation

```typescript
// backend/src/routes/support.ts
router.post('/api/support/priority-ticket',
  authenticateToken,
  checkFeature('priority_support'),
  async (req, res) => {
    // Create priority support ticket
    // Only PRO/ENTERPRISE users can access this
    const ticket = await createPriorityTicket(req.user.id, req.body);
    res.json({ ticket });
  }
);

// Fallback for non-priority users
router.post('/api/support/ticket',
  authenticateToken,
  async (req, res) => {
    // Create normal support ticket
    const ticket = await createNormalTicket(req.user.id, req.body);
    res.json({ ticket });
  }
);
```

## Example 7: A/B Testing

### Scenario
You want to test two different implementations of a feature to see which performs better.

### Setup

```bash
# Create flag for Version A (50% rollout)
curl -X POST http://localhost:3000/api/admin/feature-flags \
  -d '{
    "name": "feature_version_a",
    "isEnabled": true,
    "rolloutPercentage": 50
  }'

# Users not in Version A automatically get Version B
```

### Implementation

```typescript
export async function renderFeature(userId: string, userPlan: string) {
  const useVersionA = await isFeatureEnabled('feature_version_a', userId, userPlan);
  
  if (useVersionA) {
    // Track: "User saw Version A"
    analytics.track('feature_version_shown', { version: 'A', userId });
    return renderVersionA();
  } else {
    // Track: "User saw Version B"
    analytics.track('feature_version_shown', { version: 'B', userId });
    return renderVersionB();
  }
}
```

### Analysis

After collecting metrics, you can:
1. Set rollout to 100% for winning version
2. Delete the feature flag
3. Remove conditional logic
4. Deploy single version

## Testing Feature Flags Locally

### Setup Test Data

```bash
# 1. Start your backend
cd backend
npm run dev

# 2. Get an admin token (login as admin)
# Save the token

# 3. Create test feature flags
curl -X POST http://localhost:3000/api/admin/feature-flags \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_feature",
    "description": "Test feature flag",
    "isEnabled": true,
    "rolloutPercentage": 100,
    "planAccess": ["PRO"]
  }'
```

### Test Different Scenarios

```bash
# Test as PRO user (should work)
curl http://localhost:3000/api/protected-endpoint \
  -H "Authorization: Bearer PRO_USER_TOKEN"

# Test as FREE user (should fail)
curl http://localhost:3000/api/protected-endpoint \
  -H "Authorization: Bearer FREE_USER_TOKEN"

# Test with feature disabled
curl -X PUT http://localhost:3000/api/admin/feature-flags/FLAG_ID \
  -H "Content-Type: application/json" \
  -d '{"isEnabled": false}'

# Now both should fail
curl http://localhost:3000/api/protected-endpoint \
  -H "Authorization: Bearer PRO_USER_TOKEN"
```

## Best Practices Summary

1. **Always use server-side checks** - Never rely on client-side feature detection
2. **Start with 0% rollout** - Test internally first
3. **Increase gradually** - 0% → 10% → 25% → 50% → 100%
4. **Monitor metrics** - Watch error rates at each rollout stage
5. **Use meaningful names** - `advanced_analytics` not `feature_123`
6. **Add descriptions** - Help your team understand what each flag controls
7. **Clean up old flags** - Remove flags after full rollout
8. **Document your flags** - Keep track of what each flag does
9. **Use overrides sparingly** - Only for testing and exceptional cases
10. **Fail closed** - If flag evaluation fails, deny access by default

## Monitoring and Observability

Add logging to track feature flag usage:

```typescript
import { evaluateFeatureFlag } from '../middleware/featureFlag';

// Log all feature checks
const result = await evaluateFeatureFlag(flagKey, userId, userPlan);
console.log('Feature check:', {
  flag: flagKey,
  userId,
  enabled: result.enabled,
  reason: result.reason,
  timestamp: new Date()
});
```

This helps you:
- Understand feature adoption
- Debug access issues
- Track rollout progress
- Identify unexpected behavior
