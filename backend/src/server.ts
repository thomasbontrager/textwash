import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { globalLimiter } from './middleware/rateLimit';
import { extractSubdomain, requireSubdomain, getSubdomainUrl } from './middleware/subdomain';
import { startAgentHotReload } from './services/agentRegistry';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import apiRoutes from './routes/api';
import stripeRoutes from './routes/stripe';
import billingRoutes from './routes/billing';
import subscriptionsRoutes from './routes/subscriptions';
import pricingPlansRoutes from './routes/pricing-plans';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Extract subdomain before other middleware
app.use(extractSubdomain);

// Middleware - CORS for multiple subdomains
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3001',
  getSubdomainUrl(''),        // textwash.app
  getSubdomainUrl('api'),     // api.textwash.app
  getSubdomainUrl('billing'), // billing.textwash.app
  getSubdomainUrl('admin'),   // admin.textwash.app
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    
    // Allow any subdomain of textwash.app in production
    if (process.env.NODE_ENV === 'production' && origin.endsWith('.textwash.app')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Stripe webhook route - must be before express.json() middleware
// to get raw body for signature verification
app.use('/api/stripe', stripeRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiter
app.use(globalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Subdomain-based routing
// API Routes - available on api.textwash.app (and root for backwards compatibility)
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/billing', requireSubdomain(['billing', 'api', '']), billingRoutes);
app.use('/api/admin', requireSubdomain(['admin', 'api', '']), adminRoutes);
app.use('/api/admin/pricing-plans', requireSubdomain(['admin', 'api', '']), pricingPlansRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected');
    
    // Start agent hot-reload in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Starting agent hot-reload...');
      startAgentHotReload();
    }
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🧼 TextWash B2B API Platform                            ║
║                                                            ║
║   Server running on port ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                         ║
║                                                            ║
║   Subdomain Structure:                                     ║
║   - textwash.app       → Main app (landing, auth, app)    ║
║   - api.textwash.app   → API endpoints, webhooks          ║
║   - billing.textwash.app → Stripe portal return URL       ║
║   - admin.textwash.app → Admin dashboard                  ║
║                                                            ║
║   Public API (api.textwash.app):                          ║
║   - POST /api/v1/clean                                     ║
║   - POST /api/v1/rewrite                                   ║
║   - POST /api/v1/analyze                                   ║
║   - POST /api/v1/moderate                                  ║
║   - POST /api/stripe/webhook                               ║
║                                                            ║
║   Admin API (admin.textwash.app):                         ║
║   - POST /api/admin/agents/reload                          ║
║   - PUT  /api/admin/rules/:agentName                       ║
║   - POST /api/admin/policies                               ║
║   - POST /api/admin/api-keys                               ║
║                                                            ║
║   Features:                                                ║
║   ✅ Self-updating agent rules                             ║
║   ✅ LLM hybrid agents (optional)                          ║
║   ✅ Agent hot-reload                                      ║
║   ✅ Enterprise policy layers                              ║
║   ✅ API key authentication                                ║
║   ✅ Rate limiting                                         ║
║   ✅ Usage tracking                                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
