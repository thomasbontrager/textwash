import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../types';

// Global rate limiter for non-authenticated requests
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// API key based rate limiting
const apiKeyLimits = new Map<string, { count: number; resetTime: number }>();

export function apiKeyRateLimiter(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const apiKey = (req as any).apiKey;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = apiKey.rateLimit || 1000;
  
  const current = apiKeyLimits.get(apiKey.key);
  
  if (!current || now > current.resetTime) {
    // New window
    apiKeyLimits.set(apiKey.key, {
      count: 1,
      resetTime: now + windowMs
    });
    
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    
    return next();
  }
  
  if (current.count >= maxRequests) {
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', new Date(current.resetTime).toISOString());
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit: maxRequests,
      resetAt: new Date(current.resetTime).toISOString()
    });
  }
  
  current.count++;
  apiKeyLimits.set(apiKey.key, current);
  
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - current.count).toString());
  res.setHeader('X-RateLimit-Reset', new Date(current.resetTime).toISOString());
  
  next();
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of apiKeyLimits.entries()) {
    if (now > value.resetTime) {
      apiKeyLimits.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour
