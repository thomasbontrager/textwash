# User Management API Documentation

This document describes the User Management endpoints for administrators.

## Authentication

All user management endpoints require:
- Valid JWT token in `Authorization: Bearer <token>` header
- Admin role (ROLE = 'ADMIN')
- MANAGE_USERS permission

## Endpoints

### 1. List Users (with Pagination, Search, and Filters)

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Results per page
- `search` (optional) - Search by email (case-insensitive partial match)
- `plan` (optional) - Filter by subscription plan (FREE, STARTER, PRO, ENTERPRISE)
- `role` (optional) - Filter by user role (USER, ADMIN)
- `status` (optional) - Filter by user status (ACTIVE, SUSPENDED, DELETED)

**Example Request:**
```bash
curl -X GET 'http://localhost:3000/api/admin/users?page=1&limit=20&search=john&plan=PRO&status=ACTIVE' \
  -H 'Authorization: Bearer <admin-token>'
```

**Example Response:**
```json
{
  "users": [
    {
      "id": "clxyz123",
      "email": "john@example.com",
      "role": "USER",
      "status": "ACTIVE",
      "subscription": {
        "plan": "PRO",
        "status": "ACTIVE",
        "trialEndsAt": null,
        "currentPeriodEnd": "2024-12-31T23:59:59.000Z"
      },
      "organization": {
        "id": "org-123",
        "name": "Example Corp"
      },
      "loginCount": 45,
      "apiKeyCount": 2,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-02-01T14:20:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### 2. Get User Details

**Endpoint:** `GET /api/admin/users/:userId`

**Path Parameters:**
- `userId` (required) - User ID

**Example Request:**
```bash
curl -X GET 'http://localhost:3000/api/admin/users/clxyz123' \
  -H 'Authorization: Bearer <admin-token>'
```

**Example Response:**
```json
{
  "user": {
    "id": "clxyz123",
    "email": "john@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "stripeId": "cus_abc123",
    "deletedAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-02-01T14:20:00.000Z",
    "subscription": {
      "id": "sub-123",
      "plan": "PRO",
      "status": "ACTIVE",
      "stripeSubscriptionId": "sub_abc123",
      "trialEndsAt": null,
      "currentPeriodStart": "2024-01-01T00:00:00.000Z",
      "currentPeriodEnd": "2024-12-31T23:59:59.000Z"
    },
    "organization": {
      "id": "org-123",
      "name": "Example Corp"
    },
    "apiKeys": [
      {
        "id": "key-1",
        "name": "Production API Key",
        "enabled": true,
        "rateLimit": 1000,
        "lastUsedAt": "2024-02-15T08:45:00.000Z",
        "createdAt": "2024-01-20T12:00:00.000Z"
      }
    ],
    "loginLogs": [
      {
        "id": "log-1",
        "userId": "clxyz123",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "success": true,
        "timestamp": "2024-02-15T09:00:00.000Z"
      }
    ],
    "agentExecutions": [
      {
        "id": "exec-1",
        "agentName": "ProfanityTransformer",
        "timestamp": "2024-02-15T08:50:00.000Z",
        "duration": 120
      }
    ],
    "_count": {
      "apiKeys": 2,
      "loginLogs": 45,
      "agentExecutions": 230
    }
  },
  "usage": {
    "stats": [
      {
        "endpoint": "/api/v1/clean",
        "timestamp": "2024-02-15T08:45:00.000Z"
      }
    ],
    "totalRequests": 230
  }
}
```

---

### 3. Suspend/Activate User

**Endpoint:** `PUT /api/admin/users/:userId/suspend`

**Path Parameters:**
- `userId` (required) - User ID

**Request Body:**
```json
{
  "suspended": true
}
```

**Example Request (Suspend):**
```bash
curl -X PUT 'http://localhost:3000/api/admin/users/clxyz123/suspend' \
  -H 'Authorization: Bearer <admin-token>' \
  -H 'Content-Type: application/json' \
  -d '{"suspended": true}'
```

**Example Request (Activate):**
```bash
curl -X PUT 'http://localhost:3000/api/admin/users/clxyz123/suspend' \
  -H 'Authorization: Bearer <admin-token>' \
  -H 'Content-Type: application/json' \
  -d '{"suspended": false}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "User suspended successfully"
}
```

**Notes:**
- Suspended users cannot log in
- Admins cannot suspend themselves
- Suspended users' status is set to 'SUSPENDED'

---

### 4. Reset User Password

**Endpoint:** `POST /api/admin/users/:userId/reset-password`

**Path Parameters:**
- `userId` (required) - User ID

**Request Body:**
```json
{
  "newPassword": "newSecurePassword123"
}
```

**Example Request:**
```bash
curl -X POST 'http://localhost:3000/api/admin/users/clxyz123/reset-password' \
  -H 'Authorization: Bearer <admin-token>' \
  -H 'Content-Type: application/json' \
  -d '{"newPassword": "newSecurePassword123"}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Notes:**
- Password must be at least 8 characters
- Password is hashed with bcrypt (12 rounds)

---

### 5. Assign Plan to User

**Endpoint:** `PUT /api/admin/users/:userId/plan`

**Path Parameters:**
- `userId` (required) - User ID

**Request Body:**
```json
{
  "plan": "PRO"
}
```

**Valid Plans:**
- `FREE`
- `STARTER`
- `PRO`
- `ENTERPRISE`

**Example Request:**
```bash
curl -X PUT 'http://localhost:3000/api/admin/users/clxyz123/plan' \
  -H 'Authorization: Bearer <admin-token>' \
  -H 'Content-Type: application/json' \
  -d '{"plan": "PRO"}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Plan updated to PRO successfully"
}
```

**Notes:**
- Creates a new subscription if user doesn't have one
- Updates existing subscription if user already has one
- Sets subscription status to 'ACTIVE'

---

### 6. Soft Delete User

**Endpoint:** `DELETE /api/admin/users/:userId`

**Path Parameters:**
- `userId` (required) - User ID

**Example Request:**
```bash
curl -X DELETE 'http://localhost:3000/api/admin/users/clxyz123' \
  -H 'Authorization: Bearer <admin-token>'
```

**Example Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Notes:**
- This is a soft delete (sets `deletedAt` timestamp)
- User status is set to 'DELETED'
- User cannot log in after deletion
- Admins cannot delete themselves
- User data is preserved in database for audit purposes

---

## Login Tracking

All login attempts (successful and failed) are tracked in the `LoginLog` table with:
- User ID
- IP address
- User agent
- Success status
- Timestamp

Login logs can be viewed in the user details endpoint.

---

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

**Example Error Response:**
```json
{
  "error": "Insufficient permissions",
  "required": "MANAGE_USERS"
}
```

---

## Security Considerations

1. **Permission Checks**: All mutations (suspend, reset password, assign plan, delete) require MANAGE_USERS permission
2. **Self-Protection**: Admins cannot suspend or delete themselves
3. **Password Security**: Passwords are hashed with bcrypt (12 rounds)
4. **Soft Delete**: User data is preserved for audit purposes
5. **Login Tracking**: All login attempts are logged with IP and user agent
6. **Status Checks**: Suspended and deleted users cannot log in

---

## Integration Examples

### Node.js / JavaScript

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'your-admin-jwt-token';

async function listUsers(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await axios.get(`${API_URL}/api/admin/users?${params}`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  });
  return response.data;
}

async function suspendUser(userId) {
  const response = await axios.put(
    `${API_URL}/api/admin/users/${userId}/suspend`,
    { suspended: true },
    {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

// Usage
listUsers({ plan: 'PRO', status: 'ACTIVE', page: 1, limit: 20 })
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

### Python

```python
import requests

API_URL = 'http://localhost:3000'
ADMIN_TOKEN = 'your-admin-jwt-token'

def list_users(filters=None):
    headers = {'Authorization': f'Bearer {ADMIN_TOKEN}'}
    response = requests.get(f'{API_URL}/api/admin/users', 
                          params=filters, 
                          headers=headers)
    return response.json()

def suspend_user(user_id):
    headers = {
        'Authorization': f'Bearer {ADMIN_TOKEN}',
        'Content-Type': 'application/json'
    }
    data = {'suspended': True}
    response = requests.put(f'{API_URL}/api/admin/users/{user_id}/suspend',
                          json=data,
                          headers=headers)
    return response.json()

# Usage
users = list_users({'plan': 'PRO', 'status': 'ACTIVE'})
print(users)
```

---

## Testing

Run the test suite:

```bash
cd backend
npm test
```

Test coverage includes:
- Pagination, search, and filtering
- Permission checks on all mutations
- Soft delete functionality
- Login log tracking
- Self-protection (admins can't suspend/delete themselves)
- Password validation
- Plan assignment

---

## Changelog

### v1.0.0 (2024-02-15)
- Initial release of User Management system
- Added user listing with pagination, search, and filters
- Added user details endpoint with subscription, usage, and login history
- Added suspend/activate user functionality
- Added password reset functionality
- Added plan assignment functionality
- Added soft delete functionality
- Added login tracking with IP and user agent
- Added comprehensive test suite
- Added permission-based access control
