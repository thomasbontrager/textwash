import express from 'express';
import { AuthRequest } from '../types';
import { authenticateToken, requireRole } from '../middleware/auth';
import { PrismaClient, Role } from '@prisma/client';
import { sendTestEmail } from '../services/emailService';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole([Role.ADMIN, Role.SUPER_ADMIN]));

// GET /api/admin/email-templates - List all email templates
router.get('/', async (req: AuthRequest, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    
    res.json(templates);
  } catch (error) {
    console.error('List email templates error:', error);
    res.status(500).json({ error: 'Failed to list email templates' });
  }
});

// GET /api/admin/email-templates/:id - Get a specific email template
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Email template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Get email template error:', error);
    res.status(500).json({ error: 'Failed to get email template' });
  }
});

// POST /api/admin/email-templates - Create a new email template
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, subject, htmlBody, textBody, variables, isActive } = req.body;
    
    // Validate required fields
    if (!name || !subject || !htmlBody) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, subject, and htmlBody are required' 
      });
    }
    
    // Validate variables is an array if provided
    if (variables && !Array.isArray(variables)) {
      return res.status(400).json({ 
        error: 'Variables must be an array of strings' 
      });
    }
    
    // Create template
    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        htmlBody,
        textBody: textBody || null,
        variables: variables || null,
        isActive: isActive ?? true,
      },
    });
    
    res.status(201).json({
      success: true,
      message: 'Email template created successfully',
      template,
    });
  } catch (error: any) {
    console.error('Create email template error:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'An email template with this name already exists' 
      });
    }
    
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

// PUT /api/admin/email-templates/:id - Update an email template
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, subject, htmlBody, textBody, variables, isActive } = req.body;
    
    // Build update data object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (htmlBody !== undefined) updateData.htmlBody = htmlBody;
    if (textBody !== undefined) updateData.textBody = textBody;
    if (variables !== undefined) {
      // Validate variables is an array if provided
      if (variables !== null && !Array.isArray(variables)) {
        return res.status(400).json({ 
          error: 'Variables must be an array of strings' 
        });
      }
      updateData.variables = variables;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Update template
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    });
    
    res.json({
      success: true,
      message: 'Email template updated successfully',
      template,
    });
  } catch (error: any) {
    console.error('Update email template error:', error);
    
    // Handle not found
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Email template not found' });
    }
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'An email template with this name already exists' 
      });
    }
    
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// DELETE /api/admin/email-templates/:id - Delete an email template
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    await prisma.emailTemplate.delete({
      where: { id },
    });
    
    res.json({
      success: true,
      message: 'Email template deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete email template error:', error);
    
    // Handle not found
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Email template not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

// POST /api/admin/email-templates/:id/test - Send a test email
router.post('/:id/test', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { to, variables } = req.body;
    
    // Validate required fields
    if (!to) {
      return res.status(400).json({ 
        error: 'Recipient email address (to) is required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        error: 'Invalid email address format' 
      });
    }
    
    // Variables should be an object
    const vars = variables || {};
    if (typeof vars !== 'object' || Array.isArray(vars)) {
      return res.status(400).json({ 
        error: 'Variables must be an object with key-value pairs' 
      });
    }
    
    // Send test email
    const result = await sendTestEmail(id, to, vars);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error || 'Failed to send test email' 
      });
    }
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      preview: result.preview,
    });
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;
