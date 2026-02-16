import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to log API requests and responses
 * Captures: route, method, status, response time, user ID, timestamp
 */
export function apiLogger(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  
  // Capture the original end method
  const originalEnd = res.end;
  const originalJson = res.json;
  
  let responseBody: any = null;
  
  // Override res.json to capture response body
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Override res.end to log after response is sent
  const originalEndFn = res.end.bind(res);
  res.end = function(...args: any[]): any {
    const responseTime = Date.now() - startTime;
    
    // Log asynchronously to avoid blocking response
    setImmediate(async () => {
      try {
        // Get client IP, checking X-Forwarded-For for proxied requests
        const forwardedFor = req.headers['x-forwarded-for'];
        const clientIp = forwardedFor 
          ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim())
          : req.ip || req.socket.remoteAddress || 'unknown';
        
        await prisma.aPILog.create({
          data: {
            userId: req.user?.id || null,
            method: req.method,
            endpoint: req.path,
            statusCode: res.statusCode,
            responseTime,
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'] || null,
            requestBody: ['POST', 'PUT', 'PATCH'].includes(req.method) 
              ? sanitizeRequestBody(req.body) 
              : null,
            responseBody: sanitizeResponseBody(responseBody)
          }
        });
      } catch (error) {
        console.error('Failed to log API request:', error);
      }
    });
    
    return originalEndFn(...args);
  };
  
  next();
}

/**
 * Sanitize request body to remove sensitive data recursively
 */
function sanitizeRequestBody(body: any): any {
  if (!body) return null;
  
  return sanitizeObject(body);
}

/**
 * Sanitize response body to remove sensitive data and limit size
 */
function sanitizeResponseBody(body: any): any {
  if (!body) return null;
  
  const sanitized = sanitizeObject(body);
  
  // Limit response body size (truncate if too large)
  const bodyStr = JSON.stringify(sanitized);
  if (bodyStr.length > 10000) {
    return { truncated: true, preview: bodyStr.substring(0, 10000) };
  }
  
  return sanitized;
}

/**
 * Recursively sanitize an object by redacting sensitive fields
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: any = {};
    const sensitiveFields = ['password', 'passwordhash', 'apikey', 'token', 'secret', 'key'];
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  // Primitive values
  return obj;
}
