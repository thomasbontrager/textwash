# Deployment Guide

## Prerequisites

- PostgreSQL database (local or cloud)
- Stripe account with products created
- Node.js 18+
- Vercel/Netlify account (optional for hosting)

## Step 1: Database Setup

### Option A: Local PostgreSQL

```bash
# Create database
createdb cleantext

# Connection string
postgresql://user:password@localhost:5432/cleantext
```

### Option B: Supabase (Recommended)

1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from project settings
3. Copy to `backend/.env` as `DATABASE_URL`

### Option C: Railway/PlanetScale

Any PostgreSQL provider works with Prisma.

## Step 2: Backend Deployment

### Deploy to Vercel

```bash
cd backend
npm install -g vercel
vercel
```

During setup:
- Connect GitHub repo (or manual deploy)
- Set production environment variables:

```env
DATABASE_URL=<production-db-url>
JWT_SECRET=<generate-strong-key>
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
SENDGRID_API_KEY=<api-key>
FRONTEND_URL=https://yourdomain.com
```

Generate strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Deploy to Custom Server

```bash
# Build
npm run build

# Deploy dist/ folder
# Start with: npm start
```

## Step 3: Frontend Deployment

### Deploy to Vercel

```bash
vercel
```

Create `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": {
    "API_URL": "@api_url",
    "STRIPE_PUBLISHABLE_KEY": "@stripe_key"
  }
}
```

Add environment variables to Vercel dashboard.

### Deploy to Netlify

```bash
netlify deploy --prod --dir=.
```

Add `_redirects` file:
```
/* /index.html 200
```

## Step 4: Stripe Live Mode

### 1. Verify Stripe Account

- Complete Stripe account verification
- Get live API keys
- Update environment variables

### 2. Create Products (Live)

In Stripe Dashboard:
- Create CleanText Starter ($29/year, 14-day trial)
- Create CleanText Pro ($99/year, 14-day trial)

### 3. Setup Webhooks

Add webhook endpoint:
- URL: `https://yourdomain.com/api/webhooks/webhook`
- Events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

## Step 5: Database Migrations

Run migrations on deployed database:

```bash
# For Vercel with environment variables set
npx prisma migrate deploy

# For custom servers
npm run prisma:migrate
```

## Step 6: Create Initial Admin

### Via Prisma Studio

```bash
npm run prisma:studio
```

Create admin user:
```sql
INSERT INTO "User" (id, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES (
  'unique-id-here',
  'admin@cleantext.app',
  '$2a$12$...',  -- bcrypt hash of password
  'ADMIN',
  NOW(),
  NOW()
);
```

### Via Frontend

After initial user signup, manually update role in database:
```sql
UPDATE "User" SET role='ADMIN' WHERE email='admin@cleantext.app';
```

## Step 7: DNS Configuration

Point domain to deployment:

### Vercel
- Add domain in Vercel dashboard
- Update DNS CNAME record

### Example DNS Records
```
api.cleantext.app  CNAME  vercel-backend.vercel.app
cleantext.app      CNAME  vercel-frontend.vercel.app
```

## Step 8: SSL/HTTPS

Most hosts provide automatic SSL:
- Vercel: Automatic
- Netlify: Automatic  
- Custom servers: Use Let's Encrypt

## Step 9: Monitoring

### Logs

```bash
# Vercel
vercel logs

# Custom servers
pm2 logs
```

### Errors

Check these dashboards:
- Stripe Dashboard → Webhooks
- Vercel → Function Logs
- Database provider → Logs

## Testing Deployment

1. **Auth Flow**
   - Signup: ✅
   - Login: ✅
   - Token persistence: ✅

2. **Subscriptions**
   - Free plan works: ✅
   - Stripe checkout loads: ✅
   - Trial applies: ✅
   - Webhook updates subscription: ✅

3. **Admin**
   - Login as admin: ✅
   - Stripe config saves: ✅
   - User management works: ✅

4. **Feature Gating**
   - Free users can't access AI: ✅
   - Pro users see AI buttons: ✅
   - Gating enforced on backend: ✅

## Troubleshooting

### Database Connection Failed

```bash
# Test connection
psql $DATABASE_URL

# If using Supabase, check IP whitelist
```

### Stripe Webhooks Not Working

```bash
# Verify endpoint URL is live
curl https://yourdomain.com/api/health

# Check webhook secret matches
echo $STRIPE_WEBHOOK_SECRET
```

### Build Fails on Deploy

```bash
# Check Node version
node --version  # Should be 18+

# Verify dependencies
npm ci
```

### Users Can't Login

- Check JWT_SECRET is set
- Check database connection
- Monitor backend logs

## Performance Optimization

### Frontend

```bash
# Minimize CSS
# Use CDN for static assets
# Enable gzip compression
```

### Backend

```bash
# Cache auth tokens
# Use database indexing
# Enable API rate limiting
```

### Database

```bash
# Create indexes on frequently queried columns
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_subscription_user ON "Subscription"("userId");
```

## Security Checklist

- [ ] JWT_SECRET is strong (>32 chars)
- [ ] Stripe keys are live credentials
- [ ] HTTPS enabled on all domains
- [ ] Admin credentials secure and rotated
- [ ] Webhook secret verified
- [ ] Database backups automated
- [ ] Environment variables not in code
- [ ] CORS configured correctly

## Maintenance

### Weekly
- Monitor error logs
- Check subscription status

### Monthly
- Review Stripe reports
- Update dependencies
- Test backup restoration

### Quarterly
- Security audit
- Performance review
- Capacity planning
