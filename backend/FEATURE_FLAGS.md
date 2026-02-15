# Feature Flag System Documentation

## Overview

The TextWash platform now includes a comprehensive feature flag system that allows you to:

- Control feature availability with global toggles
- Gate features by subscription plan (FREE, STARTER, PRO, ENTERPRISE)
- Override feature access for specific users
- Gradually roll out features to a percentage of users
- Manage all flags through an admin UI

## Architecture

### Database Schema

Feature flags are stored in the `FeatureFlag` table with the following fields:

```prisma
model FeatureFlag {
  id                String   @id @default(cuid())
  name              String   @unique          // Feature flag key
  description       String?                   // Human-readable description
  isEnabled         Boolean  @default(false)  // Global toggle
  rolloutPercentage Int      @default(0)      // 0-100 gradual rollout
  planAccess        Json?                     // Array of allowed plans
  userOverrides     Json?                     // User-specific overrides
  metadata          Json?                     // Additional metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Middleware

The `checkFeature(flagKey)` middleware enforces feature access server-side.

**Enforcement Priority (highest to lowest):**

1. **Global Toggle** - If `isEnabled` is false, feature is disabled for everyone
2. **User Overrides** - Explicit user-level enable/disable overrides all other settings
3. **Plan Access** - If specified, only users on allowed plans can access the feature
4. **Rollout Percentage** - Deterministic hash-based rollout to a percentage of users

## Usage

### Server-Side Enforcement

#### Protecting API Routes

```typescript
import { checkFeature } from '../middleware/featureFlag';

// Protect a route with a feature flag
router.get('/api/advanced-analytics', 
  authenticateToken,
  checkFeature('advanced_analytics'),
  async (req, res) => {
    // This code only runs if user has access to the feature
    // ...
  }
);
```

#### Checking Features in Code

```typescript
import { isFeatureEnabled } from '../middleware/featureFlag';

async function processRequest(userId: string, userPlan: string) {
  // Check if feature is enabled for this user
  const hasAccess = await isFeatureEnabled('beta_feature', userId, userPlan);
  
  if (hasAccess) {
    // Execute feature-specific code
  } else {
    // Use fallback behavior
  }
}
```

### Admin UI

Access the admin interface at: `http://localhost:3001/admin-features.html` (or your deployment URL)

**Features:**
- Create new feature flags
- Toggle flags on/off globally
- Set rollout percentage (0-100%)
- Assign allowed subscription plans
- Add user-specific overrides
- Delete feature flags

### API Endpoints

All endpoints require admin authentication (`Authorization: Bearer <token>`).

#### List All Feature Flags

```
GET /api/admin/feature-flags
```

**Response:**
```json
[
  {
    "id": "clx123...",
    "name": "advanced_analytics",
    "description": "Advanced analytics dashboard",
    "isEnabled": true,
    "rolloutPercentage": 50,
    "planAccess": ["PRO", "ENTERPRISE"],
    "userOverrides": {
      "user_123": true,
      "user_456": false
    },
    "createdAt": "2026-02-15T10:00:00Z",
    "updatedAt": "2026-02-15T12:00:00Z"
  }
]
```

#### Get Single Feature Flag

```
GET /api/admin/feature-flags/:id
```

#### Create Feature Flag

```
POST /api/admin/feature-flags
Content-Type: application/json

{
  "name": "new_feature",
  "description": "Description of the feature",
  "isEnabled": false,
  "rolloutPercentage": 0,
  "planAccess": ["PRO", "ENTERPRISE"],
  "userOverrides": {}
}
```

#### Update Feature Flag

```
PUT /api/admin/feature-flags/:id
Content-Type: application/json

{
  "isEnabled": true,
  "rolloutPercentage": 25
}
```

Note: Only include fields you want to update.

#### Delete Feature Flag

```
DELETE /api/admin/feature-flags/:id
```

## Feature Flag Evaluation Logic

When a user requests access to a feature, the system evaluates in this order:

### 1. Flag Exists?
- **NO** → Access denied (reason: `FLAG_NOT_FOUND`)
- **YES** → Continue to step 2

### 2. Globally Enabled?
- **NO** → Access denied (reason: `GLOBALLY_DISABLED`)
- **YES** → Continue to step 3

### 3. User Override?
- **YES** → Return override value (reason: `USER_OVERRIDE_ENABLED/DISABLED`)
- **NO** → Continue to step 4

### 4. Plan Access Restricted?
- **YES** → Check if user's plan is in `planAccess`
  - **NO** → Access denied (reason: `PLAN_NOT_ALLOWED`)
  - **YES** → Continue to step 5
- **NO** (no plan restrictions) → Continue to step 5

### 5. Rollout Percentage
- Check if user is in rollout (deterministic hash-based)
  - **NO** → Access denied (reason: `NOT_IN_ROLLOUT`)
  - **YES** → Access granted (reason: `ENABLED`)

## Rollout Percentage

The rollout percentage uses deterministic hashing to ensure:
- The same user always gets the same result
- Users are evenly distributed across the rollout
- No user database updates are needed

**Algorithm:**
1. Hash the user ID using MD5
2. Convert hash to a number (0-99)
3. If number ≤ rolloutPercentage, user is in rollout

**Example:** 
- 25% rollout = ~25% of users get access
- Same user will always be in/out unless percentage changes
- Increasing percentage adds more users, never removes existing ones

## Best Practices

### Naming Conventions

Use snake_case for feature flag names:
- ✅ `advanced_analytics`
- ✅ `beta_mobile_app`
- ✅ `ai_powered_search`
- ❌ `Advanced Analytics`
- ❌ `beta-mobile-app`

### Progressive Rollout Strategy

1. **Phase 1: Internal Testing** (0% rollout, user overrides for team)
   ```json
   {
     "isEnabled": true,
     "rolloutPercentage": 0,
     "userOverrides": {
       "internal_user_1": true,
       "internal_user_2": true
     }
   }
   ```

2. **Phase 2: Beta Users** (10% rollout)
   ```json
   {
     "isEnabled": true,
     "rolloutPercentage": 10
   }
   ```

3. **Phase 3: Gradual Increase** (25% → 50% → 75%)
   - Monitor metrics and errors
   - Increase rollout percentage incrementally

4. **Phase 4: Full Rollout** (100%)
   ```json
   {
     "isEnabled": true,
     "rolloutPercentage": 100
   }
   ```

### Plan-Based Features

For features that should only be available to paying customers:

```json
{
  "name": "priority_support",
  "description": "24/7 priority support access",
  "isEnabled": true,
  "rolloutPercentage": 100,
  "planAccess": ["PRO", "ENTERPRISE"]
}
```

### Emergency Kill Switch

To quickly disable a problematic feature:

```json
{
  "isEnabled": false  // Disables for everyone immediately
}
```

## Cache Management

Feature flags are cached for 5 minutes to reduce database load. The cache is automatically cleared when:
- Flags are created/updated/deleted via the admin API
- Server restarts

## Security Considerations

1. **Server-Side Enforcement** - Always check feature flags server-side, never trust client-side checks
2. **Admin Access** - Only admins can manage feature flags via the API
3. **Fail Closed** - If flag evaluation errors, access is denied by default
4. **Audit Trail** - `createdAt` and `updatedAt` timestamps track changes

## Migration Guide

To apply the feature flag schema changes:

```bash
cd backend
npm run prisma:migrate
```

This will apply the migration that adds `planAccess` and `userOverrides` fields to the FeatureFlag table.

## Examples

### Example 1: Beta Feature for Pro Users

```typescript
// Create the flag
POST /api/admin/feature-flags
{
  "name": "ai_suggestions",
  "description": "AI-powered text suggestions",
  "isEnabled": true,
  "rolloutPercentage": 50,
  "planAccess": ["PRO", "ENTERPRISE"]
}

// Protect the route
router.post('/api/ai-suggest',
  authenticateToken,
  checkFeature('ai_suggestions'),
  async (req, res) => {
    // AI suggestion logic
  }
);
```

### Example 2: Gradual Rollout with Overrides

```typescript
// Create the flag with testing overrides
POST /api/admin/feature-flags
{
  "name": "new_editor",
  "description": "New text editor interface",
  "isEnabled": true,
  "rolloutPercentage": 10,
  "userOverrides": {
    "test_user_1": true,  // Always enabled for testing
    "problem_user_2": false  // Disable if causing issues
  }
}
```

### Example 3: Plan-Gated Feature

```typescript
// Create the flag
POST /api/admin/feature-flags
{
  "name": "bulk_operations",
  "description": "Bulk text processing",
  "isEnabled": true,
  "rolloutPercentage": 100,
  "planAccess": ["ENTERPRISE"]  // Only Enterprise customers
}

// Check in code
const canUseBulk = await isFeatureEnabled(
  'bulk_operations',
  userId,
  userPlan
);

if (canUseBulk) {
  // Allow bulk operations
} else {
  return res.status(403).json({
    error: 'Bulk operations require Enterprise plan',
    upgrade: true
  });
}
```

## Troubleshooting

### Feature Not Working for User

1. Check if flag is globally enabled (`isEnabled: true`)
2. Check user overrides - explicit disable overrides everything
3. Check plan access - ensure user's plan is in `planAccess` array
4. Check rollout percentage - user may not be in rollout cohort
5. Clear cache and retry

### How to Force Enable for Testing

Add user override:
```json
{
  "userOverrides": {
    "your_user_id": true
  }
}
```

### How to Emergency Disable

Set global toggle:
```json
{
  "isEnabled": false
}
```

This immediately disables for all users, regardless of other settings.

## Support

For questions or issues with the feature flag system:
- Check server logs for `Feature flag check error` messages
- Verify database connection for flag lookups
- Ensure admin authentication is working for management
