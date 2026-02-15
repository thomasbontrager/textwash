import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { checkUsageLimit } from '../services/aiUsageTracking';

/**
 * Middleware to check AI usage limits before processing requests
 * This should be applied to routes that use AI/LLM features
 */
export async function enforceAIUsageLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip if user is not authenticated
    if (!req.user) {
      return next();
    }

    // Estimate token usage based on input text length
    // Rough estimate: 1 token ≈ 4 characters
    const text = req.body.text || '';
    const estimatedTokens = Math.ceil(text.length / 4) * 2; // Multiply by 2 to account for completion

    // Check if user has remaining quota
    const { allowed, quota } = await checkUsageLimit(req.user.id, estimatedTokens);

    if (!allowed) {
      res.status(429).json({
        error: 'AI usage limit exceeded',
        message: `You have used ${quota.used} of ${quota.limit} tokens this month. Your quota resets on ${quota.resetDate.toISOString().split('T')[0]}.`,
        quota: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          resetDate: quota.resetDate,
        },
        upgrade: '/api/subscriptions/create-checkout-session',
      });
      return;
    }

    // Store quota info in request for use in handlers
    (req as any).usageQuota = quota;
    next();
  } catch (error) {
    console.error('Usage limit check error:', error);
    // Don't block request on error, but log it
    next();
  }
}
