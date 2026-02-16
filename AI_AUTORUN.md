# AI System Autorun Feature

## Overview

The AI System Autorun feature provides comprehensive automatic initialization of all AI subsystems when the TextWash backend server starts. This ensures that the AI core, providers, tools, memory system, and reasoning modes are properly configured, validated, and ready for use.

## Architecture

### Components

1. **AIInitializer** (`/backend/src/ai/core/ai-initializer.ts`)
   - Main initialization orchestrator
   - Validates configuration
   - Tests provider connectivity
   - Reports system status

2. **Integration Points**
   - Server startup (`/backend/src/server.ts`)
   - AI routes (`/backend/src/routes/ai.ts`)
   - Tool registry
   - Memory service
   - Provider factory

## Features

### 1. Automatic Initialization

The AI system automatically initializes when the server starts, performing the following steps:

```typescript
1. Check feature flags (FEATURE_AI_CORE, FEATURE_AGENT_SYSTEM)
2. Initialize and validate AI provider (OpenAI/Anthropic)
3. Initialize tool registry
4. Initialize memory system
5. Validate reasoning modes
6. Report comprehensive status
```

### 2. Provider Validation

- Checks for configured provider (OpenAI or Anthropic)
- Validates API key presence and format
- Tests provider interface integrity
- Reports health status

### 3. Configuration Validation

Validates the following environment variables:

```bash
# Required for AI features
FEATURE_AI_CORE=true
FEATURE_AGENT_SYSTEM=true
AI_PROVIDER=openai

# Provider configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
# OR
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### 4. Status Reporting

Provides comprehensive initialization status including:

- System enabled/disabled state
- Provider name and health
- Number of registered tools
- Memory system readiness
- Available reasoning modes
- Errors and warnings

### 5. Public Status Endpoint

```http
GET /api/ai/status
```

Returns public system status (no authentication required):

```json
{
  "enabled": true,
  "healthy": true,
  "provider": "openai",
  "toolsAvailable": 1,
  "reasoningModes": 10,
  "initialized": true
}
```

## Usage

### Server Startup

The autorun feature is automatically invoked during server startup:

```typescript
// In server.ts
async function startServer() {
  await prisma.$connect();
  console.log('Database connected');
  
  // AI system autorun
  await AIInitializer.initialize();
  
  app.listen(PORT, () => {
    console.log('Server running...');
  });
}
```

### Checking Status Programmatically

```typescript
import { AIInitializer } from './ai/core/ai-initializer';

// Get current status
const status = AIInitializer.getStatus();

// Check if initialized
const ready = AIInitializer.isInitialized();
```

### Testing

Run the autorun test:

```bash
cd backend
npx ts-node test/test-autorun.ts
```

Expected output:

```
🧠 AI System Initialization Complete

Status Summary:
  AI System Enabled: ✅
  Provider: openai
  Provider Healthy: ✅
  Tools Registered: 1
  Memory System: ✅
  Reasoning Modes: 10

✅ All systems operational
```

## Configuration

### Enabling AI Features

Set in `.env`:

```bash
# Enable AI systems
FEATURE_AI_CORE=true
FEATURE_AGENT_SYSTEM=true

# Configure provider
AI_PROVIDER=openai
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4
```

### Disabling AI Features

Set in `.env`:

```bash
FEATURE_AI_CORE=false
FEATURE_AGENT_SYSTEM=false
```

When disabled, initialization will skip AI setup and log:

```
ℹ️  AI systems disabled via feature flags
```

## Error Handling

### Graceful Degradation

The autorun feature handles errors gracefully:

1. **Missing API Keys**: Warns but doesn't crash
2. **Invalid Configuration**: Logs warnings, system remains functional
3. **Provider Errors**: Marks provider as unhealthy but continues
4. **Critical Errors**: Logged to console with full error details

### Example Warning Output

```
⚠️  Warnings:
  - AI provider not configured - missing API keys. AI features will be unavailable.
  - No OpenAI model specified, will use provider default
```

### Example Error Output

```
❌ Errors:
  - Failed to initialize AI provider: Invalid provider configuration
```

## Status Response Structure

```typescript
interface AISystemStatus {
  enabled: boolean;              // AI features enabled via feature flags
  provider: string | null;       // Provider name (openai/anthropic)
  providerHealthy: boolean;      // Provider health check status
  toolsRegistered: number;       // Number of registered tools
  memorySystemReady: boolean;    // Memory system initialization status
  reasoningModesAvailable: string[]; // List of available reasoning modes
  errors: string[];              // Critical errors
  warnings: string[];            // Non-critical warnings
}
```

## Reasoning Modes

The following reasoning modes are automatically validated and made available:

1. **conversation** - General chat and dialogue
2. **summarization** - Text summarization
3. **translation** - Language translation
4. **rewriting** - Text rewriting and style adjustment
5. **planning** - Task planning and decomposition
6. **code_reasoning** - Code understanding and generation
7. **data_analysis** - Data interpretation
8. **step_by_step** - Step-by-step reasoning
9. **structured_output** - JSON schema-based output
10. **tool_use** - Tool execution and orchestration

## Security

### API Key Protection

- API keys are never exposed in status responses
- Only validation of key presence/format is performed
- No actual API calls made during initialization (to avoid costs)

### Public Status Endpoint

The `/api/ai/status` endpoint is intentionally public to allow:
- Health monitoring
- Service availability checks
- Integration testing

Sensitive information (errors, warnings, detailed config) is filtered out for non-admin users.

## Monitoring

### Health Checks

Use the status endpoint for monitoring:

```bash
curl http://localhost:3000/api/ai/status
```

### Logging

All initialization steps are logged to console:

```
✅ AI Provider initialized: openai
✅ AI Provider health check passed
✅ Tool registry initialized with 1 tools
✅ Memory system initialized
✅ Reasoning modes available
```

## Troubleshooting

### Problem: AI features not available

**Solution**: Check feature flags in `.env`:
```bash
FEATURE_AI_CORE=true
FEATURE_AGENT_SYSTEM=true
```

### Problem: Provider unhealthy

**Solution**: Verify API key configuration:
```bash
OPENAI_API_KEY=sk-...  # Must be valid key
```

### Problem: No tools registered

**Solution**: Check tool initialization in `tool-initializer.ts` and ensure feature flags are enabled.

### Problem: Memory system not ready

**Solution**: Verify database connection and Prisma client generation:
```bash
npm run prisma:generate
```

## Future Enhancements

Potential future improvements:

1. **Actual Provider Testing**: Optional real API calls to validate connectivity
2. **Tool Hot-Reload**: Dynamic tool registration without restart
3. **Multi-Provider Support**: Simultaneous multiple providers
4. **Advanced Health Checks**: Periodic background health monitoring
5. **Metrics Export**: Prometheus/Grafana integration
6. **Admin Dashboard**: Visual status monitoring

## Related Documentation

- [AI Capabilities](../../AI_CAPABILITIES.md)
- [Implementation Guide](./backend/IMPLEMENTATION_GUIDE.md)
- [API Documentation](../../API.md)
- [Feature Flags](../../FEATURE_FLAG_SYSTEM.md)

## Version History

- **v1.0.0** (2026-02-16): Initial autorun implementation
  - Comprehensive initialization
  - Provider validation
  - Status endpoint
  - Error handling
  - Documentation
