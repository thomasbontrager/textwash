# Prisma Schema Documentation - SaaS Platform

## Overview
This Prisma schema defines a complete database structure for a SaaS platform with user management, role-based access control, subscriptions, logging, and webhook handling.

## Database Provider
- **PostgreSQL** - Production-ready relational database

## Enums

### RoleType
Defines the hierarchy of user roles:
- `SUPER_ADMIN` - Highest level access
- `ADMIN` - Administrative access
- `MANAGER` - Management level access
- `USER` - Standard user access
- `GUEST` - Limited guest access

### SubscriptionStatus
Tracks subscription states:
- `ACTIVE` - Subscription is currently active
- `CANCELED` - Subscription has been canceled
- `PAST_DUE` - Payment is overdue
- `TRIALING` - In trial period
- `PAUSED` - Temporarily paused
- `EXPIRED` - Subscription has expired

### SubscriptionPlan
Available subscription tiers:
- `FREE` - Free tier
- `STARTER` - Entry-level paid tier
- `PRO` - Professional tier
- `ENTERPRISE` - Enterprise tier

## Core Models

### User
Main user model with soft delete support.

**Key Features:**
- Soft delete via `deletedAt` field
- Multiple subscriptions support
- Role-based access through UserRole junction table
- Email uniqueness constraint
- Stripe integration support

**Relations:**
- One-to-many: Subscriptions, API keys, sessions, logs
- Many-to-many: Roles (through UserRole)
- One-to-one: AdminProfile

**Indexes:**
- `email` - Fast user lookup
- `deletedAt` - Soft delete queries
- `organizationId` - Organization filtering

### Role
Defines available roles in the system.

**Key Features:**
- Unique role names
- Role type categorization
- Many-to-many with Users and Permissions

**Relations:**
- Many-to-many: Users (through UserRole)
- Many-to-many: Permissions (through RolePermission)

### Permission
Defines granular permissions for resources and actions.

**Key Features:**
- Unique permission names
- Resource and action combination must be unique
- Cascade delete with roles

**Relations:**
- Many-to-many: Roles (through RolePermission)

**Indexes:**
- `resource` - Fast resource-based queries

### RolePermission
Junction table linking Roles and Permissions.

**Cascade Rules:**
- `onDelete: Cascade` - Deleting a role or permission removes the link

**Indexes:**
- `roleId` - Role-based queries
- `permissionId` - Permission-based queries
- Unique constraint on `[roleId, permissionId]`

### UserRole
Junction table linking Users and Roles.

**Cascade Rules:**
- `onDelete: Cascade` - Deleting a user or role removes the link

**Indexes:**
- `userId` - User-based queries
- `roleId` - Role-based queries
- Unique constraint on `[userId, roleId]`

### Plan
Defines subscription plans with feature limits.

**JSON Fields:**
- `featureLimits` - Stores feature limitations (e.g., `{"apiCalls": 1000, "storage": 5000}`)
- `planAccess` - Stores feature access flags (e.g., `{"analytics": true, "ai": false}`)

**Key Features:**
- Unique plan names
- Stripe price ID integration
- Active/inactive status

**Indexes:**
- `isActive` - Filter active plans
- `name` - Fast plan lookup

### Subscription
Links users to plans with billing information.

**JSON Fields:**
- `userOverrides` - User-specific feature overrides (e.g., `{"apiCalls": 2000}`)

**Key Features:**
- Cascade delete with users
- Stripe subscription tracking
- Trial period support
- Period tracking (start/end dates)

**Indexes:**
- `userId` - User subscription queries
- `planId` - Plan-based queries
- `status` - Status filtering
- `currentPeriodEnd` - Expiration tracking

## Logging & Monitoring Models

### FeatureFlag
Manages feature rollouts and A/B testing.

**Key Features:**
- Gradual rollout percentage (0-100)
- Metadata for additional configuration
- Enable/disable toggle

**Indexes:**
- `isEnabled` - Filter enabled features
- `name` - Fast feature lookup

### AIUsageLog
Tracks AI model usage and costs.

**Key Features:**
- Token usage tracking
- Cost calculation
- Model identification
- Cascade delete with users

**Indexes:**
- `[userId, timestamp]` - User usage history
- `model` - Model-specific queries
- `timestamp` - Time-based queries

### WebhookEvent
Stores webhook events from external services.

**Key Features:**
- Payload stored as JSON
- Retry tracking (attempts, errors)
- Processing status
- Source and event type classification

**Indexes:**
- `[source, eventType]` - Event type queries
- `status` - Filter by processing status
- `createdAt` - Chronological ordering

### EmailTemplate
Manages email templates for the platform.

**JSON Fields:**
- `variables` - Required template variables (e.g., `["userName", "resetLink"]`)

**Key Features:**
- HTML and text versions
- Active/inactive status
- Unique template names

**Indexes:**
- `name` - Template lookup
- `isActive` - Filter active templates

### LoginLog
Tracks user login attempts.

**Key Features:**
- Success/failure tracking
- IP address and user agent logging
- Failure reason capture
- Cascade delete with users

**Indexes:**
- `[userId, timestamp]` - User login history
- `ipAddress` - IP-based queries
- `timestamp` - Time-based queries

### APILog
Comprehensive API request logging.

**Key Features:**
- Request/response body as JSON
- Response time tracking
- Optional user association (SetNull on delete)
- HTTP method and status code

**Indexes:**
- `[userId, timestamp]` - User activity
- `endpoint` - Endpoint-specific queries
- `statusCode` - Error tracking
- `timestamp` - Time-based queries

### Session
Manages user sessions.

**Key Features:**
- Token-based authentication
- Expiration tracking
- IP and user agent logging
- Cascade delete with users

**Indexes:**
- `userId` - User sessions
- `token` - Token lookup
- `expiresAt` - Expiration queries

## Legacy Models
These models are preserved for backward compatibility:

- **AdminProfile** - Admin-specific configuration
- **Organization** - Multi-tenant organization support
- **AgentRule** - AI agent rule management
- **Policy** - Organization policies
- **ApiKey** - API key management
- **UsageRecord** - API usage tracking
- **AgentExecution** - AI agent execution logs

## Cascade Rules Summary

### Cascade Delete (onDelete: Cascade)
Automatically deletes related records:
- User → Subscriptions, API keys, sessions, logs
- Role → RolePermission
- Permission → RolePermission
- Organization → Policies, API keys
- ApiKey → UsageRecords

### Set Null (onDelete: SetNull)
Nullifies foreign key on deletion:
- User → APILog (optional user reference)

## Migration Instructions

### Generate Prisma Client
```bash
npm run prisma:generate
# or
npx prisma generate
```

### Create Migration
```bash
npm run prisma:migrate
# or
npx prisma migrate dev --name migration_name
```

### Apply Migrations (Production)
```bash
npx prisma migrate deploy
```

### View Database in Prisma Studio
```bash
npm run prisma:studio
# or
npx prisma studio
```

## JSON Field Examples

### Plan.featureLimits
```json
{
  "apiCalls": 10000,
  "storageGB": 50,
  "users": 10,
  "customDomain": true
}
```

### Plan.planAccess
```json
{
  "analytics": true,
  "ai": true,
  "prioritySupport": true,
  "customBranding": false
}
```

### Subscription.userOverrides
```json
{
  "apiCalls": 15000,
  "storageGB": 75,
  "specialFeature": true
}
```

### EmailTemplate.variables
```json
["userName", "resetLink", "expirationTime"]
```

## Best Practices

1. **Soft Deletes**: Use `deletedAt` field on User model for data retention
2. **Indexing**: All timestamp fields are indexed for efficient queries
3. **Cascade Rules**: Properly configured to maintain referential integrity
4. **JSON Validation**: Implement application-level validation for JSON fields
5. **Unique Constraints**: Enforced on critical fields like emails, tokens, and keys
6. **Audit Trail**: Login, API, and AI usage logs provide comprehensive auditing

## Security Considerations

1. **Password Hashing**: Store only hashed passwords (passwordHash field)
2. **Token Security**: Session tokens should be cryptographically secure
3. **API Keys**: Store hashed versions in production
4. **PII Handling**: Be mindful of GDPR with soft deletes and logs
5. **Stripe Data**: Sensitive payment data stored as IDs only, not actual card data
