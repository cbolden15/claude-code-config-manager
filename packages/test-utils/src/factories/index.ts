/**
 * Test Factories Index
 *
 * Central export for all factory functions
 */

export * from './machines';
export * from './env';
export * from './hooks';
export * from './permissions';

/**
 * Reset all factory counters
 * Useful for test isolation
 */
export function resetAllCounters(): void {
  const { resetMachineCounters } = require('./machines');
  const { resetEnvVarCounters } = require('./env');
  const { resetHookCounters } = require('./hooks');
  const { resetPermissionCounters } = require('./permissions');

  resetMachineCounters();
  resetEnvVarCounters();
  resetHookCounters();
  resetPermissionCounters();
}
