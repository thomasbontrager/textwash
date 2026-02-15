import { PrismaClient } from '@prisma/client';
import { getTimeRangeDate } from '../utils/timeRange';

const prisma = new PrismaClient();

export interface DashboardMetrics {
  requestsPerMinute: number;
  errorRate: number;
  activeUsers: number;
  aiCostPerDay: number;
  subscriptionCount: {
    total: number;
    byPlan: Record<string, number>;
  };
}

export interface RequestMetrics {
  timestamp: Date;
  count: number;
}

export interface ErrorMetrics {
  timestamp: Date;
  errorCount: number;
  totalCount: number;
  errorRate: number;
}

/**
 * Get comprehensive dashboard metrics
 */
export async function getDashboardMetrics(timeRange: string = '24h'): Promise<DashboardMetrics> {
  const timeRangeDate = getTimeRangeDate(timeRange);
  
  const [
    requestsPerMinute,
    errorRate,
    activeUsers,
    aiCostPerDay,
    subscriptionCount
  ] = await Promise.all([
    getRequestsPerMinute(timeRangeDate),
    getErrorRate(timeRangeDate),
    getActiveUsers(timeRangeDate),
    getAICostPerDay(),
    getSubscriptionCount()
  ]);
  
  return {
    requestsPerMinute,
    errorRate,
    activeUsers,
    aiCostPerDay,
    subscriptionCount
  };
}

/**
 * Calculate requests per minute over the time range
 */
export async function getRequestsPerMinute(since: Date): Promise<number> {
  const logs = await prisma.aPILog.count({
    where: {
      timestamp: {
        gte: since
      }
    }
  });
  
  const minutesElapsed = Math.max(1, (Date.now() - since.getTime()) / 60000);
  return Math.round((logs / minutesElapsed) * 100) / 100;
}

/**
 * Calculate error rate (percentage of 4xx and 5xx responses)
 */
export async function getErrorRate(since: Date): Promise<number> {
  const [totalRequests, errorRequests] = await Promise.all([
    prisma.aPILog.count({
      where: {
        timestamp: {
          gte: since
        }
      }
    }),
    prisma.aPILog.count({
      where: {
        timestamp: {
          gte: since
        },
        statusCode: {
          gte: 400
        }
      }
    })
  ]);
  
  if (totalRequests === 0) return 0;
  return Math.round((errorRequests / totalRequests) * 10000) / 100;
}

/**
 * Get count of active users (users who made requests in the time range)
 */
export async function getActiveUsers(since: Date): Promise<number> {
  const result = await prisma.aPILog.findMany({
    where: {
      timestamp: {
        gte: since
      },
      userId: {
        not: null
      }
    },
    select: {
      userId: true
    },
    distinct: ['userId']
  });
  
  return result.length;
}

/**
 * Calculate AI cost for the current day
 */
export async function getAICostPerDay(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const result = await prisma.aIUsageLog.aggregate({
    where: {
      timestamp: {
        gte: startOfDay
      }
    },
    _sum: {
      cost: true
    }
  });
  
  return result._sum.cost || 0;
}

/**
 * Get subscription count and breakdown by plan
 */
export async function getSubscriptionCount(): Promise<{ total: number; byPlan: Record<string, number> }> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE'
    },
    select: {
      plan: {
        select: {
          name: true
        }
      }
    }
  });
  
  const byPlan: Record<string, number> = {};
  for (const sub of subscriptions) {
    const planName = sub.plan.name;
    byPlan[planName] = (byPlan[planName] || 0) + 1;
  }
  
  return {
    total: subscriptions.length,
    byPlan
  };
}

/**
 * Get detailed request metrics over time
 */
export async function getRequestMetrics(
  since: Date,
  interval: 'minute' | 'hour' | 'day' = 'hour'
): Promise<RequestMetrics[]> {
  const logs = await prisma.aPILog.findMany({
    where: {
      timestamp: {
        gte: since
      }
    },
    select: {
      timestamp: true
    },
    orderBy: {
      timestamp: 'asc'
    }
  });
  
  // Group by interval
  const grouped = groupByInterval(logs, interval);
  
  return grouped.map(g => ({
    timestamp: g.timestamp,
    count: g.count
  }));
}

/**
 * Get detailed error metrics over time
 */
export async function getErrorMetrics(
  since: Date,
  interval: 'minute' | 'hour' | 'day' = 'hour'
): Promise<ErrorMetrics[]> {
  const logs = await prisma.aPILog.findMany({
    where: {
      timestamp: {
        gte: since
      }
    },
    select: {
      timestamp: true,
      statusCode: true
    },
    orderBy: {
      timestamp: 'asc'
    }
  });
  
  // Group by interval
  const grouped = groupByIntervalWithErrors(logs, interval);
  
  return grouped.map(g => ({
    timestamp: g.timestamp,
    errorCount: g.errorCount,
    totalCount: g.totalCount,
    errorRate: g.totalCount > 0 ? Math.round((g.errorCount / g.totalCount) * 10000) / 100 : 0
  }));
}

/**
 * Get top endpoints by request count
 */
export async function getTopEndpoints(since: Date, limit: number = 10) {
  const logs = await prisma.aPILog.groupBy({
    by: ['endpoint'],
    where: {
      timestamp: {
        gte: since
      }
    },
    _count: {
      endpoint: true
    },
    orderBy: {
      _count: {
        endpoint: 'desc'
      }
    },
    take: limit
  });
  
  return logs.map((log) => ({
    endpoint: log.endpoint,
    count: log._count.endpoint
  }));
}

/**
 * Get slowest endpoints by average response time
 */
export async function getSlowestEndpoints(since: Date, limit: number = 10) {
  const logs = await prisma.aPILog.groupBy({
    by: ['endpoint'],
    where: {
      timestamp: {
        gte: since
      }
    },
    _avg: {
      responseTime: true
    },
    _count: {
      endpoint: true
    },
    orderBy: {
      _avg: {
        responseTime: 'desc'
      }
    },
    take: limit
  });
  
  return logs.map((log) => ({
    endpoint: log.endpoint,
    avgResponseTime: Math.round(log._avg.responseTime || 0),
    count: log._count.endpoint
  }));
}

// Helper functions

function groupByInterval(
  logs: { timestamp: Date }[],
  interval: 'minute' | 'hour' | 'day'
): { timestamp: Date; count: number }[] {
  const groups = new Map<string, number>();
  
  for (const log of logs) {
    const key = getIntervalKey(log.timestamp, interval);
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  
  return Array.from(groups.entries()).map(([key, count]) => ({
    timestamp: new Date(key),
    count
  }));
}

function groupByIntervalWithErrors(
  logs: { timestamp: Date; statusCode: number }[],
  interval: 'minute' | 'hour' | 'day'
): { timestamp: Date; totalCount: number; errorCount: number }[] {
  const groups = new Map<string, { total: number; errors: number }>();
  
  for (const log of logs) {
    const key = getIntervalKey(log.timestamp, interval);
    const current = groups.get(key) || { total: 0, errors: 0 };
    current.total++;
    if (log.statusCode >= 400) {
      current.errors++;
    }
    groups.set(key, current);
  }
  
  return Array.from(groups.entries()).map(([key, data]) => ({
    timestamp: new Date(key),
    totalCount: data.total,
    errorCount: data.errors
  }));
}

function getIntervalKey(date: Date, interval: 'minute' | 'hour' | 'day'): string {
  const d = new Date(date);
  
  switch (interval) {
    case 'minute':
      d.setSeconds(0, 0);
      break;
    case 'hour':
      d.setMinutes(0, 0, 0);
      break;
    case 'day':
      d.setHours(0, 0, 0, 0);
      break;
  }
  
  return d.toISOString();
}
