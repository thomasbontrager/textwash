# API Logging and Metrics System

## Overview

This implementation adds comprehensive API logging and a metrics dashboard system to the TextWash backend. All requests are logged automatically, and aggregated metrics can be accessed through dedicated admin endpoints.

## Features

### 1. Automatic API Logging

The `apiLogger` middleware automatically captures the following data for every API request:

- **Route/Endpoint**: The path that was accessed
- **Method**: HTTP method (GET, POST, PUT, DELETE, etc.)
- **Status Code**: Response status code
- **Response Time**: Time taken to process the request (in milliseconds)
- **User ID**: ID of the authenticated user (if applicable)
- **Timestamp**: When the request was made
- **IP Address**: Client IP address
- **User Agent**: Browser/client information
- **Request Body**: Sanitized request payload (sensitive fields redacted)
- **Response Body**: Sanitized response payload (sensitive fields redacted)

#### Data Sanitization

The logger automatically redacts sensitive fields including:
- `password`
- `passwordHash`
- `apiKey`
- `token`
- `secret`
- `key`

Large response bodies (>10KB) are automatically truncated to prevent database bloat.

### 2. Metrics Dashboard API

All metrics endpoints require:
- Authentication (valid JWT token)
- `VIEW_LOGS` permission

#### Available Endpoints

##### GET `/api/admin/metrics/dashboard`

Returns comprehensive dashboard metrics.

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d` (default: `24h`)

**Response:**
```json
{
  "success": true,
  "timeRange": "24h",
  "metrics": {
    "requestsPerMinute": 12.5,
    "errorRate": 2.3,
    "activeUsers": 45,
    "aiCostPerDay": 15.67,
    "subscriptionCount": {
      "total": 123,
      "byPlan": {
        "FREE": 80,
        "STARTER": 30,
        "PRO": 10,
        "ENTERPRISE": 3
      }
    }
  }
}
```

##### GET `/api/admin/metrics/requests`

Returns request metrics over time.

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d` (default: `24h`)
- `interval`: `minute`, `hour`, `day` (default: `hour`)

**Response:**
```json
{
  "success": true,
  "timeRange": "24h",
  "interval": "hour",
  "metrics": [
    {
      "timestamp": "2026-02-15T12:00:00.000Z",
      "count": 450
    },
    {
      "timestamp": "2026-02-15T13:00:00.000Z",
      "count": 523
    }
  ]
}
```

##### GET `/api/admin/metrics/errors`

Returns error metrics over time.

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d` (default: `24h`)
- `interval`: `minute`, `hour`, `day` (default: `hour`)

**Response:**
```json
{
  "success": true,
  "timeRange": "24h",
  "interval": "hour",
  "metrics": [
    {
      "timestamp": "2026-02-15T12:00:00.000Z",
      "errorCount": 15,
      "totalCount": 450,
      "errorRate": 3.33
    }
  ]
}
```

##### GET `/api/admin/metrics/endpoints/top`

Returns the most frequently accessed endpoints.

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d` (default: `24h`)
- `limit`: number (default: `10`)

**Response:**
```json
{
  "success": true,
  "timeRange": "24h",
  "endpoints": [
    {
      "endpoint": "/api/v1/clean",
      "count": 5432
    },
    {
      "endpoint": "/api/v1/analyze",
      "count": 3210
    }
  ]
}
```

##### GET `/api/admin/metrics/endpoints/slowest`

Returns the slowest endpoints by average response time.

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d` (default: `24h`)
- `limit`: number (default: `10`)

**Response:**
```json
{
  "success": true,
  "timeRange": "24h",
  "endpoints": [
    {
      "endpoint": "/api/v1/rewrite",
      "avgResponseTime": 1250,
      "count": 234
    },
    {
      "endpoint": "/api/v1/clean",
      "avgResponseTime": 450,
      "count": 5432
    }
  ]
}
```

## Database Schema

The system uses the existing `APILog` model in Prisma:

```prisma
model APILog {
  id           String   @id @default(cuid())
  userId       String?
  method       String
  endpoint     String
  statusCode   Int
  responseTime Int      // in milliseconds
  ipAddress    String
  userAgent    String?
  requestBody  Json?
  responseBody Json?
  timestamp    DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, timestamp])
  @@index([endpoint])
  @@index([statusCode])
  @@index([timestamp])
}
```

## Permission System

The metrics endpoints use the RBAC (Role-Based Access Control) system with the `VIEW_LOGS` permission.

By default, the following roles have `VIEW_LOGS` permission:
- **SUPPORT**: Can view logs for troubleshooting
- **ADMIN**: Can view logs and manage most aspects
- **SUPER_ADMIN**: Full access to all permissions

## Integration

The logging middleware is automatically applied to all routes:

```typescript
// In server.ts
import { apiLogger } from './middleware/apiLogger';

// Applied after body parsing, before routes
app.use(apiLogger);
```

The metrics routes are available at:

```typescript
app.use('/api/admin/metrics', requireSubdomain(['admin', 'api', '']), metricsRoutes);
```

## Performance Considerations

1. **Asynchronous Logging**: Logs are written asynchronously using `setImmediate()` to avoid blocking API responses
2. **Response Body Truncation**: Large response bodies are automatically truncated to 10KB
3. **Indexed Queries**: The database schema includes indexes on frequently queried fields
4. **Efficient Aggregations**: Metrics use Prisma's native aggregation functions for optimal performance

## Usage Example

```bash
# Get dashboard metrics for the last 24 hours
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://api.textwash.app/api/admin/metrics/dashboard?timeRange=24h"

# Get hourly request metrics for the last 7 days
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://api.textwash.app/api/admin/metrics/requests?timeRange=7d&interval=hour"

# Get top 20 endpoints
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://api.textwash.app/api/admin/metrics/endpoints/top?limit=20"
```

## Future Enhancements

Potential improvements for future iterations:

1. Real-time metrics streaming via WebSockets
2. Custom metric alerts and notifications
3. Export metrics to external monitoring systems (Datadog, New Relic, etc.)
4. Advanced filtering by user, organization, or custom criteria
5. Visualization dashboard in the admin frontend
6. Log retention policies and archiving
7. Rate limiting analytics
8. Geographic distribution of requests
