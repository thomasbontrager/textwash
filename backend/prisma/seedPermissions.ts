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
  let skipped = 0;

  for (const [role, permissions] of Object.entries(rolePermissions)) {
    for (const permission of permissions) {
      try {
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
      } catch (error) {
        console.error(`Failed to create ${role} -> ${permission}:`, error);
        skipped++;
      }
    }
  }

  console.log(`✅ Role-Permission mappings seeded: ${created} created, ${skipped} skipped`);
  console.log('\nRole-Permission Summary:');
  console.log(`  USER: ${rolePermissions.USER.length} permissions`);
  console.log(`  SUPPORT: ${rolePermissions.SUPPORT.length} permissions`);
  console.log(`  ADMIN: ${rolePermissions.ADMIN.length} permissions`);
  console.log(`  SUPER_ADMIN: ${rolePermissions.SUPER_ADMIN.length} permissions`);
}

async function main() {
  await seedPermissions();
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
