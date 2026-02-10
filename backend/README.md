# TextWash Backend - Advanced Agent System

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts              # Main server entry point
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── middleware/
│   │   ├── auth.ts           # JWT & API key authentication
│   │   └── rateLimit.ts      # Rate limiting
│   ├── routes/
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── admin.ts          # Admin management
│   │   └── api.ts            # Public B2B API
│   ├── services/
│   │   ├── ruleLoader.ts     # Self-updating rules with cache
│   │   ├── llm.ts            # LLM service with safety
│   │   ├── agentRegistry.ts  # Agent hot-reload
│   │   └── policyService.ts  # Enterprise policies
│   └── agents/
│       ├── basicAgents.ts    # Deterministic agents
│       └── hybridAgents.ts   # LLM-powered agents
├── prisma/
│   └── schema.prisma         # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

## ✨ Key Features

### 1. Self-Updating Agent Rules
- Rules live in database
- Hot cache with 1-minute TTL
- Version tracking
- Zero-downtime updates

```typescript
// Update rules via API
PUT /api/admin/rules/ProfanityTransformer
{
  "rules": {
    "map": {
      "damn": "darn",
      "hell": "heck"
    }
  }
}

// Agents pick up changes instantly
```

### 2. LLM Hybrid Agents
- Optional AI integration
- Safety controls (timeout, validation)
- Deterministic fallback
- Per-plan enablement

```typescript
// LLM suggests, deterministic logic decides
const suggestion = await system.llm.suggest({
  task: "rewrite professionally",
  text: input
});
const safe = deterministicFilter(suggestion);
```

### 3. Agent Hot-Reload
- File watcher in development
- Manual trigger via admin API
- Zero downtime
- Cache invalidation

```bash
# Trigger reload
POST /api/admin/agents/reload
```

### 4. Enterprise Policy Layers
- Organization-scoped
- Agent filtering
- Compliance validation
- Tone restrictions

```typescript
// Policies filter agents
const filteredAgents = applyPolicies(agents, policies);

// Validate output
const validation = validateAgainstPolicies(text, policies);
```

### 5. B2B API Platform
- API key authentication
- Rate limiting
- Usage tracking
- Confidence scoring

```bash
# Use the API
curl -X POST https://api.textwash.com/v1/clean \
  -H "X-Api-Key: tw_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"text": "your text here"}'
```

## 🔐 Authentication

### JWT Tokens (User Auth)
```bash
# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Use token
Authorization: Bearer eyJhbG...
```

### API Keys (B2B Auth)
```bash
# Create key (admin only)
POST /api/admin/api-keys
{
  "userId": "user_123",
  "organizationId": "org_123",
  "name": "Production Key"
}

# Use key
X-Api-Key: tw_abcdef123456...
```

## 📊 Database Schema

Key models:

- **User**: Users with subscription plans
- **Subscription**: Plan management (FREE/STARTER/PRO/ENTERPRISE)
- **Organization**: Multi-tenant support
- **AgentRule**: Self-updating rules with versioning
- **Policy**: Enterprise policies
- **ApiKey**: API authentication with rate limits
- **UsageRecord**: Metered billing tracking
- **AgentExecution**: Audit log

## 🤖 Available Agents

### Basic Agents
- **WhitespaceNormalizer**: Cleans whitespace
- **PunctuationNormalizer**: Fixes punctuation
- **ProfanityTransformer**: Rule-based profanity filter
- **ClarityTransformer**: Removes filler words

### Hybrid Agents (PRO)
- **HybridRewrite**: AI rewriting with fallback
- **ProfessionalTone**: Professional tone conversion
- **CasualTone**: Casual tone conversion
- **ConciseRewrite**: Concise text generation

## 📡 API Endpoints

### Public API
- `POST /api/v1/clean` - Text cleaning
- `POST /api/v1/rewrite` - AI rewriting
- `POST /api/v1/analyze` - Text analysis
- `POST /api/v1/moderate` - Content moderation

### Admin API
- `GET /api/admin/agents` - List agents
- `POST /api/admin/agents/reload` - Reload agents
- `PUT /api/admin/rules/:agentName` - Update rules
- `POST /api/admin/policies` - Create policy
- `POST /api/admin/api-keys` - Create API key
- `GET /api/admin/usage` - Usage statistics

### Auth API
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

## ⚡ Rate Limiting

- **Global**: 100 requests / 15 minutes (unauthenticated)
- **API Key**: Configurable per key (default 1000/hour)
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 🔧 Development

### Scripts

```bash
npm run dev          # Development mode with hot-reload
npm run build        # Build for production
npm start            # Run production build
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run migrations
npm run prisma:studio     # Open Prisma Studio
```

### Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret (32+ chars)
- `PORT` - Server port (default 3000)

Optional:
- `LLM_ENABLED` - Enable LLM features (true/false)
- `LLM_API_KEY` - OpenAI API key
- `LLM_MAX_TOKENS` - Max tokens per request (default 500)
- `LLM_TIMEOUT` - Request timeout in ms (default 10000)

## 🚀 Production Deployment

1. **Build**:
   ```bash
   npm run build
   ```

2. **Database**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Start**:
   ```bash
   npm start
   ```

4. **Environment**: Set all production environment variables

5. **Monitoring**: Monitor key metrics:
   - API response times
   - Error rates
   - Rate limit hits
   - LLM success rate

## 🧪 Testing

Create a test API key:

```bash
# 1. Create user account
POST /api/auth/signup

# 2. Login as admin
POST /api/auth/login

# 3. Create API key
POST /api/admin/api-keys

# 4. Test the API
curl -X POST http://localhost:3000/api/v1/clean \
  -H "X-Api-Key: tw_xxxxx" \
  -d '{"text": "  Hello    World  "}'
```

## 📚 Documentation

- **Implementation Guide**: See `IMPLEMENTATION_GUIDE.md`
- **API Documentation**: See `../API.md`
- **Agent Development**: See implementation guide

## 🤝 Contributing

1. Create new agents in `src/agents/`
2. Register in `src/services/agentRegistry.ts`
3. Test with hot-reload
4. Update documentation

## 📄 License

© 2026 TextWash • Built by Thomas Bontrager
