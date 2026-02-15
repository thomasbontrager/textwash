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
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
