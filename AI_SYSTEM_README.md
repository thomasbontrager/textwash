# TextWash AI Capability Expansion Layer

## Overview

This document describes the AI capability expansion layer for TextWash, a production-grade modular AI framework integrated into the existing TextWash SaaS platform.

## Architecture

### Core Components

```
/src/ai
  /core
    - types.ts              # Core AI types and interfaces
    - provider.factory.ts   # AI provider factory
    - ai.service.ts         # Main AI service with usage tracking
    - tool-initializer.ts   # Tool registration
  /providers
    - openai.provider.ts    # OpenAI implementation
    - anthropic.provider.ts # Anthropic (Claude) implementation
  /memory
    - memory.service.ts     # Short-term and long-term memory
  /agents
    - agent.service.ts      # Agent orchestration
    - tool.registry.ts      # Tool registry
    - tool.executor.ts      # Tool execution engine
    - tool.types.ts         # Tool type definitions
    /tools
      - web-search.tool.ts  # Example web search tool
/src/routes
  - ai.ts                   # AI API endpoints
```

## Features

### 1. AI Provider Abstraction

The system supports multiple AI providers through a unified interface:

- **OpenAI** (GPT-4, GPT-3.5-turbo, etc.)
- **Anthropic** (Claude 3 Opus, Sonnet, Haiku)

Providers are selected via environment configuration:

```env
AI_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
ANTHROPIC_API_KEY=sk-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### 2. Memory System

**Short-term Memory (Session-based)**
- Stores conversation context for active sessions
- Automatically managed with cleanup
- Limited to last 20 messages per session

**Long-term Memory (Persistent)**
- User preferences and learned information
- Flexible key-value storage with JSON values
- Confidence scoring and access tracking
- Plan-gated storage limits

### 3. Agent Tool System

**Tool Registry**
- Central registration of all tools
- Plan-based access control (FREE, STARTER, PRO, ENTERPRISE)
- Category organization (WEB, SYSTEM, FILE, MEDIA, DATA)
- Tool discovery and listing

**Tool Executor**
- Input validation using JSON Schema
- Output validation
- Input sanitization for security
- Rate limiting per tool
- Comprehensive execution logging
- Cost tracking

**Available Tool Categories:**
- **Web**: Search, URL ingestion, RAG document retrieval
- **System**: Database queries, Python sandbox, chart generation
- **File**: PDF/CSV/DOCX readers and generators
- **Media**: Image generation, text-to-speech, video creation

### 4. Usage Tracking & Billing

All AI operations are automatically tracked:

```typescript
{
  userId: string,
  subscriptionId: string,
  planId: string,
  model: string,
  tokenCount: number,
  costEstimate: number,
  operation: string,
  featureType: string,
  executionTime: number,
  metadata: object
}
```

## API Endpoints

### Chat with AI

```http
POST /api/ai/chat
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "message": "Hello, what can you help me with?",
  "sessionId": "optional-session-id",
  "useTools": true,
  "systemPrompt": "You are a helpful assistant"
}
```

Response:
```json
{
  "response": "I can help you with...",
  "toolsUsed": ["web_search"],
  "sessionId": "session-123"
}
```

### Create a Plan

```http
POST /api/ai/plan
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "task": "Build a marketing campaign",
  "context": "For a SaaS product"
}
```

Response:
```json
{
  "plan": {
    "goal": "Create comprehensive marketing campaign",
    "steps": [
      {
        "step": 1,
        "action": "Market research",
        "description": "...",
        "estimatedTime": "2 days"
      }
    ],
    "resources": ["Social media", "Email marketing"]
  },
  "steps": ["Market research", "Content creation", ...]
}
```

### Execute a Tool

```http
POST /api/ai/tools/execute
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "toolName": "web_search",
  "input": {
    "query": "latest AI trends 2024",
    "maxResults": 5
  }
}
```

Response:
```json
{
  "success": true,
  "output": {
    "results": [
      {
        "title": "...",
        "snippet": "...",
        "url": "..."
      }
    ],
    "summary": "AI summary of results"
  },
  "metadata": {
    "executionTime": 1500,
    "tokenCount": 300,
    "cost": 0.01
  }
}
```

### List Available Tools

```http
GET /api/ai/tools
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "tools": [
    {
      "name": "web_search",
      "description": "Search the web and return summarized results",
      "category": "web",
      "requiredPlans": ["PRO", "ENTERPRISE"],
      "rateLimitPerHour": 50,
      "costPerExecution": 0.01
    }
  ]
}
```

### Get Usage Statistics

```http
GET /api/ai/usage?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "ai": {
    "logs": [...],
    "totalTokens": 50000,
    "totalCost": 5.25,
    "totalRequests": 150
  },
  "tools": {
    "executions": [...],
    "totalTokens": 10000,
    "totalCost": 1.50,
    "totalExecutionTime": 45000,
    "totalExecutions": 50
  }
}
```

### Store User Memory

```http
POST /api/ai/memory
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "memoryType": "preference",
  "key": "writing_style",
  "value": "professional and concise",
  "confidence": 0.9,
  "source": "user_feedback"
}
```

### Retrieve User Memory

```http
GET /api/ai/memory?memoryType=preference
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "memories": [
    {
      "id": "...",
      "userId": "...",
      "memoryType": "preference",
      "key": "writing_style",
      "value": "professional and concise",
      "confidence": 0.9,
      "lastAccessed": "2024-01-15T10:30:00Z",
      "accessCount": 5
    }
  ]
}
```

## Database Models

### AIUsageLog
Tracks all AI API calls with token usage and cost estimation.

### ToolExecution
Logs every tool execution with input, output, success status, and metadata.

### UserMemory
Stores long-term user preferences and learned information.

### MediaAsset
Tracks generated images, audio, and video files.

### VideoJob
Manages video generation pipeline state with resumable steps.

### AutomationTask
Scheduled and triggered AI tasks for automation.

## Security Features

### Input Sanitization
All tool inputs are sanitized to prevent:
- XSS attacks
- Script injection
- SQL injection (when applicable)

### Rate Limiting
- Global rate limit: 100 requests per 15 minutes
- Per-tool rate limits (configurable)
- Per-user tracking

### Plan-Based Access Control
Tools require specific subscription plans:
```typescript
{
  requiredPlans: ['PRO', 'ENTERPRISE']
}
```

### Output Validation
All tool outputs are validated against JSON schemas.

## Creating New Tools

To add a new tool:

1. **Create tool class** implementing `Tool` interface:

```typescript
import {
  Tool,
  ToolDefinition,
  ToolCategory,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../tool.types';

export class MyCustomTool implements Tool {
  definition: ToolDefinition = {
    name: 'my_tool',
    description: 'Description of what the tool does',
    category: ToolCategory.WEB,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    },
    outputSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' }
      }
    },
    requiredPlans: ['PRO', 'ENTERPRISE'],
    rateLimitPerHour: 100,
    costPerExecution: 0.005,
  };

  async execute(
    input: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      // Implement tool logic here
      const result = await performSomeOperation(input);
      
      return {
        success: true,
        output: result,
        metadata: {
          executionTime: 0,
          cost: 0.005,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: 0,
        },
      };
    }
  }
}
```

2. **Register the tool** in `tool-initializer.ts`:

```typescript
import { MyCustomTool } from '../agents/tools/my-custom.tool';

export function initializeTools(): void {
  ToolRegistry.register(new MyCustomTool());
  // ... other tools
}
```

## Feature Flags

Control AI features with environment variables:

```env
FEATURE_AI_CORE=true           # Core AI engine
FEATURE_AGENT_SYSTEM=true      # Agent tool system
FEATURE_VIDEO=false            # Video generation
FEATURE_AVATAR=false           # Avatar creation
FEATURE_AUDIO=false            # Audio synthesis
FEATURE_RAG=false              # RAG document retrieval
```

## Cost Management

### Token Estimation
The system automatically estimates token usage and costs for all operations.

### Cost Tracking
All operations log:
- Token count (actual or estimated)
- Cost estimate based on model pricing
- Execution time

### Plan Limits
Enforce usage limits per plan:
```typescript
{
  FREE: { tokensPerMonth: 10000 },
  STARTER: { tokensPerMonth: 100000 },
  PRO: { tokensPerMonth: 1000000 },
  ENTERPRISE: { tokensPerMonth: -1 } // Unlimited
}
```

## Testing

### Manual Testing

1. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

2. **Start the server:**
```bash
npm run dev
```

3. **Test AI chat:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "useTools": false}'
```

## Next Steps

### Immediate Priorities
1. Implement queue system (BullMQ) for async operations
2. Add remaining tools (file processing, media generation)
3. Build video generation pipeline
4. Create frontend UI components
5. Add comprehensive test suite

### Future Enhancements
1. Multi-agent collaboration
2. Custom model fine-tuning
3. Advanced RAG with vector databases
4. Real-time streaming responses
5. Voice interface integration

## Support

For questions or issues:
- Review the implementation code in `/src/ai`
- Check logs for execution errors
- Monitor usage via `/api/ai/usage` endpoint

## License

This is part of the TextWash platform. All rights reserved.
