# TextWash Advanced Agent System - Implementation Guide

## Overview

This implementation adds a complete B2B API platform to TextWash with self-updating agents, optional LLM integration, hot-reload capabilities, enterprise policy layers, and full API key management.

## Architecture

### Core Components

1. **Self-Updating Agent Rules**
   - Rules stored in database (AgentRule model)
   - Hot cache with 1-minute TTL
   - Version tracking for rollback capability
   - Zero-downtime updates

2. **LLM Hybrid System**
   - Optional LLM integration with safety controls
   - Timeouts (configurable, default 10s)
   - Token limits (configurable, default 500)
   - Deterministic fallback if LLM fails
   - Per-plan enablement

3. **Agent Hot-Reload**
   - File watcher using chokidar
   - Live agent updates without restart
   - Admin API trigger: POST /admin/agents/reload
   - Development mode auto-reload

4. **Enterprise Policy Layers**
   - Organization-scoped policies
   - Compliance rules (profanity, tone, etc.)
   - Agent filtering based on policies
   - Output validation

5. **B2B API Platform**
   - Public API endpoints (/v1/clean, /v1/rewrite, etc.)
   - API key authentication
   - Rate limiting (per organization)
   - Usage tracking for metered billing
   - Confidence scoring

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- (Optional) OpenAI API key for LLM features

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Create `.env` file (use `.env.example` as template):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/textwash
JWT_SECRET=your-super-secret-key-min-32-characters-long
NODE_ENV=development
PORT=3000

# Stripe (existing)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

FRONTEND_URL=http://localhost:3001

# Optional LLM Configuration
LLM_ENABLED=false
LLM_API_KEY=
LLM_API_URL=https://api.openai.com/v1
LLM_MODEL=gpt-3.5-turbo
LLM_MAX_TOKENS=500
LLM_TIMEOUT=10000
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### Running the Server

```bash
# Development mode (with hot-reload)
npm run dev

# Production mode
npm run build
npm start
```

## API Documentation

### Authentication

Two authentication methods:

1. **JWT Token** (for user-facing features)
   - Header: `Authorization: Bearer <token>`
   - Get token from `/api/auth/login`

2. **API Key** (for B2B API access)
   - Header: `X-Api-Key: tw_xxxxx`
   - Create keys via admin panel

### Public API Endpoints

#### POST /api/v1/clean
Basic text cleaning with multiple agents.

**Request:**
```json
{
  "text": "Text to clean",
  "mode": "basic|standard",
  "policies": ["policy-name"]
}
```

**Response:**
```json
{
  "result": "Cleaned text",
  "agentsApplied": ["WhitespaceNormalizer", "PunctuationNormalizer"],
  "confidenceScore": 0.95,
  "metadata": {
    "duration": 42,
    "mode": "standard"
  }
}
```

#### POST /api/v1/rewrite
AI-powered text rewriting (PRO plan required).

**Request:**
```json
{
  "text": "Text to rewrite",
  "mode": "professional|casual|concise"
}
```

**Response:**
```json
{
  "result": "Rewritten text",
  "agentsApplied": ["ProfessionalTone"],
  "confidenceScore": 0.90,
  "metadata": {
    "duration": 1234,
    "mode": "professional",
    "usedLLM": true
  }
}
```

#### POST /api/v1/analyze
Analyze text without modification.

**Request:**
```json
{
  "text": "Text to analyze"
}
```

**Response:**
```json
{
  "length": 150,
  "words": 25,
  "lines": 3,
  "hasWhitespaceIssues": true,
  "hasPunctuationIssues": false,
  "suggestedAgents": ["WhitespaceNormalizer"]
}
```

#### POST /api/v1/moderate
Content moderation based on policies.

**Request:**
```json
{
  "text": "Text to moderate"
}
```

**Response:**
```json
{
  "passed": false,
  "violations": ["Profanity detected"],
  "metadata": {
    "policiesApplied": 2
  }
}
```

### Admin API Endpoints

All admin endpoints require admin authentication.

#### GET /api/admin/agents
List all registered agents.

**Response:**
```json
[
  {
    "name": "ProfanityTransformer",
    "description": "Replaces profanity with appropriate alternatives"
  }
]
```

#### POST /api/admin/agents/reload
Hot-reload all agents.

**Response:**
```json
{
  "success": true,
  "message": "Agents reloaded successfully",
  "agents": ["ProfanityTransformer", "ClarityTransformer"],
  "count": 2
}
```

#### PUT /api/admin/rules/:agentName
Update rules for a specific agent.

**Request:**
```json
{
  "rules": {
    "map": {
      "damn": "darn",
      "hell": "heck"
    }
  },
  "description": "Updated profanity map"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rules updated successfully",
  "agentName": "ProfanityTransformer",
  "version": 2
}
```

#### POST /api/admin/policies
Create a new policy.

**Request:**
```json
{
  "organizationId": "org_123",
  "name": "Enterprise Compliance",
  "type": "compliance",
  "rules": {
    "forbid": ["casual", "emoji"],
    "require": ["professional"],
    "compliance": ["no-profanity", "professional-only"]
  }
}
```

#### POST /api/admin/api-keys
Create a new API key.

**Request:**
```json
{
  "userId": "user_123",
  "organizationId": "org_123",
  "name": "Production API Key",
  "rateLimit": 5000,
  "enabledAgents": ["ProfanityTransformer", "ClarityTransformer"]
}
```

**Response:**
```json
{
  "success": true,
  "apiKey": {
    "id": "key_123",
    "key": "tw_abcdef1234567890...",
    "name": "Production API Key"
  }
}
```

#### GET /api/admin/usage
Get usage statistics.

**Query Parameters:**
- `organizationId` (optional)
- `startDate` (optional, ISO 8601)
- `endDate` (optional, ISO 8601)

**Response:**
```json
{
  "stats": {
    "totalRequests": 1250,
    "byEndpoint": {
      "/v1/clean": 800,
      "/v1/rewrite": 450
    },
    "byAgent": {
      "WhitespaceNormalizer": 1250,
      "ProfessionalTone": 450
    }
  },
  "records": [...]
}
```

## Agents

### Basic Agents (Always Available)

1. **WhitespaceNormalizer**: Normalizes whitespace and line breaks
2. **PunctuationNormalizer**: Fixes quotes, dashes, and spacing
3. **ProfanityTransformer**: Replaces profanity (rule-based)
4. **ClarityTransformer**: Removes filler words

### Hybrid Agents (PRO Plan)

1. **HybridRewrite**: General AI rewriting with fallback
2. **ProfessionalTone**: Convert to professional tone
3. **CasualTone**: Convert to casual tone
4. **ConciseRewrite**: Make text more concise

## Agent Development

### Creating a New Agent

```typescript
import { Agent, SystemContext, AgentResult } from '../types';

export const myAgent: Agent = {
  name: 'MyAgent',
  description: 'What this agent does',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    // Your transformation logic
    const output = input.toUpperCase();
    
    return {
      output,
      changed: output !== input,
      metadata: {
        // Optional metadata
      }
    };
  }
};
```

### Using Live Rules

```typescript
import { getRules } from '../services/ruleLoader';

export const ruleBasedAgent: Agent = {
  name: 'RuleBasedAgent',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    const rules = await getRules('RuleBasedAgent');
    
    // Use rules.map, rules.patterns, etc.
    let output = input;
    for (const [bad, good] of Object.entries(rules.map || {})) {
      output = output.replace(new RegExp(bad, 'gi'), good as string);
    }
    
    return { output, changed: output !== input };
  }
};
```

### Registering Agent

Add to `src/services/agentRegistry.ts`:

```typescript
import { myAgent } from '../agents/myAgent';

export function initializeAgents() {
  AGENTS.set('MyAgent', myAgent);
  // ...
}
```

## Policy System

### Policy Structure

```typescript
interface PolicyRules {
  forbid?: string[];      // Forbidden agent types
  require?: string[];     // Required agent types
  tone?: string[];        // Forbidden tones
  compliance?: string[];  // Compliance rules
}
```

### Example Policies

**Enterprise Professional:**
```json
{
  "forbid": ["casual", "emoji"],
  "require": ["professional"],
  "compliance": ["no-profanity", "professional-only"]
}
```

**Education Safe:**
```json
{
  "compliance": ["no-profanity", "age-appropriate"],
  "tone": ["casual", "slang"]
}
```

## Rate Limiting

### API Key Rate Limits

- Default: 1000 requests/hour
- Configurable per API key
- Headers returned:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### Global Rate Limits

- 100 requests per 15 minutes for unauthenticated requests
- Applies to auth endpoints

## Usage Tracking & Billing

### Usage Records

Every API request creates a usage record:

```prisma
model UsageRecord {
  id          String
  apiKeyId    String
  endpoint    String
  agentsUsed  String[]
  timestamp   DateTime
}
```

### Billing Integration

Use `/api/admin/usage` endpoint to:
1. Fetch usage records by organization
2. Aggregate by time period
3. Send to Stripe for metered billing

Example integration:

```typescript
const usage = await fetch('/api/admin/usage?organizationId=org_123&startDate=2026-02-01');
const data = await usage.json();

// Report to Stripe
stripe.subscriptionItems.createUsageRecord(subItemId, {
  quantity: data.stats.totalRequests,
  timestamp: 'now'
});
```

## Security Best Practices

1. **Environment Variables**: Never commit `.env` file
2. **API Keys**: Generate cryptographically secure keys
3. **Rate Limiting**: Protect against abuse
4. **Input Validation**: Validate all user inputs
5. **LLM Safety**: Always use timeouts and output validation
6. **Database**: Use parameterized queries (Prisma handles this)
7. **JWT Secrets**: Use strong, random secrets (32+ chars)

## Production Deployment

### Build

```bash
npm run build
```

### Environment

Ensure all environment variables are set:
- `DATABASE_URL`
- `JWT_SECRET`
- `STRIPE_*` keys
- `LLM_*` config (if using LLM)

### Run

```bash
npm start
```

### Database Migration

```bash
npx prisma migrate deploy
```

### Monitoring

Key metrics to monitor:
- API response times
- Error rates
- Rate limit hits
- LLM timeout frequency
- Agent execution duration
- Database connection pool

## Troubleshooting

### Agent Hot-Reload Not Working

- Check file watcher is running (development mode)
- Verify agent files are in `src/agents/`
- Try manual reload: `POST /api/admin/agents/reload`

### LLM Timeouts

- Increase `LLM_TIMEOUT` in environment
- Check LLM API status
- Verify network connectivity
- Fallback is automatic

### Rate Limit Issues

- Check API key rate limit setting
- Verify organization usage
- Use burst allowance wisely

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure migrations are applied
- Connection pool may be exhausted

## Future Enhancements

1. **Agent Marketplace**: Allow users to install community agents
2. **Self-Scoring**: Agents evaluate their own confidence
3. **White-Label SDK**: Client libraries for major languages
4. **On-Prem Deploy**: Docker compose for enterprise
5. **AI Governance Dashboard**: Monitor AI usage and compliance
6. **Multi-LLM Support**: Support multiple LLM providers
7. **Streaming Responses**: Real-time processing for long texts
8. **Batch Processing**: Process multiple texts in one request
9. **Webhooks**: Notify on policy violations
10. **Agent Analytics**: Track agent performance and usage

## Support

For questions or issues:
- GitHub Issues: https://github.com/thomasbontrager/textwash/issues
- Documentation: See README.md and API.md

## License

© 2026 TextWash • Built by Thomas Bontrager
