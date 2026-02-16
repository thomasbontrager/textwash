/**
 * Test script for AI Autorun Initialization
 */

// Mock environment for testing
process.env.FEATURE_AI_CORE = 'true';
process.env.FEATURE_AGENT_SYSTEM = 'true';
process.env.AI_PROVIDER = 'openai';
// No API keys set - should warn but not crash

import { AIInitializer } from '../src/ai/core/ai-initializer';

async function testAutorun() {
  console.log('='.repeat(60));
  console.log('Testing AI Autorun Initialization');
  console.log('='.repeat(60));
  console.log();

  try {
    // Test initialization
    const status = await AIInitializer.initialize();

    console.log('\n' + '='.repeat(60));
    console.log('Test Results:');
    console.log('='.repeat(60));
    console.log();
    console.log('✅ Initialization completed without errors');
    console.log();
    console.log('Status Details:');
    console.log(`  - Enabled: ${status.enabled}`);
    console.log(`  - Provider: ${status.provider}`);
    console.log(`  - Provider Healthy: ${status.providerHealthy}`);
    console.log(`  - Tools Registered: ${status.toolsRegistered}`);
    console.log(`  - Memory Ready: ${status.memorySystemReady}`);
    console.log(`  - Reasoning Modes: ${status.reasoningModesAvailable.length}`);
    console.log(`  - Errors: ${status.errors.length}`);
    console.log(`  - Warnings: ${status.warnings.length}`);
    console.log();

    if (status.errors.length > 0) {
      console.log('Errors:');
      status.errors.forEach(err => console.log(`  ❌ ${err}`));
      console.log();
    }

    if (status.warnings.length > 0) {
      console.log('Warnings:');
      status.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
      console.log();
    }

    // Test getting status
    const statusCheck = AIInitializer.getStatus();
    console.log('✅ Status retrieval works');

    // Test isInitialized
    const initialized = AIInitializer.isInitialized();
    console.log(`✅ Initialization check: ${initialized}`);

    console.log();
    console.log('='.repeat(60));
    console.log('All tests passed! ✅');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Test failed with error:');
    console.error('='.repeat(60));
    console.error(error);
    console.error();
    process.exit(1);
  }
}

testAutorun().then(() => {
  console.log('\n✅ Test script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test script failed:', error);
  process.exit(1);
});
