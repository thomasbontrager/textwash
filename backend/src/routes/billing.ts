import express from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// POST /billing/create-portal-session - Create Stripe Customer Portal session
router.post('/create-portal-session', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscriptions: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    let customerId = user.stripeId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeId: customerId }
      });
    }

    // Determine return URL based on environment
    const baseDomain = process.env.BASE_DOMAIN || 'textwash.app';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const returnUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3002'
      : `${protocol}://billing.${baseDomain}`;

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// GET /billing/success - Return from Stripe portal (optional success page)
router.get('/success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Billing Updated - TextWash</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
          }
          h1 { color: #667eea; margin-bottom: 1rem; }
          p { color: #666; margin-bottom: 2rem; }
          .btn {
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
          .btn:hover { background: #5568d3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Billing Updated</h1>
          <p>Your billing information has been successfully updated.</p>
          <a href="/" class="btn">Return to App</a>
        </div>
      </body>
    </html>
  `);
});

export default router;
