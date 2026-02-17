import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../src/routes/auth';
import bcrypt from 'bcryptjs';

// Set JWT_SECRET for tests
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-123456';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const prisma = new PrismaClient();

// Mock Prisma for testing
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    subscription: {
      create: jest.fn()
    },
    loginLog: {
      create: jest.fn()
    }
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

jest.mock('bcryptjs');

describe('Auth Endpoints - Login Tracking', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should create login log on successful login', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed',
        status: 'ACTIVE',
        deletedAt: null,
        subscription: { plan: 'FREE', status: 'ACTIVE' }
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.loginLog.create as jest.Mock).mockResolvedValue({
        id: 'log-id',
        userId: 'user-id',
        success: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .set('User-Agent', 'TestAgent/1.0')
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(prisma.loginLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          success: true
        })
      });
    });

    it('should create login log on failed login', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed',
        status: 'ACTIVE',
        deletedAt: null
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.loginLog.create as jest.Mock).mockResolvedValue({
        id: 'log-id',
        userId: 'user-id',
        success: false
      });

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);

      expect(prisma.loginLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          success: false
        })
      });
    });

    it('should prevent login for suspended users', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed',
        status: 'SUSPENDED',
        deletedAt: null
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(403);

      expect(response.body.error).toContain('suspended');
    });

    it('should prevent login for deleted users', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed',
        status: 'DELETED',
        deletedAt: new Date()
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(403);

      expect(response.body.error).toContain('deleted');
    });

    it('should capture IP address in login log', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed',
        status: 'ACTIVE',
        deletedAt: null,
        subscription: { plan: 'FREE' }
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.loginLog.create as jest.Mock).mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);

      expect(prisma.loginLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: expect.any(String),
          userAgent: expect.any(String)
        })
      });
    });
  });
});
