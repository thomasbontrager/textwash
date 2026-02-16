# Email Template Manager API Documentation

## Overview
The Email Template Manager provides a complete system for managing transactional email templates with variable substitution, test sending, and admin controls.

## Authentication
All endpoints require authentication with an ADMIN or SUPER_ADMIN role. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. List All Email Templates
Retrieve all email templates in the system.

**Endpoint:** `GET /api/admin/email-templates`

**Response:**
```json
[
  {
    "id": "clx123...",
    "name": "welcome",
    "subject": "Welcome to TextWash, {{name}}!",
    "htmlBody": "<!DOCTYPE html>...",
    "textBody": "Welcome to TextWash...",
    "variables": ["name"],
    "isActive": true,
    "createdAt": "2026-02-15T12:00:00.000Z",
    "updatedAt": "2026-02-15T12:00:00.000Z"
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

---

### 2. Get Single Email Template
Retrieve a specific email template by ID.

**Endpoint:** `GET /api/admin/email-templates/:id`

**Parameters:**
- `id` (path, required) - Template ID

**Response:**
```json
{
  "id": "clx123...",
  "name": "welcome",
  "subject": "Welcome to TextWash, {{name}}!",
  "htmlBody": "<!DOCTYPE html>...",
  "textBody": "Welcome to TextWash...",
  "variables": ["name"],
  "isActive": true,
  "createdAt": "2026-02-15T12:00:00.000Z",
  "updatedAt": "2026-02-15T12:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Template not found
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

---

### 3. Create Email Template
Create a new email template.

**Endpoint:** `POST /api/admin/email-templates`

**Request Body:**
```json
{
  "name": "custom_notification",
  "subject": "Notification for {{name}}",
  "htmlBody": "<html><body><h1>Hello {{name}}</h1><p>Your {{plan}} plan is active.</p></body></html>",
  "textBody": "Hello {{name}}, Your {{plan}} plan is active.",
  "variables": ["name", "plan"],
  "isActive": true
}
```

**Field Descriptions:**
- `name` (string, required) - Unique template identifier (lowercase, underscores)
- `subject` (string, required) - Email subject line with variable placeholders
- `htmlBody` (string, required) - HTML email body with variable placeholders
- `textBody` (string, optional) - Plain text fallback
- `variables` (array of strings, optional) - List of required variables
- `isActive` (boolean, optional, default: true) - Whether template is active

**Response:**
```json
{
  "success": true,
  "message": "Email template created successfully",
  "template": {
    "id": "clx456...",
    "name": "custom_notification",
    "subject": "Notification for {{name}}",
    "htmlBody": "<html>...",
    "textBody": "Hello {{name}}...",
    "variables": ["name", "plan"],
    "isActive": true,
    "createdAt": "2026-02-15T13:00:00.000Z",
    "updatedAt": "2026-02-15T13:00:00.000Z"
  }
}
```

**Status Codes:**
- `201 Created` - Template created successfully
- `400 Bad Request` - Invalid input (missing fields, duplicate name, invalid variables)
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

**Validation Errors:**
- Missing name, subject, or htmlBody: `"Missing required fields: name, subject, and htmlBody are required"`
- Invalid variables format: `"Variables must be an array of strings"`
- Duplicate name: `"An email template with this name already exists"`

---

### 4. Update Email Template
Update an existing email template.

**Endpoint:** `PUT /api/admin/email-templates/:id`

**Parameters:**
- `id` (path, required) - Template ID

**Request Body (all fields optional):**
```json
{
  "name": "custom_notification_v2",
  "subject": "Updated Subject {{name}}",
  "htmlBody": "<html>Updated HTML</html>",
  "textBody": "Updated text",
  "variables": ["name", "plan", "usage"],
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email template updated successfully",
  "template": {
    "id": "clx456...",
    "name": "custom_notification_v2",
    "subject": "Updated Subject {{name}}",
    "htmlBody": "<html>Updated HTML</html>",
    "textBody": "Updated text",
    "variables": ["name", "plan", "usage"],
    "isActive": false,
    "createdAt": "2026-02-15T13:00:00.000Z",
    "updatedAt": "2026-02-15T14:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` - Template updated successfully
- `400 Bad Request` - Invalid input (invalid variables format, duplicate name)
- `404 Not Found` - Template not found
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

---

### 5. Delete Email Template
Delete an email template.

**Endpoint:** `DELETE /api/admin/email-templates/:id`

**Parameters:**
- `id` (path, required) - Template ID

**Response:**
```json
{
  "success": true,
  "message": "Email template deleted successfully"
}
```

**Status Codes:**
- `200 OK` - Template deleted successfully
- `404 Not Found` - Template not found
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

---

### 6. Send Test Email
Send a test email using a template with provided variables.

**Endpoint:** `POST /api/admin/email-templates/:id/test`

**Parameters:**
- `id` (path, required) - Template ID

**Request Body:**
```json
{
  "to": "test@example.com",
  "variables": {
    "name": "John Doe",
    "plan": "Pro",
    "usage": "150 API calls this month"
  }
}
```

**Field Descriptions:**
- `to` (string, required) - Recipient email address
- `variables` (object, required) - Key-value pairs for variable substitution

**Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "<abc123@mail.example.com>",
  "preview": "https://ethereal.email/message/abc123..."
}
```

**Note:** The `preview` field is only included when using Ethereal Email (test mode).

**Status Codes:**
- `200 OK` - Test email sent successfully
- `400 Bad Request` - Invalid input (invalid email, missing variables, template inactive)
- `404 Not Found` - Template not found
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

**Validation Errors:**
- Missing recipient: `"Recipient email address (to) is required"`
- Invalid email format: `"Invalid email address format"`
- Missing required variables: `"Missing required variables: name, plan"`
- Invalid variables format: `"Variables must be an object with key-value pairs"`

---

## Variable Substitution

Templates support variable placeholders in the format `{{variableName}}`. During email sending, these placeholders are replaced with actual values.

### Syntax
```
Subject: Welcome {{name}} to {{product}}!
Body: Hello {{name}}, your {{plan}} subscription is active.
```

### Supported Locations
Variables can be used in:
- Email subject
- HTML body
- Text body

### Example
**Template:**
```html
<h1>Hello {{name}}</h1>
<p>Your {{plan}} plan includes {{usage}}.</p>
```

**Variables:**
```json
{
  "name": "Alice",
  "plan": "Pro",
  "usage": "10,000 API calls/month"
}
```

**Result:**
```html
<h1>Hello Alice</h1>
<p>Your Pro plan includes 10,000 API calls/month.</p>
```

---

## Default Templates

The system includes 4 pre-seeded templates:

### 1. Welcome Email
- **Name:** `welcome`
- **Variables:** `name`
- **Use Case:** Sent after user registration
- **Features:** Onboarding information, call-to-action

### 2. Password Reset
- **Name:** `password_reset`
- **Variables:** `name`, `resetUrl`
- **Use Case:** Password recovery requests
- **Features:** Secure reset link, expiration notice

### 3. Upgrade Confirmation
- **Name:** `upgrade_confirmation`
- **Variables:** `name`, `plan`, `usage`
- **Use Case:** Subscription tier changes
- **Features:** Plan details, usage statistics

### 4. Cancellation Notice
- **Name:** `cancellation`
- **Variables:** `name`, `plan`
- **Use Case:** Subscription cancellations
- **Features:** End date, data retention notice

---

## Integration Guide

### Programmatic Email Sending

```typescript
import { sendTemplateEmail } from './services/emailService';

// Send welcome email
const result = await sendTemplateEmail(
  'welcome',
  'user@example.com',
  { name: 'Alice' }
);

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

### Error Handling

```typescript
const result = await sendTemplateEmail('welcome', email, { name });

if (!result.success) {
  if (result.error?.includes('not found')) {
    // Template doesn't exist
  } else if (result.error?.includes('Missing required variables')) {
    // Variables missing
  } else {
    // SMTP or other error
  }
}
```

---

## SMTP Configuration

Configure email sending via environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="TextWash" <noreply@textwash.app>
```

### Gmail Configuration
1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password in `SMTP_PASS`

### SendGrid Configuration
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM="TextWash" <noreply@textwash.app>
```

### Test Mode
If no SMTP credentials are configured, the system uses Ethereal Email (test mode). Test emails are not actually sent but can be previewed via the `preview` URL in the response.

---

## Best Practices

### Template Naming
- Use lowercase letters and underscores only
- Make names descriptive: `password_reset`, not `pr`
- Keep names under 50 characters

### Variable Naming
- Use camelCase: `firstName`, not `first_name`
- Make names descriptive: `planName`, not `pn`
- Document required variables in template description

### HTML Templates
- Use inline CSS for compatibility
- Keep total size under 100KB
- Test rendering in multiple email clients
- Always provide a text fallback

### Variable Substitution
- Always declare required variables in the `variables` array
- Provide default values when possible: `{{name || 'User'}}`
- Escape user content to prevent XSS

### Security
- Never include sensitive data in templates
- Use short-lived reset tokens (1 hour max)
- Log all template modifications
- Review templates regularly for security issues

---

## Troubleshooting

### Common Issues

**Email not sending:**
- Check SMTP credentials
- Verify SMTP_HOST and SMTP_PORT
- Check firewall/security groups
- Review server logs for errors

**Variables not substituting:**
- Verify variable names match exactly (case-sensitive)
- Check that all required variables are provided
- Ensure variable format is `{{name}}`, not `{name}` or `$name`

**Template not found:**
- Verify template name is correct
- Check that template `isActive` is true
- Ensure template exists in database

**Permission denied:**
- Verify JWT token is valid
- Check user has ADMIN or SUPER_ADMIN role
- Ensure token includes role information

---

## Rate Limiting

Email sending is subject to the global API rate limiter. High-volume senders should:
- Implement queuing for bulk sends
- Use background jobs for transactional emails
- Monitor send rates and adjust accordingly
- Consider upgrading SMTP provider limits

---

## Monitoring

Track email template usage:
- Monitor send success/failure rates
- Log all template modifications
- Alert on SMTP failures
- Track variable validation errors

---

## Future Enhancements

Planned features:
- Template versioning and rollback
- A/B testing support
- Rich text WYSIWYG editor UI
- Email preview in dashboard
- Scheduled sending
- Template analytics dashboard
- Attachment support
- Multi-language templates
