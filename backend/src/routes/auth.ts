import express from 'express';
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
const prisma = new PrismaClient();

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
    }

    // Set HTTP-only cookie
    if (result.token) {
      setAuthCookie(res, result.token);
    }

    res.json({
      user: result.user,
      token: result.token // Also return in body for clients that prefer headers
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
      include: { subscription: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      subscription: user.subscription
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
