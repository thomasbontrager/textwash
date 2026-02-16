# User Management Quick Reference

## Quick Start

```bash
# Run migrations (when database is available)
cd backend
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Build
npm run build

# Run tests
npm test

# Start server
npm run dev
```

## API Endpoints

### List Users
```bash
GET /api/admin/users?page=1&limit=20&search=email&plan=PRO&status=ACTIVE
```

### Get User Details
```bash
GET /api/admin/users/:userId
```

### Suspend User
```bash
PUT /api/admin/users/:userId/suspend
Body: { "suspended": true }
```

### Reset Password
```bash
POST /api/admin/users/:userId/reset-password
Body: { "newPassword": "newpass123" }
```

### Assign Plan
```bash
PUT /api/admin/users/:userId/plan
Body: { "plan": "PRO" }
```

### Delete User (Soft)
```bash
DELETE /api/admin/users/:userId
```

## Required Headers

All endpoints require:
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

## Test with cURL

```bash
# Set your admin token
TOKEN="your-admin-jwt-token"

# List users
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/users

# Get user details
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/users/USER_ID

# Suspend user
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"suspended":true}' \
  http://localhost:3000/api/admin/users/USER_ID/suspend
```

## Database Schema

```prisma
enum UserStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

model User {
  status        UserStatus    @default(ACTIVE)
  deletedAt     DateTime?
  loginLogs     LoginLog[]
}

model LoginLog {
  userId      String
  ipAddress   String?
  userAgent   String?
  success     Boolean  @default(true)
  timestamp   DateTime @default(now())
}
```

## Permission System

```typescript
import { Permission } from './middleware/auth';

// In routes
router.use(requirePermission(Permission.MANAGE_USERS));
```

## Security Checklist

- ✅ All mutations check MANAGE_USERS permission
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ Admins can't suspend/delete themselves
- ✅ Suspended users can't log in
- ✅ Deleted users can't log in
- ✅ Soft delete preserves audit trail
- ✅ Login attempts tracked with IP/user agent

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test users.test.ts

# Run with coverage
npm test -- --coverage
```

## Troubleshooting

**Issue:** "No token provided"
**Solution:** Include `Authorization: Bearer <token>` header

**Issue:** "Insufficient permissions"
**Solution:** Ensure user has ADMIN role

**Issue:** "Cannot suspend your own account"
**Solution:** Cannot perform this action on yourself

**Issue:** "Account is suspended"
**Solution:** User status is SUSPENDED, activate first

## Documentation

- Full API docs: `backend/USER_MANAGEMENT_API.md`
- Implementation details: `USER_MANAGEMENT_SUMMARY.md`
- Project README: `README.md`

## Support

For issues or questions, see the comprehensive documentation files listed above.
