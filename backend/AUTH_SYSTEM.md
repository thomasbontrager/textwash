# Authentication System Documentation

## Overview

TextWash implements a production-ready authentication system with the following features:

- **Email/Password Authentication**: Secure user registration and login
- **bcrypt Password Hashing**: Industry-standard password encryption with 12 salt rounds
- **JWT Authentication**: Stateless authentication with 30-day token expiry
- **HTTP-Only Cookies**: Secure token storage preventing XSS attacks
- **Session Tracking**: Database-backed session management
- **Password Reset Flow**: Secure token-based password recovery
- **Zod Validation**: Robust input validation with detailed error messages
- **Rate Limiting**: Protection against brute-force attacks
- **Protected Routes**: Middleware for securing endpoints
- **Proper Error Handling**: Consistent error responses

## Architecture

### Directory Structure

```
backend/src/
├── lib/auth/
│   ├── tokens.ts          # JWT token generation and verification
│   ├── cookies.ts         # HTTP-only cookie management
│   ├── validation.ts      # Zod validation schemas
│   └── index.ts          # Public exports
├── middleware/
│   ├── auth.ts           # Authentication middleware
│   ├── validation.ts     # Request validation middleware
│   └── rateLimit.ts      # Rate limiting configuration
├── services/
│   └── authService.ts    # Authentication business logic
└── routes/
    └── auth.ts           # Authentication API endpoints
```

### Database Models

#### User
```prisma
model User {
  id                   String   @id @default(cuid())
  email                String   @unique
  passwordHash         String
  role                 Role     @default(USER)
  sessions             Session[]
  passwordResetTokens  PasswordResetToken[]
  // ... other fields
}
```

#### Session
```prisma
model Session {
  id              String   @id @default(cuid())
  userId          String
  token           String   @unique
  expiresAt       DateTime
  userAgent       String?
  ipAddress       String?
  createdAt       DateTime @default(now())
  lastActivityAt  DateTime @default(now())
}
```

#### PasswordResetToken
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

## API Endpoints

### POST /api/auth/signup

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Password Requirements:**
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response (201):**
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "role": "USER",
    "subscription": {
      "plan": "FREE",
      "status": "ACTIVE"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Rate Limit:** 5 requests per 15 minutes

**Cookie Set:** `auth_token` (HTTP-only, secure in production)

### POST /api/auth/login

Authenticate an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "role": "USER",
    "subscription": { ... }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Rate Limit:** 5 requests per 15 minutes (only counts failed attempts)

**Cookie Set:** `auth_token` (HTTP-only, secure in production)

### POST /api/auth/logout

Logout the current user and invalidate session.

**Headers:**
```
Authorization: Bearer <token>
```
or use `auth_token` cookie

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Cookie Cleared:** `auth_token`

### GET /api/auth/me

Get the current authenticated user's information.

**Headers:**
```
Authorization: Bearer <token>
```
or use `auth_token` cookie

**Response (200):**
```json
{
  "id": "clx...",
  "email": "user@example.com",
  "role": "USER",
  "subscription": {
    "id": "clx...",
    "plan": "FREE",
    "status": "ACTIVE"
  }
}
```

### POST /api/auth/password-reset/request

Request a password reset token.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If the email exists, a reset link will be sent",
  "token": "abc123..." // Only in development mode
}
```

**Rate Limit:** 3 requests per hour

**Security Note:** Always returns success to prevent email enumeration.

### POST /api/auth/password-reset/confirm

Reset password using a valid token.

**Request:**
```json
{
  "token": "abc123...",
  "newPassword": "NewSecurePass456"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Security Note:** All user sessions are invalidated after password reset.

### POST /api/auth/change-password

Change password for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "currentPassword": "OldSecurePass123",
  "newPassword": "NewSecurePass456"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully. Please login again."
}
```

**Security Note:** All user sessions are invalidated after password change.

### GET /api/auth/sessions

Get all active sessions for the current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "clx...",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastActivityAt": "2024-01-01T01:00:00.000Z"
    }
  ]
}
```

## Middleware

### authenticateToken

Validates JWT tokens from either Authorization header or HTTP-only cookie.

**Usage:**
```typescript
import { authenticateToken } from './middleware/auth';

router.get('/protected', authenticateToken, async (req: AuthRequest, res) => {
  // req.user is available here
  const userId = req.user!.id;
  // ...
});
```

**Features:**
- Accepts tokens from `Authorization: Bearer <token>` header
- Accepts tokens from `auth_token` HTTP-only cookie
- Validates session in database
- Updates last activity timestamp
- Attaches user info to `req.user`

### requireAdmin

Requires the user to have ADMIN role.

**Usage:**
```typescript
import { authenticateToken, requireAdmin } from './middleware/auth';

router.post('/admin-only', authenticateToken, requireAdmin, async (req, res) => {
  // Only admins can access this
});
```

### requirePlan

Requires the user to have a specific subscription plan.

**Usage:**
```typescript
import { authenticateToken, requirePlan } from './middleware/auth';

router.post('/pro-feature', 
  authenticateToken, 
  requirePlan(['PRO', 'ENTERPRISE']), 
  async (req, res) => {
    // Only PRO or ENTERPRISE users can access
  }
);
```

### protectedRoute

Combines multiple auth checks in one middleware array.

**Usage:**
```typescript
import { protectedRoute } from './middleware/auth';

// Require auth only
router.get('/profile', ...protectedRoute(true), handler);

// Require admin role
router.get('/admin', ...protectedRoute(true, 'ADMIN'), handler);

// Require specific plans
router.post('/api/pro', ...protectedRoute(true, undefined, ['PRO', 'ENTERPRISE']), handler);
```

### validateRequest

Validates request body using Zod schemas.

**Usage:**
```typescript
import { validateRequest } from './middleware/validation';
import { signupSchema } from './lib/auth/validation';

router.post('/signup', validateRequest(signupSchema), async (req, res) => {
  // req.body is validated and typed
});
```

## Security Features

### Password Security
- **bcrypt hashing** with 12 salt rounds
- **Strong password requirements** enforced via Zod
- **Passwords never logged** or returned in responses

### Token Security
- **JWT with HMAC-SHA256** signing
- **30-day expiration** on tokens
- **HTTP-only cookies** prevent XSS attacks
- **Secure flag** in production (HTTPS only)
- **SameSite: lax** prevents CSRF attacks
- **Origin validation** for cookie-based requests (additional CSRF protection)

### Session Security
- **Database-backed sessions** can be invalidated
- **Session tracking** with IP and user agent
- **Automatic cleanup** of expired sessions
- **Last activity tracking** for monitoring

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/signup | 5 | 15 minutes |
| /auth/login | 5 | 15 minutes |
| /auth/password-reset/request | 3 | 1 hour |
| Global (all endpoints) | 100 | 15 minutes |

### Error Handling
- **Consistent error format** across all endpoints
- **Validation errors** with field-level details
- **Generic messages** to prevent information leakage
- **Proper HTTP status codes**

### CSRF Protection
The system implements multiple layers of CSRF protection:

1. **SameSite=lax cookies**: Prevents cookies from being sent in cross-site POST requests
2. **Origin header validation**: Validates the Origin/Referer header on state-changing requests
3. **Bearer token support**: API clients can use Authorization headers instead of cookies

**Note:** The CSRF middleware automatically exempts:
- GET, HEAD, OPTIONS requests (safe methods)
- Requests using `Authorization: Bearer <token>` header
- Requests with no origin (development/testing)

For production deployments using cookies, ensure your frontend's origin is included in the `ALLOWED_ORIGINS` list or matches your `BASE_DOMAIN`.

## Environment Variables

Required in `.env`:

```env
# JWT Secret (minimum 32 characters)
JWT_SECRET=your-super-secret-key-min-32-characters-long

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/textwash

# Node environment
NODE_ENV=development # or production

# CORS
FRONTEND_URL=http://localhost:3001
```

## Usage Examples

### Client-Side (JavaScript)

#### Signup
```javascript
const response = await fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123'
  })
});

const data = await response.json();
// Store token if not using cookies
localStorage.setItem('token', data.token);
```

#### Login
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

#### Protected Request (with cookie)
```javascript
const response = await fetch('http://localhost:3000/api/auth/me', {
  credentials: 'include' // Sends cookie automatically
});

const user = await response.json();
```

#### Protected Request (with header)
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const user = await response.json();
```

#### Logout
```javascript
await fetch('http://localhost:3000/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
});
localStorage.removeItem('token');
```

### Server-Side (Node.js)

#### Using the AuthService
```typescript
import { authService } from './services/authService';

// Signup
const result = await authService.signup(
  { email: 'user@example.com', password: 'SecurePass123' },
  { userAgent: req.headers['user-agent'], ipAddress: req.ip }
);

if (result.success) {
  console.log('User created:', result.user);
  // Use result.token
}

// Login
const loginResult = await authService.login(
  { email: 'user@example.com', password: 'SecurePass123' },
  { userAgent: req.headers['user-agent'], ipAddress: req.ip }
);

// Logout
await authService.logout(userId, sessionId);

// Password reset
const resetResult = await authService.requestPasswordReset({
  email: 'user@example.com'
});
```

## Testing

### Manual Testing

Run the test script:
```bash
chmod +x /tmp/auth-test/test-auth.sh
/tmp/auth-test/test-auth.sh
```

### Integration Testing

```typescript
import { authService } from './services/authService';

describe('Auth System', () => {
  it('should signup a new user', async () => {
    const result = await authService.signup({
      email: 'test@example.com',
      password: 'TestPass123'
    });
    
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
  });
  
  it('should reject weak passwords', async () => {
    const result = await authService.signup({
      email: 'test@example.com',
      password: 'weak'
    });
    
    expect(result.success).toBe(false);
  });
});
```

## Troubleshooting

### Cookies Not Working
1. Ensure `credentials: 'include'` is set on client requests
2. Check CORS configuration allows credentials
3. Verify frontend URL is in `allowedOrigins` list
4. In development, ensure using `http://localhost:3001` (not `127.0.0.1`)

### Session Not Found
1. Check database migrations have been run
2. Verify `SESSION_TABLE` exists in database
3. Ensure JWT contains `sessionId` field

### Rate Limiting Too Strict
1. Adjust limits in `src/middleware/rateLimit.ts`
2. Use `skipSuccessfulRequests: true` for login attempts
3. Consider IP-based rate limiting for production

### Token Expired
- Tokens expire after 30 days
- User must login again to get new token
- Sessions in database also expire after 30 days

## Migration Guide

### From Old Auth System

If upgrading from a previous auth implementation:

1. **Run database migration:**
   ```bash
   cd backend
   npm run prisma:migrate
   ```

2. **Update client code** to handle cookies:
   ```javascript
   // Add credentials: 'include' to all auth requests
   fetch(url, { credentials: 'include', ... })
   ```

3. **Update CORS configuration** in server.ts:
   ```typescript
   cors({
     origin: [...],
     credentials: true // Important!
   })
   ```

4. **Test all auth flows** before deploying

## Best Practices

1. **Always use HTTPS in production** for secure cookies
2. **Rotate JWT_SECRET regularly** (requires user re-login)
3. **Monitor failed login attempts** for security threats
4. **Set up email service** for password reset in production
5. **Log authentication events** for audit trails
6. **Implement account lockout** after multiple failed attempts
7. **Use secure session management** on client side
8. **Invalidate sessions on security events** (password change, etc.)

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] OAuth providers (Google, GitHub)
- [ ] Magic link authentication
- [ ] Email verification on signup
- [ ] Account lockout after failed attempts
- [ ] IP-based geolocation for suspicious logins
- [ ] Device management (revoke specific sessions)
- [ ] Security event notifications
- [ ] Refresh token rotation
- [ ] WebAuthn/Passkey support

## Support

For issues or questions:
1. Check this documentation first
2. Review code examples in `/backend/src/routes/auth.ts`
3. Check logs for error details
4. Ensure environment variables are set correctly
