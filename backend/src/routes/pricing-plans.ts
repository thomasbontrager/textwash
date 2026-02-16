import express from 'express';
import { AuthRequest } from '../types';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

// Import the shared Prisma client (should be singleton)
// For now, create a local instance but ideally this should be in a shared db module
const prisma = new PrismaClient();

// All pricing plan admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// GET /admin/pricing-plans - List all pricing plans
router.get('/', async (req: AuthRequest, res) => {
  try {
    const plans = await prisma.pricingPlan.findMany({
      orderBy: {
        sortOrder: 'asc'
      }
    });
    
    res.json(plans);
  } catch (error) {
    console.error('List pricing plans error:', error);
    res.status(500).json({ error: 'Failed to list pricing plans' });
  }
});

// GET /admin/pricing-plans/:id - Get a specific pricing plan
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const plan = await prisma.pricingPlan.findUnique({
      where: { id }
    });
    
    if (!plan) {
      return res.status(404).json({ error: 'Pricing plan not found' });
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Get pricing plan error:', error);
    res.status(500).json({ error: 'Failed to get pricing plan' });
  }
});

// POST /admin/pricing-plans - Create a new pricing plan
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      name,
      displayName,
      description,
      monthlyPrice,
      yearlyPrice,
      stripeMonthlyPriceId,
      stripeYearlyPriceId,
      trialDays,
      features,
      active,
      sortOrder
    } = req.body;
    
    // Validate required fields
    if (!name || !displayName || monthlyPrice === undefined || yearlyPrice === undefined) {
      return res.status(400).json({ 
        error: 'Required fields: name, displayName, monthlyPrice, yearlyPrice' 
      });
    }
    
    // Parse and validate numeric inputs
    const parsedMonthlyPrice = parseFloat(monthlyPrice);
    const parsedYearlyPrice = parseFloat(yearlyPrice);
    const parsedTrialDays = parseInt(trialDays || '0');
    const parsedSortOrder = parseInt(sortOrder || '0');
    
    if (isNaN(parsedMonthlyPrice) || isNaN(parsedYearlyPrice)) {
      return res.status(400).json({ error: 'Invalid price values' });
    }
    
    if (isNaN(parsedTrialDays) || parsedTrialDays < 0) {
      return res.status(400).json({ error: 'Invalid trial days value' });
    }
    
    if (isNaN(parsedSortOrder)) {
      return res.status(400).json({ error: 'Invalid sort order value' });
    }
    
    // Check if name already exists
    const existing = await prisma.pricingPlan.findUnique({
      where: { name }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Plan with this name already exists' });
    }
    
    const plan = await prisma.pricingPlan.create({
      data: {
        name,
        displayName,
        description,
        monthlyPrice: parsedMonthlyPrice,
        yearlyPrice: parsedYearlyPrice,
        stripeMonthlyPriceId: stripeMonthlyPriceId || null,
        stripeYearlyPriceId: stripeYearlyPriceId || null,
        trialDays: parsedTrialDays,
        features: features || {},
        active: active !== undefined ? active : true,
        sortOrder: parsedSortOrder
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Pricing plan created successfully',
      plan
    });
  } catch (error) {
    console.error('Create pricing plan error:', error);
    res.status(500).json({ error: 'Failed to create pricing plan' });
  }
});

// PUT /admin/pricing-plans/:id - Update a pricing plan
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      displayName,
      description,
      monthlyPrice,
      yearlyPrice,
      stripeMonthlyPriceId,
      stripeYearlyPriceId,
      trialDays,
      features,
      active,
      sortOrder
    } = req.body;
    
    // Check if plan exists
    const existing = await prisma.pricingPlan.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Pricing plan not found' });
    }
    
    // Build update data object with only provided fields
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    
    if (monthlyPrice !== undefined) {
      const parsed = parseFloat(monthlyPrice);
      if (isNaN(parsed)) {
        return res.status(400).json({ error: 'Invalid monthly price value' });
      }
      updateData.monthlyPrice = parsed;
    }
    
    if (yearlyPrice !== undefined) {
      const parsed = parseFloat(yearlyPrice);
      if (isNaN(parsed)) {
        return res.status(400).json({ error: 'Invalid yearly price value' });
      }
      updateData.yearlyPrice = parsed;
    }
    
    if (stripeMonthlyPriceId !== undefined) updateData.stripeMonthlyPriceId = stripeMonthlyPriceId || null;
    if (stripeYearlyPriceId !== undefined) updateData.stripeYearlyPriceId = stripeYearlyPriceId || null;
    
    if (trialDays !== undefined) {
      const parsed = parseInt(trialDays);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ error: 'Invalid trial days value' });
      }
      updateData.trialDays = parsed;
    }
    
    if (features !== undefined) updateData.features = features;
    if (active !== undefined) updateData.active = active;
    
    if (sortOrder !== undefined) {
      const parsed = parseInt(sortOrder);
      if (isNaN(parsed)) {
        return res.status(400).json({ error: 'Invalid sort order value' });
      }
      updateData.sortOrder = parsed;
    }
    
    const plan = await prisma.pricingPlan.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      success: true,
      message: 'Pricing plan updated successfully',
      plan
    });
  } catch (error) {
    console.error('Update pricing plan error:', error);
    res.status(500).json({ error: 'Failed to update pricing plan' });
  }
});

// PATCH /admin/pricing-plans/:id/toggle-active - Toggle active status
router.patch('/:id/toggle-active', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.pricingPlan.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Pricing plan not found' });
    }
    
    const plan = await prisma.pricingPlan.update({
      where: { id },
      data: {
        active: !existing.active
      }
    });
    
    res.json({
      success: true,
      message: `Pricing plan ${plan.active ? 'activated' : 'deactivated'}`,
      plan
    });
  } catch (error) {
    console.error('Toggle pricing plan error:', error);
    res.status(500).json({ error: 'Failed to toggle pricing plan' });
  }
});

// DELETE /admin/pricing-plans/:id - Delete a pricing plan
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.pricingPlan.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Pricing plan not found' });
    }
    
    await prisma.pricingPlan.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Pricing plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete pricing plan error:', error);
    res.status(500).json({ error: 'Failed to delete pricing plan' });
  }
});

export default router;
