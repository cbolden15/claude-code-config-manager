#!/usr/bin/env node
/**
 * Run all v2.0 API tests
 *
 * Usage:
 *   tsx __tests__/api/v2/run-all-tests.ts
 *   tsx __tests__/api/v2/run-all-tests.ts --suite machines
 */

import { spawnSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestSuite {
  name: string;
  path: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'machines',
    path: join(__dirname, 'machines', 'machines.test.ts'),
    description: 'Machine API (GET, POST, PUT, DELETE, overrides)'
  },
  {
    name: 'hooks',
    path: join(__dirname, 'settings', 'hooks', 'hooks.test.ts'),
    description: 'Hooks API (CRUD, import, export)'
  },
  {
    name: 'permissions',
    path: join(__dirname, 'settings', 'permissions', 'permissions.test.ts'),
    description: 'Permissions API (CRUD, import, export)'
  },
  {
    name: 'env',
    path: join(__dirname, 'settings', 'env', 'env.test.ts'),
    description: 'Environment Variables API (CRUD, export)'
  }
];

// Parse command line arguments
const args = process.argv.slice(2);
const suiteArg = args.find(arg => arg.startsWith('--suite='))?.split('=')[1];

// Filter test suites if specific suite requested
const suitesToRun = suiteArg
  ? testSuites.filter(suite => suite.name === suiteArg)
  : testSuites;

if (suiteArg && suitesToRun.length === 0) {
  console.error(`❌ Unknown test suite: ${suiteArg}`);
  console.log('\nAvailable test suites:');
  testSuites.forEach(suite => {
    console.log(`  - ${suite.name}: ${suite.description}`);
  });
  process.exit(1);
}

console.log('🧪 CCM v2.0 API Test Runner\n');

// Main test runner function
async function runAllTests() {
  // Clean up database before running tests
  console.log('🧹 Cleaning up test database...');
  const { prisma } = await import('../../../src/lib/db');
  try {
    await prisma.machineOverride.deleteMany({});
    await prisma.syncLog.deleteMany({});
    await prisma.syncState.deleteMany({});
    await prisma.machine.deleteMany({});
    await prisma.globalHook.deleteMany({});
    await prisma.globalPermission.deleteMany({});
    await prisma.globalEnvVar.deleteMany({});
    await prisma.claudeDesktopMcp.deleteMany({});
    await prisma.claudeDesktopPlugin.deleteMany({});
    console.log('✅ Database cleaned\n');
  } catch (error) {
    console.error('⚠️  Failed to clean database:', error);
  }

  console.log(`Running ${suitesToRun.length} test suite(s)...\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  const results: { suite: string; passed: boolean; time: number }[] = [];

  for (const suite of suitesToRun) {
    console.log(`${'='.repeat(60)}`);
    console.log(`📦 Test Suite: ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();

    const result = spawnSync('tsx', [suite.path], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    const passed = result.status === 0;

    if (passed) {
      totalPassed++;
      console.log(`\n✅ ${suite.name} tests passed (${duration.toFixed(2)}s)\n`);
    } else {
      totalFailed++;
      console.log(`\n❌ ${suite.name} tests failed (${duration.toFixed(2)}s)\n`);
    }

    results.push({
      suite: suite.name,
      passed,
      time: duration
    });
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60) + '\n');

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const time = result.time.toFixed(2);
    console.log(`${icon} ${result.suite.padEnd(20)} ${time}s`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${totalPassed + totalFailed} suites`);
  console.log(`Passed: ${totalPassed} ✅`);
  console.log(`Failed: ${totalFailed} ${totalFailed > 0 ? '❌' : ''}`);
  console.log('='.repeat(60) + '\n');

  if (totalFailed > 0) {
    console.log('❌ Some tests failed. Please check the output above.\n');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
