# Auth System Quick Start

## Overview

TextWash now includes a production-ready authentication system with enterprise-grade security features.

## Features

✅ **Email/Password Authentication** - Secure registration and login
✅ **bcrypt Password Hashing** - Industry-standard encryption (12 rounds)
✅ **JWT Tokens** - Stateless authentication with 30-day expiry
✅ **HTTP-Only Cookies** - XSS-safe token storage
✅ **Session Tracking** - Database-backed session management
✅ **Password Reset Flow** - Secure token-based recovery
✅ **Zod Validation** - Type-safe input validation
✅ **Rate Limiting** - Brute-force protection
✅ **CSRF Protection** - Multi-layered attack prevention
✅ **Protected Routes** - Easy-to-use middleware

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Environment Variables

Create `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/textwash
JWT_SECRET=your-super-secret-key-min-32-characters-long
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001
```

### 3. Run Database Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start the Server

```bash
npm run dev
```

Server runs on http://localhost:3000

## API Endpoints

### Authentication

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/api/auth/signup` | Create account | 5/15min |
| POST | `/api/auth/login` | Login | 5/15min |
| POST | `/api/auth/logout` | Logout | - |
| GET | `/api/auth/me` | Get current user | - |
| GET | `/api/auth/sessions` | List sessions | - |

### Password Management

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/api/auth/password-reset/request` | Request reset | 3/hour |
| POST | `/api/auth/password-reset/confirm` | Reset password | - |
| POST | `/api/auth/change-password` | Change password | - |

## Usage Examples

### Signup

```javascript
const response = await fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies!
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123'
  })
});

const data = await response.json();
console.log('Token:', data.token);
console.log('User:', data.user);
```

### Login

```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123'
  })
});

const data = await response.json();
```

### Protected Request (with cookie)

```javascript
const response = await fetch('http://localhost:3000/api/auth/me', {
  credentials: 'include' // Sends cookie automatically
});

const user = await response.json();
```

### Protected Request (with header)

```javascript
const token = 'your-jwt-token';
const response = await fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const user = await response.json();
```

### Logout

```javascript
await fetch('http://localhost:3000/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
});
```

## Protecting Routes

### Basic Protection

```typescript
import { authenticateToken } from './middleware/auth';

router.get('/protected', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  // Your logic here
});
```

### Admin Only

```typescript
import { authenticateToken, requireAdmin } from './middleware/auth';

router.post('/admin', authenticateToken, requireAdmin, async (req, res) => {
  // Only admins can access
});
```

### Plan-Based Access

```typescript
import { authenticateToken, requirePlan } from './middleware/auth';

router.post('/pro-feature', 
  authenticateToken, 
  requirePlan(['PRO', 'ENTERPRISE']), 
  async (req, res) => {
    // Only PRO or ENTERPRISE users
  }
);
```

### Combined Protection

```typescript
import { protectedRoute } from './middleware/auth';

// Require auth + admin + specific plans
router.get('/endpoint', 
  ...protectedRoute(true, 'ADMIN', ['ENTERPRISE']), 
  handler
);
```

## Password Requirements

Passwords must meet these criteria:
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

Example valid passwords:
- `SecurePass123`
- `MyP@ssw0rd!`
- `Testing123ABC`

## Security Features

### CSRF Protection

The system implements multiple layers of CSRF protection:

1. **SameSite=lax cookies** - Prevents cross-site cookie usage
2. **Origin validation** - Checks request origin
3. **Bearer token support** - Alternative to cookies

**Note:** When using cookies, always include `credentials: 'include'` in fetch requests.

### Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Auth endpoints | 5 requests | 15 minutes |
| Password reset | 3 requests | 1 hour |
| Global | 100 requests | 15 minutes |

### Session Management

- Sessions expire after 30 days
- Tracked with IP address and user agent
- Can be listed and managed per user
- Automatically cleaned up when expired
- All sessions invalidated on password change

## Testing

### Manual Testing

```bash
# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Test protected endpoint
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Run Test Script

```bash
chmod +x /tmp/auth-test/test-auth.sh
/tmp/auth-test/test-auth.sh
```

## Troubleshooting

### Cookies Not Working

1. Check `credentials: 'include'` is set on client
2. Verify CORS allows credentials
3. Ensure frontend URL in allowed origins
4. Use `http://localhost:3001` (not `127.0.0.1`)

### Token Expired

- Tokens expire after 30 days
- User must login again
- Check server time is correct

### Validation Errors

Response includes detailed error information:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

## Documentation

- **[AUTH_SYSTEM.md](./AUTH_SYSTEM.md)** - Complete auth system documentation
- **[SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md)** - Security analysis and recommendations
- **[API_EXAMPLES.md](./API_EXAMPLES.md)** - More API usage examples

## Production Checklist

Before deploying to production:

- [ ] Set strong `JWT_SECRET` (32+ random characters)
- [ ] Configure production database
- [ ] Enable HTTPS for secure cookies
- [ ] Set `NODE_ENV=production`
- [ ] Configure email service for password resets
- [ ] Set up monitoring for failed login attempts
- [ ] Review rate limiting settings
- [ ] Update allowed origins list
- [ ] Test all auth flows
- [ ] Run security audit

## Support

For questions or issues:
1. Check the documentation
2. Review code examples
3. Check server logs
4. Verify environment variables

## License

© 2026 TextWash
