/**
 * Database Seeders
 *
 * Pre-configured data sets for testing
 */

import { createMachine } from '../factories';

/**
 * Seeds a minimal set of test data
 */
export function seedMinimal() {
  return {
    machines: [
      createMachine({ name: 'test-machine' }),
    ],
  };
}

/**
 * Seeds a comprehensive set of test data
 */
export function seedComprehensive() {
  return {
    machines: [
      createMachine({ name: 'dev-laptop', isCurrentMachine: true }),
      createMachine({ name: 'ci-runner' }),
      createMachine({ name: 'homelab' }),
    ],
  };
}

/**
 * Seeds data for machine testing
 */
export function seedMachines() {
  return [
    createMachine({ name: 'dev-laptop', platform: 'darwin', isCurrentMachine: true }),
    createMachine({ name: 'linux-desktop', platform: 'linux' }),
    createMachine({ name: 'windows-pc', platform: 'win32' }),
    createMachine({ name: 'ci-runner' }),
  ];
}
