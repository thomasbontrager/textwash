import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { verifyAccessToken, TokenPayload } from '../lib/auth/tokens';
import { PrismaClient, RoleEnum as Role, PermissionEnum as Permission } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Permission enum
export enum Permission {
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_STRIPE = 'MANAGE_STRIPE',
  MANAGE_AGENTS = 'MANAGE_AGENTS',
  MANAGE_API_KEYS = 'MANAGE_API_KEYS',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS'
}

// Admin role has all permissions
const ADMIN_PERMISSIONS = Object.values(Permission);

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // Try to get token from Authorization header first, then from cookie
  let token: string | undefined;
  
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.auth_token) {
    token = req.cookies.auth_token;
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        subscriptions: true,
        organization: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Validate session if sessionId is present
    if (decoded.sessionId) {
      const session = await prisma.session.findFirst({
        where: {
          id: decoded.sessionId,
          userId: user.id,
          expiresAt: { gt: new Date() }
        }
      });
      
      if (!session) {
        return res.status(401).json({ error: 'Session expired or invalid' });
      }
      
      // Update last activity
      await prisma.session.update({
        where: { id: decoded.sessionId },
        data: { lastActivityAt: new Date() }
      }).catch(() => {}); // Non-critical, don't fail if update fails
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId || undefined
    };
    
    // Attach sessionId to request for logout
    if (decoded.sessionId) {
      (req as any).sessionId = decoded.sessionId;
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

export async function authenticateApiKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'No API key provided' });
  }
  
  try {
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          include: {
            subscriptions: true
          }
        },
        organization: true
      }
    });
    
    if (!keyRecord || !keyRecord.enabled) {
      return res.status(401).json({ error: 'Invalid or disabled API key' });
    }
    
    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    });
    
    req.user = {
      id: keyRecord.userId,
      email: keyRecord.user.email,
      role: keyRecord.user.role,
      organizationId: keyRecord.organizationId
    };
    
    // Attach API key info to request for rate limiting
    (req as any).apiKey = keyRecord;
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Authentication failed' });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requirePlan(allowedPlans: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: 'ACTIVE' },
      include: { plan: true }
    });
    
    if (!subscription || !allowedPlans.includes(subscription.plan.name)) {
      return res.status(403).json({
        error: 'Insufficient plan',
        required: allowedPlans,
        current: subscription?.plan.name || 'NONE'
      });
    }
    
    next();
  };
}

// Protected route wrapper for combining multiple auth checks
export function protectedRoute(
  requireAuth: boolean = true,
  requiredRole?: 'ADMIN' | 'USER',
  requiredPlans?: string[]
) {
  const middleware: any[] = [];
  
  if (requireAuth) {
    middleware.push(authenticateToken);
  }
  
  if (requiredRole === 'ADMIN') {
    middleware.push(requireAdmin);
  }
  
  if (requiredPlans && requiredPlans.length > 0) {
    middleware.push(requirePlan(requiredPlans));
  }
  
  return middleware;
/**
 * Middleware to require specific role(s)
 * Usage: requireRole(['ADMIN', 'SUPER_ADMIN'])
 */
export function requireRole(allowedRoles: string[]) {
export function requirePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has the required permission (admin has all permissions)
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission
      });
    }
    
    next();
  };
}

/**
 * Middleware to require specific permission(s)
 * Checks if user has the required permission(s) through their roles
 * Usage: requirePermission(['MANAGE_USERS', 'VIEW_LOGS'])
 * 
 * Note: Currently simplified - in production, implement proper permission system
 */
export function requirePermission(requiredPermissions: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Simplified permission check: Allow SUPER_ADMIN and ADMIN roles
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }
    
    return res.status(403).json({
      error: 'Insufficient permissions',
      required: requiredPermissions,
    });
  };
}
