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
  res.end = function(chunk?: any, encodingOrCallback?: any, callback?: any): any {
    const responseTime = Date.now() - startTime;
    
    // Log asynchronously to avoid blocking response
    setImmediate(async () => {
      try {
        await prisma.aPILog.create({
          data: {
            userId: req.user?.id || null,
            method: req.method,
            endpoint: req.path,
            statusCode: res.statusCode,
            responseTime,
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
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
    
    return originalEnd.call(this, chunk, encodingOrCallback, callback);
  };
  
  next();
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeRequestBody(body: any): any {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'passwordHash', 'apiKey', 'token', 'secret'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Sanitize response body to remove sensitive data and limit size
 */
function sanitizeResponseBody(body: any): any {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'passwordHash', 'apiKey', 'token', 'secret', 'key'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Limit response body size (truncate if too large)
  const bodyStr = JSON.stringify(sanitized);
  if (bodyStr.length > 10000) {
    return { truncated: true, preview: bodyStr.substring(0, 10000) };
  }
  
  return sanitized;
}
