# Railway Deployment - Quick Start

## Files Modified for Deployment

### 1. `/backend/src/server.ts`
- ✅ Updated CORS to use production URLs (https://textwash.app, https://admin.textwash.app)
- ✅ Removed localhost URLs from production (only included in development mode)
- ✅ Added Stripe webhook route at `/webhooks/stripe` (alongside legacy `/api/stripe`)
- ✅ Fixed duplicate imports and route registrations
- ✅ Graceful shutdown handlers already in place

### 2. `/backend/package.json`
- ✅ Added `postinstall` script: Runs `prisma generate` automatically
- ✅ Added `prisma:migrate:deploy` script: For production migrations
- ✅ Updated `build` script: Includes Prisma generation

### 3. `/backend/railway.json` (NEW)
- ✅ Railway configuration file
- ✅ Build command: `npm run build`
- ✅ Start command: `npm run prisma:migrate:deploy && npm start`
- ✅ Restart policy configured

### 4. `/backend/.env.example`
- ✅ Updated with comprehensive environment variable documentation
- ✅ Added production-ready comments
- ✅ Organized by category

### 5. `/backend/DEPLOYMENT.md` (NEW)
- ✅ Complete Railway deployment guide
- ✅ Step-by-step instructions
- ✅ Environment variables list
- ✅ DNS configuration for IONOS
- ✅ Stripe webhook setup
- ✅ Troubleshooting guide

### 6. Fixed TypeScript Build Issues
- ✅ Fixed Prisma queries in `/backend/src/routes/admin.ts`
- ✅ Fixed Prisma queries in `/backend/src/routes/subscriptions.ts`
- ✅ Fixed duplicate imports in `/backend/src/routes/billing.ts`
- ✅ Build now succeeds without errors

## What to Do Next

### Step 1: Push to GitHub
```bash
git push origin main
```

### Step 2: Deploy to Railway
1. Go to https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `thomasbontrager/textwash`
4. Railway will auto-detect the backend

### Step 3: Add PostgreSQL Database
1. In Railway project, click "New" → "Database" → "PostgreSQL"
2. `DATABASE_URL` will be automatically set

### Step 4: Set Environment Variables in Railway

**Required:**
```bash
NODE_ENV=production
JWT_SECRET=<generate-secure-random-32-char-string>
BASE_DOMAIN=textwash.app
FRONTEND_URL=https://textwash.app
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Get from Stripe after webhook setup
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
```

**Optional (AI features):**
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
FEATURE_AI_CORE=true
FEATURE_AGENT_SYSTEM=true
```

### Step 5: Configure DNS in IONOS

Add CNAME record:
- **Subdomain**: `api`
- **Type**: `CNAME`
- **Value**: `<your-railway-url>.up.railway.app`
- **TTL**: `3600`

Then add custom domain in Railway:
1. Settings → Domains → "Add Domain"
2. Enter: `api.textwash.app`
3. Railway provisions SSL automatically

### Step 6: Configure Stripe Webhook

1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.textwash.app/webhooks/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy signing secret to Railway as `STRIPE_WEBHOOK_SECRET`

### Step 7: Update Frontend

The frontend is already configured! The file `/subdomain-config.js` automatically uses:
- Development: `http://localhost:3000`
- Production: `https://api.textwash.app`

No frontend changes needed!

### Step 8: Verify Deployment

```bash
# Test health endpoint
curl https://api.textwash.app/health

# Expected: {"status":"ok","timestamp":"..."}

# Test from frontend
# Visit https://textwash.app and try login/signup
```

## Important URLs

- **Frontend**: https://textwash.app
- **API**: https://api.textwash.app
- **Admin**: https://admin.textwash.app
- **Health Check**: https://api.textwash.app/health
- **Stripe Webhook**: https://api.textwash.app/webhooks/stripe/webhook

## Key Features Configured

✅ **CORS**: Properly configured for textwash.app and admin.textwash.app  
✅ **Stripe Webhooks**: Available at `/webhooks/stripe/webhook`  
✅ **Health Check**: Available at `/health`  
✅ **Prisma**: Configured for production with automatic migrations  
✅ **Graceful Shutdown**: Properly disconnects Prisma on SIGTERM/SIGINT  
✅ **Port**: Uses `process.env.PORT` (Railway sets this)  
✅ **Environment-based**: Localhost only in development  

## Troubleshooting

### "Network error" on login
- Check Railway logs
- Verify API URL is accessible
- Check CORS configuration in Railway logs

### Stripe webhook failing
- Verify webhook URL in Stripe dashboard
- Check `STRIPE_WEBHOOK_SECRET` in Railway
- Review webhook logs in Stripe dashboard

### Database connection error
- Verify `DATABASE_URL` is set in Railway
- Check Railway logs for Prisma errors
- Ensure migrations ran successfully

## Reference

See `/backend/DEPLOYMENT.md` for comprehensive documentation.
