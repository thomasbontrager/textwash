# TextWash - Complete Integration Guide

This guide shows how to integrate the frontend and backend together.

## Architecture Overview

```
TextWash/
├── Frontend (HTML/CSS/JS)
│   ├── User interface
│   ├── Stripe integration
│   └── Basic text cleaning (client-side)
│
└── Backend (Node.js/TypeScript)
    ├── Advanced agent system
    ├── B2B API platform
    ├── Enterprise policies
    └── Database (PostgreSQL)
```

## Quick Start (Full Stack)

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required:
# - DATABASE_URL
# - JWT_SECRET (32+ characters)

# Run setup script
chmod +x setup.sh
./setup.sh

# Start backend
npm run dev
```

Backend will run on `http://localhost:3000`

### 2. Frontend Setup

The frontend is a static HTML/CSS/JS application.

```bash
# Navigate to frontend
cd ..

# Update app.js with backend URL
# Edit line 4: const API_URL = 'http://localhost:3000/api';

# Serve with any static server
# Option 1: Python
python3 -m http.server 3001

# Option 2: Node.js
npx http-server -p 3001

# Option 3: VS Code Live Server extension
```

Frontend will run on `http://localhost:3001`

### 3. Create First Admin User

```bash
# 1. Sign up through UI at http://localhost:3001
# 2. Use Prisma Studio to promote to admin
cd backend
npm run prisma:studio

# 3. In Prisma Studio:
#    - Open "User" table
#    - Find your user
#    - Change "role" from "USER" to "ADMIN"
#    - Save changes
```

### 4. Create Organization and API Key

```bash
# 1. In Prisma Studio, create an organization:
#    - Open "Organization" table
#    - Click "Add record"
#    - Set name: "My Company"
#    - Save and note the ID

# 2. Link your user to the organization:
#    - Open "User" table
#    - Edit your user
#    - Set organizationId to the org ID
#    - Save

# 3. Create API key via API:
curl -X POST http://localhost:3000/api/admin/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "organizationId": "YOUR_ORG_ID",
    "name": "Development Key",
    "rateLimit": 1000
  }'
```

## Frontend Integration Options

### Option 1: Use Existing Frontend with Backend

The current frontend does client-side text cleaning. You can:

1. **Keep it as-is**: Works without backend
2. **Add API calls**: Integrate backend APIs for advanced features

Example integration in `app.js`:

```javascript
// Add after line 378 (in attachEventListeners function)
document.getElementById('advancedCleanBtn')?.addEventListener('click', async () => {
  const input = document.getElementById('input');
  const output = document.getElementById('output');
  
  try {
    const response = await fetch(`${API_URL}/v1/clean`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        text: input.value,
        mode: 'standard'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      output.value = data.result;
      console.log('Agents applied:', data.agentsApplied);
    }
  } catch (error) {
    console.error('API error:', error);
    // Fallback to client-side cleaning
    output.value = cleanText(input.value);
  }
});
```

### Option 2: B2B API Integration (Headless)

Use the backend as a pure API platform:

```javascript
const TextWashAPI = {
  apiKey: 'tw_your_api_key',
  baseUrl: 'https://api.textwash.com',
  
  async clean(text, mode = 'standard') {
    const response = await fetch(`${this.baseUrl}/v1/clean`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, mode })
    });
    return response.json();
  },
  
  async rewrite(text, mode = 'professional') {
    const response = await fetch(`${this.baseUrl}/v1/rewrite`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, mode })
    });
    return response.json();
  }
};

// Usage
const result = await TextWashAPI.clean('  Hello   World  ');
console.log(result.result);
```

## Deployment Scenarios

### Scenario 1: Frontend Only (Current Setup)

- Deploy frontend to: Vercel, Netlify, GitHub Pages
- No backend needed
- Client-side text cleaning works immediately

### Scenario 2: Full Stack (Recommended)

#### Backend Deployment

**Option A: Vercel/Railway/Render**
```bash
cd backend
npm run build

# Deploy dist/ folder
# Set environment variables in dashboard
# Ensure PostgreSQL database is provisioned
```

**Option B: VPS/Cloud Server**
```bash
# On server
git clone https://github.com/yourusername/textwash.git
cd textwash/backend
npm install
npm run build

# Setup systemd service
sudo nano /etc/systemd/system/textwash.service

# Add:
[Unit]
Description=TextWash Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/textwash/backend
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable textwash
sudo systemctl start textwash
```

#### Frontend Deployment

Update `app.js` to point to production backend:

```javascript
const API_URL = 'https://api.yourdomain.com/api';
```

Deploy to static hosting (Vercel, Netlify, etc.)

### Scenario 3: B2B API Platform (No Frontend)

Deploy backend only and provide API to customers:

1. Deploy backend to production
2. Create organizations for customers
3. Generate API keys
4. Provide API documentation
5. Monitor usage via `/api/admin/usage`

## Environment Configuration

### Development

**Backend `.env`:**
```env
DATABASE_URL=postgresql://localhost:5432/textwash
JWT_SECRET=dev-secret-key-min-32-chars-long
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Optional: Enable LLM features
LLM_ENABLED=false
LLM_API_KEY=
```

**Frontend `app.js`:**
```javascript
const API_URL = 'http://localhost:3000/api';
```

### Production

**Backend `.env`:**
```env
DATABASE_URL=postgresql://user:pass@prod-db:5432/textwash
JWT_SECRET=super-secure-random-string-32-chars-min
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://textwash.com

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# LLM (optional)
LLM_ENABLED=true
LLM_API_KEY=sk-xxxxx
LLM_MAX_TOKENS=500
LLM_TIMEOUT=10000
```

**Frontend `app.js`:**
```javascript
const API_URL = 'https://api.yourdomain.com/api';
const STRIPE_PUBLISHABLE_KEY = 'pk_live_xxxxx';
```

## Feature Availability

| Feature | Frontend Only | With Backend |
|---------|--------------|--------------|
| Basic text cleaning | ✅ | ✅ |
| User authentication | ✅ | ✅ |
| Stripe subscriptions | ✅ | ✅ |
| Advanced agents | ❌ | ✅ |
| Self-updating rules | ❌ | ✅ |
| LLM rewriting | ❌ | ✅ |
| Enterprise policies | ❌ | ✅ |
| B2B API access | ❌ | ✅ |
| Usage tracking | ❌ | ✅ |
| Hot-reload agents | ❌ | ✅ |

## Testing the Integration

### 1. Test Frontend Alone

```bash
# Open http://localhost:3001
# Sign up and test basic cleaning
# Should work without backend
```

### 2. Test Backend Alone

```bash
# Use API examples from backend/API_EXAMPLES.md
curl -X POST http://localhost:3000/api/v1/clean \
  -H "X-Api-Key: tw_your_key" \
  -d '{"text": "test"}'
```

### 3. Test Full Integration

```bash
# 1. Backend running on :3000
# 2. Frontend running on :3001
# 3. Create account through frontend
# 4. Get JWT token from localStorage
# 5. Use token to call backend APIs
```

## Troubleshooting

### CORS Errors

If frontend can't reach backend:

1. Check `FRONTEND_URL` in backend `.env`
2. Ensure CORS is configured in `server.ts`
3. Use browser devtools to see CORS errors

### Database Connection

If backend won't start:

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Test connection string
cd backend
npx prisma studio
```

### API Authentication

If API calls fail with 401:

1. Check JWT token is valid
2. Verify API key is correct
3. Check rate limits haven't been hit

### Agent Hot-Reload Not Working

1. Ensure development mode: `NODE_ENV=development`
2. Check file watcher is running (console output)
3. Try manual reload: `POST /api/admin/agents/reload`

## Monitoring & Maintenance

### Health Check

```bash
curl http://localhost:3000/health
```

### View Logs

```bash
# Development
npm run dev  # Logs to console

# Production
journalctl -u textwash -f  # If using systemd
```

### Database Backups

```bash
# Backup
pg_dump -U postgres textwash > backup.sql

# Restore
psql -U postgres textwash < backup.sql
```

### Update Agent Rules

```bash
# Via API
curl -X PUT http://localhost:3000/api/admin/rules/ProfanityTransformer \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"rules": {...}}'

# Rules update instantly (1-minute cache)
```

## Next Steps

1. **Add More Agents**: Create custom agents in `backend/src/agents/`
2. **Implement Policies**: Define organization-specific rules
3. **Enable LLM**: Add OpenAI API key for AI features
4. **Set Up Billing**: Configure Stripe metered billing with usage data
5. **Monitor Usage**: Use admin dashboard to track API usage
6. **Scale**: Add load balancer and multiple backend instances

## Support

- **Backend Issues**: See `backend/IMPLEMENTATION_GUIDE.md`
- **API Usage**: See `backend/API_EXAMPLES.md`
- **Frontend Issues**: See root `README.md`
- **Database**: See Prisma documentation

## License

© 2026 TextWash • Built by Thomas Bontrager
