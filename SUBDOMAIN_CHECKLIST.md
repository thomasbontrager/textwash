# Subdomain Deployment Checklist

This checklist ensures proper setup of TextWash's subdomain architecture.

## ✅ Prerequisites

- [ ] Domain purchased (e.g., textwash.app)
- [ ] DNS provider access
- [ ] Hosting platform selected (Vercel, Netlify, VPS, etc.)
- [ ] Stripe account created and verified
- [ ] PostgreSQL database provisioned

## 🌐 DNS Configuration

### Required DNS Records

For each subdomain, add DNS records:

```
Type    Name      Target                      TTL
------  --------  --------------------------  ----
A/CNAME @         <hosting-provider-target>   300
A/CNAME api       <hosting-provider-target>   300
A/CNAME billing   <hosting-provider-target>   300
A/CNAME admin     <hosting-provider-target>   300
```

**Example (Vercel):**
```
Type    Name      Target                      TTL
------  --------  --------------------------  ----
CNAME   @         cname.vercel-dns.com       300
CNAME   api       cname.vercel-dns.com       300
CNAME   billing   cname.vercel-dns.com       300
CNAME   admin     cname.vercel-dns.com       300
```

- [ ] textwash.app DNS configured
- [ ] api.textwash.app DNS configured
- [ ] billing.textwash.app DNS configured
- [ ] admin.textwash.app DNS configured
- [ ] DNS propagation verified (use `dig` or `nslookup`)

## 🔧 Backend Setup

### 1. Environment Variables

Configure in your hosting platform:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/textwash
JWT_SECRET=<generate-32-char-random-string>
NODE_ENV=production
BASE_DOMAIN=textwash.app

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_STARTER_PRICE_ID=price_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx

# Optional LLM
LLM_ENABLED=false
```

- [ ] All environment variables set
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] DATABASE_URL points to production database
- [ ] BASE_DOMAIN matches your domain

### 2. Database Migrations

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed  # Optional: adds sample data
```

- [ ] Prisma client generated
- [ ] Database migrations run
- [ ] Database schema verified

### 3. Deploy Backend

**Vercel:**
```bash
cd backend
vercel --prod
```

**Custom Server:**
```bash
cd backend
npm run build
npm start  # or use PM2: pm2 start dist/server.js
```

- [ ] Backend deployed
- [ ] Health check passes: `curl https://api.textwash.app/health`

## 🎨 Frontend Setup

### 1. Update Configuration

Update `subdomain-config.js` if needed for production URLs.

- [ ] subdomain-config.js reviewed
- [ ] API URLs point to production

### 2. Deploy Frontend

**Vercel/Netlify:**
```bash
vercel --prod
```

**Custom Server:**
```bash
# Serve static files with nginx or similar
```

- [ ] Main app deployed: https://textwash.app
- [ ] Billing page deployed: https://billing.textwash.app
- [ ] Admin page deployed: https://admin.textwash.app

## 💳 Stripe Configuration

### 1. Create Products

In Stripe Dashboard → Products:

**Product 1: TextWash Starter**
- Name: TextWash Starter
- Price: $29/year
- Billing period: Yearly
- Trial: 14 days
- Copy Price ID → Set as `STRIPE_STARTER_PRICE_ID`

**Product 2: TextWash Pro**
- Name: TextWash Pro
- Price: $99/year
- Billing period: Yearly
- Trial: 14 days
- Copy Price ID → Set as `STRIPE_PRO_PRICE_ID`

- [ ] Starter product created
- [ ] Pro product created
- [ ] Price IDs saved to environment variables

### 2. Configure Webhooks

In Stripe Dashboard → Developers → Webhooks:

- Endpoint URL: `https://api.textwash.app/api/stripe/webhook`
- Events to subscribe:
  - [x] customer.subscription.created
  - [x] customer.subscription.updated
  - [x] customer.subscription.deleted
  - [x] invoice.payment_failed

- [ ] Webhook endpoint added
- [ ] Webhook events subscribed
- [ ] Webhook secret saved as `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook fired successfully

### 3. Configure Customer Portal

In Stripe Dashboard → Settings → Billing → Customer Portal:

- Return URL: `https://billing.textwash.app`
- Activate:
  - [x] Allow customers to update payment methods
  - [x] Allow customers to cancel subscriptions
  - [x] Allow customers to switch plans
  - [x] Show invoice history

- [ ] Customer Portal configured
- [ ] Return URL set to billing subdomain
- [ ] Features enabled

## 🔐 SSL/TLS Certificates

### Automatic (Vercel/Netlify)
- [ ] SSL automatically provisioned
- [ ] All subdomains have HTTPS

### Manual (Let's Encrypt)
```bash
sudo certbot certonly --nginx \
  -d textwash.app \
  -d api.textwash.app \
  -d billing.textwash.app \
  -d admin.textwash.app
```

- [ ] Certificates generated
- [ ] Auto-renewal configured
- [ ] All subdomains accessible via HTTPS

## 👤 Admin User Setup

### Create Initial Admin

Via Prisma Studio:
```bash
npm run prisma:studio
```

Or via SQL:
```sql
-- Generate password hash first with bcrypt
INSERT INTO "User" (id, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@textwash.app',
  '$2a$12$YOUR_BCRYPT_HASH',
  'ADMIN',
  NOW(),
  NOW()
);
```

- [ ] Admin user created
- [ ] Admin can login to https://admin.textwash.app

## 🧪 Testing

### 1. Main App (textwash.app)
- [ ] Landing page loads
- [ ] Signup works
- [ ] Login works
- [ ] Pricing page displays
- [ ] Main app accessible after login

### 2. API (api.textwash.app)
```bash
# Health check
curl https://api.textwash.app/health

# Create user
curl -X POST https://api.textwash.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

- [ ] Health endpoint responds
- [ ] Auth endpoints work
- [ ] API endpoints accessible

### 3. Billing (billing.textwash.app)
- [ ] Billing page loads
- [ ] Stripe portal opens
- [ ] Return URL redirects correctly

### 4. Admin (admin.textwash.app)
- [ ] Admin dashboard accessible
- [ ] Admin login works
- [ ] User management visible
- [ ] Metrics displayed

### 5. Stripe Integration
- [ ] Checkout flow works
- [ ] Test payment processes (use test card: 4242 4242 4242 4242)
- [ ] Webhook updates subscription status
- [ ] Customer Portal works
- [ ] Subscription cancellation works

## 🔍 Verification

### CORS
```bash
# Test CORS headers
curl -H "Origin: https://textwash.app" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  https://api.textwash.app/api/auth/login
```

- [ ] CORS allows all subdomains
- [ ] Credentials enabled

### Subdomain Routing
- [ ] Admin routes only accessible on admin/api subdomains
- [ ] Billing routes accessible on billing subdomain
- [ ] API routes accessible from all origins in production

### Database
- [ ] Subscriptions table populated
- [ ] Users table has test users
- [ ] Agent executions logged

## 📊 Monitoring

### Setup Monitoring
- [ ] Uptime monitoring configured (UptimeRobot, Pingdom, etc.)
- [ ] Error tracking setup (Sentry, LogRocket, etc.)
- [ ] Analytics configured (if desired)

### Monitor These URLs
- `https://textwash.app`
- `https://api.textwash.app/health`
- `https://billing.textwash.app`
- `https://admin.textwash.app`

## 🚀 Go Live

### Pre-Launch Checklist
- [ ] All DNS records propagated
- [ ] All SSL certificates valid
- [ ] All environment variables set
- [ ] Database backups configured
- [ ] Stripe in live mode
- [ ] Admin account secured
- [ ] Documentation updated
- [ ] Legal pages added (Terms, Privacy)

### Launch
- [ ] Main site live
- [ ] API endpoints functional
- [ ] Billing portal working
- [ ] Admin panel secured
- [ ] Monitoring active

## 📝 Post-Launch

- [ ] Monitor webhook deliveries in Stripe
- [ ] Check error logs daily
- [ ] Test subscription flow end-to-end
- [ ] Verify email notifications (if configured)
- [ ] Update documentation with actual URLs

## 🔄 Maintenance

### Weekly
- [ ] Check error logs
- [ ] Monitor webhook success rate
- [ ] Review subscription metrics

### Monthly
- [ ] Update dependencies
- [ ] Review Stripe reports
- [ ] Test backup restoration
- [ ] Security audit

---

## Need Help?

See detailed guides:
- [SUBDOMAIN_GUIDE.md](./SUBDOMAIN_GUIDE.md) - Architecture and setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Stripe configuration

---

**Tip:** Use this checklist systematically. Don't skip steps, especially around security and DNS configuration.
