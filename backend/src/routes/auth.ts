import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// POST /auth/signup - Create new user
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
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
router.post('/login', async (req, res) => {
  try {
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
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    res.json({
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

export default router;
