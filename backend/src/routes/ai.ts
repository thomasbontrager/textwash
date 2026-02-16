import express, { Response } from 'express';
import { AuthRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import { AgentService } from '../ai/agents/agent.service';
import { ToolRegistry } from '../ai/agents/tool.registry';
import { ToolExecutor } from '../ai/agents/tool.executor';
import { AIService } from '../ai/core/ai.service';
import { AIInitializer } from '../ai/core/ai-initializer';
import { MemoryService } from '../ai/memory/memory.service';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /ai/status - Get AI system initialization status
 * Public endpoint (no auth required)
 */
router.get('/status', (req, res: Response) => {
  try {
    const status = AIInitializer.getStatus();
    
    // Remove sensitive error details for non-admin users
    const publicStatus = {
      enabled: status.enabled,
      healthy: status.providerHealthy && status.memorySystemReady,
      provider: status.provider,
      toolsAvailable: status.toolsRegistered,
      reasoningModes: status.reasoningModesAvailable.length,
      initialized: AIInitializer.isInitialized(),
    };

    res.json(publicStatus);
  } catch (error) {
    console.error('Get AI status error:', error);
    res.status(500).json({
      error: 'Failed to get AI status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// All other routes require authentication
router.use(authenticateToken);

/**
 * POST /ai/chat - AI conversation endpoint
 */
router.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { message, sessionId, useTools, systemPrompt } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'No active subscription',
        message: 'Please subscribe to use AI features',
      });
    }

    const result = await AgentService.chat({
      userId: req.user.id,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      userPlan: subscription.plan.name,
      message,
      sessionId,
      useTools,
      systemPrompt,
    });

    res.json(result);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /ai/plan - AI planning endpoint
 */
router.post('/plan', async (req: AuthRequest, res: Response) => {
  try {
    const { task, context } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'No active subscription',
        message: 'Please subscribe to use AI features',
      });
    }

    const result = await AgentService.plan({
      userId: req.user.id,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      task,
      context,
    });

    res.json(result);
  } catch (error) {
    console.error('AI planning error:', error);
    res.status(500).json({
      error: 'Failed to create plan',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /ai/tools/execute - Execute a tool directly
 */
router.post('/tools/execute', async (req: AuthRequest, res: Response) => {
  try {
    const { toolName, input } = req.body;

    if (!toolName || !input) {
      return res.status(400).json({
        error: 'toolName and input are required',
      });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'No active subscription',
        message: 'Please subscribe to use tools',
      });
    }

    const result = await ToolExecutor.execute(toolName, input, {
      userId: req.user.id,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      userPlan: subscription.plan.name,
      requestId: req.headers['x-request-id'] as string || 'unknown',
    });

    res.json(result);
  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({
      error: 'Failed to execute tool',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /ai/tools - List available tools
 */
router.get('/tools', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.json({ tools: [] });
    }

    const tools = ToolRegistry.getToolsForPlan(subscription.plan.name);
    const toolDefinitions = tools.map((tool) => tool.definition);

    res.json({ tools: toolDefinitions });
  } catch (error) {
    console.error('List tools error:', error);
    res.status(500).json({
      error: 'Failed to list tools',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /ai/usage - Get user's AI usage statistics
 */
router.get('/usage', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const [aiUsage, toolUsage] = await Promise.all([
      AIService.getUserUsage(req.user.id, start, end),
      ToolExecutor.getUserUsage(req.user.id, undefined, start, end),
    ]);

    res.json({
      ai: aiUsage,
      tools: toolUsage,
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      error: 'Failed to get usage',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /ai/memory - Store user memory
 */
router.post('/memory', async (req: AuthRequest, res: Response) => {
  try {
    const { memoryType, key, value, confidence, source } = req.body;

    if (!memoryType || !key || !value) {
      return res.status(400).json({
        error: 'memoryType, key, and value are required',
      });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: 'ACTIVE',
      },
    });

    await MemoryService.storeMemory(req.user.id, memoryType, key, value, {
      subscriptionId: subscription?.id,
      planId: subscription?.planId,
      confidence,
      source,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Store memory error:', error);
    res.status(500).json({
      error: 'Failed to store memory',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /ai/memory - Get user memory
 */
router.get('/memory', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { memoryType, key } = req.query;

    const memories = await MemoryService.getMemory(
      req.user.id,
      memoryType as string,
      key as string
    );

    res.json({ memories });
  } catch (error) {
    console.error('Get memory error:', error);
    res.status(500).json({
      error: 'Failed to get memory',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /ai/session/:sessionId - Clear session
 */
router.delete('/session/:sessionId', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    MemoryService.clearSession(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('Clear session error:', error);
    res.status(500).json({
      error: 'Failed to clear session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
