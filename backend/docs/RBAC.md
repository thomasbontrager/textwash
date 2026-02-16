# Role-Based Access Control (RBAC) Implementation

This document describes the RBAC implementation for the TextWash B2B API Platform.

## Overview

The RBAC system implements fine-grained access control using roles and permissions. Each role has a set of permissions that determine what actions users can perform in the system.

## Roles

### 1. USER
- **Description**: Basic user with no administrative privileges
- **Permissions**: None
- **Use Case**: Regular users who use the text processing APIs

### 2. SUPPORT
- **Description**: Customer support staff who can troubleshoot user issues
- **Permissions**:
  - `VIEW_LOGS` - Can view system logs and usage statistics
  - `IMPERSONATE_USERS` - Can impersonate users for troubleshooting
- **Use Case**: Support team members helping customers

### 3. ADMIN
- **Description**: Administrators who can manage most system aspects
- **Permissions**:
  - `MANAGE_USERS` - Can create, update, and manage user accounts and API keys
  - `MANAGE_PLANS` - Can create and modify subscription plans and policies
  - `VIEW_LOGS` - Can view system logs and usage statistics
  - `IMPERSONATE_USERS` - Can impersonate users for troubleshooting
  - `MANAGE_BILLING` - Can manage billing and payment settings
- **Use Case**: System administrators managing day-to-day operations

### 4. SUPER_ADMIN
- **Description**: Super administrators with full system access
- **Permissions**: All permissions
  - `MANAGE_USERS`
  - `MANAGE_PLANS`
  - `MANAGE_FEATURE_FLAGS` - Can modify agent rules and feature flags
  - `MANAGE_OAUTH` - Can manage OAuth and authentication settings
  - `VIEW_LOGS`
  - `IMPERSONATE_USERS`
  - `MANAGE_BILLING`
- **Use Case**: System architects and senior administrators

## Permissions

### MANAGE_USERS
- Create, update, and delete user accounts
- Create and manage API keys
- View user details and activity

### MANAGE_PLANS
- Create and modify subscription plans
- Create and update policies
- Configure plan features

### MANAGE_FEATURE_FLAGS
- Update agent rules
- Reload agent configurations
- Modify feature flags
- Clear agent caches

### MANAGE_OAUTH
- Configure OAuth providers
- Manage authentication settings
- Update JWT secrets (future)

### VIEW_LOGS
- View system logs
- Access usage statistics
- View audit trails
- Monitor system health

### IMPERSONATE_USERS
- Log in as another user for troubleshooting
- Access user sessions
- Debug user-specific issues

### MANAGE_BILLING
- Configure Stripe settings
- View payment information
- Manage subscription billing
- Process refunds

## Database Schema

### Role Enum
```prisma
enum Role {
  USER
  SUPPORT
  ADMIN
  SUPER_ADMIN
}
```

### Permission Enum
```prisma
enum Permission {
  MANAGE_USERS
  MANAGE_PLANS
  MANAGE_FEATURE_FLAGS
  MANAGE_OAUTH
  VIEW_LOGS
  IMPERSONATE_USERS
  MANAGE_BILLING
}
```

### RolePermission Model
```prisma
model RolePermission {
  id          String     @id @default(cuid())
  role        Role
  permission  Permission
  createdAt   DateTime   @default(now())
  
  @@unique([role, permission])
  @@index([role])
}
```

## Middleware

### requireRole(allowedRoles: Role[])
Restricts access to routes based on user roles.

**Example**:
```typescript
router.get('/admin/agents', 
  requireRole([Role.ADMIN, Role.SUPER_ADMIN]), 
  async (req, res) => {
    // Handler code
  }
);
```

### requirePermission(requiredPermissions: Permission[])
Restricts access to routes based on user permissions. Automatically checks if the user's role has the required permission(s).

**Example**:
```typescript
router.post('/admin/agents/reload',
  requirePermission([Permission.MANAGE_FEATURE_FLAGS]),
  async (req, res) => {
    // Handler code
  }
);
```

## Seeding

### Permission Seeding
Run the permission seeding script to populate the `RolePermission` table with the default role-permission mappings:

```bash
npm run prisma:seed
```

Or run the standalone permission seeding script:

```bash
npx ts-node prisma/seedPermissions.ts
```

### Seed Script Details
The seed script (`prisma/seed.ts`) automatically:
1. Seeds role-permission mappings
2. Seeds initial agent rules

The standalone permission seeding script (`prisma/seedPermissions.ts`) only seeds role-permission mappings.

## Migration

The RBAC feature was added via migration `20260215100900_add_rbac_models` which:
1. Adds `SUPPORT` and `SUPER_ADMIN` to the `Role` enum
2. Creates the `Permission` enum
3. Creates the `RolePermission` table with appropriate indexes

To apply the migration:
```bash
npx prisma migrate deploy
```

## Usage Examples

### Protecting Routes by Role

```typescript
import { requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

// Only ADMIN and SUPER_ADMIN can access
router.get('/admin/users', 
  requireRole([Role.ADMIN, Role.SUPER_ADMIN]),
  async (req, res) => {
    // Handler code
  }
);
```

### Protecting Routes by Permission

```typescript
import { requirePermission } from '../middleware/auth';
import { Permission } from '@prisma/client';

// Only users with MANAGE_USERS permission can access
router.post('/admin/users',
  requirePermission([Permission.MANAGE_USERS]),
  async (req, res) => {
    // Handler code
  }
);

// Requires multiple permissions (user must have ALL of them)
router.post('/admin/critical-action',
  requirePermission([
    Permission.MANAGE_FEATURE_FLAGS,
    Permission.MANAGE_OAUTH
  ]),
  async (req, res) => {
    // Handler code
  }
);
```

### Checking Permissions in Code

```typescript
import { PrismaClient, Role, Permission } from '@prisma/client';

const prisma = new PrismaClient();

async function userHasPermission(
  userRole: Role, 
  permission: Permission
): Promise<boolean> {
  const rolePermission = await prisma.rolePermission.findUnique({
    where: {
      role_permission: {
        role: userRole,
        permission: permission
      }
    }
  });
  
  return rolePermission !== null;
}
```

## Admin Route Permissions

The following table shows which permissions are required for each admin route:

| Route | Method | Permission/Role | Description |
|-------|--------|----------------|-------------|
| `/admin/agents` | GET | ADMIN, SUPER_ADMIN | List all agents |
| `/admin/agents/reload` | POST | MANAGE_FEATURE_FLAGS | Reload agent configurations |
| `/admin/rules/:agentName` | GET | ADMIN, SUPER_ADMIN | Get agent rules |
| `/admin/rules/:agentName` | PUT | MANAGE_FEATURE_FLAGS | Update agent rules |
| `/admin/rules/:agentName/clear-cache` | POST | MANAGE_FEATURE_FLAGS | Clear agent cache |
| `/admin/policies` | GET | ADMIN, SUPER_ADMIN | List policies |
| `/admin/policies` | POST | MANAGE_PLANS | Create policy |
| `/admin/policies/:policyId` | PUT | MANAGE_PLANS | Update policy |
| `/admin/policies/:policyId` | DELETE | MANAGE_PLANS | Delete policy |
| `/admin/api-keys` | GET | ADMIN, SUPER_ADMIN | List API keys |
| `/admin/api-keys` | POST | MANAGE_USERS | Create API key |
| `/admin/api-keys/:keyId` | PUT | MANAGE_USERS | Update API key |
| `/admin/api-keys/:keyId` | DELETE | MANAGE_USERS | Delete API key |
| `/admin/usage` | GET | VIEW_LOGS | View usage statistics |

## Security Considerations

1. **Server-Side Enforcement**: All permission checks are performed server-side. Frontend restrictions are for UX only and should not be relied upon for security.

2. **JWT Tokens**: User roles are encoded in JWT tokens and verified on each request.

3. **Database Consistency**: The `RolePermission` table is the single source of truth for role-permission mappings.

4. **Audit Trail**: Consider logging permission checks and role changes for security auditing (future enhancement).

5. **Least Privilege**: Users should be assigned the minimum role necessary for their job function.

## Testing

To test the RBAC system:

1. Create test users with different roles
2. Generate JWT tokens for each user
3. Make API requests to protected endpoints
4. Verify that access is granted/denied appropriately

Example test scenarios:
- USER should not be able to access any admin endpoints
- SUPPORT should be able to view logs but not modify system settings
- ADMIN should be able to manage users and plans but not feature flags
- SUPER_ADMIN should have access to all endpoints

## Future Enhancements

1. **Dynamic Permission Management**: API endpoints to create custom permissions
2. **Role Hierarchy**: Implement role inheritance (e.g., SUPER_ADMIN inherits ADMIN permissions)
3. **Permission Groups**: Group related permissions for easier management
4. **Audit Logging**: Log all permission checks and role changes
5. **Time-Based Permissions**: Temporary permission grants with expiration
6. **Resource-Level Permissions**: Permissions tied to specific resources (e.g., manage only certain organizations)
