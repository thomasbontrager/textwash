import express from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';
import { authenticateToken, requirePermission, Permission } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// All user management routes require authentication and MANAGE_USERS permission
router.use(authenticateToken);
router.use(requirePermission(Permission.MANAGE_USERS));

// GET /api/admin/users - List users with pagination, search, and filters
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      search, 
      plan, 
      role, 
      status 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filters
    const where: any = {
      deletedAt: null // Exclude soft-deleted users by default
    };

    // Search by email
    if (search) {
      where.email = {
        contains: search as string,
        mode: 'insensitive'
      };
    }

    // Filter by role
    if (role) {
      where.role = role;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by plan (needs to join with subscription)
    const subscriptionFilter: any = {};
    if (plan) {
      subscriptionFilter.plan = plan;
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          subscription: {
            where: Object.keys(subscriptionFilter).length > 0 ? subscriptionFilter : undefined
          },
          organization: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              loginLogs: true,
              apiKeys: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    // Filter out users without matching subscription if plan filter was applied
    const filteredUsers = plan 
      ? users.filter(u => u.subscription && u.subscription.plan === plan)
      : users;

    // Remove sensitive data
    const sanitizedUsers = filteredUsers.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      subscription: user.subscription ? {
        plan: user.subscription.plan,
        status: user.subscription.status,
        trialEndsAt: user.subscription.trialEndsAt,
        currentPeriodEnd: user.subscription.currentPeriodEnd
      } : null,
      organization: user.organization,
      loginCount: user._count.loginLogs,
      apiKeyCount: user._count.apiKeys,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      users: sanitizedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// GET /api/admin/users/:userId - Get user details
router.get('/:userId', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        organization: true,
        apiKeys: {
          select: {
            id: true,
            name: true,
            enabled: true,
            rateLimit: true,
            lastUsedAt: true,
            createdAt: true
          }
        },
        loginLogs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 50
        },
        agentExecutions: {
          select: {
            id: true,
            agentName: true,
            timestamp: true,
            duration: true
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 20
        },
        _count: {
          select: {
            apiKeys: true,
            loginLogs: true,
            agentExecutions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get usage statistics
    const usageStats = await prisma.usageRecord.findMany({
      where: {
        apiKey: {
          userId: userId
        }
      },
      select: {
        endpoint: true,
        timestamp: true
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100
    });

    // Remove password hash
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      usage: {
        stats: usageStats,
        totalRequests: usageStats.length
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// PUT /api/admin/users/:userId/suspend - Suspend user
router.put('/:userId/suspend', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { suspended } = req.body;

    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ error: 'suspended field is required (boolean)' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot suspend yourself
    if (user.id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot suspend your own account' });
    }

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: suspended ? 'SUSPENDED' : 'ACTIVE'
      }
    });

    res.json({
      success: true,
      message: `User ${suspended ? 'suspended' : 'activated'} successfully`
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// POST /api/admin/users/:userId/reset-password - Reset user password
router.post('/:userId/reset-password', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// PUT /api/admin/users/:userId/plan - Assign plan to user
router.put('/:userId/plan', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { plan } = req.body;

    const validPlans = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ 
        error: 'Valid plan is required',
        validPlans
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or update subscription
    if (user.subscription) {
      await prisma.subscription.update({
        where: { userId },
        data: {
          plan,
          status: 'ACTIVE'
        }
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          plan,
          status: 'ACTIVE'
        }
      });
    }

    res.json({
      success: true,
      message: `Plan updated to ${plan} successfully`
    });
  } catch (error) {
    console.error('Assign plan error:', error);
    res.status(500).json({ error: 'Failed to assign plan' });
  }
});

// DELETE /api/admin/users/:userId - Soft delete user
router.delete('/:userId', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot delete yourself
    if (user.id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Soft delete - set deletedAt timestamp and change status
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: 'DELETED'
      }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
