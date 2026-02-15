# Feature Flag System - Quick Start

This repository now includes a complete feature flag system for controlling feature availability at runtime.

## What Was Added

### 1. Database Schema Changes
- Added `planAccess` field to store allowed subscription plans
- Added `userOverrides` field for user-specific feature control
- Migration file: `backend/prisma/migrations/20260215112344_add_feature_flag_fields/migration.sql`

### 2. Server-Side Middleware
**File:** `backend/src/middleware/featureFlag.ts`

```typescript
// Protect a route
router.get('/api/feature',
  authenticateToken,
  checkFeature('feature_name'),
  handler
);

// Check in code
const enabled = await isFeatureEnabled('feature_name', userId, userPlan);
```

### 3. Admin API
**File:** `backend/src/routes/admin.ts`

New endpoints:
- `GET /api/admin/feature-flags` - List all flags
- `POST /api/admin/feature-flags` - Create flag
- `PUT /api/admin/feature-flags/:id` - Update flag
- `DELETE /api/admin/feature-flags/:id` - Delete flag

### 4. Admin UI
**File:** `admin-features.html`

Features:
- ✅ Toggle flags on/off
- ✅ Set rollout percentage (0-100%)
- ✅ Assign plans (FREE, STARTER, PRO, ENTERPRISE)
- ✅ Add user overrides
- ✅ Modern, responsive design

**Access:** `http://localhost:3001/admin-features.html`

### 5. Example Routes
**File:** `backend/src/routes/featureExamples.ts`

Demo endpoints:
- `/api/features/example-feature` - Protected by feature flag
- `/api/features/process-text` - Conditional logic example
- `/api/features/check-features` - Feature detection

### 6. Documentation
- `backend/FEATURE_FLAGS.md` - Complete system documentation
- `backend/FEATURE_FLAG_EXAMPLES.md` - Usage examples and best practices

## Quick Setup

### 1. Apply Database Migration

```bash
cd backend
npm run prisma:migrate
```

### 2. Create Your First Feature Flag

Via UI:
1. Open `http://localhost:3001/admin-features.html`
2. Click "Create Flag"
3. Fill in details and save

Via API:
```bash
curl -X POST http://localhost:3000/api/admin/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_feature",
    "description": "My awesome feature",
    "isEnabled": true,
    "rolloutPercentage": 50,
    "planAccess": ["PRO", "ENTERPRISE"]
  }'
```

### 3. Protect Your Routes

```typescript
import { checkFeature } from '../middleware/featureFlag';

router.get('/api/my-feature',
  authenticateToken,
  checkFeature('my_feature'),
  async (req, res) => {
    // Your feature code
  }
);
```

## Feature Flag Evaluation

Priority order (highest to lowest):

1. **Global Toggle** - `isEnabled: false` → Feature off for everyone
2. **User Overrides** - Explicit user-level enable/disable
3. **Plan Access** - User's plan must be in `planAccess` array
4. **Rollout Percentage** - Deterministic hash-based rollout

## Common Use Cases

### Gradual Rollout
```json
{
  "isEnabled": true,
  "rolloutPercentage": 25  // Start at 25%, increase gradually
}
```

### Plan-Gated Feature
```json
{
  "isEnabled": true,
  "rolloutPercentage": 100,
  "planAccess": ["PRO", "ENTERPRISE"]
}
```

### Beta Testing
```json
{
  "isEnabled": true,
  "rolloutPercentage": 0,
  "userOverrides": {
    "beta_user_1": true,
    "beta_user_2": true
  }
}
```

### Emergency Kill Switch
```json
{
  "isEnabled": false  // Instantly disable for everyone
}
```

## API Response Examples

### Success (Feature Enabled)
```json
{
  "message": "You have access to this feature!",
  "userId": "user_123",
  "feature": "example_feature"
}
```

### Denied (Plan Not Allowed)
```json
{
  "error": "Feature not available",
  "feature": "advanced_analytics",
  "reason": "PLAN_NOT_ALLOWED"
}
```

### Denied (Not in Rollout)
```json
{
  "error": "Feature not available",
  "feature": "beta_feature",
  "reason": "NOT_IN_ROLLOUT"
}
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User Request                       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│        checkFeature Middleware                       │
│  1. Check global toggle                              │
│  2. Check user overrides                             │
│  3. Check plan access                                │
│  4. Check rollout percentage                         │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────┐            ┌─────────┐
    │ Allowed │            │ Denied  │
    │ 200 OK  │            │ 403     │
    └─────────┘            └─────────┘
```

## Files Added/Modified

```
admin-features.html                          # Admin UI
backend/
  ├── prisma/
  │   ├── schema.prisma                      # Modified: Added fields
  │   └── migrations/
  │       └── 20260215112344_.../            # New migration
  │           └── migration.sql
  ├── src/
  │   ├── middleware/
  │   │   └── featureFlag.ts                 # New: Core middleware
  │   ├── routes/
  │   │   ├── admin.ts                       # Modified: Added endpoints
  │   │   └── featureExamples.ts             # New: Example routes
  │   └── server.ts                          # Modified: Added routes
  ├── FEATURE_FLAGS.md                       # Documentation
  └── FEATURE_FLAG_EXAMPLES.md               # Usage examples
```

## Testing

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Test Example Routes
```bash
# Check feature access
curl http://localhost:3000/api/features/check-features \
  -H "Authorization: Bearer USER_TOKEN"

# Try protected route
curl http://localhost:3000/api/features/example-feature \
  -H "Authorization: Bearer USER_TOKEN"
```

### 3. Use Admin UI
Open `http://localhost:3001/admin-features.html` and manage flags visually.

## Best Practices

1. ✅ **Start with 0% rollout** - Test internally first
2. ✅ **Increase gradually** - 0% → 10% → 25% → 50% → 100%
3. ✅ **Use meaningful names** - `advanced_analytics` not `feature_1`
4. ✅ **Add descriptions** - Help your team understand each flag
5. ✅ **Clean up old flags** - Remove after 100% rollout
6. ✅ **Server-side only** - Never trust client-side checks
7. ✅ **Monitor metrics** - Watch error rates during rollout
8. ✅ **Document changes** - Keep track of what each flag controls

## Support

- 📖 Full Documentation: `backend/FEATURE_FLAGS.md`
- 💡 Examples: `backend/FEATURE_FLAG_EXAMPLES.md`
- 🐛 Issues: Check server logs for error messages

## Security

- ✅ Server-side enforcement (secure)
- ✅ Admin-only management
- ✅ Fail-closed on errors
- ✅ Authentication required
- ✅ No client-side bypass possible

---

**Ready to use!** Create your first feature flag and start controlling features at runtime.
