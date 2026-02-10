import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { globalLimiter } from './middleware/rateLimit';
import { startAgentHotReload } from './services/agentRegistry';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import apiRoutes from './routes/api';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiter
app.use(globalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
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
║   Public API:                                              ║
║   - POST /api/v1/clean                                     ║
║   - POST /api/v1/rewrite                                   ║
║   - POST /api/v1/analyze                                   ║
║   - POST /api/v1/moderate                                  ║
║                                                            ║
║   Admin API:                                               ║
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
