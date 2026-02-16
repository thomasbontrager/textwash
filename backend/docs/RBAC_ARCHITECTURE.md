# RBAC Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TextWash RBAC System                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                           USER ROLES                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │    USER     │  │   SUPPORT   │  │    ADMIN    │  │SUPER_ADMIN │ │
│  │             │  │             │  │             │  │            │ │
│  │ 0 perms     │  │  2 perms    │  │  5 perms    │  │  7 perms   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘

                                  ↓
                                  
┌──────────────────────────────────────────────────────────────────────┐
│                      PERMISSION MATRIX                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Permission              │ USER │ SUPPORT │ ADMIN │ SUPER_ADMIN     │
│  ──────────────────────────────────────────────────────────────────  │
│  MANAGE_USERS           │  ✗   │    ✗    │   ✓   │      ✓          │
│  MANAGE_PLANS           │  ✗   │    ✗    │   ✓   │      ✓          │
│  MANAGE_FEATURE_FLAGS   │  ✗   │    ✗    │   ✗   │      ✓          │
│  MANAGE_OAUTH           │  ✗   │    ✗    │   ✗   │      ✓          │
│  VIEW_LOGS              │  ✗   │    ✓    │   ✓   │      ✓          │
│  IMPERSONATE_USERS      │  ✗   │    ✓    │   ✓   │      ✓          │
│  MANAGE_BILLING         │  ✗   │    ✗    │   ✓   │      ✓          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘

                                  ↓

┌──────────────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE LAYER                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  authenticateToken()  or  authenticateApiKey()              │     │
│  │  ─────────────────────────────────────────────────────────  │     │
│  │  • Verifies JWT token or API key                           │     │
│  │  • Loads user role into req.user                           │     │
│  │  • Required for all protected routes                       │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                        │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  requireRole([Role.ADMIN, Role.SUPER_ADMIN])               │     │
│  │  ─────────────────────────────────────────────────────────  │     │
│  │  • Checks if user.role is in allowed roles                 │     │
│  │  • Fast check (no DB query)                                │     │
│  │  • Returns 403 if not authorized                           │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                        │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  requirePermission([Permission.MANAGE_USERS])              │     │
│  │  ─────────────────────────────────────────────────────────  │     │
│  │  • Queries RolePermission table for user's role            │     │
│  │  • Checks if role has ALL required permissions             │     │
│  │  • Returns 403 with details if unauthorized                │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘

                                  ↓

┌──────────────────────────────────────────────────────────────────────┐
│                       PROTECTED ROUTES                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Route                        │ Required Permission/Role             │
│  ───────────────────────────────────────────────────────────────────  │
│  GET  /admin/agents          │ ADMIN, SUPER_ADMIN                   │
│  POST /admin/agents/reload   │ MANAGE_FEATURE_FLAGS                 │
│  PUT  /admin/rules/:name     │ MANAGE_FEATURE_FLAGS                 │
│  GET  /admin/policies        │ ADMIN, SUPER_ADMIN                   │
│  POST /admin/policies        │ MANAGE_PLANS                         │
│  GET  /admin/api-keys        │ ADMIN, SUPER_ADMIN                   │
│  POST /admin/api-keys        │ MANAGE_USERS                         │
│  GET  /admin/usage           │ VIEW_LOGS                            │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                       DATABASE SCHEMA                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────┐          ┌─────────────────────────┐        │
│  │  User              │          │  RolePermission         │        │
│  ├────────────────────┤          ├─────────────────────────┤        │
│  │ id: String         │          │ id: String              │        │
│  │ email: String      │    ┌───→ │ role: Role              │        │
│  │ role: Role         │────┘     │ permission: Permission  │        │
│  │ ...                │          │ createdAt: DateTime     │        │
│  └────────────────────┘          │                         │        │
│                                  │ UNIQUE(role,permission) │        │
│                                  │ INDEX(role)             │        │
│                                  └─────────────────────────┘        │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                       REQUEST FLOW                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. Client sends request with JWT token or API key                   │
│                    ↓                                                  │
│  2. authenticateToken/authenticateApiKey middleware                  │
│     • Validates token/key                                            │
│     • Loads user with role into req.user                             │
│                    ↓                                                  │
│  3. requireRole or requirePermission middleware                      │
│     • Checks authorization                                           │
│     • Queries RolePermission table (if using permissions)            │
│                    ↓                                                  │
│  4a. Authorized → Execute route handler                              │
│  4b. Unauthorized → Return 403 with error details                    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    SECURITY FEATURES                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ✓ Server-side enforcement only (no frontend bypass)                 │
│  ✓ Database-driven permissions (single source of truth)              │
│  ✓ TypeScript type safety (no typos or invalid values)               │
│  ✓ Proper error handling (no sensitive data leaks)                   │
│  ✓ Indexed database queries (fast permission lookups)                │
│  ✓ JWT token validation (prevents tampering)                         │
│  ✓ Role encoded in JWT (reduces DB queries)                          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Usage Example

```typescript
// Example: Creating a protected route

import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { Permission } from '@prisma/client';

const router = Router();

// Step 1: Authenticate the user
router.use(authenticateToken);

// Step 2: Protect route with permission check
router.post('/admin/users',
  requirePermission([Permission.MANAGE_USERS]),
  async (req, res) => {
    // This code only runs if user has MANAGE_USERS permission
    // Create user logic here
  }
);

// Step 3: Multiple permissions (user must have ALL)
router.post('/admin/critical-action',
  requirePermission([
    Permission.MANAGE_FEATURE_FLAGS,
    Permission.MANAGE_OAUTH
  ]),
  async (req, res) => {
    // Only SUPER_ADMIN can access (only role with both permissions)
  }
);
```

## Permission Check Flow

```
User Request
     ↓
[JWT Token: { userId: "abc", role: "ADMIN" }]
     ↓
authenticateToken() → req.user = { id: "abc", role: "ADMIN" }
     ↓
requirePermission([MANAGE_USERS])
     ↓
Query: SELECT permission FROM RolePermission WHERE role = 'ADMIN'
     ↓
Result: [MANAGE_USERS, MANAGE_PLANS, VIEW_LOGS, ...]
     ↓
Check: Does result include MANAGE_USERS? ✓ Yes
     ↓
Execute route handler
```
