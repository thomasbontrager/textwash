import nodemailer, { Transporter } from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize email transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    // Check if SMTP credentials are configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Use ethereal email for testing if no SMTP configured
      console.warn('No SMTP configuration found. Using test account for development.');
      // Return a test transporter that logs instead of sending
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test',
        },
      });
    }
  }
  return transporter;
}

/**
 * Replace template variables with actual values
 * Variables should be in format {{variableName}}
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  // Replace all {{variable}} patterns with their values
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  return result;
}

/**
 * Validate that required variables are provided
 */
export function validateVariables(
  requiredVariables: string[] | null,
  providedVariables: Record<string, string>
): { valid: boolean; missing: string[] } {
  if (!requiredVariables || requiredVariables.length === 0) {
    return { valid: true, missing: [] };
  }
  
  const missing = requiredVariables.filter(varName => !providedVariables[varName]);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Send email using a template
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  variables: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get template from database
    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName },
    });
    
    if (!template) {
      return { success: false, error: `Template '${templateName}' not found` };
    }
    
    if (!template.isActive) {
      return { success: false, error: `Template '${templateName}' is not active` };
    }
    
    // Validate required variables
    const requiredVars = template.variables as string[] | null;
    const validation = validateVariables(requiredVars, variables);
    
    if (!validation.valid) {
      return {
        success: false,
        error: `Missing required variables: ${validation.missing.join(', ')}`,
      };
    }
    
    // Replace variables in subject, HTML body, and text body
    const subject = replaceVariables(template.subject, variables);
    const htmlBody = replaceVariables(template.htmlBody, variables);
    const textBody = template.textBody 
      ? replaceVariables(template.textBody, variables) 
      : undefined;
    
    // Send email
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"TextWash" <noreply@textwash.app>',
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
    
    console.log('Email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Send email error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send test email with template preview
 */
export async function sendTestEmail(
  templateId: string,
  to: string,
  variables: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string; preview?: string }> {
  try {
    // Get template from database
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });
    
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    
    // Validate required variables
    const requiredVars = template.variables as string[] | null;
    const validation = validateVariables(requiredVars, variables);
    
    if (!validation.valid) {
      return {
        success: false,
        error: `Missing required variables: ${validation.missing.join(', ')}`,
      };
    }
    
    // Replace variables in subject, HTML body, and text body
    const subject = replaceVariables(template.subject, variables);
    const htmlBody = replaceVariables(template.htmlBody, variables);
    const textBody = template.textBody 
      ? replaceVariables(template.textBody, variables) 
      : undefined;
    
    // Send test email
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"TextWash Test" <noreply@textwash.app>',
      to,
      subject: `[TEST] ${subject}`,
      text: textBody,
      html: htmlBody,
    });
    
    console.log('Test email sent:', info.messageId);
    
    // Generate preview URL for ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    return { 
      success: true, 
      messageId: info.messageId,
      preview: previewUrl || undefined
    };
  } catch (error) {
    console.error('Send test email error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
