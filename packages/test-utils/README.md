# @ccm/test-utils

Comprehensive test utilities, factories, and mocks for the CCM project.

## Installation

```bash
# In your package.json
{
  "devDependencies": {
    "@ccm/test-utils": "workspace:*"
  }
}
```

## Features

- **Factory Functions**: Create test data with sensible defaults
- **API Mocks**: Mock API responses and fetch calls
- **Database Utilities**: Mock Prisma client and seeders
- **Test Helpers**: Common testing utilities and assertions

## Usage

### Factory Functions

Create test data with default or custom properties:

```typescript
import { createEnvVar, createHook, createPermission, createMachine } from '@ccm/test-utils';

// Create an environment variable
const envVar = createEnvVar({
  key: 'API_KEY',
  value: 'test-key',
  sensitive: true,
});

// Create a hook
const hook = createHook({
  hookType: 'PreToolUse',
  matcher: 'Write',
  command: 'echo "test"',
});

// Create multiple items
import { createEnvVars } from '@ccm/test-utils';
const envVars = createEnvVars(5); // Creates 5 env vars

// Create pre-configured items
import { createApiKeyEnvVar, createGitCommitHook } from '@ccm/test-utils';
const apiKey = createApiKeyEnvVar();
const gitHook = createGitCommitHook();
```

### API Mocking

Mock fetch calls and API responses:

```typescript
import { mockFetch, createSuccessResponse, mockEnvVarListResponse } from '@ccm/test-utils';

// Mock fetch builder
const mock = mockFetch()
  .get('/api/settings/env', createSuccessResponse({ envVars: [] }))
  .post('/api/settings/env', createSuccessResponse({ envVar }))
  .build();

// Install globally
import { installMockFetch } from '@ccm/test-utils';
const cleanup = installMockFetch(mock);
// ... run tests
cleanup(); // Restore original fetch

// Mock specific responses
const response = mockEnvVarListResponse([envVar1, envVar2]);
```

### Database Utilities

Mock Prisma client and seed test data:

```typescript
import {
  createMockPrismaClient,
  createPrismaTestHelper,
  seedComprehensive,
} from '@ccm/test-utils';

// Create mock Prisma client
const prisma = createMockPrismaClient();

// Use test helper for easier mocking
const helper = createPrismaTestHelper(prisma);

helper
  .mockFindMany('globalEnvVar', [envVar1, envVar2])
  .mockCreate('globalEnvVar', newEnvVar)
  .mockFindUnique('globalEnvVar', envVar1);

// Seed test data
const testData = seedComprehensive();
// testData contains: envVars, hooks, permissions, machines
```

### Test Helpers

Utility functions for common test operations:

```typescript
import {
  waitFor,
  sleep,
  retry,
  createSpy,
  randomString,
  dateOffset,
} from '@ccm/test-utils';

// Wait for a condition
await waitFor(() => someCondition, { timeout: 5000 });

// Retry a failing operation
const result = await retry(async () => fetchData(), {
  maxAttempts: 3,
  delay: 1000,
});

// Create a spy function
const spy = createSpy<(x: number) => number>();
spy.mockImplementation((x) => x * 2);
spy(5);
expect(spy.callCount()).toBe(1);
expect(spy.calledWith(5)).toBe(true);

// Generate random data
const id = randomString(10);
const date = dateOffset({ days: -7 });
```

### Custom Assertions

Additional assertion helpers:

```typescript
import {
  assertContains,
  assertDefined,
  assertMatches,
  assertInRange,
  assertHasKeys,
  assertRecentDate,
  assertThrowsAsync,
} from '@ccm/test-utils';

// Assert array contains object with properties
assertContains(envVars, { key: 'API_KEY', sensitive: true });

// Assert value is defined
assertDefined(result.data);

// Assert string matches pattern
assertMatches(envVar.key, /^[A-Z_]+$/);

// Assert number in range
assertInRange(count, 0, 100);

// Assert object has keys
assertHasKeys(envVar, ['id', 'key', 'value']);

// Assert date is recent
assertRecentDate(envVar.createdAt, 5000);

// Assert async function throws
await assertThrowsAsync(
  async () => createEnvVar({ key: '' }),
  'Key is required'
);
```

## Factory Reset

Reset all factory counters for test isolation:

```typescript
import { resetAllCounters } from '@ccm/test-utils';

beforeEach(() => {
  resetAllCounters();
});
```

## Database Seeders

Pre-configured data sets:

```typescript
import {
  seedMinimal,
  seedComprehensive,
  seedEnvVars,
  seedHooks,
  seedPermissions,
  seedMachines,
} from '@ccm/test-utils';

// Minimal set
const minimal = seedMinimal();

// Comprehensive set
const comprehensive = seedComprehensive();

// Specific entities
const envVars = seedEnvVars();
const hooks = seedHooks();
const permissions = seedPermissions();
const machines = seedMachines();
```

## Example Test

Complete test example:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEnvVar,
  createMockPrismaClient,
  createPrismaTestHelper,
  mockEnvVarListResponse,
  resetAllCounters,
} from '@ccm/test-utils';

describe('Environment Variables API', () => {
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let helper: ReturnType<typeof createPrismaTestHelper>;

  beforeEach(() => {
    resetAllCounters();
    prisma = createMockPrismaClient();
    helper = createPrismaTestHelper(prisma);
  });

  it('should list environment variables', async () => {
    const envVars = [
      createEnvVar({ key: 'KEY1' }),
      createEnvVar({ key: 'KEY2' }),
    ];

    helper.mockFindMany('globalEnvVar', envVars);

    const result = await listEnvVars();

    expect(result.envVars).toHaveLength(2);
    expect(result.stats.total).toBe(2);
  });
});
```

## API

See TypeScript definitions for complete API documentation.

### Factories

- `createMachine(overrides?)` - Create machine
- `createMachineOverride(overrides?)` - Create machine override
- `createEnvVar(overrides?)` - Create environment variable
- `createMaskedEnvVar(overrides?)` - Create masked env var
- `createHook(overrides?)` - Create hook
- `createPermission(overrides?)` - Create permission
- And many pre-configured factory functions...

### Mocks

- `mockFetch()` - Fetch mock builder
- `createMockResponse(data, options?)` - Mock response
- `createMockPrismaClient()` - Mock Prisma client
- `mockEnvVarListResponse(envVars)` - Mock env var list
- And many other response mocks...

### Utilities

- `waitFor(condition, options?)` - Wait for condition
- `retry(fn, options?)` - Retry with backoff
- `createSpy<T>()` - Create spy function
- `sleep(ms)` - Sleep for duration
- And many other helpers...

## License

MIT
