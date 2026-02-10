# API Usage Examples

This document provides practical examples for using the TextWash B2B API.

## Quick Start

### 1. Create an Account

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

Response:
```json
{
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "role": "USER",
    "subscription": {
      "plan": "FREE",
      "status": "ACTIVE"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Create an API Key (Admin Only)

First, promote your user to admin in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'user@example.com';
```

Then create an organization and API key:

```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }' | jq -r '.token')

# Create organization (via Prisma Studio or SQL)
# Then create API key
curl -X POST http://localhost:3000/api/admin/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "organizationId": "your-org-id",
    "name": "Development Key",
    "rateLimit": 1000
  }'
```

## API Examples

### Basic Text Cleaning

```bash
curl -X POST http://localhost:3000/api/v1/clean \
  -H "X-Api-Key: tw_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "  Hello    World  \n\n\n  How   are   you?  ",
    "mode": "basic"
  }'
```

Response:
```json
{
  "result": "Hello World\n\nHow are you?",
  "agentsApplied": [
    "WhitespaceNormalizer",
    "PunctuationNormalizer"
  ],
  "confidenceScore": 0.95,
  "metadata": {
    "duration": 15,
    "mode": "basic"
  }
}
```

### Standard Cleaning (with Profanity Filter)

```bash
curl -X POST http://localhost:3000/api/v1/clean \
  -H "X-Api-Key: tw_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This damn thing is not working, what the hell!",
    "mode": "standard"
  }'
```

Response:
```json
{
  "result": "This darn thing is not working, what the heck!",
  "agentsApplied": [
    "WhitespaceNormalizer",
    "PunctuationNormalizer",
    "ProfanityTransformer",
    "ClarityTransformer"
  ],
  "confidenceScore": 0.95,
  "metadata": {
    "duration": 28
  }
}
```

### AI Rewriting (PRO Plan Required)

```bash
# Professional tone
curl -X POST http://localhost:3000/api/v1/rewrite \
  -H "X-Api-Key: tw_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hey, can you help me with this thing?",
    "mode": "professional"
  }'
```

Response:
```json
{
  "result": "Could you please assist me with this matter?",
  "agentsApplied": ["ProfessionalTone"],
  "confidenceScore": 0.90,
  "metadata": {
    "duration": 1234,
    "mode": "professional",
    "tone": "professional",
    "usedLLM": true
  }
}
```

### Text Analysis

```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "X-Api-Key: tw_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is  a   sample text with   extra    spaces."
  }'
```

Response:
```json
{
  "length": 51,
  "words": 9,
  "lines": 1,
  "hasWhitespaceIssues": true,
  "hasPunctuationIssues": false,
  "suggestedAgents": ["WhitespaceNormalizer"]
}
```

### Content Moderation

```bash
curl -X POST http://localhost:3000/api/v1/moderate \
  -H "X-Api-Key: tw_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This damn text contains profanity."
  }'
```

Response:
```json
{
  "passed": false,
  "violations": ["Profanity detected"],
  "metadata": {
    "policiesApplied": 0
  }
}
```

## Admin API Examples

### List All Agents

```bash
curl -X GET http://localhost:3000/api/admin/agents \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
[
  {
    "name": "ProfanityTransformer",
    "description": "Replaces profanity with appropriate alternatives"
  },
  {
    "name": "ClarityTransformer",
    "description": "Improves text clarity and readability"
  }
]
```

### Update Agent Rules

```bash
curl -X PUT http://localhost:3000/api/admin/rules/ProfanityTransformer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": {
      "map": {
        "damn": "darn",
        "hell": "heck",
        "crap": "crud",
        "stupid": "silly"
      }
    },
    "description": "Updated profanity map with more words"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Rules updated successfully",
  "agentName": "ProfanityTransformer",
  "version": 2
}
```

### Hot-Reload Agents

```bash
curl -X POST http://localhost:3000/api/admin/agents/reload \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "message": "Agents reloaded successfully",
  "agents": [
    "ProfanityTransformer",
    "ClarityTransformer",
    "WhitespaceNormalizer",
    "PunctuationNormalizer",
    "HybridRewrite",
    "ProfessionalTone",
    "CasualTone",
    "ConciseRewrite"
  ],
  "count": 8
}
```

### Create Enterprise Policy

```bash
curl -X POST http://localhost:3000/api/admin/policies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_123",
    "name": "Enterprise Compliance",
    "type": "compliance",
    "rules": {
      "forbid": ["casual", "emoji"],
      "require": ["professional"],
      "compliance": ["no-profanity", "professional-only"]
    }
  }'
```

### View Usage Statistics

```bash
# All usage
curl -X GET http://localhost:3000/api/admin/usage \
  -H "Authorization: Bearer $TOKEN"

# By organization
curl -X GET "http://localhost:3000/api/admin/usage?organizationId=org_123" \
  -H "Authorization: Bearer $TOKEN"

# Date range
curl -X GET "http://localhost:3000/api/admin/usage?startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer $TOKEN"
```

Response:
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
      "ProfessionalTone": 450,
      "ProfanityTransformer": 800
    }
  },
  "records": [...]
}
```

## Rate Limiting

All API responses include rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 994
X-RateLimit-Reset: 2026-02-10T16:00:00.000Z
```

When rate limit is exceeded:

```json
{
  "error": "Rate limit exceeded",
  "limit": 1000,
  "resetAt": "2026-02-10T16:00:00.000Z"
}
```

## Error Handling

### 400 Bad Request
```json
{
  "error": "Text is required"
}
```

### 401 Unauthorized
```json
{
  "error": "No API key provided"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient plan",
  "required": ["PRO", "ENTERPRISE"],
  "current": "FREE"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "limit": 1000,
  "resetAt": "2026-02-10T16:00:00.000Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "Processing failed"
}
```

## JavaScript/Node.js Example

```javascript
const axios = require('axios');

const API_KEY = 'tw_your_api_key';
const BASE_URL = 'http://localhost:3000/api';

async function cleanText(text, mode = 'standard') {
  try {
    const response = await axios.post(`${BASE_URL}/v1/clean`, {
      text,
      mode
    }, {
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else {
      console.error('Network Error:', error.message);
    }
    throw error;
  }
}

// Usage
(async () => {
  const result = await cleanText('  Hello   World  ');
  console.log('Cleaned:', result.result);
  console.log('Agents:', result.agentsApplied);
})();
```

## Python Example

```python
import requests

API_KEY = 'tw_your_api_key'
BASE_URL = 'http://localhost:3000/api'

def clean_text(text, mode='standard'):
    response = requests.post(
        f'{BASE_URL}/v1/clean',
        json={
            'text': text,
            'mode': mode
        },
        headers={
            'X-Api-Key': API_KEY,
            'Content-Type': 'application/json'
        }
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f'API Error: {response.json()}')

# Usage
result = clean_text('  Hello   World  ')
print('Cleaned:', result['result'])
print('Agents:', result['agentsApplied'])
```

## Testing with curl Script

Save this as `test-api.sh`:

```bash
#!/bin/bash

API_KEY="tw_your_api_key"
BASE_URL="http://localhost:3000/api"

echo "Testing TextWash API..."
echo ""

# Test 1: Basic cleaning
echo "1. Basic cleaning:"
curl -X POST "$BASE_URL/v1/clean" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "  Hello    World  ", "mode": "basic"}' \
  | jq '.'

echo ""
echo "2. Text analysis:"
curl -X POST "$BASE_URL/v1/analyze" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Sample text"}' \
  | jq '.'

echo ""
echo "3. Content moderation:"
curl -X POST "$BASE_URL/v1/moderate" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Clean text"}' \
  | jq '.'

echo ""
echo "Tests complete!"
```

Make it executable and run:
```bash
chmod +x test-api.sh
./test-api.sh
```
