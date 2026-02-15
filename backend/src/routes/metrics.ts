import express from 'express';
import { AuthRequest } from '../types';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { getTimeRangeDate } from '../utils/timeRange';
import {
  getDashboardMetrics,
  getRequestMetrics,
  getErrorMetrics,
  getTopEndpoints,
  getSlowestEndpoints
} from '../services/metricsService';

const router = express.Router();

// All metrics routes require authentication and VIEW_LOGS permission
router.use(authenticateToken);
router.use(requirePermission(['VIEW_LOGS']));

/**
 * GET /metrics/dashboard
 * Get comprehensive dashboard metrics
 * Query params:
 *   - timeRange: '1h', '24h', '7d', '30d' (default: '24h')
 */
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    
    const metrics = await getDashboardMetrics(timeRange);
    
    res.json({
      success: true,
      timeRange,
      metrics
    });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to get dashboard metrics' });
  }
});

/**
 * GET /metrics/requests
 * Get request metrics over time
 * Query params:
 *   - timeRange: '1h', '24h', '7d', '30d' (default: '24h')
 *   - interval: 'minute', 'hour', 'day' (default: 'hour')
 */
router.get('/requests', async (req: AuthRequest, res) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const interval = (req.query.interval as 'minute' | 'hour' | 'day') || 'hour';
    
    const since = getTimeRangeDate(timeRange);
    const metrics = await getRequestMetrics(since, interval);
    
    res.json({
      success: true,
      timeRange,
      interval,
      metrics
    });
  } catch (error) {
    console.error('Get request metrics error:', error);
    res.status(500).json({ error: 'Failed to get request metrics' });
  }
});

/**
 * GET /metrics/errors
 * Get error metrics over time
 * Query params:
 *   - timeRange: '1h', '24h', '7d', '30d' (default: '24h')
 *   - interval: 'minute', 'hour', 'day' (default: 'hour')
 */
router.get('/errors', async (req: AuthRequest, res) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const interval = (req.query.interval as 'minute' | 'hour' | 'day') || 'hour';
    
    const since = getTimeRangeDate(timeRange);
    const metrics = await getErrorMetrics(since, interval);
    
    res.json({
      success: true,
      timeRange,
      interval,
      metrics
    });
  } catch (error) {
    console.error('Get error metrics error:', error);
    res.status(500).json({ error: 'Failed to get error metrics' });
  }
});

/**
 * GET /metrics/endpoints/top
 * Get top endpoints by request count
 * Query params:
 *   - timeRange: '1h', '24h', '7d', '30d' (default: '24h')
 *   - limit: number (default: 10)
 */
router.get('/endpoints/top', async (req: AuthRequest, res) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const limit = parseInt(req.query.limit as string) || 10;
    
    const since = getTimeRangeDate(timeRange);
    const endpoints = await getTopEndpoints(since, limit);
    
    res.json({
      success: true,
      timeRange,
      endpoints
    });
  } catch (error) {
    console.error('Get top endpoints error:', error);
    res.status(500).json({ error: 'Failed to get top endpoints' });
  }
});

/**
 * GET /metrics/endpoints/slowest
 * Get slowest endpoints by average response time
 * Query params:
 *   - timeRange: '1h', '24h', '7d', '30d' (default: '24h')
 *   - limit: number (default: 10)
 */
router.get('/endpoints/slowest', async (req: AuthRequest, res) => {
  try {
    const timeRange = (req.query.timeRange as string) || '24h';
    const limit = parseInt(req.query.limit as string) || 10;
    
    const since = getTimeRangeDate(timeRange);
    const endpoints = await getSlowestEndpoints(since, limit);
    
    res.json({
      success: true,
      timeRange,
      endpoints
    });
  } catch (error) {
    console.error('Get slowest endpoints error:', error);
    res.status(500).json({ error: 'Failed to get slowest endpoints' });
  }
});

export default router;
