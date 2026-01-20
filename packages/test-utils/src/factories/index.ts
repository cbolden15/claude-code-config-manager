/**
 * Test Factories Index
 *
 * Central export for all factory functions
 */

export * from './machines';

/**
 * Reset all factory counters
 * Useful for test isolation
 */
export function resetAllCounters(): void {
  const { resetMachineCounters } = require('./machines');
  resetMachineCounters();
}
