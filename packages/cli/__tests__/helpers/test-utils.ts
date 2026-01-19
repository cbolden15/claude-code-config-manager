/**
 * Test Utilities
 *
 * Common utilities for CLI testing
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Create a temporary test directory
 */
export function createTestDir(prefix = 'ccm-test-'): string {
  const testDir = join(tmpdir(), `${prefix}${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up test directory
 */
export function cleanupTestDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Create a test config file
 */
export function createTestConfig(dir: string, config: any): string {
  const configPath = join(dir, '.ccm.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return configPath;
}

/**
 * Create a test settings.local.json file
 */
export function createTestSettings(dir: string, settings: any): string {
  const settingsPath = join(dir, 'settings.local.json');
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  return settingsPath;
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strip ANSI color codes from string
 */
export function stripAnsi(str: string): string {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
}

/**
 * Mock environment variables
 */
export function mockEnv(vars: Record<string, string>) {
  const original = { ...process.env };

  Object.assign(process.env, vars);

  return {
    restore: () => {
      process.env = original;
    },
  };
}
