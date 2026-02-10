import { Request, Response, NextFunction } from 'express';

export interface SubdomainRequest extends Request {
  subdomain?: string;
}

/**
 * Extract subdomain from request
 * Supports formats:
 * - api.textwash.app -> 'api'
 * - billing.textwash.app -> 'billing'
 * - admin.textwash.app -> 'admin'
 * - textwash.app -> '' (root)
 * - localhost:3000 -> '' (development)
 */
export function extractSubdomain(req: SubdomainRequest, res: Response, next: NextFunction) {
  const host = req.hostname;
  
  // For development (localhost)
  if (host === 'localhost' || host === '127.0.0.1') {
    req.subdomain = '';
    return next();
  }

  // Split the hostname by dots
  const parts = host.split('.');
  
  // If we have 3+ parts (e.g., api.textwash.app), extract subdomain
  if (parts.length >= 3) {
    req.subdomain = parts[0];
  } else {
    // Root domain (textwash.app)
    req.subdomain = '';
  }
  
  next();
}

/**
 * Middleware to restrict routes to specific subdomains
 */
export function requireSubdomain(allowedSubdomains: string[]) {
  return (req: SubdomainRequest, res: Response, next: NextFunction) => {
    const subdomain = req.subdomain || '';
    
    // In development, allow all subdomains
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    if (allowedSubdomains.includes(subdomain)) {
      return next();
    }
    
    res.status(403).json({
      error: 'Forbidden',
      message: `This endpoint is not available on subdomain: ${subdomain || 'root'}`
    });
  };
}

/**
 * Get the full base URL for a given subdomain
 */
export function getSubdomainUrl(subdomain: string): string {
  const baseDomain = process.env.BASE_DOMAIN || 'textwash.app';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
  if (process.env.NODE_ENV === 'development') {
    // In development, use localhost with different ports
    const ports: Record<string, number> = {
      '': 3001,      // main app
      'api': 3000,   // API server
      'billing': 3002,
      'admin': 3003
    };
    return `${protocol}://localhost:${ports[subdomain] || 3000}`;
  }
  
  if (!subdomain) {
    return `${protocol}://${baseDomain}`;
  }
  
  return `${protocol}://${subdomain}.${baseDomain}`;
}
