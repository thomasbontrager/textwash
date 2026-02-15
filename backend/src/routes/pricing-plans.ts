import express from 'express';
import { AuthRequest } from '../types';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
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
        monthlyPrice: parseFloat(monthlyPrice),
        yearlyPrice: parseFloat(yearlyPrice),
        stripeMonthlyPriceId: stripeMonthlyPriceId || null,
        stripeYearlyPriceId: stripeYearlyPriceId || null,
        trialDays: parseInt(trialDays || '0'),
        features: features || {},
        active: active !== undefined ? active : true,
        sortOrder: parseInt(sortOrder || '0')
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
    if (monthlyPrice !== undefined) updateData.monthlyPrice = parseFloat(monthlyPrice);
    if (yearlyPrice !== undefined) updateData.yearlyPrice = parseFloat(yearlyPrice);
    if (stripeMonthlyPriceId !== undefined) updateData.stripeMonthlyPriceId = stripeMonthlyPriceId || null;
    if (stripeYearlyPriceId !== undefined) updateData.stripeYearlyPriceId = stripeYearlyPriceId || null;
    if (trialDays !== undefined) updateData.trialDays = parseInt(trialDays);
    if (features !== undefined) updateData.features = features;
    if (active !== undefined) updateData.active = active;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
    
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
