# TextWash Subdomain Architecture

## Overview

TextWash uses a multi-subdomain architecture to separate concerns and provide a professional, scalable SaaS infrastructure.

## Required Subdomains

### 1. `textwash.app` (Root Domain)
**Purpose:** Main application interface

**Hosts:**
- Landing page
- User login/signup
- Main TextWash app
- Pricing page

**Routes:**
- `/` - Landing page
- `/pricing` - Pricing plans
- `/login` - Authentication
- `/app` - Main application (after login)

### 2. `api.textwash.app`
**Purpose:** API endpoints and backend services

**Hosts:**
- Stripe webhooks
- Subscription sync
- AI requests
- Auth/session validation
- All B2B API endpoints

**Routes:**
- `POST /api/stripe/webhook` - Stripe webhook endpoint
- `POST /api/v1/clean` - Text cleaning
- `POST /api/v1/rewrite` - Text rewriting
- `POST /api/v1/analyze` - Text analysis
- `POST /api/v1/moderate` - Content moderation
- `POST /api/auth/login` - Authentication
- `POST /api/auth/signup` - User registration

**Stripe Configuration:**
- Webhook URL: `https://api.textwash.app/api/stripe/webhook`

### 3. `billing.textwash.app`
**Purpose:** Stripe billing portal integration

**Hosts:**
- Stripe Customer Portal return URL
- Upgrade/downgrade flows
- Plan switching (monthly ↔ yearly)
- Payment method management

**Stripe Configuration:**
- Customer Portal Return URL: `https://billing.textwash.app`

### 4. `admin.textwash.app`
**Purpose:** Internal administration

**Hosts:**
- Admin dashboard
- User management
- Subscription overrides
- Internal metrics
- Agent management
- Policy configuration

**Routes:**
- `/dashboard` - Admin overview
- `/users` - User management
- `/subscriptions` - Subscription management
- `/agents` - Agent configuration
- `/policies` - Policy management

## Optional Subdomains (Future)

### `staging.textwash.app`
- Test Stripe keys
- Preview changes before production
- Test yearly plans

### `docs.textwash.app`
- Help documentation
- API documentation
- User guides
- FAQs

### `auth.textwash.app`
- Dedicated authentication service (if decoupled later)
- OAuth providers
- Magic links

## Development Setup

### Local Development
In development, all subdomains run on localhost with different ports:

```
textwash.app       → http://localhost:3001 (frontend)
api.textwash.app   → http://localhost:3000 (backend API)
billing.textwash.app → http://localhost:3002
admin.textwash.app → http://localhost:3003
```

### Environment Variables

```bash
# Backend (.env)
PORT=3000
NODE_ENV=development
BASE_DOMAIN=textwash.app
FRONTEND_URL=http://localhost:3001

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_STARTER_PRICE_ID=price_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
```

## Production Deployment

### DNS Configuration

Set up DNS records for each subdomain:

```
Type    Name      Value                          TTL
------  --------  ---------------------------    ----
A       @         <your-server-ip>               300
CNAME   api       yourdomain.com                 300
CNAME   billing   yourdomain.com                 300
CNAME   admin     yourdomain.com                 300
```

Or, if using a platform like Vercel:

```
Type    Name      Value                          TTL
------  --------  ---------------------------    ----
CNAME   @         cname.vercel-dns.com          300
CNAME   api       cname.vercel-dns.com          300
CNAME   billing   cname.vercel-dns.com          300
CNAME   admin     cname.vercel-dns.com          300
```

### Vercel Deployment

1. **Deploy Backend:**
   ```bash
   cd backend
   vercel --prod
   ```

2. **Add Domain Aliases:**
   - Go to Vercel Dashboard → Project Settings → Domains
   - Add: `api.textwash.app`
   - Add: `billing.textwash.app`
   - Add: `admin.textwash.app`

3. **Environment Variables:**
   Set production environment variables in Vercel dashboard:
   ```
   NODE_ENV=production
   BASE_DOMAIN=textwash.app
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### Nginx Configuration (Self-Hosted)

```nginx
# Main app
server {
    listen 443 ssl http2;
    server_name textwash.app;
    
    ssl_certificate /etc/letsencrypt/live/textwash.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/textwash.app/privkey.pem;
    
    root /var/www/textwash/frontend;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# API subdomain
server {
    listen 443 ssl http2;
    server_name api.textwash.app;
    
    ssl_certificate /etc/letsencrypt/live/textwash.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/textwash.app/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Billing subdomain
server {
    listen 443 ssl http2;
    server_name billing.textwash.app;
    
    ssl_certificate /etc/letsencrypt/live/textwash.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/textwash.app/privkey.pem;
    
    root /var/www/textwash/frontend;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Admin subdomain
server {
    listen 443 ssl http2;
    server_name admin.textwash.app;
    
    ssl_certificate /etc/letsencrypt/live/textwash.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/textwash.app/privkey.pem;
    
    root /var/www/textwash/frontend;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### SSL Certificates

Use Let's Encrypt to generate SSL certificates for all subdomains:

```bash
sudo certbot certonly --nginx -d textwash.app -d api.textwash.app -d billing.textwash.app -d admin.textwash.app
```

## Stripe Integration

### Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.textwash.app/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Customer Portal

1. Go to Stripe Dashboard → Settings → Billing → Customer Portal
2. Set return URL: `https://billing.textwash.app`
3. Enable features:
   - Update payment method
   - Cancel subscription
   - Update plan

## Security Considerations

### CORS Configuration
The backend automatically allows:
- All subdomains of `textwash.app` in production
- Specific localhost ports in development
- Credentials (cookies) across subdomains

### Subdomain Restrictions
Admin routes are restricted to:
- `admin.textwash.app` (production)
- `api.textwash.app` (for API access)
- All subdomains (development)

This is enforced via the `requireSubdomain` middleware.

## Testing

### Local Testing

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
python -m http.server 3001

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/auth/signup -d '{"email":"test@example.com","password":"password123"}'
```

### Production Testing

```bash
# Test API endpoint
curl https://api.textwash.app/health

# Test webhook (from Stripe CLI)
stripe listen --forward-to https://api.textwash.app/api/stripe/webhook
stripe trigger customer.subscription.created
```

## Monitoring

Monitor subdomain health:

```bash
# Health checks
curl https://api.textwash.app/health
curl https://textwash.app/
curl https://billing.textwash.app/
curl https://admin.textwash.app/
```

Set up uptime monitoring for all subdomains:
- UptimeRobot
- Pingdom
- Better Uptime

## Troubleshooting

### CORS Errors
- Verify `BASE_DOMAIN` is set correctly
- Check browser console for specific origin
- Ensure credentials are included in requests

### Webhook Not Receiving Events
- Verify webhook URL is accessible publicly
- Check Stripe webhook logs in dashboard
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe

### DNS Not Resolving
- Wait for DNS propagation (up to 48 hours)
- Use `dig` to check DNS records
- Verify CNAME points to correct target

```bash
dig api.textwash.app
dig billing.textwash.app
dig admin.textwash.app
```
