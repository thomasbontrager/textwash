import { PrismaClient } from '@prisma/client';
import { AgentRules } from '../types';

const prisma = new PrismaClient();
const ruleCache = new Map<string, { rules: AgentRules; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export async function getRules(agentName: string): Promise<AgentRules> {
  const cached = ruleCache.get(agentName);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.rules;
  }
  
  const agentRule = await prisma.agentRule.findFirst({
    where: {
      agentName,
      enabled: true
    },
    orderBy: {
      version: 'desc'
    }
  });
  
  const rules = agentRule?.rules as AgentRules || {};
  
  ruleCache.set(agentName, {
    rules,
    timestamp: now
  });
  
  return rules;
}

export function clearRuleCache(agentName?: string) {
  if (agentName) {
    ruleCache.delete(agentName);
  } else {
    ruleCache.clear();
  }
}

export async function updateRules(agentName: string, rules: AgentRules, description?: string): Promise<void> {
  const latestRule = await prisma.agentRule.findFirst({
    where: { agentName },
    orderBy: { version: 'desc' }
  });
  
  const newVersion = (latestRule?.version || 0) + 1;
  
  await prisma.agentRule.create({
    data: {
      agentName,
      version: newVersion,
      rules,
      description,
      enabled: true
    }
  });
  
  clearRuleCache(agentName);
}

export async function getLatestRuleVersion(agentName: string): Promise<number> {
  const latestRule = await prisma.agentRule.findFirst({
    where: { agentName },
    orderBy: { version: 'desc' }
  });
  
  return latestRule?.version || 0;
}
