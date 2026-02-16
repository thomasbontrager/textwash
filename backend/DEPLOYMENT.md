# Railway Deployment Guide for TextWash Backend

This guide provides step-by-step instructions for deploying the TextWash backend to Railway and configuring it to work with the frontend at https://textwash.app.

## Prerequisites

1. Railway account (https://railway.app)
2. PostgreSQL database (Railway provides this)
3. Stripe account with webhook secret
4. IONOS DNS access for api.textwash.app
5. All required API keys (OpenAI, Anthropic, etc.)

## Part 1: Railway Project Setup

### Step 1: Create New Railway Project

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select the `thomasbontrager/textwash` repository
6. Railway will detect the backend automatically

### Step 2: Configure Build Settings

Railway should auto-detect the Node.js project. The `railway.json` file in the `/backend` directory will configure:
- Build command: `npm run build`
- Start command: `npm run prisma:migrate:deploy && npm start`

If needed, manually set:
- **Root Directory**: `/backend`
- **Build Command**: `npm run build`
- **Start Command**: `npm run prisma:migrate:deploy && npm start`

### Step 3: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a `DATABASE_URL` environment variable
4. The Prisma client will automatically use this connection string

## Part 2: Environment Variables

In Railway, go to your project → Variables tab and add the following:

### Required Environment Variables

```bash
# Node Environment
NODE_ENV=production

# Database (automatically set by Railway PostgreSQL)
DATABASE_URL=postgresql://...  # Auto-populated by Railway

# Server Configuration
PORT=3000  # Railway will override this with their own PORT

# JWT Secret (generate a secure random string)
JWT_SECRET=<generate-a-secure-random-string-min-32-chars>

# Base Domain
BASE_DOMAIN=textwash.app

# Frontend URL
FRONTEND_URL=https://textwash.app

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...  # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_live_...  # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...  # Get from Stripe webhook setup (see below)
STRIPE_STARTER_PRICE_ID=price_...  # Your Stripe Starter plan price ID
STRIPE_PRO_PRICE_ID=price_...  # Your Stripe Pro plan price ID

# AI Provider Configuration (Optional but recommended)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...  # Your OpenAI API key
OPENAI_MODEL=gpt-4
OPENAI_API_URL=https://api.openai.com/v1

# Anthropic (if using Claude)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Feature Flags (set to true/false as needed)
FEATURE_AI_CORE=true
FEATURE_AGENT_SYSTEM=true
FEATURE_VIDEO=false
FEATURE_AVATAR=false
FEATURE_AUDIO=false
FEATURE_RAG=false

# LLM Configuration (legacy, keep for backwards compatibility)
LLM_ENABLED=false
```

### How to Generate JWT_SECRET

Run this command locally to generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Part 3: DNS Configuration (IONOS)

### Configure api.textwash.app to point to Railway

1. Get your Railway deployment URL (e.g., `textwash-backend-production.up.railway.app`)

2. Log in to IONOS DNS management

3. Add a CNAME record:
   - **Subdomain**: `api`
   - **Type**: `CNAME`
   - **Value**: `textwash-backend-production.up.railway.app` (your Railway URL)
   - **TTL**: `3600` (or default)

4. Wait for DNS propagation (usually 5-30 minutes)

5. Verify DNS propagation:
   ```bash
   nslookup api.textwash.app
   ```

### Add Custom Domain in Railway

1. In your Railway project, go to Settings → Domains
2. Click "Add Domain"
3. Enter: `api.textwash.app`
4. Railway will automatically provision SSL certificate (Let's Encrypt)

## Part 4: Database Migration

Railway will automatically run migrations on deploy using the start command:
```bash
npm run prisma:migrate:deploy && npm start
```

### Manual Migration (if needed)

If you need to run migrations manually:

1. In Railway dashboard, go to your service
2. Click on "Deploy Logs" 
3. You should see migration logs during startup
4. Or use Railway CLI:
   ```bash
   railway run npm run prisma:migrate:deploy
   ```

### Seed Database (if needed)

To seed the database with initial data:
```bash
railway run npm run prisma:seed
```

## Part 5: Stripe Webhook Configuration

### Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter webhook URL: `https://api.textwash.app/webhooks/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the "Signing secret" (starts with `whsec_...`)
6. Add it to Railway environment variables as `STRIPE_WEBHOOK_SECRET`

### Test Webhook

```bash
curl https://api.textwash.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-..."
}
```

## Part 6: Frontend Configuration

Update your frontend (app.js or config) to use the production API:

```javascript
// Replace any localhost URLs with:
const API_URL = 'https://api.textwash.app';

// Example API calls:
fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({ email, password })
});
```

## Part 7: Verification Checklist

After deployment, verify the following:

- [ ] **Health Check**: `curl https://api.textwash.app/health` returns `{"status":"ok"}`
- [ ] **DNS Resolution**: `nslookup api.textwash.app` resolves correctly
- [ ] **SSL Certificate**: `https://api.textwash.app` shows valid certificate
- [ ] **CORS**: Frontend can make requests from `https://textwash.app`
- [ ] **Database**: Check Railway logs for successful Prisma connection
- [ ] **Login/Signup**: Test from `https://textwash.app`
- [ ] **Stripe Webhook**: Send a test event from Stripe dashboard
- [ ] **Admin Panel**: Access `https://admin.textwash.app` (if applicable)

## Part 8: Monitoring & Logs

### View Logs in Railway

1. Go to your Railway project
2. Click on your service
3. Click "Deploy Logs" to see startup logs
4. Click "Application Logs" to see runtime logs

### Common Log Messages

**Success:**
```
Database connected
🧼 TextWash B2B API Platform
Server running on port 3000
```

**Errors to watch for:**
- `Failed to start server` - Check environment variables
- `Database connection failed` - Check DATABASE_URL
- `Stripe webhook verification failed` - Check STRIPE_WEBHOOK_SECRET
- `CORS error` - Check FRONTEND_URL and BASE_DOMAIN

## Part 9: Troubleshooting

### Frontend shows "Network Error"

1. Check browser console for CORS errors
2. Verify `https://api.textwash.app` is accessible
3. Check Railway deployment logs
4. Verify FRONTEND_URL in Railway env vars

### Stripe Webhook Failing

1. Check STRIPE_WEBHOOK_SECRET in Railway
2. Verify webhook URL in Stripe: `https://api.textwash.app/webhooks/stripe/webhook`
3. Check Railway logs for webhook errors
4. Test webhook delivery in Stripe dashboard

### Database Migration Errors

1. Check DATABASE_URL is set
2. Run migrations manually: `railway run npm run prisma:migrate:deploy`
3. Check Railway logs for specific Prisma errors

### 502 Bad Gateway

1. Check Railway service is running
2. Check application logs for startup errors
3. Verify build completed successfully
4. Check if PORT is being used correctly (Railway sets this automatically)

## Part 10: Deployment Commands Summary

### What to Commit

```bash
cd /home/runner/work/textwash/textwash
git add backend/src/server.ts
git add backend/package.json
git add backend/railway.json
git add backend/DEPLOYMENT.md
git commit -m "Prepare backend for Railway deployment"
git push origin main
```

### What to Set in Railway

All environment variables listed in Part 2 above.

### What DNS to Set in IONOS

```
Type: CNAME
Subdomain: api
Value: <your-railway-url>.up.railway.app
TTL: 3600
```

## Part 11: Rollback Plan

If something goes wrong:

1. **Rollback in Railway**: 
   - Go to Deployments tab
   - Click on a previous successful deployment
   - Click "Redeploy"

2. **Revert DNS**: 
   - Remove the CNAME record in IONOS
   - Wait for DNS propagation

3. **Check Logs**:
   - Always check Railway logs first
   - Look for specific error messages

## Success Criteria

✅ `https://api.textwash.app/health` returns `200 OK`  
✅ `https://textwash.app` can login/signup successfully  
✅ Admin panel accessible at `https://admin.textwash.app`  
✅ Stripe webhooks receiving events  
✅ No CORS errors in browser console  
✅ Railway logs show "Database connected"  

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Check Railway application logs
3. Verify all environment variables are set
4. Test API endpoints directly with curl
5. Check Stripe webhook logs

---

**Last Updated**: 2024
**Deployment Target**: Railway
**Frontend**: GitHub Pages (https://textwash.app)
**Backend**: Railway (https://api.textwash.app)
