import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { PrismaClient, Role, Permission } from '@prisma/client';

const prisma = new PrismaClient();

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        subscription: true,
        organization: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId || undefined
    };
    
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
            subscription: true
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
    
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!subscription || !allowedPlans.includes(subscription.plan)) {
      return res.status(403).json({
        error: 'Insufficient plan',
        required: allowedPlans,
        current: subscription?.plan || 'NONE'
      });
    }
    
    next();
  };
}

/**
 * Middleware to require specific role(s)
 * Usage: requireRole(['ADMIN', 'SUPER_ADMIN'])
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
}

/**
 * Middleware to require specific permission(s)
 * Checks if user's role has the required permission(s)
 * Usage: requirePermission(['MANAGE_USERS', 'VIEW_LOGS'])
 */
export function requirePermission(requiredPermissions: Permission[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      // Get all permissions for the user's role
      const rolePermissions = await prisma.rolePermission.findMany({
        where: {
          role: req.user.role as Role
        },
        select: {
          permission: true
        }
      });
      
      const userPermissions = rolePermissions.map(rp => rp.permission);
      
      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(
        permission => userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredPermissions,
          userPermissions: userPermissions
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Failed to check permissions' });
    }
  };
}
