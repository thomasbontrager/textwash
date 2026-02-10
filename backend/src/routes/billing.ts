import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Stripe
let stripe: Stripe | null = null;

async function getStripe(): Promise<Stripe | null> {
  if (stripe) return stripe;
  
  // Get Stripe keys from admin profile
  const adminProfile = await prisma.adminProfile.findFirst();
  
  if (adminProfile?.stripeSecretKey) {
    stripe = new Stripe(adminProfile.stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
    return stripe;
  }
  
  return null;
}

// All billing routes require authentication
router.use(authenticateToken);

// POST /billing/create-portal-session - Create Stripe Customer Portal session
router.post('/create-portal-session', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.stripeId) {
      return res.status(400).json({ error: 'No Stripe customer ID found' });
    }
    
    const stripeClient = await getStripe();
    if (!stripeClient) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    // Create portal session
    const session = await stripeClient.billingPortal.sessions.create({
      customer: user.stripeId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/account`
    });
    
    res.json({
      url: session.url
    });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

export default router;
