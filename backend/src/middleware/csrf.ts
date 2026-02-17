import { Request, Response, NextFunction } from 'express';

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3001',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003'
];

/**
 * CSRF Protection Middleware
 * 
 * This middleware provides CSRF protection for state-changing operations
 * by validating the Origin header on POST, PUT, DELETE, PATCH requests.
 * 
 * Combined with SameSite=lax cookies, this provides strong CSRF protection.
 * 
 * GET requests are exempt as they should be idempotent.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF check if using Authorization header (not cookie-based)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // For cookie-based auth, validate Origin header
  const origin = req.headers['origin'] || req.headers['referer'];
  
  if (!origin) {
    // Allow requests with no origin (e.g., from server-side or Postman)
    // In production, you might want to be stricter
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        error: 'CSRF protection: Origin header required for cookie-based authentication' 
      });
    }
    return next();
  }

  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some(allowed => {
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(allowed);
      return originUrl.origin === allowedUrl.origin;
    } catch {
      return false;
    }
  });

  // In production, also allow any subdomain of the base domain
  const productionAllowed = process.env.NODE_ENV === 'production' && 
    origin.includes(process.env.BASE_DOMAIN || 'textwash.app');

  if (isAllowed || productionAllowed) {
    return next();
  }

  return res.status(403).json({ 
    error: 'CSRF protection: Origin not allowed',
    origin 
  });
}
