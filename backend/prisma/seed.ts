import { PrismaClient, Role, Permission } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Role-Permission Mapping
 * Defines which permissions each role has access to
 */
const rolePermissions: Record<Role, Permission[]> = {
  // USER - Basic user, no special permissions
  USER: [],

  // SUPPORT - Can view logs and impersonate users for troubleshooting
  SUPPORT: [
    Permission.VIEW_LOGS,
    Permission.IMPERSONATE_USERS
  ],

  // ADMIN - Can manage most aspects except critical OAuth and feature flags
  ADMIN: [
    Permission.MANAGE_USERS,
    Permission.MANAGE_PLANS,
    Permission.VIEW_LOGS,
    Permission.IMPERSONATE_USERS,
    Permission.MANAGE_BILLING
  ],

  // SUPER_ADMIN - Full access to all permissions
  SUPER_ADMIN: [
    Permission.MANAGE_USERS,
    Permission.MANAGE_PLANS,
    Permission.MANAGE_FEATURE_FLAGS,
    Permission.MANAGE_OAUTH,
    Permission.VIEW_LOGS,
    Permission.IMPERSONATE_USERS,
    Permission.MANAGE_BILLING
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
            role: role as Role,
            permission: permission
          }
        },
        update: {},
        create: {
          role: role as Role,
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
  
  console.log('\nSeeding initial agent rules...');

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
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
