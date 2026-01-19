/**
 * Environment Variables Factory
 *
 * Factory functions for creating test environment variable data
 */

import type { GlobalEnvVar, GlobalEnvVarCreate, GlobalEnvVarMasked, EnvScope, EnvCategory } from '@ccm/shared';

let envCounter = 0;

/**
 * Creates an environment variable with default or custom properties
 */
export function createEnvVar(overrides?: Partial<GlobalEnvVar>): GlobalEnvVar {
  envCounter++;

  const now = new Date();
  const key = overrides?.key ?? `TEST_VAR_${envCounter}`;

  return {
    id: overrides?.id ?? `env_${envCounter}`,
    key,
    value: overrides?.value ?? `test-value-${envCounter}`,
    encrypted: overrides?.encrypted ?? false,
    sensitive: overrides?.sensitive ?? false,
    description: overrides?.description ?? null,
    scope: overrides?.scope ?? 'all',
    category: overrides?.category ?? null,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    ...overrides,
  };
}

/**
 * Creates a masked environment variable
 */
export function createMaskedEnvVar(overrides?: Partial<GlobalEnvVarMasked>): GlobalEnvVarMasked {
  const envVar = createEnvVar(overrides as Partial<GlobalEnvVar>);

  return {
    ...envVar,
    value: envVar.sensitive ? '********' : envVar.value,
    hasValue: true,
  };
}

/**
 * Creates an environment variable create payload
 */
export function createEnvVarCreate(overrides?: Partial<GlobalEnvVarCreate>): GlobalEnvVarCreate {
  envCounter++;

  return {
    key: overrides?.key ?? `TEST_VAR_${envCounter}`,
    value: overrides?.value ?? `test-value-${envCounter}`,
    encrypted: overrides?.encrypted ?? false,
    sensitive: overrides?.sensitive ?? false,
    description: overrides?.description,
    scope: overrides?.scope ?? 'all',
    category: overrides?.category,
    ...overrides,
  };
}

/**
 * Creates multiple environment variables
 */
export function createEnvVars(count: number, overrides?: Partial<GlobalEnvVar>): GlobalEnvVar[] {
  return Array.from({ length: count }, (_, i) =>
    createEnvVar({ ...overrides, key: overrides?.key ?? `VAR_${i + 1}` })
  );
}

/**
 * Creates an API key environment variable
 */
export function createApiKeyEnvVar(): GlobalEnvVar {
  return createEnvVar({
    key: 'OPENAI_API_KEY',
    value: 'sk-test1234567890abcdefghijklmnop',
    encrypted: true,
    sensitive: true,
    category: 'api_keys',
    description: 'OpenAI API key for testing',
  });
}

/**
 * Creates a path environment variable
 */
export function createPathEnvVar(): GlobalEnvVar {
  return createEnvVar({
    key: 'AUTO_CLAUDE_PATH',
    value: '/Users/test/Projects/Auto-Claude',
    encrypted: false,
    sensitive: false,
    category: 'paths',
    description: 'Path to Auto-Claude installation',
  });
}

/**
 * Creates a webhook environment variable
 */
export function createWebhookEnvVar(): GlobalEnvVar {
  return createEnvVar({
    key: 'DISCORD_WEBHOOK_URL',
    value: 'https://discord.com/api/webhooks/123456789/abcdefghijk',
    encrypted: false,
    sensitive: true,
    category: 'webhooks',
    description: 'Discord webhook for notifications',
  });
}

/**
 * Creates a database credential environment variable
 */
export function createDatabaseEnvVar(): GlobalEnvVar {
  return createEnvVar({
    key: 'DATABASE_URL',
    value: 'postgresql://user:password@localhost:5432/testdb',
    encrypted: true,
    sensitive: true,
    category: 'database',
    description: 'PostgreSQL database connection string',
  });
}

/**
 * Creates environment variables for all scopes
 */
export function createEnvVarsByScope(): Record<EnvScope, GlobalEnvVar> {
  return {
    all: createEnvVar({ key: 'COMMON_VAR', scope: 'all' }),
    'claude-desktop': createEnvVar({ key: 'DESKTOP_VAR', scope: 'claude-desktop' }),
    'claude-code': createEnvVar({ key: 'CODE_VAR', scope: 'claude-code' }),
    cli: createEnvVar({ key: 'CLI_VAR', scope: 'cli' }),
  };
}

/**
 * Creates environment variables for all categories
 */
export function createEnvVarsByCategory(): Record<EnvCategory, GlobalEnvVar> {
  return {
    api_keys: createApiKeyEnvVar(),
    paths: createPathEnvVar(),
    webhooks: createWebhookEnvVar(),
    database: createDatabaseEnvVar(),
    credentials: createEnvVar({ key: 'GITHUB_TOKEN', category: 'credentials', sensitive: true }),
    other: createEnvVar({ key: 'OTHER_VAR', category: 'other' }),
  };
}

/**
 * Reset counter (useful for test isolation)
 */
export function resetEnvVarCounters(): void {
  envCounter = 0;
}
