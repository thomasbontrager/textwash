import express from 'express';
import { AuthRequest, SystemContext, CleanRequest, CleanResponse } from '../types';
import { authenticateApiKey } from '../middleware/auth';
import { apiKeyRateLimiter } from '../middleware/rateLimit';
import { getAgent, getAllAgents } from '../services/agentRegistry';
import { getPolicies, applyPolicies, validateAgainstPolicies } from '../services/policyService';
import { LLMServiceImpl, MockLLMService } from '../services/llm';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and rate limiting to all API routes
router.use(authenticateApiKey);
router.use(apiKeyRateLimiter);

// POST /v1/clean - Basic text cleaning
router.post('/v1/clean', async (req: AuthRequest, res) => {
  try {
    const { text, mode, policies: policyNames } = req.body as CleanRequest;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const startTime = Date.now();
    const agentsApplied: string[] = [];
    let result = text;
    
    // Get user's subscription
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      include: { plan: true }
    });
    
    // Create system context
    const llmEnabled = process.env.LLM_ENABLED === 'true' && subscription?.plan.name === 'PRO';
    const llmService = llmEnabled && process.env.LLM_API_KEY
      ? new LLMServiceImpl({
          apiKey: process.env.LLM_API_KEY!,
          apiUrl: process.env.LLM_API_URL,
          model: process.env.LLM_MODEL,
          maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500'),
          timeout: parseInt(process.env.LLM_TIMEOUT || '10000')
        })
      : new MockLLMService();
    
    const systemContext: SystemContext = {
      config: {
        llmEnabled,
        llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500'),
        llmTimeout: parseInt(process.env.LLM_TIMEOUT || '10000'),
        llmModel: process.env.LLM_MODEL || 'gpt-3.5-turbo'
      },
      llm: llmService,
      userId: req.user!.id,
      organizationId: req.user!.organizationId,
      plan: subscription?.plan.name || 'FREE'
    };
    
    // Get agents based on mode
    let agents = mode === 'basic'
      ? [
          getAgent('WhitespaceNormalizer'),
          getAgent('PunctuationNormalizer')
        ].filter(Boolean)
      : [
          getAgent('WhitespaceNormalizer'),
          getAgent('PunctuationNormalizer'),
          getAgent('ProfanityTransformer'),
          getAgent('ClarityTransformer')
        ].filter(Boolean);
    
    // Apply organization policies
    if (req.user!.organizationId) {
      const policies = await getPolicies(req.user!.organizationId);
      agents = applyPolicies(agents as any[], policies);
    }
    
    // Run agents sequentially
    for (const agent of agents) {
      if (agent) {
        const agentResult = await agent.run(result, systemContext);
        if (agentResult.changed) {
          result = agentResult.output;
          agentsApplied.push(agent.name);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    const changed = result !== text;
    const confidenceScore = changed ? 0.95 : 1.0;
    
    // Log execution
    await prisma.agentExecution.create({
      data: {
        userId: req.user!.id,
        agentName: 'clean',
        input: text.substring(0, 1000),
        output: result.substring(0, 1000),
        changed,
        agentsApplied,
        confidenceScore,
        duration
      }
    });
    
    // Record usage
    const apiKey = (req as any).apiKey;
    await prisma.usageRecord.create({
      data: {
        apiKeyId: apiKey.id,
        endpoint: '/v1/clean',
        agentsUsed: agentsApplied
      }
    });
    
    const response: CleanResponse = {
      result,
      agentsApplied,
      confidenceScore,
      metadata: {
        duration,
        mode: mode || 'standard'
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Clean API error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// POST /v1/rewrite - AI-powered rewriting
router.post('/v1/rewrite', async (req: AuthRequest, res) => {
  try {
    const { text, mode } = req.body as CleanRequest;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const startTime = Date.now();
    
    // Get user's subscription
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      include: { plan: true }
    });
    
    if (subscription?.plan.name === 'FREE') {
      return res.status(403).json({
        error: 'Rewrite feature requires PRO plan',
        upgrade: '/pricing'
      });
    }
    
    // Create system context
    const llmEnabled = process.env.LLM_ENABLED === 'true';
    const llmService = llmEnabled && process.env.LLM_API_KEY
      ? new LLMServiceImpl({
          apiKey: process.env.LLM_API_KEY!,
          apiUrl: process.env.LLM_API_URL,
          model: process.env.LLM_MODEL,
          maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500'),
          timeout: parseInt(process.env.LLM_TIMEOUT || '10000')
        })
      : new MockLLMService();
    
    const systemContext: SystemContext = {
      config: {
        llmEnabled,
        llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500'),
        llmTimeout: parseInt(process.env.LLM_TIMEOUT || '10000'),
        llmModel: process.env.LLM_MODEL || 'gpt-3.5-turbo'
      },
      llm: llmService,
      userId: req.user!.id,
      organizationId: req.user!.organizationId,
      plan: subscription?.plan.name || 'FREE'
    };
    
    // Select agent based on mode
    let agent;
    switch (mode) {
      case 'professional':
        agent = getAgent('ProfessionalTone');
        break;
      case 'casual':
        agent = getAgent('CasualTone');
        break;
      case 'concise':
        agent = getAgent('ConciseRewrite');
        break;
      default:
        agent = getAgent('HybridRewrite');
    }
    
    if (!agent) {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    
    const agentResult = await agent.run(text, systemContext);
    const duration = Date.now() - startTime;
    
    // Validate against policies
    if (req.user!.organizationId) {
      const policies = await getPolicies(req.user!.organizationId);
      const validation = validateAgainstPolicies(agentResult.output, policies);
      
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Policy violation',
          violations: validation.violations
        });
      }
    }
    
    // Log execution
    await prisma.agentExecution.create({
      data: {
        userId: req.user!.id,
        agentName: agent.name,
        input: text.substring(0, 1000),
        output: agentResult.output.substring(0, 1000),
        changed: agentResult.changed,
        agentsApplied: [agent.name],
        confidenceScore: 0.90,
        duration
      }
    });
    
    // Record usage
    const apiKey = (req as any).apiKey;
    await prisma.usageRecord.create({
      data: {
        apiKeyId: apiKey.id,
        endpoint: '/v1/rewrite',
        agentsUsed: [agent.name]
      }
    });
    
    const response: CleanResponse = {
      result: agentResult.output,
      agentsApplied: [agent.name],
      confidenceScore: 0.90,
      metadata: {
        duration,
        mode: mode || 'default',
        ...agentResult.metadata
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Rewrite API error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// POST /v1/analyze - Analyze text without modification
router.post('/v1/analyze', async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const analysis = {
      length: text.length,
      words: text.split(/\s+/).length,
      lines: text.split('\n').length,
      hasWhitespaceIssues: /[ \t]{2,}|\n{3,}/.test(text),
      hasPunctuationIssues: /[""''–—]/.test(text),
      suggestedAgents: [] as string[]
    };
    
    if (analysis.hasWhitespaceIssues) {
      analysis.suggestedAgents.push('WhitespaceNormalizer');
    }
    if (analysis.hasPunctuationIssues) {
      analysis.suggestedAgents.push('PunctuationNormalizer');
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('Analyze API error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// POST /v1/moderate - Content moderation
router.post('/v1/moderate', async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Apply policies if organization has them
    if (req.user!.organizationId) {
      const policies = await getPolicies(req.user!.organizationId);
      const validation = validateAgainstPolicies(text, policies);
      
      return res.json({
        passed: validation.valid,
        violations: validation.violations,
        metadata: {
          policiesApplied: policies.length
        }
      });
    }
    
    // Default moderation
    const profanityPattern = /\b(damn|hell|crap)\b/i;
    const hasProfanity = profanityPattern.test(text);
    
    res.json({
      passed: !hasProfanity,
      violations: hasProfanity ? ['Profanity detected'] : [],
      metadata: {
        policiesApplied: 0
      }
    });
  } catch (error) {
    console.error('Moderate API error:', error);
    res.status(500).json({ error: 'Moderation failed' });
  }
});

export default router;
