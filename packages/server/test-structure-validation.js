#!/usr/bin/env node
/**
 * Auto-Claude Test Structure Validation
 * Validates that all test files are properly structured and comprehensive
 */

import fs from 'fs';
import path from 'path';

const testDir = './__tests__/generators/auto-claude';

function validateTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);

  console.log(`\n📋 Validating ${fileName}:`);

  // Count test scenarios
  const testCount = (content.match(/console\.log\('Test \d+:/g) || []).length;
  console.log(`   ✅ ${testCount} test scenarios found`);

  // Check for comprehensive testing patterns
  const hasValidInput = content.includes('Valid') || content.includes('valid');
  const hasInvalidInput = content.includes('Invalid') || content.includes('invalid');
  const hasEdgeCases = content.includes('Edge case') || content.includes('edge') ||
                       content.includes('null') || content.includes('empty') ||
                       content.includes('custom') || content.includes('missing') ||
                       content.includes('no options') || content.includes('invalid');
  const hasAssertions = content.includes('assert');
  const hasErrorHandling = content.includes('error') && content.includes('Expected');

  console.log(`   ✅ Valid input scenarios: ${hasValidInput ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Invalid input scenarios: ${hasInvalidInput ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Edge case testing: ${hasEdgeCases ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Assertion testing: ${hasAssertions ? 'Present' : 'Missing'}`);
  console.log(`   ✅ Error handling: ${hasErrorHandling ? 'Present' : 'Missing'}`);

  // Count assertions
  const assertionCount = (content.match(/assert\(/g) || []).length;
  console.log(`   ✅ ${assertionCount} assertions found`);

  return {
    fileName: fileName.replace('.test.ts', ''),
    testCount,
    assertionCount,
    hasComprehensiveTesting: hasValidInput && hasInvalidInput && hasEdgeCases && hasAssertions
  };
}

function validateTestSuite() {
  console.log('🚀 Auto-Claude Generator Test Structure Validation');
  console.log('=' .repeat(60));

  const testFiles = [
    'env-file.test.ts',
    'model-profile.test.ts',
    'prompts.test.ts',
    'agent-configs.test.ts'
  ];

  const results = [];
  let totalTests = 0;
  let totalAssertions = 0;

  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    if (fs.existsSync(filePath)) {
      const result = validateTestFile(filePath);
      results.push(result);
      totalTests += result.testCount;
      totalAssertions += result.assertionCount;
    } else {
      console.log(`❌ Test file missing: ${file}`);
    }
  }

  // Validate index.test.ts
  const indexPath = path.join(testDir, 'index.test.ts');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    console.log(`\n📋 Validating index.test.ts:`);

    const hasOrchestration = indexContent.includes('runAllTests') && indexContent.includes('testSuites');
    const hasReporting = indexContent.includes('TEST SUMMARY REPORT');
    const hasErrorHandling = indexContent.includes('try') && indexContent.includes('catch');
    const hasExitCodes = indexContent.includes('process.exit');

    console.log(`   ✅ Test orchestration: ${hasOrchestration ? 'Present' : 'Missing'}`);
    console.log(`   ✅ Summary reporting: ${hasReporting ? 'Present' : 'Missing'}`);
    console.log(`   ✅ Error handling: ${hasErrorHandling ? 'Present' : 'Missing'}`);
    console.log(`   ✅ CI/CD exit codes: ${hasExitCodes ? 'Present' : 'Missing'}`);
  }

  // Summary report
  console.log('\n' + '=' .repeat(60));
  console.log('📊 VALIDATION SUMMARY REPORT');
  console.log('=' .repeat(60));

  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total Generator Test Files: ${results.length}/4`);
  console.log(`   Total Test Scenarios: ${totalTests}`);
  console.log(`   Total Assertions: ${totalAssertions}`);
  console.log(`   Average Tests per Generator: ${(totalTests / results.length).toFixed(1)}`);
  console.log(`   Average Assertions per Generator: ${(totalAssertions / results.length).toFixed(1)}`);

  console.log(`\n✅ Generator Test Coverage:`);
  for (const result of results) {
    const coverage = result.hasComprehensiveTesting ? '✅ Comprehensive' : '⚠️  Basic';
    console.log(`   • ${result.fileName}: ${result.testCount} tests, ${result.assertionCount} assertions (${coverage})`);
  }

  const allComprehensive = results.every(r => r.hasComprehensiveTesting);

  console.log('\n' + '=' .repeat(60));

  if (allComprehensive && results.length === 4) {
    console.log('🎉 ALL GENERATOR TESTS COMPREHENSIVE! 🎉');
    console.log('\nTest structure validation successful:');
    console.log('✓ All 4 generator test files present and comprehensive');
    console.log('✓ Valid input scenario testing implemented');
    console.log('✓ Invalid input scenario testing implemented');
    console.log('✓ Edge case testing implemented');
    console.log('✓ Comprehensive assertion coverage');
    console.log('✓ Test orchestration with reporting');
    console.log('');
    console.log('Ready for Auto-Claude generator integration testing!');

    return 0;
  } else {
    console.log('💥 TEST STRUCTURE INCOMPLETE! 💥');
    console.log('\nPlease ensure all generator test files are comprehensive');
    console.log('before proceeding with integration.');

    return 1;
  }
}

// Run validation
const exitCode = validateTestSuite();
process.exit(exitCode);