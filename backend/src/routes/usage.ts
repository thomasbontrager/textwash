import express from 'express';
import { AuthRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import { getUserUsageQuota, getUserUsageStats } from '../services/aiUsageTracking';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /usage/quota - Get user's current usage quota
router.get('/quota', async (req: AuthRequest, res) => {
  try {
    const quota = await getUserUsageQuota(req.user!.id);
    
    res.json(quota);
  } catch (error) {
    console.error('Get quota error:', error);
    res.status(500).json({ error: 'Failed to get usage quota' });
  }
});

// GET /usage/stats - Get user's usage statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const now = new Date();
    let startDate: Date;
    
    // Determine date range based on period
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    const endDate = new Date();
    
    const stats = await getUserUsageStats(req.user!.id, startDate, endDate);
    
    res.json({
      period,
      startDate,
      endDate,
      stats,
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

// GET /usage/dashboard - Get complete usage dashboard data
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    // Get current quota
    const quota = await getUserUsageQuota(req.user!.id);
    
    // Get current month stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date();
    const monthStats = await getUserUsageStats(req.user!.id, monthStart, monthEnd);
    
    // Get last month stats for comparison
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStats = await getUserUsageStats(req.user!.id, lastMonthStart, lastMonthEnd);
    
    res.json({
      quota,
      currentMonth: {
        startDate: monthStart,
        endDate: monthEnd,
        stats: monthStats,
      },
      lastMonth: {
        startDate: lastMonthStart,
        endDate: lastMonthEnd,
        stats: lastMonthStats,
      },
    });
  } catch (error) {
    console.error('Get usage dashboard error:', error);
    res.status(500).json({ error: 'Failed to get usage dashboard' });
  }
});

export default router;
