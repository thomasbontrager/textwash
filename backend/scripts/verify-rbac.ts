/**
 * RBAC Verification Script
 * 
 * This script demonstrates and verifies the RBAC implementation.
 * It shows examples of how to use the middleware and check permissions.
 * 
 * Usage: npx ts-node scripts/verify-rbac.ts
 */

import { PrismaClient, Role, Permission } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyRolePermissions() {
  console.log('🔐 RBAC Verification\n');
  console.log('='.repeat(60));
  
  // Check if role-permission mappings exist
  const allMappings = await prisma.rolePermission.findMany({
    orderBy: [
      { role: 'asc' },
      { permission: 'asc' }
    ]
  });
  
  if (allMappings.length === 0) {
    console.log('⚠️  No role-permission mappings found!');
    console.log('   Run: npm run prisma:seed');
    return;
  }
  
  console.log(`✅ Found ${allMappings.length} role-permission mappings\n`);
  
  // Group by role
  const byRole: Record<string, Permission[]> = {};
  for (const mapping of allMappings) {
    if (!byRole[mapping.role]) {
      byRole[mapping.role] = [];
    }
    byRole[mapping.role].push(mapping.permission);
  }
  
  // Display permissions for each role
  const roles = [Role.USER, Role.SUPPORT, Role.ADMIN, Role.SUPER_ADMIN];
  
  for (const role of roles) {
    const permissions = byRole[role] || [];
    console.log(`\n📋 ${role} (${permissions.length} permissions):`);
    console.log('─'.repeat(60));
    
    if (permissions.length === 0) {
      console.log('   (No special permissions)');
    } else {
      permissions.forEach(permission => {
        console.log(`   ✓ ${permission}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Test permission checks
  console.log('\n🧪 Testing Permission Checks:\n');
  
  const testCases = [
    { role: Role.USER, permission: Permission.MANAGE_USERS, expected: false },
    { role: Role.SUPPORT, permission: Permission.VIEW_LOGS, expected: true },
    { role: Role.SUPPORT, permission: Permission.MANAGE_USERS, expected: false },
    { role: Role.ADMIN, permission: Permission.MANAGE_USERS, expected: true },
    { role: Role.ADMIN, permission: Permission.MANAGE_FEATURE_FLAGS, expected: false },
    { role: Role.SUPER_ADMIN, permission: Permission.MANAGE_FEATURE_FLAGS, expected: true },
    { role: Role.SUPER_ADMIN, permission: Permission.MANAGE_OAUTH, expected: true },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const hasPermission = await checkPermission(testCase.role, testCase.permission);
    const result = hasPermission === testCase.expected;
    
    if (result) {
      console.log(`   ✅ ${testCase.role} ${hasPermission ? 'has' : 'lacks'} ${testCase.permission}`);
      passed++;
    } else {
      console.log(`   ❌ ${testCase.role} permission check failed for ${testCase.permission}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed === 0) {
    console.log('✅ All RBAC checks passed!\n');
  } else {
    console.log('❌ Some RBAC checks failed. Please verify the seed data.\n');
  }
}

async function checkPermission(role: Role, permission: Permission): Promise<boolean> {
  const rolePermission = await prisma.rolePermission.findUnique({
    where: {
      role_permission: {
        role,
        permission
      }
    }
  });
  
  return rolePermission !== null;
}

async function main() {
  try {
    await verifyRolePermissions();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
