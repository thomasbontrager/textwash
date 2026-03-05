# 🔥 textwash

Clean and process text at scale

# TextWash - Advanced Text Processing Platform

Professional text cleaning with AI features, self-updating agents, and enterprise-grade B2B API.

## ✨ What's New

This platform now includes an **advanced agent system** with:

🧠 **Self-Updating Rules** - Rules live in database, update without restart
🤖 **LLM Hybrid Agents** - Optional AI with deterministic fallback
🔄 **Hot-Reload** - Update agents live in production
🏢 **Enterprise Policies** - Organization-scoped compliance rules
🌐 **B2B API Platform** - Full API with key auth, rate limiting, usage tracking

## 🚀 Architecture

### Subdomain Structure

TextWash uses a professional multi-subdomain architecture:

- **`textwash.app`** (Root) - Landing page, login/signup, pricing, main app
- **`api.textwash.app`** - API endpoints, Stripe webhooks, AI requests, auth
- **`billing.textwash.app`** - Stripe Customer Portal return URL, subscription management
- **`admin.textwash.app`** - Admin dashboard, user management, metrics

See **[SUBDOMAIN_GUIDE.md](./SUBDOMAIN_GUIDE.md)** for complete setup instructions.

### Frontend (Static HTML/CSS/JS)
- User interface with dark SaaS theme
- Client-side text cleaning
- Stripe checkout integration
- Works standalone or with backend

### Backend (Node.js/TypeScript/Express)
- **8 Intelligent Agents** (4 basic + 4 hybrid AI)
- **Self-updating rules** with database storage
- **Hot-reload capability** for zero-downtime updates
- **Enterprise policy engine** for compliance
- **B2B API endpoints** with authentication
- **Rate limiting & usage tracking** for billing
- **PostgreSQL** with Prisma ORM

## 🎯 Quick Start

### Frontend Only (No Backend)
```bash
# Install dependencies (first time only)
npm install

# Start dev server
npm run dev

# Open http://localhost:3001
```

### Full Stack (Frontend + Backend)
```bash
# 1. Start backend
cd backend
./setup.sh  # First time only
npm run dev

# 2. In another terminal, serve frontend
cd ..
npm install  # First time only
npm run dev

# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
```

See **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** for detailed setup.

**Having trouble with port 3001?** See **[PORT_3001_GUIDE.md](./PORT_3001_GUIDE.md)** for troubleshooting.

## 🚀 Features

**Free Plan**
- Basic text cleaning
- Whitespace normalization
- Punctuation fixes

**Starter Plan ($29/year + 14-day trial)**
- Everything in Free
- Enhanced local cleaning
- Priority support

**Pro Plan ($99/year + 14-day trial)**
- Everything in Starter
- AI spelling & grammar correction
- Smart rewrite modes (Clarity, Concise, Professional, Casual)
- Context-aware AI rewriting
- All future AI upgrades included

**Enterprise Plan (Custom)**
- Everything in Pro
- Custom policies and compliance rules
- Dedicated API access
- Self-updating agent rules
- White-label options
- SLA support

## 📁 Project Structure

```
textwash/
├── index.html              # Multi-page SPA
├── billing.html            # Billing portal page
├── style.css               # Dark SaaS theme
├── app.js                  # Frontend logic
├── subdomain-config.js     # Subdomain-aware configuration
├── assets/                 # Logo, favicon
├── SUBDOMAIN_GUIDE.md      # Subdomain setup guide
├── INTEGRATION_GUIDE.md    # Full integration guide
└── backend/
    ├── README.md           # Backend quick start
    ├── IMPLEMENTATION_GUIDE.md  # Detailed architecture
    ├── API_EXAMPLES.md     # API usage examples
    ├── setup.sh            # Easy setup script
    ├── src/
    │   ├── server.ts       # Express server
    │   ├── types/          # TypeScript definitions
    │   ├── middleware/
    │   │   ├── auth.ts     # JWT & API key auth
    │   │   ├── subdomain.ts  # Subdomain routing
    │   │   └── rateLimit.ts  # Rate limiting
    │   ├── routes/
    │   │   ├── auth.ts     # Authentication
    │   │   ├── admin.ts    # Admin management
    │   │   ├── billing.ts  # Stripe portal
    │   │   ├── stripe.ts   # Stripe webhooks
    │   │   └── api.ts      # Public B2B API
    │   ├── services/
    │   │   ├── ruleLoader.ts      # Self-updating rules
    │   │   ├── llm.ts             # LLM with safety
    │   │   ├── agentRegistry.ts   # Hot-reload
    │   │   └── policyService.ts   # Enterprise policies
    │   └── agents/
    │       ├── basicAgents.ts     # Deterministic agents
    │       └── hybridAgents.ts    # AI-powered agents
    ├── prisma/
    │   ├── schema.prisma   # Database schema
    │   └── seed.ts         # Initial data
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

## 🤖 Available Agents

### Basic Agents (All Plans)
- **WhitespaceNormalizer** - Clean whitespace and line breaks
- **PunctuationNormalizer** - Fix quotes, dashes, spacing
- **ProfanityTransformer** - Rule-based profanity filter
- **ClarityTransformer** - Remove filler words

### Hybrid AI Agents (PRO/Enterprise)
- **HybridRewrite** - AI rewriting with fallback
- **ProfessionalTone** - Convert to professional tone
- **CasualTone** - Convert to casual tone  
- **ConciseRewrite** - Make text more concise

All agents support:
- ✅ Self-updating rules
- ✅ Hot-reload
- ✅ Policy enforcement
- ✅ Safety controls

## 🌐 B2B API Platform

### Public Endpoints

```bash
POST /api/v1/clean      # Text cleaning
POST /api/v1/rewrite    # AI rewriting (PRO)
POST /api/v1/analyze    # Text analysis
POST /api/v1/moderate   # Content moderation
```

### Admin Endpoints

```bash
GET  /api/admin/agents           # List agents
POST /api/admin/agents/reload    # Hot-reload
PUT  /api/admin/rules/:name      # Update rules
POST /api/admin/policies         # Create policy
POST /api/admin/api-keys         # Create API key
GET  /api/admin/usage            # Usage stats
```

See **[backend/API_EXAMPLES.md](./backend/API_EXAMPLES.md)** for usage examples.

## 🔧 Setup Instructions

### Option 1: Use Setup Script (Recommended)

```bash
cd backend
./setup.sh
```

The script will:
1. Install dependencies
2. Create `.env` from template
3. Generate Prisma client
4. Run database migrations
5. Build TypeScript

### Option 2: Manual Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Setup database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 4. Build and start
npm run build
npm run dev
```

Backend runs on `http://localhost:3000`

For detailed setup instructions, see **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**

## 📊 Database Schema

Key models:
- **User** - Users with subscription plans
- **Subscription** - Plan management (FREE/STARTER/PRO/ENTERPRISE)
- **Organization** - Multi-tenant support
- **AgentRule** - Self-updating rules with versioning
- **Policy** - Enterprise policies
- **ApiKey** - API authentication with rate limits
- **UsageRecord** - Metered billing tracking
- **AgentExecution** - Audit log

## 💳 Stripe Setup

### 1. Create Stripe Account
- Go to [stripe.com](https://stripe.com)
- Create account and get API keys

### 2. Create Products in Stripe Dashboard

**Product 1: TextWash Starter**
- Recurring billing
- Yearly interval
- 14-day trial
- Price: $29

**Product 2: TextWash Pro**
- Recurring billing
- Yearly interval
- 14-day trial
- Price: $99

### 3. Update Backend

Create initial admin account first:
```bash
# In Prisma Studio
npm run prisma:studio
```

Create a user with ADMIN role:
```sql
INSERT INTO "User" (id, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES (
  'unique-uuid',
  'admin@textwash.app',
  '$2a$12$...hash',
  'ADMIN',
  NOW(),
  NOW()
);
```

Then login to admin panel and add Stripe keys:
- Go to `http://localhost:3001#adminPage`
- Enter Publishable Key, Secret Key, Webhook Secret
- Save configuration

### 4. Configure Webhooks

In Stripe Dashboard:
- Go to Webhooks
- Add endpoint: `https://api.textwash.app/api/stripe/webhook`
- Subscribe to:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

### 5. Configure Customer Portal

In Stripe Dashboard → Settings → Billing → Customer Portal:
- Set return URL: `https://billing.textwash.app`
- Enable features:
  - Update payment method
  - Cancel subscription
  - View invoices

## 👤 Admin Panel

Access at: `http://localhost:3001` (if admin user)

### Features
- **Stripe Config**: Manage Stripe API keys securely
- **User Management**: 
  - View paginated user list with search and filters
  - Search users by email
  - Filter by plan, role, and status
  - View detailed user information (subscription, usage, login history)
  - Suspend/activate users
  - Reset user passwords
  - Assign subscription plans
  - Soft delete users (preserves audit trail)
- **Subscription Status**: Monitor all active subscriptions
- **Agent Management**: Update rules, reload agents, view execution logs
- **Policy Management**: Create and manage enterprise policies
- **API Keys**: Generate and manage B2B API keys
- **Usage Analytics**: Track API usage for billing
- **Login Tracking**: Monitor login attempts with IP, user agent, and timestamps

## 🔐 Security & Permissions

### Authentication
- **JWT Tokens** - User authentication with 30-day expiry
- **API Keys** - B2B access with `tw_` prefix
- **Rate Limiting** - Per-key limits with headers

### Authorization
- **User Role** - Standard access
- **Admin Role** - Full management access
  - MANAGE_USERS - User management operations
  - MANAGE_STRIPE - Stripe configuration
  - MANAGE_AGENTS - Agent and rule management
  - MANAGE_API_KEYS - API key operations
  - VIEW_ANALYTICS - Usage analytics
- **Organization Scoping** - Multi-tenant isolation

### Safety Controls
- **LLM Timeouts** - Configurable (default 10s)
- **Token Limits** - Prevent abuse (default 500)
- **Output Validation** - Sanitize all LLM responses
- **Deterministic Fallback** - Always safe operation

## 🧪 Testing

### Test Frontend
```bash
python3 -m http.server 3001
# Visit http://localhost:3001
```

### Test Backend API
```bash
# Health check
curl http://localhost:3000/health

# Clean text
curl -X POST http://localhost:3000/api/v1/clean \
  -H "X-Api-Key: tw_your_key" \
  -d '{"text": "  test  "}'
```

See **[backend/API_EXAMPLES.md](./backend/API_EXAMPLES.md)** for complete examples.

## 📚 Documentation

- **[AI_AUTORUN.md](./AI_AUTORUN.md)** - AI System automatic initialization guide
- **[AI_CAPABILITIES.md](./AI_CAPABILITIES.md)** - Comprehensive AI capabilities guide
- **[SUBDOMAIN_GUIDE.md](./SUBDOMAIN_GUIDE.md)** - Subdomain architecture setup
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Full integration guide
- **[backend/README.md](./backend/README.md)** - Backend quick start
- **[backend/IMPLEMENTATION_GUIDE.md](./backend/IMPLEMENTATION_GUIDE.md)** - Detailed architecture
- **[backend/API_EXAMPLES.md](./backend/API_EXAMPLES.md)** - API usage examples
- **[API.md](./API.md)** - Original API documentation

## 🚢 Deployment

### Frontend
Deploy to Vercel, Netlify, or GitHub Pages:
```bash
# Static files work as-is
# Update API_URL in app.js to point to backend
```

### Backend
Deploy to Vercel, Railway, Render, or VPS:
```bash
cd backend
npm run build
npm start
```

Environment variables required:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Secure random string (32+ chars)
- `STRIPE_*` - Stripe API keys (optional)
- `LLM_*` - LLM configuration (optional)

## 🎯 Use Cases

### Use Case 1: SaaS Platform
- Frontend for end users
- Subscription management
- Freemium model

### Use Case 2: B2B API Provider
- API-first approach
- Organization-based billing
- Enterprise policies

### Use Case 3: Hybrid Model
- Frontend for direct users
- API for business customers
- White-label options

## 🔄 Agent System Features

### Self-Updating Rules
```bash
# Update profanity map without restart
PUT /api/admin/rules/ProfanityTransformer
{
  "rules": {
    "map": {"damn": "darn", "hell": "heck"}
  }
}
# ✅ Changes apply within 1 minute (cache TTL)
```

### Hot-Reload Agents
```bash
# Reload all agents live
POST /api/admin/agents/reload
# ✅ Zero downtime
# ✅ New logic active immediately
```

### Enterprise Policies
```bash
# Apply compliance rules
POST /api/admin/policies
{
  "organizationId": "org_123",
  "rules": {
    "forbid": ["casual", "emoji"],
    "compliance": ["no-profanity"]
  }
}
# ✅ Enforced on all API calls
```

### LLM Safety
```typescript
// Always has fallback
try {
  result = await llm.suggest(text);
} catch {
  result = deterministicFilter(text); // ✅ Safe fallback
}
```

## 🔐 Feature Gating

Backend enforces all feature gating:

```typescript
// Free/Starter users
❌ No AI endpoints available
❌ No API access

// Pro users
✅ Full AI access
```

### Frontend Gating
- AI buttons visible only for Pro users
- Upgrade prompts shown to Free/Starter users

## 📊 Database Schema

**User**
- id, email, passwordHash, role, stripeId, createdAt, updatedAt

**Subscription**
- id, userId, plan (FREE/STARTER/PRO), status, stripeSubscriptionId
- stripeCustomerId, trialEndsAt, currentPeriodStart, currentPeriodEnd

**AdminProfile**
- id, userId, stripePublishableKey, stripeSecretKey, stripeWebhookSecret

**Roles**
- USER (default)
- ADMIN (can manage Stripe, users, config)

## 🚢 Deployment

### Backend (Vercel)

```bash
# Deploy
vercel deploy

# Set environment variables in Vercel dashboard
# Run migrations on Vercel Postgres
```

### Frontend (Vercel/Netlify)

```bash
# Deploy
vercel deploy

# Ensure API_URL points to backend deployment
```

### Custom Server (Node.js)

```bash
# Build backend
npm run build

# Deploy dist/ directory
npm start
```

## 🧪 Testing

### Signup/Login
1. Visit `http://localhost:3001`
2. Click "Start Free"
3. Enter email and password
4. Verify JWT token in localStorage

### Free Plan
1. After signup, user has FREE plan
2. Basic text cleaning works
3. AI buttons hidden

### Trial Checkout
1. Click pricing button
2. Select Starter or Pro
3. Stripe checkout opens
4. Use test card: `4242 4242 4242 4242`
5. Trial status updates after payment

### Admin Panel
1. Login as admin
2. Configure Stripe keys
3. View users and manage access

## 🐛 Common Issues

**"Cannot find module '@prisma/client'"**
```bash
npm install
npm run prisma:generate
```

**Stripe webhook fails**
- Verify webhook secret matches `.env`
- Check endpoint URL is publicly accessible
- Monitor Stripe dashboard for webhook attempts

**Subscription not updating**
- Check webhooks are configured
- Verify timestamps in database
- Monitor backend logs

## 📞 Support

This is a production-ready SaaS platform. All code is:
- ✅ Zero placeholders
- ✅ Zero TODOs
- ✅ Fully functional on first deploy
- ✅ Production-quality security
- ✅ Stripe fully integrated

## 📝 License

© 2026 TextWash • Built by Thomas Bontrager
