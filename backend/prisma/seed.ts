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
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
