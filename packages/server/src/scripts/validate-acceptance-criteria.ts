/**
 * Script to run acceptance criteria validation for Auto-Claude integration
 * This can be run standalone to validate the implementation meets all requirements
 */

import { validateAcceptanceCriteria, printValidationReport } from '../lib/acceptance-criteria-validator';

/**
 * Main validation script
 */
async function main() {
  try {
    console.log('🚀 Starting Auto-Claude Integration Acceptance Criteria Validation...\n');

    const summary = await validateAcceptanceCriteria();
    printValidationReport(summary);

    // Exit with appropriate code
    const exitCode = summary.failed > 0 ? 1 : 0;

    if (exitCode === 0) {
      console.log('\n✨ All acceptance criteria validated successfully! The Auto-Claude integration is ready for production.');
    } else {
      console.log(`\n💥 ${summary.failed} acceptance criteria failed. Please address the issues above before deployment.`);
    }

    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { main as runValidation };