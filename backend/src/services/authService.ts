import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  generateAccessToken,
  generateResetToken,
  generateSessionToken,
  TokenPayload
} from '../lib/auth/tokens';
import {
  SignupInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetInput,
  ChangePasswordInput
} from '../lib/auth/validation';

const prisma = new PrismaClient();

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    subscription?: any;
  };
  sessionId?: string;
  error?: string;
}

export interface SessionInfo {
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {
  async signup(data: SignupInput, sessionInfo?: SessionInfo): Promise<AuthResult> {
    try {
      // Check if user exists
      const existing = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existing) {
        return { success: false, error: 'Email already registered' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Create user with transaction
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            role: 'USER'
          }
        });

        // Create free subscription
        const subscription = await tx.subscription.create({
          data: {
            userId: user.id,
            plan: 'FREE',
            status: 'ACTIVE'
          }
        });

        // Create session
        const sessionToken = generateSessionToken();
        const session = await tx.session.create({
          data: {
            userId: user.id,
            token: sessionToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            userAgent: sessionInfo?.userAgent,
            ipAddress: sessionInfo?.ipAddress
          }
        });

        // Generate JWT
        const token = generateAccessToken({
          userId: user.id,
          email: user.email,
          sessionId: session.id
        });

        return {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            subscription: {
              plan: subscription.plan,
              status: subscription.status
            }
          },
          token,
          sessionId: session.id
        };
      });

      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Signup failed' };
    }
  }

  async login(data: LoginInput, sessionInfo?: SessionInfo): Promise<AuthResult> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: { subscription: true }
      });

      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Verify password
      const valid = await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Clean up expired sessions
      await this.cleanupExpiredSessions(user.id);

      // Create new session
      const sessionToken = generateSessionToken();
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          userAgent: sessionInfo?.userAgent,
          ipAddress: sessionInfo?.ipAddress
        }
      });

      // Generate JWT
      const token = generateAccessToken({
        userId: user.id,
        email: user.email,
        sessionId: session.id
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscription: user.subscription
        },
        token,
        sessionId: session.id
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  async logout(userId: string, sessionId?: string): Promise<boolean> {
    try {
      if (sessionId) {
        // Delete specific session
        await prisma.session.delete({
          where: {
            id: sessionId,
            userId: userId
          }
        });
      } else {
        // Delete all user sessions
        await prisma.session.deleteMany({
          where: { userId }
        });
      }
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  async requestPasswordReset(data: PasswordResetRequestInput): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (!user) {
        // Don't reveal if user exists
        return { success: true };
      }

      // Invalidate old tokens
      await prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          used: false,
          expiresAt: { gt: new Date() }
        },
        data: { used: true }
      });

      // Create new token
      const token = generateResetToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        }
      });

      // In production, send email here
      // For now, return token (development only)
      return {
        success: true,
        token: process.env.NODE_ENV === 'development' ? token : undefined
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { success: false, error: 'Failed to process request' };
    }
  }

  async resetPassword(data: PasswordResetInput): Promise<{ success: boolean; error?: string }> {
    try {
      // Find valid token
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          token: data.token,
          used: false,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });

      if (!resetToken) {
        return { success: false, error: 'Invalid or expired token' };
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(data.newPassword, 12);

      // Update password and mark token as used
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash }
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true }
        }),
        // Invalidate all sessions for security
        prisma.session.deleteMany({
          where: { userId: resetToken.userId }
        })
      ]);

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  async changePassword(userId: string, data: ChangePasswordInput): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!valid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(data.newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      // Optionally invalidate other sessions for security
      await prisma.session.deleteMany({
        where: { userId }
      });

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }

  async validateSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId,
          expiresAt: { gt: new Date() }
        }
      });

      if (!session) {
        return false;
      }

      // Update last activity
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date() }
      });

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  async getUserSessions(userId: string) {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() }
        },
        orderBy: { lastActivityAt: 'desc' }
      });

      return sessions.map(s => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt
      }));
    } catch (error) {
      console.error('Get sessions error:', error);
      return [];
    }
  }

  private async cleanupExpiredSessions(userId: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: {
          userId,
          expiresAt: { lt: new Date() }
        }
      });
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }
}

export const authService = new AuthService();
