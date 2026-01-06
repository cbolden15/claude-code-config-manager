#!/usr/bin/env node
/**
 * Auto-Claude Generators Test Suite
 * Comprehensive testing for all Auto-Claude generator functions
 */

import { runEnvFileTests } from './env-file.test.ts';
import { runModelProfileTests } from './model-profile.test.ts';
import { runPromptsTests } from './prompts.test.ts';
import { runAgentConfigsTests } from './agent-configs.test.ts';

interface TestResult {
  name: string;
  success: boolean;
  error?: Error;
  duration: number;
}

async function runSingleTest(name: string, testFunction: () => void): Promise<TestResult> {
  const startTime = Date.now();

  try {
    testFunction();
    const duration = Date.now() - startTime;
    return {
      name,
      success: true,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name,
      success: false,
      error: error as Error,
      duration
    };
  }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Auto-Claude Generators Test Suite\n');
  console.log(repeatString('=', 60));
  console.log('Testing all generator functions with various input scenarios');
  console.log(repeatString('=', 60));
  console.log('');

  const testSuites = [
    { name: 'Env-File Generator', testFunction: runEnvFileTests },
    { name: 'Model-Profile Generator', testFunction: runModelProfileTests },
    { name: 'Prompts Generator', testFunction: runPromptsTests },
    { name: 'Agent-Configs Generator', testFunction: runAgentConfigsTests }
  ];

  const results: TestResult[] = [];

  for (const suite of testSuites) {
    console.log(`\n🔄 Running ${suite.name} tests...`);
    console.log(repeatString('-', 50));

    const result = await runSingleTest(suite.name, suite.testFunction);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${suite.name} tests completed successfully (${result.duration}ms)`);
    } else {
      console.log(`❌ ${suite.name} tests failed (${result.duration}ms)`);
      console.log(`   Error: ${result.error?.message}`);
      if (result.error?.stack) {
        console.log(`   Stack: ${result.error.stack}`);
      }
    }
  }

  // Summary report
  console.log('\n' + repeatString('=', 60));
  console.log('📊 TEST SUMMARY REPORT');
  console.log(repeatString('=', 60));

  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total Test Suites: ${results.length}`);
  console.log(`   Successful: ${successfulTests.length}`);
  console.log(`   Failed: ${failedTests.length}`);
  console.log(`   Total Duration: ${totalDuration}ms`);

  if (successfulTests.length > 0) {
    console.log(`\n✅ Successful Test Suites:`);
    for (const result of successfulTests) {
      console.log(`   • ${result.name} (${result.duration}ms)`);
    }
  }

  if (failedTests.length > 0) {
    console.log(`\n❌ Failed Test Suites:`);
    for (const result of failedTests) {
      console.log(`   • ${result.name} (${result.duration}ms)`);
      console.log(`     Error: ${result.error?.message}`);
    }
  }

  console.log('\n' + repeatString('=', 60));

  if (failedTests.length === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('\nAuto-Claude generators are working correctly.');
    console.log('All functions tested with various input scenarios:');
    console.log('');
    console.log('✓ Env-file generator:');
    console.log('  - Basic env generation with/without config');
    console.log('  - Custom project configs with MCP toggles');
    console.log('  - Settings override scenarios');
    console.log('  - Environment validation (valid/invalid cases)');
    console.log('  - Edge cases (empty arrays, null values)');
    console.log('');
    console.log('✓ Model-profile generator:');
    console.log('  - Task metadata generation with different profiles');
    console.log('  - Default, cost-optimized, and quality-focused profiles');
    console.log('  - Metadata validation (valid/invalid JSON)');
    console.log('  - Custom profile scenarios');
    console.log('  - Missing phase configurations');
    console.log('');
    console.log('✓ Prompts generator:');
    console.log('  - Basic and complex prompt generation');
    console.log('  - Injection point replacement scenarios');
    console.log('  - Front matter preservation');
    console.log('  - Prompt content validation');
    console.log('  - Multiple prompts handling');
    console.log('');
    console.log('✓ Agent-configs generator:');
    console.log('  - Single and multiple agent config generation');
    console.log('  - Agent configuration validation');
    console.log('  - Export JSON validation');
    console.log('  - Default configs and merging');
    console.log('  - Standard tools/MCP servers');
    console.log('');
    console.log('Ready for integration with the main CCM system!');

    process.exit(0);
  } else {
    console.log('💥 SOME TESTS FAILED! 💥');
    console.log('\nPlease review the errors above and fix the issues.');
    console.log('Ensure all generator functions are working correctly');
    console.log('before proceeding with integration.');

    process.exit(1);
  }
}

// Utility function to repeat characters
function repeatString(str: string, count: number): string {
  return str.repeat(count);
}

// Export for testing purposes
export { runAllTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch((error) => {
    console.error('Fatal error running test suite:', error);
    process.exit(1);
  });
}