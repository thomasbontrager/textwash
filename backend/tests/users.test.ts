import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import usersRoutes from '../src/routes/users';
import jwt from 'jsonwebtoken';

// Set JWT_SECRET for tests
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-123456';

// Mock authentication middleware to bypass real auth in tests
jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    // Extract token and decode for test
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'USER'
      };
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  },
  requirePermission: (permission: string) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  },
  Permission: {
    MANAGE_USERS: 'MANAGE_USERS'
  }
}));

const app = express();
app.use(express.json());
app.use('/api/admin/users', usersRoutes);

const prisma = new PrismaClient();

// Mock Prisma for testing
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    subscription: {
      create: jest.fn(),
      update: jest.fn()
    },
    usageRecord: {
      findMany: jest.fn()
    },
    loginLog: {
      create: jest.fn()
    }
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('User Management Endpoints', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(() => {
    // Create test tokens
    adminToken = jwt.sign(
      { userId: 'admin-id', email: 'admin@test.com', role: 'ADMIN' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: 'user-id', email: 'user@test.com', role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return paginated list of users for admin', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'user1@test.com',
          role: 'USER',
          status: 'ACTIVE',
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          subscription: { plan: 'FREE', status: 'ACTIVE' },
          organization: null,
          _count: { loginLogs: 5, apiKeys: 0 }
        }
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.users).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
    });

    it('should filter users by email search', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await request(app)
        .get('/api/admin/users?search=test@example.com')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: expect.objectContaining({
              contains: 'test@example.com',
              mode: 'insensitive'
            })
          })
        })
      );
    });

    it('should filter users by role', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await request(app)
        .get('/api/admin/users?role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'ADMIN'
          })
        })
      );
    });

    it('should filter users by status', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await request(app)
        .get('/api/admin/users?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE'
          })
        })
      );
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should deny access without authentication', async () => {
      await request(app)
        .get('/api/admin/users')
        .expect(401);
    });
  });

  describe('GET /api/admin/users/:userId', () => {
    it('should return user details for admin', async () => {
      const mockUser = {
        id: '1',
        email: 'user@test.com',
        passwordHash: 'hashed',
        role: 'USER',
        status: 'ACTIVE',
        deletedAt: null,
        subscription: { plan: 'PRO', status: 'ACTIVE' },
        organization: null,
        apiKeys: [],
        loginLogs: [],
        agentExecutions: [],
        _count: { apiKeys: 0, loginLogs: 5, agentExecutions: 10 }
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.usageRecord.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/admin/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.passwordHash).toBeUndefined(); // Password should be removed
      expect(response.body.usage).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get('/api/admin/users/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/admin/users/:userId/suspend', () => {
    it('should suspend a user', async () => {
      const mockUser = {
        id: '1',
        email: 'user@test.com',
        status: 'ACTIVE'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED'
      });

      const response = await request(app)
        .put('/api/admin/users/1/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ suspended: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'SUSPENDED' }
      });
    });

    it('should activate a suspended user', async () => {
      const mockUser = {
        id: '1',
        email: 'user@test.com',
        status: 'SUSPENDED'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'ACTIVE'
      });

      await request(app)
        .put('/api/admin/users/1/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ suspended: false })
        .expect(200);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'ACTIVE' }
      });
    });

    it('should prevent admin from suspending themselves', async () => {
      const mockUser = {
        id: 'admin-id',
        email: 'admin@test.com',
        status: 'ACTIVE'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await request(app)
        .put('/api/admin/users/admin-id/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ suspended: true })
        .expect(400);
    });
  });

  describe('POST /api/admin/users/:userId/reset-password', () => {
    it('should reset user password', async () => {
      const mockUser = {
        id: '1',
        email: 'user@test.com'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/admin/users/1/reset-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'newpassword123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should reject short passwords', async () => {
      const mockUser = {
        id: '1',
        email: 'user@test.com'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await request(app)
        .post('/api/admin/users/1/reset-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'short' })
        .expect(400);
    });
  });

  describe('PUT /api/admin/users/:userId/plan', () => {
    it('should assign plan to user with existing subscription', async () => {
      const mockUser = {
        id: '1',
        email: 'user@test.com',
        subscription: { id: 'sub-1', plan: 'FREE' }
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.subscription.update as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        plan: 'PRO'
      });

      const response = await request(app)
        .put('/api/admin/users/1/plan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'PRO' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: '1' },
        data: { plan: 'PRO', status: 'ACTIVE' }
      });
    });

    it('should create subscription for user without one', async () => {
      const mockUser = {
        id: '1',
        email: 'user@test.com',
        subscription: null
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.subscription.create as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        userId: '1',
        plan: 'STARTER'
      });

      await request(app)
        .put('/api/admin/users/1/plan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'STARTER' })
        .expect(200);

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: '1',
          plan: 'STARTER',
          status: 'ACTIVE'
        }
      });
    });

    it('should reject invalid plan', async () => {
      const mockUser = {
        id: '1',
        email: 'user@test.com',
        subscription: null
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await request(app)
        .put('/api/admin/users/1/plan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'INVALID' })
        .expect(400);
    });
  });

  describe('DELETE /api/admin/users/:userId', () => {
    it('should soft delete a user', async () => {
      const mockUser = {
        id: '1',
        email: 'user@test.com',
        deletedAt: null
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
        status: 'DELETED'
      });

      const response = await request(app)
        .delete('/api/admin/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: 'DELETED'
        })
      });
    });

    it('should prevent admin from deleting themselves', async () => {
      const mockUser = {
        id: 'admin-id',
        email: 'admin@test.com',
        deletedAt: null
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await request(app)
        .delete('/api/admin/users/admin-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
