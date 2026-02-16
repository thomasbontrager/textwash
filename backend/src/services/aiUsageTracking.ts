import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// OpenAI pricing per 1K tokens (as of 2024)
const PRICING_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
};

export interface AIUsageParams {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  operation: string;
  metadata?: any;
}

export interface UsageQuota {
  used: number;
  limit: number;
  remaining: number;
  resetDate: Date;
}

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  byModel: Record<string, { tokens: number; cost: number; count: number }>;
}

/**
 * Calculate the estimated cost for an OpenAI API call
 */
export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING_PER_1K_TOKENS[model] || PRICING_PER_1K_TOKENS['gpt-3.5-turbo'];
  
  const inputCost = (promptTokens / 1000) * pricing.input;
  const outputCost = (completionTokens / 1000) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Log AI usage to the database
 */
export async function logAIUsage(params: AIUsageParams): Promise<void> {
  const cost = calculateCost(params.model, params.promptTokens, params.completionTokens);
  
  await prisma.aIUsageLog.create({
    data: {
      userId: params.userId,
      model: params.model,
      tokensUsed: params.totalTokens,
      cost,
      operation: params.operation,
      metadata: params.metadata || {},
    },
  });
}

/**
 * Get user's current usage quota for the current period
 */
export async function getUserUsageQuota(userId: string): Promise<UsageQuota> {
  // Get user's subscription and plan limits
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    return {
      used: 0,
      limit: 0,
      remaining: 0,
      resetDate: new Date(),
    };
  }

  // Get feature limits from plan
  const featureLimits = subscription.plan.featureLimits as any;
  const aiTokenLimit = featureLimits?.aiTokensPerMonth || 0;

  // Calculate current period start (beginning of month)
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Get usage for current period
  const logs = await prisma.aIUsageLog.findMany({
    where: {
      userId,
      timestamp: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  const totalTokensUsed = logs.reduce((sum, log) => sum + log.tokensUsed, 0);

  return {
    used: totalTokensUsed,
    limit: aiTokenLimit,
    remaining: Math.max(0, aiTokenLimit - totalTokensUsed),
    resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

/**
 * Check if user has exceeded their usage limit
 */
export async function checkUsageLimit(userId: string, estimatedTokens: number = 0): Promise<{ allowed: boolean; quota: UsageQuota }> {
  const quota = await getUserUsageQuota(userId);
  
  // If no limit set (0), allow unlimited usage
  if (quota.limit === 0) {
    return { allowed: true, quota };
  }
  
  const allowed = (quota.used + estimatedTokens) <= quota.limit;
  
  return { allowed, quota };
}

/**
 * Get usage statistics for a user within a date range
 */
export async function getUserUsageStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UsageStats> {
  const logs = await prisma.aIUsageLog.findMany({
    where: {
      userId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const stats: UsageStats = {
    totalTokens: 0,
    totalCost: 0,
    requestCount: logs.length,
    byModel: {},
  };

  for (const log of logs) {
    stats.totalTokens += log.tokensUsed;
    stats.totalCost += log.cost || 0;

    if (!stats.byModel[log.model]) {
      stats.byModel[log.model] = { tokens: 0, cost: 0, count: 0 };
    }

    stats.byModel[log.model].tokens += log.tokensUsed;
    stats.byModel[log.model].cost += log.cost || 0;
    stats.byModel[log.model].count += 1;
  }

  return stats;
}

/**
 * Get aggregated daily usage statistics (for admin dashboard)
 */
export async function getDailyUsageStats(startDate: Date, endDate: Date): Promise<any[]> {
  const logs = await prisma.aIUsageLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      timestamp: 'asc',
    },
  });

  // Group by date
  const dailyStats: Record<string, { date: string; tokens: number; cost: number; requests: number }> = {};

  for (const log of logs) {
    const date = log.timestamp.toISOString().split('T')[0];
    
    if (!dailyStats[date]) {
      dailyStats[date] = { date, tokens: 0, cost: 0, requests: 0 };
    }

    dailyStats[date].tokens += log.tokensUsed;
    dailyStats[date].cost += log.cost || 0;
    dailyStats[date].requests += 1;
  }

  return Object.values(dailyStats);
}

/**
 * Get usage statistics per user (for admin dashboard)
 */
export async function getUsersUsageStats(startDate: Date, endDate: Date): Promise<any[]> {
  const logs = await prisma.aIUsageLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Group by user
  const userStats: Record<string, any> = {};

  for (const log of logs) {
    const userId = log.userId;
    
    if (!userStats[userId]) {
      userStats[userId] = {
        userId,
        email: log.user.email,
        name: `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || 'Unknown',
        tokens: 0,
        cost: 0,
        requests: 0,
        byModel: {} as Record<string, number>,
      };
    }

    userStats[userId].tokens += log.tokensUsed;
    userStats[userId].cost += log.cost || 0;
    userStats[userId].requests += 1;
    userStats[userId].byModel[log.model] = (userStats[userId].byModel[log.model] || 0) + 1;
  }

  return Object.values(userStats).sort((a, b) => b.cost - a.cost);
}
