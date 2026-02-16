import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Cache feature flags for performance (5 minute TTL)
const flagCache = new Map<string, { flag: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a feature flag from database with caching
 */
async function getFeatureFlag(flagKey: string) {
  const cached = flagCache.get(flagKey);
  if (cached && cached.expires > Date.now()) {
    return cached.flag;
  }

  const flag = await prisma.featureFlag.findUnique({
    where: { name: flagKey }
  });

  if (flag) {
    flagCache.set(flagKey, {
      flag,
      expires: Date.now() + CACHE_TTL
    });
  }

  return flag;
}

/**
 * Clear feature flag cache (useful for admin operations)
 */
export function clearFeatureFlagCache(flagKey?: string) {
  if (flagKey) {
    flagCache.delete(flagKey);
  } else {
    flagCache.clear();
  }
}

/**
 * Check if a user has access to a feature based on rollout percentage
 * Uses deterministic hashing to ensure consistent rollout for same user
 */
function checkRolloutPercentage(userId: string, rolloutPercentage: number): boolean {
  if (rolloutPercentage >= 100) return true;
  if (rolloutPercentage <= 0) return false;

  // Create deterministic hash from userId
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  const userPercentile = (hashNumber % 100) + 1;

  return userPercentile <= rolloutPercentage;
}

/**
 * Evaluate if a user has access to a feature flag
 */
export async function evaluateFeatureFlag(
  flagKey: string,
  userId: string,
  userPlan: string
): Promise<{ enabled: boolean; reason: string }> {
  const flag = await getFeatureFlag(flagKey);

  // Feature flag doesn't exist - default to disabled
  if (!flag) {
    return { enabled: false, reason: 'FLAG_NOT_FOUND' };
  }

  // Check global toggle
  if (!flag.isEnabled) {
    return { enabled: false, reason: 'GLOBALLY_DISABLED' };
  }

  // Check user overrides (highest priority)
  if (flag.userOverrides && typeof flag.userOverrides === 'object') {
    const overrides = flag.userOverrides as Record<string, boolean>;
    if (userId in overrides) {
      return {
        enabled: overrides[userId],
        reason: overrides[userId] ? 'USER_OVERRIDE_ENABLED' : 'USER_OVERRIDE_DISABLED'
      };
    }
  }

  // Check plan access
  if (flag.planAccess && Array.isArray(flag.planAccess)) {
    const allowedPlans = flag.planAccess as string[];
    if (!allowedPlans.includes(userPlan)) {
      return { enabled: false, reason: 'PLAN_NOT_ALLOWED' };
    }
  }

  // Check rollout percentage
  if (flag.rolloutPercentage < 100) {
    const inRollout = checkRolloutPercentage(userId, flag.rolloutPercentage);
    if (!inRollout) {
      return { enabled: false, reason: 'NOT_IN_ROLLOUT' };
    }
  }

  // All checks passed
  return { enabled: true, reason: 'ENABLED' };
}

/**
 * Middleware to check if a feature is enabled for the current user
 * Usage: router.get('/feature', checkFeature('featureName'), handler)
 */
export function checkFeature(flagKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Require authentication
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user's plan
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: req.user.id,
          status: 'ACTIVE'
        },
        include: {
          plan: true
        }
      });

      const userPlan = subscription?.plan.name || 'FREE';

      // Evaluate feature flag
      const result = await evaluateFeatureFlag(flagKey, req.user.id, userPlan);

      if (!result.enabled) {
        return res.status(403).json({
          error: 'Feature not available',
          feature: flagKey,
          reason: result.reason
        });
      }

      // Feature is enabled, proceed
      next();
    } catch (error) {
      console.error('Feature flag check error:', error);
      // Fail closed - deny access on error
      return res.status(500).json({
        error: 'Feature check failed',
        feature: flagKey
      });
    }
  };
}

/**
 * Helper to check feature flag without middleware (for use in code)
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId: string,
  userPlan: string
): Promise<boolean> {
  const result = await evaluateFeatureFlag(flagKey, userId, userPlan);
  return result.enabled;
}
