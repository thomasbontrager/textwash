import { PrismaClient, RoleEnum, PermissionEnum } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Role-Permission Mapping
 * Defines which permissions each role has access to
 */
const rolePermissions: Record<RoleEnum, PermissionEnum[]> = {
  // USER - Basic user, no special permissions
  USER: [],

  // SUPPORT - Can view logs and impersonate users for troubleshooting
  SUPPORT: [
    PermissionEnum.VIEW_LOGS,
    PermissionEnum.IMPERSONATE_USERS
  ],

  // ADMIN - Can manage most aspects except critical OAuth and feature flags
  ADMIN: [
    PermissionEnum.MANAGE_USERS,
    PermissionEnum.MANAGE_PLANS,
    PermissionEnum.VIEW_LOGS,
    PermissionEnum.IMPERSONATE_USERS,
    PermissionEnum.MANAGE_BILLING
  ],

  // SUPER_ADMIN - Full access to all permissions
  SUPER_ADMIN: [
    PermissionEnum.MANAGE_USERS,
    PermissionEnum.MANAGE_PLANS,
    PermissionEnum.MANAGE_FEATURE_FLAGS,
    PermissionEnum.MANAGE_OAUTH,
    PermissionEnum.VIEW_LOGS,
    PermissionEnum.IMPERSONATE_USERS,
    PermissionEnum.MANAGE_BILLING
  ]
};

async function seedPermissions() {
  console.log('🔐 Seeding role-permission mappings...');

  let created = 0;

  for (const [role, permissions] of Object.entries(rolePermissions)) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_permission: {
            role: role as RoleEnum,
            permission: permission
          }
        },
        update: {},
        create: {
          role: role as RoleEnum,
          permission: permission
        }
      });
      created++;
    }
  }

  console.log(`✅ Role-Permission mappings seeded: ${created} mappings`);
  console.log('  USER: 0 permissions');
  console.log('  SUPPORT: 2 permissions (VIEW_LOGS, IMPERSONATE_USERS)');
  console.log('  ADMIN: 5 permissions');
  console.log('  SUPER_ADMIN: 7 permissions (all)');
}

async function main() {
  // Seed role-permission mappings first
  await seedPermissions();
  
  console.log('\n💼 Seeding subscription plans...');
  
  // FREE Plan
  await prisma.plan.upsert({
    where: { name: 'FREE' },
    update: {
      displayName: 'Free Plan',
      description: 'Basic text cleaning features',
      price: 0,
      currency: 'usd',
      interval: 'month',
      featureLimits: {
        apiCalls: 100,
        aiTokensPerMonth: 0, // No AI usage on free plan
        storage: 1000
      },
      planAccess: {
        basicAgents: true,
        advancedAgents: false,
        aiRewrite: false,
        analytics: false
      },
      isActive: true
    },
    create: {
      name: 'FREE',
      displayName: 'Free Plan',
      description: 'Basic text cleaning features',
      price: 0,
      currency: 'usd',
      interval: 'month',
      featureLimits: {
        apiCalls: 100,
        aiTokensPerMonth: 0,
        storage: 1000
      },
      planAccess: {
        basicAgents: true,
        advancedAgents: false,
        aiRewrite: false,
        analytics: false
      },
      isActive: true
    }
  });
  
  // STARTER Plan
  await prisma.plan.upsert({
    where: { name: 'STARTER' },
    update: {
      displayName: 'Starter Plan',
      description: 'All features with moderate usage limits',
      price: 29,
      currency: 'usd',
      interval: 'month',
      featureLimits: {
        apiCalls: 10000,
        aiTokensPerMonth: 50000, // ~50K tokens per month
        storage: 10000
      },
      planAccess: {
        basicAgents: true,
        advancedAgents: true,
        aiRewrite: true,
        analytics: true
      },
      isActive: true,
      stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null
    },
    create: {
      name: 'STARTER',
      displayName: 'Starter Plan',
      description: 'All features with moderate usage limits',
      price: 29,
      currency: 'usd',
      interval: 'month',
      featureLimits: {
        apiCalls: 10000,
        aiTokensPerMonth: 50000,
        storage: 10000
      },
      planAccess: {
        basicAgents: true,
        advancedAgents: true,
        aiRewrite: true,
        analytics: true
      },
      isActive: true,
      stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null
    }
  });
  
  // PRO Plan
  await prisma.plan.upsert({
    where: { name: 'PRO' },
    update: {
      displayName: 'Pro Plan',
      description: 'Unlimited features with high usage limits',
      price: 99,
      currency: 'usd',
      interval: 'month',
      featureLimits: {
        apiCalls: 100000,
        aiTokensPerMonth: 500000, // ~500K tokens per month
        storage: 100000
      },
      planAccess: {
        basicAgents: true,
        advancedAgents: true,
        aiRewrite: true,
        analytics: true,
        prioritySupport: true
      },
      isActive: true,
      stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null
    },
    create: {
      name: 'PRO',
      displayName: 'Pro Plan',
      description: 'Unlimited features with high usage limits',
      price: 99,
      currency: 'usd',
      interval: 'month',
      featureLimits: {
        apiCalls: 100000,
        aiTokensPerMonth: 500000,
        storage: 100000
      },
      planAccess: {
        basicAgents: true,
        advancedAgents: true,
        aiRewrite: true,
        analytics: true,
        prioritySupport: true
      },
      isActive: true,
      stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null
    }
  });
  
  console.log('✅ Plans seeded (FREE, STARTER, PRO)');
  
  console.log('\n🤖 Seeding initial agent rules...');

  // Profanity Transformer rules
  await prisma.agentRule.upsert({
    where: {
      agentName_version: {
        agentName: 'ProfanityTransformer',
        version: 1
      }
    },
    update: {},
    create: {
      agentName: 'ProfanityTransformer',
      version: 1,
      enabled: true,
      description: 'Default profanity replacement map',
      rules: {
        map: {
          'damn': 'darn',
          'hell': 'heck',
          'crap': 'crud',
          'ass': 'butt'
        }
      }
    }
  });

  // Clarity Transformer rules
  await prisma.agentRule.upsert({
    where: {
      agentName_version: {
        agentName: 'ClarityTransformer',
        version: 1
      }
    },
    update: {},
    create: {
      agentName: 'ClarityTransformer',
      version: 1,
      enabled: true,
      description: 'Remove filler words and improve clarity',
      rules: {
        replacements: [
          { pattern: '\\bvery\\s+(\\w+)', replacement: '$1' },
          { pattern: '\\breally\\s+(\\w+)', replacement: '$1' },
          { pattern: '\\bactually\\s+', replacement: '' },
          { pattern: '\\bbasically\\s+', replacement: '' },
          { pattern: '\\bliterally\\s+', replacement: '' }
        ]
      }
    }
  });

  console.log('✅ Agent rules seeded');
  
  console.log('Seeding pricing plans...');
  
  // Free Plan
  await prisma.pricingPlan.upsert({
    where: { name: 'FREE' },
    update: {},
    create: {
      name: 'FREE',
      displayName: 'Free',
      description: 'Basic text cleaning features',
      monthlyPrice: 0,
      yearlyPrice: 0,
      stripeMonthlyPriceId: null,
      stripeYearlyPriceId: null,
      trialDays: 0,
      features: {
        limits: {
          maxRequests: 100,
          maxLength: 1000
        },
        features: [
          'Basic text cleaning',
          'Whitespace normalization',
          'Punctuation fixes'
        ]
      },
      active: true,
      sortOrder: 1
    }
  });
  
  // Starter Plan
  await prisma.pricingPlan.upsert({
    where: { name: 'STARTER' },
    update: {},
    create: {
      name: 'STARTER',
      displayName: 'Starter',
      description: 'Enhanced cleaning with priority support',
      monthlyPrice: 4.99,
      yearlyPrice: 29,
      stripeMonthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || null,
      stripeYearlyPriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
      trialDays: 14,
      features: {
        limits: {
          maxRequests: 1000,
          maxLength: 5000
        },
        features: [
          'Everything in Free',
          'Enhanced local cleaning',
          'Priority support',
          '14-day trial'
        ]
      },
      active: true,
      sortOrder: 2
    }
  });
  
  // Pro Plan
  await prisma.pricingPlan.upsert({
    where: { name: 'PRO' },
    update: {},
    create: {
      name: 'PRO',
      displayName: 'Pro',
      description: 'AI-powered text processing',
      monthlyPrice: 12.99,
      yearlyPrice: 99,
      stripeMonthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null,
      stripeYearlyPriceId: process.env.STRIPE_PRO_PRICE_ID || null,
      trialDays: 14,
      features: {
        limits: {
          maxRequests: 10000,
          maxLength: 50000
        },
        features: [
          'Everything in Starter',
          'AI spelling & grammar',
          'Smart rewrite modes',
          'Context-aware AI rewriting',
          'All future AI upgrades',
          '14-day trial'
        ]
      },
      active: true,
      sortOrder: 3
    }
  });
  
  // Enterprise Plan
  await prisma.pricingPlan.upsert({
    where: { name: 'ENTERPRISE' },
    update: {},
    create: {
      name: 'ENTERPRISE',
      displayName: 'Enterprise',
      description: 'Custom solutions for organizations',
      monthlyPrice: 0,
      yearlyPrice: 0,
      stripeMonthlyPriceId: null,
      stripeYearlyPriceId: null,
      trialDays: 30,
      features: {
        limits: {
          maxRequests: -1,
          maxLength: -1
        },
        features: [
          'Everything in Pro',
          'Custom policies',
          'Dedicated API access',
          'Self-updating agent rules',
          'White-label options',
          'SLA support',
          'Custom pricing'
        ]
      },
      active: true,
      sortOrder: 4
    }
  });
  
  console.log('✅ Pricing plans seeded');
  
  console.log('\nSeeding email templates...');
  
  // Welcome Email Template
  await prisma.emailTemplate.upsert({
    where: { name: 'welcome' },
    update: {},
    create: {
      name: 'welcome',
      subject: 'Welcome to TextWash, {{name}}!',
      htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧼 Welcome to TextWash!</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>We're excited to have you on board! TextWash is your intelligent text processing platform powered by self-updating AI agents.</p>
      
      <p><strong>Here's what you can do:</strong></p>
      <ul>
        <li>Clean and normalize text automatically</li>
        <li>Rewrite content with AI assistance</li>
        <li>Apply custom policies and rules</li>
        <li>Access powerful API endpoints</li>
      </ul>
      
      <p>Get started by exploring our API or dashboard:</p>
      <a href="https://textwash.app/dashboard" class="button">Go to Dashboard</a>
      
      <p>If you have any questions, our support team is here to help!</p>
      
      <p>Best regards,<br>The TextWash Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 TextWash. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      textBody: `Welcome to TextWash, {{name}}!

We're excited to have you on board! TextWash is your intelligent text processing platform powered by self-updating AI agents.

Here's what you can do:
- Clean and normalize text automatically
- Rewrite content with AI assistance
- Apply custom policies and rules
- Access powerful API endpoints

Get started by visiting: https://textwash.app/dashboard

If you have any questions, our support team is here to help!

Best regards,
The TextWash Team

---
© 2026 TextWash. All rights reserved.`,
      variables: ['name'],
      isActive: true
    }
  });
  
  // Password Reset Email Template
  await prisma.emailTemplate.upsert({
    where: { name: 'password_reset' },
    update: {},
    create: {
      name: 'password_reset',
      subject: 'Reset Your TextWash Password',
      htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset Request</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>We received a request to reset your TextWash password.</p>
      
      <p>Click the button below to reset your password:</p>
      <a href="{{resetUrl}}" class="button">Reset Password</a>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong><br>
        This link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">{{resetUrl}}</p>
      
      <p>Best regards,<br>The TextWash Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 TextWash. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      textBody: `Password Reset Request

Hi {{name}},

We received a request to reset your TextWash password.

Click this link to reset your password:
{{resetUrl}}

⚠️ Security Notice:
This link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.

Best regards,
The TextWash Team

---
© 2026 TextWash. All rights reserved.`,
      variables: ['name', 'resetUrl'],
      isActive: true
    }
  });
  
  // Upgrade Confirmation Email Template
  await prisma.emailTemplate.upsert({
    where: { name: 'upgrade_confirmation' },
    update: {},
    create: {
      name: 'upgrade_confirmation',
      subject: 'Welcome to {{plan}} - Upgrade Confirmed!',
      htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; background: #11998e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .highlight { background: #e8f5e9; padding: 20px; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Upgrade Successful!</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>Congratulations! Your account has been successfully upgraded to the <strong>{{plan}}</strong> plan.</p>
      
      <div class="highlight">
        <h3>Your New Features:</h3>
        <p>You now have access to:</p>
        <ul>
          <li>Increased API request limits</li>
          <li>Advanced AI-powered text processing</li>
          <li>Priority support</li>
          <li>Custom policies and rules</li>
        </ul>
        <p><strong>Current Usage:</strong> {{usage}}</p>
      </div>
      
      <p>Start making the most of your upgraded plan:</p>
      <a href="https://textwash.app/dashboard" class="button">Go to Dashboard</a>
      
      <p>Thank you for choosing TextWash!</p>
      
      <p>Best regards,<br>The TextWash Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 TextWash. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      textBody: `Upgrade Successful!

Hi {{name}},

Congratulations! Your account has been successfully upgraded to the {{plan}} plan.

Your New Features:
You now have access to:
- Increased API request limits
- Advanced AI-powered text processing
- Priority support
- Custom policies and rules

Current Usage: {{usage}}

Start making the most of your upgraded plan:
https://textwash.app/dashboard

Thank you for choosing TextWash!

Best regards,
The TextWash Team

---
© 2026 TextWash. All rights reserved.`,
      variables: ['name', 'plan', 'usage'],
      isActive: true
    }
  });
  
  // Cancellation Email Template
  await prisma.emailTemplate.upsert({
    where: { name: 'cancellation' },
    update: {},
    create: {
      name: 'cancellation',
      subject: 'Your TextWash Subscription Has Been Cancelled',
      htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #546e7a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .info-box { background: #e3f2fd; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2196f3; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Cancelled</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>We're sorry to see you go. Your {{plan}} subscription has been cancelled as requested.</p>
      
      <div class="info-box">
        <h3>What happens now?</h3>
        <ul>
          <li>Your subscription will remain active until the end of your current billing period</li>
          <li>No further charges will be made</li>
          <li>You can still access your account and features until the subscription expires</li>
          <li>Your data will be retained for 30 days in case you change your mind</li>
        </ul>
      </div>
      
      <p><strong>We'd love to hear your feedback!</strong> If you have a moment, please let us know why you're leaving so we can improve our service.</p>
      
      <p>Changed your mind? You can reactivate your subscription anytime:</p>
      <a href="https://textwash.app/pricing" class="button">Reactivate Subscription</a>
      
      <p>Thank you for using TextWash. We hope to see you again soon!</p>
      
      <p>Best regards,<br>The TextWash Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 TextWash. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      textBody: `Subscription Cancelled

Hi {{name}},

We're sorry to see you go. Your {{plan}} subscription has been cancelled as requested.

What happens now?
- Your subscription will remain active until the end of your current billing period
- No further charges will be made
- You can still access your account and features until the subscription expires
- Your data will be retained for 30 days in case you change your mind

We'd love to hear your feedback! If you have a moment, please let us know why you're leaving so we can improve our service.

Changed your mind? You can reactivate your subscription anytime:
https://textwash.app/pricing

Thank you for using TextWash. We hope to see you again soon!

Best regards,
The TextWash Team

---
© 2026 TextWash. All rights reserved.`,
      variables: ['name', 'plan'],
      isActive: true
    }
  });
  
  console.log('✅ Email templates seeded');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
