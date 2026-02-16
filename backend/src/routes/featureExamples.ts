import express from 'express';
import { AuthRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import { checkFeature, isFeatureEnabled } from '../middleware/featureFlag';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Example route demonstrating feature flag middleware usage
 * This route is protected by the 'example_feature' flag
 */
router.get('/example-feature',
  authenticateToken,
  checkFeature('example_feature'),
  async (req: AuthRequest, res) => {
    res.json({
      message: 'You have access to this feature!',
      userId: req.user?.id,
      feature: 'example_feature'
    });
  }
);

/**
 * Example route showing conditional logic based on feature flags
 */
router.post('/process-text',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      // Get user's subscription to determine plan
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: req.user!.id,
          status: 'ACTIVE'
        },
        include: {
          plan: true
        }
      });
      
      const userPlan = subscription?.plan.name || 'FREE';
      
      // Check if user has access to AI processing
      const hasAIAccess = await isFeatureEnabled(
        'ai_processing',
        req.user!.id,
        userPlan
      );
      
      let result: string;
      let method: string;
      
      if (hasAIAccess) {
        // Simulate AI processing
        method = 'AI-Enhanced';
        result = text.trim()
          .replace(/\s+/g, ' ')
          .replace(/([.!?])\s+/g, '$1 ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase()); // Title case simulation
      } else {
        // Basic processing
        method = 'Basic';
        result = text.trim().replace(/\s+/g, ' ');
      }
      
      res.json({
        original: text,
        processed: result,
        method,
        featureEnabled: hasAIAccess
      });
    } catch (error) {
      console.error('Text processing error:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  }
);

/**
 * Route to check feature access without triggering middleware
 * Useful for client-side feature detection
 */
router.get('/check-features',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      // Get user's subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: req.user!.id,
          status: 'ACTIVE'
        },
        include: {
          plan: true
        }
      });
      
      const userPlan = subscription?.plan.name || 'FREE';
      
      // Check multiple features
      const features = ['example_feature', 'ai_processing', 'advanced_analytics'];
      const featureAccess: Record<string, boolean> = {};
      
      for (const feature of features) {
        featureAccess[feature] = await isFeatureEnabled(
          feature,
          req.user!.id,
          userPlan
        );
      }
      
      res.json({
        userId: req.user!.id,
        plan: userPlan,
        features: featureAccess
      });
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({ error: 'Feature check failed' });
    }
  }
);

export default router;
