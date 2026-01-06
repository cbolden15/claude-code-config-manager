#!/usr/bin/env node
import { runAutoClaudeAPITests } from './index.test.js';
import { runImportTests } from './import.test.js';
import { runValidationTests } from './validation.test.js';

/**
 * Main test runner for all Auto-Claude API tests
 */
async function runAllAutoClaudeAPITests() {
  const startTime = Date.now();
  console.log('🚀 Running all Auto-Claude API integration tests...\n');
  console.log('=' .repeat(80));
  console.log('');

  let totalTests = 0;
  let passedTests = 0;
  const results: Array<{ name: string; status: 'PASSED' | 'FAILED'; error?: string; duration: number }> = [];

  // Test Suite 1: Main API Integration Tests
  try {
    const testStartTime = Date.now();
    console.log('📦 Test Suite 1: Main API Integration Tests');
    console.log('-'.repeat(50));
    await runAutoClaudeAPITests();
    const duration = Date.now() - testStartTime;
    results.push({ name: 'Main API Integration Tests', status: 'PASSED', duration });
    passedTests++;
  } catch (error) {
    const duration = Date.now() - Date.now();
    results.push({
      name: 'Main API Integration Tests',
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });
    console.error('❌ Main API Integration Tests failed:', error);
  }
  totalTests++;

  console.log('');

  // Test Suite 2: Import Endpoint Tests
  try {
    const testStartTime = Date.now();
    console.log('📥 Test Suite 2: Import Endpoint Tests');
    console.log('-'.repeat(50));
    await runImportTests();
    const duration = Date.now() - testStartTime;
    results.push({ name: 'Import Endpoint Tests', status: 'PASSED', duration });
    passedTests++;
  } catch (error) {
    const duration = Date.now() - Date.now();
    results.push({
      name: 'Import Endpoint Tests',
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });
    console.error('❌ Import Endpoint Tests failed:', error);
  }
  totalTests++;

  console.log('');

  // Test Suite 3: Validation and Error Handling Tests
  try {
    const testStartTime = Date.now();
    console.log('🔍 Test Suite 3: Validation and Error Handling Tests');
    console.log('-'.repeat(50));
    await runValidationTests();
    const duration = Date.now() - testStartTime;
    results.push({ name: 'Validation and Error Handling Tests', status: 'PASSED', duration });
    passedTests++;
  } catch (error) {
    const duration = Date.now() - Date.now();
    results.push({
      name: 'Validation and Error Handling Tests',
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });
    console.error('❌ Validation and Error Handling Tests failed:', error);
  }
  totalTests++;

  // Generate comprehensive test report
  const totalDuration = Date.now() - startTime;
  console.log('');
  console.log('=' .repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(80));
  console.log('');

  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`📈 Test Suites: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('');

  // Detailed results
  console.log('📋 Detailed Results:');
  console.log('-'.repeat(80));

  results.forEach((result, index) => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    const duration = `${result.duration}ms`;
    console.log(`${index + 1}. ${status} ${result.name} (${duration})`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('');

  // Test coverage summary
  console.log('🎯 Test Coverage Summary:');
  console.log('-'.repeat(80));
  console.log('✅ API Endpoints Tested:');
  console.log('   - GET/POST /api/auto-claude/agents');
  console.log('   - GET/PUT/DELETE /api/auto-claude/agents/[agentType]');
  console.log('   - GET/POST /api/auto-claude/prompts');
  console.log('   - GET/PUT/DELETE /api/auto-claude/prompts/[id]');
  console.log('   - GET/POST /api/auto-claude/model-profiles');
  console.log('   - GET/PUT/DELETE /api/auto-claude/model-profiles/[id]');
  console.log('   - POST /api/auto-claude/import');
  console.log('   - POST /api/auto-claude/sync');
  console.log('   - POST /api/generate (Auto-Claude integration)');
  console.log('');
  console.log('✅ Database Operations Tested:');
  console.log('   - Component CRUD with real Prisma operations');
  console.log('   - Data validation and constraint checking');
  console.log('   - Transaction handling and rollback');
  console.log('   - Duplicate detection and handling');
  console.log('');
  console.log('✅ Validation Scenarios Tested:');
  console.log('   - Required field validation');
  console.log('   - Type and format validation');
  console.log('   - Enum value validation');
  console.log('   - Database constraint validation');
  console.log('   - Error response formatting');
  console.log('');

  // Final verdict
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Auto-Claude API integration is ready.');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} test suite(s) failed. Please review and fix issues.`);
  }

  console.log('');
  console.log('=' .repeat(80));

  // Exit with appropriate code
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllAutoClaudeAPITests();
}

export { runAllAutoClaudeAPITests };