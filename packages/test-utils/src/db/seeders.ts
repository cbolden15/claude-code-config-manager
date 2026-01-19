/**
 * Database Seeders
 *
 * Pre-configured data sets for testing
 */

import {
  createEnvVar,
  createHook,
  createPermission,
  createMachine,
} from '../factories';

/**
 * Seeds a minimal set of test data
 */
export function seedMinimal() {
  return {
    envVars: [
      createEnvVar({ key: 'TEST_VAR', value: 'test' }),
    ],
    hooks: [
      createHook({ hookType: 'PreToolUse', matcher: '*' }),
    ],
    permissions: [
      createPermission({ permission: 'Bash(*)', action: 'allow' }),
    ],
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
    envVars: [
      createEnvVar({ key: 'API_KEY', sensitive: true, encrypted: true, category: 'api_keys' }),
      createEnvVar({ key: 'DATABASE_URL', sensitive: true, category: 'database' }),
      createEnvVar({ key: 'APP_PATH', category: 'paths' }),
      createEnvVar({ key: 'WEBHOOK_URL', sensitive: true, category: 'webhooks' }),
      createEnvVar({ key: 'DEBUG', value: 'true', category: 'other' }),
    ],
    hooks: [
      createHook({ hookType: 'PreToolUse', matcher: 'Write|Edit', category: 'formatting' }),
      createHook({ hookType: 'PostToolUse', matcher: 'Write', category: 'formatting' }),
      createHook({ hookType: 'SessionStart', matcher: '*', category: 'notifications' }),
      createHook({ hookType: 'Stop', matcher: '*', category: 'notifications' }),
    ],
    permissions: [
      createPermission({ permission: 'Bash(git:*)', action: 'allow', category: 'git', priority: 10 }),
      createPermission({ permission: 'Bash(rm:-rf)', action: 'deny', category: 'shell', priority: 100 }),
      createPermission({ permission: 'WebFetch(domain:github.com)', action: 'allow', category: 'network' }),
      createPermission({ permission: 'Write(path:/tmp/*)', action: 'allow', category: 'file' }),
    ],
    machines: [
      createMachine({ name: 'dev-laptop', isCurrentMachine: true }),
      createMachine({ name: 'ci-runner', syncEnabled: false }),
      createMachine({ name: 'homelab' }),
    ],
  };
}

/**
 * Seeds data for environment variable testing
 */
export function seedEnvVars() {
  return [
    createEnvVar({ key: 'VAR_ALL', scope: 'all' }),
    createEnvVar({ key: 'VAR_DESKTOP', scope: 'claude-desktop' }),
    createEnvVar({ key: 'VAR_CODE', scope: 'claude-code' }),
    createEnvVar({ key: 'VAR_CLI', scope: 'cli' }),
    createEnvVar({ key: 'API_KEY_1', sensitive: true, encrypted: true, category: 'api_keys' }),
    createEnvVar({ key: 'API_KEY_2', sensitive: true, encrypted: true, category: 'api_keys' }),
    createEnvVar({ key: 'PATH_1', category: 'paths' }),
    createEnvVar({ key: 'PATH_2', category: 'paths' }),
  ];
}

/**
 * Seeds data for hook testing
 */
export function seedHooks() {
  return [
    createHook({ hookType: 'PreToolUse', matcher: '*', order: 1 }),
    createHook({ hookType: 'PreToolUse', matcher: 'Write', order: 2 }),
    createHook({ hookType: 'PostToolUse', matcher: '*', order: 1 }),
    createHook({ hookType: 'PostToolUse', matcher: 'Write', order: 2 }),
    createHook({ hookType: 'SessionStart', matcher: '*' }),
    createHook({ hookType: 'Stop', matcher: '*' }),
    createHook({ hookType: 'Notification', matcher: '*', enabled: false }),
  ];
}

/**
 * Seeds data for permission testing
 */
export function seedPermissions() {
  return [
    createPermission({ permission: 'Bash(git:*)', action: 'allow', priority: 10 }),
    createPermission({ permission: 'Bash(rm:-rf)', action: 'deny', priority: 100 }),
    createPermission({ permission: 'Bash(sudo:*)', action: 'deny', priority: 100 }),
    createPermission({ permission: 'WebFetch(domain:*)', action: 'deny', priority: 1 }),
    createPermission({ permission: 'WebFetch(domain:github.com)', action: 'allow', priority: 10 }),
    createPermission({ permission: 'Write(path:/etc/*)', action: 'deny', priority: 100 }),
    createPermission({ permission: 'Write(path:/tmp/*)', action: 'allow', priority: 5 }),
  ];
}

/**
 * Seeds data for machine testing
 */
export function seedMachines() {
  return [
    createMachine({ name: 'dev-laptop', platform: 'darwin', isCurrentMachine: true }),
    createMachine({ name: 'linux-desktop', platform: 'linux' }),
    createMachine({ name: 'windows-pc', platform: 'win32' }),
    createMachine({ name: 'ci-runner', syncEnabled: false }),
  ];
}
