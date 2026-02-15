import express from 'express';
import { AuthRequest } from '../types';
import { authenticateToken, requireRole, requirePermission } from '../middleware/auth';
import { reloadAgents, getAgentNames, getAllAgents } from '../services/agentRegistry';
import { getRules, updateRules, clearRuleCache, getLatestRuleVersion } from '../services/ruleLoader';
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from '../services/policyService';
import { PrismaClient, Role, Permission } from '@prisma/client';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require authentication
router.use(authenticateToken);

// GET /admin/agents - List all registered agents
// Requires ADMIN or SUPER_ADMIN role
router.get('/agents', requireRole([Role.ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
  try {
    const agents = getAllAgents();
    const agentList = agents.map(agent => ({
      name: agent.name,
      description: agent.description
    }));
    
    res.json(agentList);
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// POST /admin/agents/reload - Trigger hot reload of agents
// Requires MANAGE_FEATURE_FLAGS permission
router.post('/agents/reload', requirePermission([Permission.MANAGE_FEATURE_FLAGS]), async (req: AuthRequest, res) => {
  try {
    await reloadAgents();
    const agentNames = getAgentNames();
    
    res.json({
      success: true,
      message: 'Agents reloaded successfully',
      agents: agentNames,
      count: agentNames.length
    });
  } catch (error) {
    console.error('Reload agents error:', error);
    res.status(500).json({ error: 'Failed to reload agents' });
  }
});

// GET /admin/rules/:agentName - Get rules for a specific agent
// Requires ADMIN or SUPER_ADMIN role
router.get('/rules/:agentName', requireRole([Role.ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { agentName } = req.params;
    const rules = await getRules(agentName);
    const version = await getLatestRuleVersion(agentName);
    
    res.json({
      agentName,
      version,
      rules
    });
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Failed to get rules' });
  }
});

// PUT /admin/rules/:agentName - Update rules for a specific agent
// Requires MANAGE_FEATURE_FLAGS permission
router.put('/rules/:agentName', requirePermission([Permission.MANAGE_FEATURE_FLAGS]), async (req: AuthRequest, res) => {
  try {
    const { agentName } = req.params;
    const { rules, description } = req.body;
    
    if (!rules) {
      return res.status(400).json({ error: 'Rules are required' });
    }
    
    await updateRules(agentName, rules, description);
    const version = await getLatestRuleVersion(agentName);
    
    res.json({
      success: true,
      message: 'Rules updated successfully',
      agentName,
      version
    });
  } catch (error) {
    console.error('Update rules error:', error);
    res.status(500).json({ error: 'Failed to update rules' });
  }
});

// POST /admin/rules/:agentName/clear-cache - Clear cache for specific agent
// Requires MANAGE_FEATURE_FLAGS permission
router.post('/rules/:agentName/clear-cache', requirePermission([Permission.MANAGE_FEATURE_FLAGS]), async (req: AuthRequest, res) => {
  try {
    const { agentName } = req.params;
    clearRuleCache(agentName);
    
    res.json({
      success: true,
      message: `Cache cleared for ${agentName}`
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// GET /admin/policies - List all policies
// Requires ADMIN or SUPER_ADMIN role
router.get('/policies', requireRole([Role.ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { organizationId } = req.query;
    
    const where = organizationId ? { organizationId: organizationId as string } : {};
    
    const policies = await prisma.policy.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(policies);
  } catch (error) {
    console.error('List policies error:', error);
    res.status(500).json({ error: 'Failed to list policies' });
  }
});

// POST /admin/policies - Create a new policy
// Requires MANAGE_PLANS permission
router.post('/policies', requirePermission([Permission.MANAGE_PLANS]), async (req: AuthRequest, res) => {
  try {
    const { organizationId, name, type, rules } = req.body;
    
    if (!organizationId || !name || !type || !rules) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    await createPolicy(organizationId, name, type, rules);
    
    res.status(201).json({
      success: true,
      message: 'Policy created successfully'
    });
  } catch (error) {
    console.error('Create policy error:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// PUT /admin/policies/:policyId - Update a policy
// Requires MANAGE_PLANS permission
router.put('/policies/:policyId', requirePermission([Permission.MANAGE_PLANS]), async (req: AuthRequest, res) => {
  try {
    const { policyId } = req.params;
    const { rules, enabled } = req.body;
    
    await updatePolicy(policyId, rules, enabled);
    
    res.json({
      success: true,
      message: 'Policy updated successfully'
    });
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

// DELETE /admin/policies/:policyId - Delete a policy
// Requires MANAGE_PLANS permission
router.delete('/policies/:policyId', requirePermission([Permission.MANAGE_PLANS]), async (req: AuthRequest, res) => {
  try {
    const { policyId } = req.params;
    
    await deletePolicy(policyId);
    
    res.json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

// GET /admin/api-keys - List API keys
// Requires ADMIN or SUPER_ADMIN role
router.get('/api-keys', requireRole([Role.ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { organizationId } = req.query;
    
    const where = organizationId ? { organizationId: organizationId as string } : {};
    
    const apiKeys = await prisma.apiKey.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Hide actual keys for security
    const sanitizedKeys = apiKeys.map(k => ({
      ...k,
      key: `${k.key.substring(0, 8)}...${k.key.substring(k.key.length - 4)}`
    }));
    
    res.json(sanitizedKeys);
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// POST /admin/api-keys - Create a new API key
// Requires MANAGE_USERS permission
router.post('/api-keys', requirePermission([Permission.MANAGE_USERS]), async (req: AuthRequest, res) => {
  try {
    const { userId, organizationId, name, rateLimit, enabledAgents } = req.body;
    
    if (!userId || !organizationId || !name) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    
    // Generate secure API key
    const key = `tw_${crypto.randomBytes(32).toString('hex')}`;
    
    const apiKey = await prisma.apiKey.create({
      data: {
        key,
        name,
        userId,
        organizationId,
        rateLimit: rateLimit || 1000,
        enabledAgents: enabledAgents || [],
        enabled: true
      }
    });
    
    res.status(201).json({
      success: true,
      apiKey: {
        id: apiKey.id,
        key: apiKey.key, // Only show full key on creation
        name: apiKey.name
      }
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// PUT /admin/api-keys/:keyId - Update API key
// Requires MANAGE_USERS permission
router.put('/api-keys/:keyId', requirePermission([Permission.MANAGE_USERS]), async (req: AuthRequest, res) => {
  try {
    const { keyId } = req.params;
    const { enabled, rateLimit, enabledAgents } = req.body;
    
    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        enabled,
        rateLimit,
        enabledAgents
      }
    });
    
    res.json({
      success: true,
      message: 'API key updated successfully'
    });
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// DELETE /admin/api-keys/:keyId - Delete API key
// Requires MANAGE_USERS permission
router.delete('/api-keys/:keyId', requirePermission([Permission.MANAGE_USERS]), async (req: AuthRequest, res) => {
  try {
    const { keyId } = req.params;
    
    await prisma.apiKey.delete({
      where: { id: keyId }
    });
    
    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// GET /admin/usage - Get usage statistics
// Requires VIEW_LOGS permission
router.get('/usage', requirePermission([Permission.VIEW_LOGS]), async (req: AuthRequest, res) => {
  try {
    const { organizationId, startDate, endDate } = req.query;
    
    const where: any = {};
    
    if (organizationId) {
      where.apiKey = {
        organizationId: organizationId as string
      };
    }
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }
    
    const usage = await prisma.usageRecord.findMany({
      where,
      include: {
        apiKey: {
          select: {
            name: true,
            organizationId: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 1000
    });
    
    // Aggregate statistics
    const stats = {
      totalRequests: usage.length,
      byEndpoint: {} as Record<string, number>,
      byAgent: {} as Record<string, number>
    };
    
    for (const record of usage) {
      stats.byEndpoint[record.endpoint] = (stats.byEndpoint[record.endpoint] || 0) + 1;
      for (const agent of record.agentsUsed) {
        stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;
      }
    }
    
    res.json({
      stats,
      records: usage
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

export default router;
