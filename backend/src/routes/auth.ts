import express from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit';
import { AuthRequest } from '../types';
import { authService } from '../services/authService';
import { setAuthCookie, clearAuthCookie } from '../lib/auth/cookies';
import {
  signupSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  changePasswordSchema
} from '../lib/auth/validation';

const router = express.Router();

// POST /auth/signup - Create new user
router.post('/signup', authLimiter, validateRequest(signupSchema), async (req, res) => {
  try {
    const sessionInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress
    };

    const result = await authService.signup(req.body, sessionInfo);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Set HTTP-only cookie
    if (result.token) {
      setAuthCookie(res, result.token);
    }

    res.status(201).json({
      user: result.user,
      token: result.token // Also return in body for clients that prefer headers
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create Stripe customer if Stripe is configured
    let stripeCustomerId: string | undefined;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16'
        });
        
        const customer = await stripe.customers.create({
          email,
          metadata: {
            source: 'signup'
          }
        });
        
        stripeCustomerId = customer.id;
        console.log(`Stripe customer created: ${customer.id} for ${email}`);
      } catch (stripeError) {
        console.error('Failed to create Stripe customer on signup:', stripeError);
        // Continue with signup even if Stripe customer creation fails
      }
    }
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'USER',
        stripeId: stripeCustomerId
      }
    });
    
    // Get or create FREE plan
    let freePlan = await prisma.plan.findFirst({
      where: { name: 'FREE' }
    });
    
    if (!freePlan) {
      freePlan = await prisma.plan.create({
        data: {
          name: 'FREE',
          displayName: 'Free',
          description: 'Basic text cleaning features',
          price: 0,
          currency: 'usd',
          interval: 'month',
          featureLimits: {
            maxRequests: 100,
            maxLength: 1000
          },
          planAccess: {
            features: ['basic_cleaning', 'whitespace', 'punctuation']
          },
          isActive: true
        }
      });
    }
    
    // Create free subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        stripeCustomerId: stripeCustomerId
      },
      include: {
        plan: true
      }
    });
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription: {
          plan: subscription.plan.name,
          status: subscription.status
        }
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /auth/login - Authenticate user
router.post('/login', authLimiter, validateRequest(loginSchema), async (req, res) => {
  try {
    const sessionInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress
    };

    const result = await authService.login(req.body, sessionInfo);

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscriptions: true }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set HTTP-only cookie
    if (result.token) {
      setAuthCookie(res, result.token);
    
    // Check if user is suspended or deleted
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    if (user.status === 'DELETED' || user.deletedAt) {
      return res.status(403).json({ error: 'Account is deleted' });
    }
    
    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    
    // Log login attempt
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        success: valid
      }
    });
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      user: result.user,
      token: result.token // Also return in body for clients that prefer headers
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription: user.subscriptions?.find(s => s.status === 'ACTIVE') || user.subscriptions?.[0]
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/logout - Logout user
router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sessionId = (req as any).sessionId;
    const success = await authService.logout(req.user!.id, sessionId);

    if (!success) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    // Clear HTTP-only cookie
    clearAuthCookie(res);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /auth/me - Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscriptions: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      subscription: user.subscriptions?.find(s => s.status === 'ACTIVE') || user.subscriptions?.[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// POST /auth/password-reset/request - Request password reset
router.post('/password-reset/request', passwordResetLimiter, validateRequest(passwordResetRequestSchema), async (req, res) => {
  try {
    const result = await authService.requestPasswordReset(req.body);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      message: 'If the email exists, a reset link will be sent',
      // Only include token in development
      ...(result.token && { token: result.token })
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /auth/password-reset/confirm - Reset password with token
router.post('/password-reset/confirm', validateRequest(passwordResetSchema), async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /auth/change-password - Change password (authenticated)
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), async (req: AuthRequest, res) => {
  try {
    const result = await authService.changePassword(req.user!.id, req.body);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Clear cookie since all sessions are invalidated
    clearAuthCookie(res);

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /auth/sessions - Get user's active sessions
router.get('/sessions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sessions = await authService.getUserSessions(req.user!.id);
    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

export default router;
