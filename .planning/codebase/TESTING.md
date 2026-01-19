# Testing Patterns

**Analysis Date:** 2026-01-18

## Test Framework

**Runner:**
- **Server package:** Jest 30.2.0 with next/jest integration
  - Config: `packages/server/jest.config.js`
- **CLI package:** Jest 29.7.0 with ts-jest ESM preset
  - Config: `packages/cli/jest.config.js`
- **Test-utils package:** Vitest 1.2.0
  - Config: `packages/test-utils/vitest.config.ts`
- **V2 API tests:** Custom tsx runner (not Jest)
  - Runner: `packages/server/__tests__/api/v2/run-all-tests.ts`

**Assertion Library:**
- Jest: Built-in `expect()` assertions
- Vitest: Built-in `expect()` (Jest-compatible)
- V2 tests: Node.js `assert` module
- React testing: `@testing-library/jest-dom`

**Run Commands:**
```bash
# Server tests (Jest)
pnpm --filter server test              # Run all tests
pnpm --filter server test:watch        # Watch mode
pnpm --filter server test:coverage     # Coverage report

# V2 API tests (custom runner)
pnpm --filter server test:v2           # Run all v2 API tests
pnpm --filter server test:v2:machines  # Run machine tests only
pnpm --filter server test:v2:hooks     # Run hooks tests only
pnpm --filter server test:v2:permissions # Run permissions tests only
pnpm --filter server test:v2:env       # Run env var tests only

# CLI tests (Jest with ESM)
pnpm --filter cli test                 # Run all tests
pnpm --filter cli test:watch           # Watch mode
pnpm --filter cli test:coverage        # Coverage report

# Test-utils (Vitest)
cd packages/test-utils
pnpm test                              # Run tests
pnpm test:ui                           # UI mode
pnpm test:coverage                     # Coverage report
```

## Test File Organization

**Location:**
- Co-located in `__tests__/` directories within packages
- Mirrored structure to source code

**Naming:**
- Pattern: `*.test.ts` or `*.test.tsx`
- Match source file name (e.g., `orchestrator.test.ts` tests `orchestrator.ts`)

**Structure:**
```
packages/server/
├── __tests__/
│   ├── api/
│   │   ├── v2/
│   │   │   ├── machines/machines.test.ts
│   │   │   ├── settings/hooks/hooks.test.ts
│   │   │   ├── settings/permissions/permissions.test.ts
│   │   │   ├── settings/env/env.test.ts
│   │   │   ├── test-utils.ts           # Shared test utilities
│   │   │   └── run-all-tests.ts        # Test runner
│   │   ├── machines/route.test.ts
│   │   └── projects/sync.test.ts
│   ├── lib/
│   │   └── sync/
│   │       ├── orchestrator.test.ts
│   │       └── overrides.test.ts
│   ├── generators/
│   │   └── auto-claude/*.test.ts
│   └── helpers/
│       ├── db.ts                       # Test database setup
│       ├── factories.ts                # Test data factories
│       └── api.ts                      # Mock request helpers

packages/cli/
├── __tests__/
│   ├── commands/
│   │   ├── settings-permissions.test.ts
│   │   ├── error-handling.test.ts
│   │   └── auto-claude.test.ts
│   ├── lib/
│   │   └── api-permissions.test.ts
│   └── helpers/
│       ├── api-mocks.js               # Fetch mocking
│       └── test-utils.js              # CLI test utilities
```

## Test Structure

**Suite Organization (Jest/Vitest):**
```typescript
describe('Sync Orchestrator', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  describe('syncProject', () => {
    it('should successfully sync a project with profile', async () => {
      // Arrange
      const machine = await createTestMachine(prisma, { syncEnabled: true });
      const project = await createTestProjectWithProfile(prisma, { ... });

      // Act
      const result = await syncProject(prisma, { ... });

      // Assert
      expect(result.success).toBe(true);
      expect(result.files).toBeInstanceOf(Array);
    });

    it('should return error if project not found', async () => {
      // Arrange & Act
      const result = await syncProject(prisma, { projectId: 'non-existent', ... });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('Project not found');
    });
  });
});
```

**Suite Organization (V2 custom runner):**
```typescript
#!/usr/bin/env node
import assert from 'node:assert';
import { prisma } from '../../../../src/lib/db';
import { cleanupTestData, createTestMachine, ... } from '../test-utils';

console.log(' Running Machine API Tests...\n');

async function setup() {
  await cleanupTestData();
}

async function teardown() {
  await cleanupTestData();
}

async function testListMachines() {
  console.log('Testing GET /api/machines (list)...');
  await setup();

  // Create test data
  await createTestMachine({ name: 'machine-1', platform: 'darwin' });

  // Make request
  const { request } = createMockRequest('http://localhost:3000/api/machines');
  const response = await MachinesGET(request);

  // Assert
  assertSuccess(response);
  const data = await parseResponse(response);
  assert(data.machines, 'Response should have machines array');
  assert.strictEqual(data.machines.length, 3, 'Should have 3 machines');

  console.log('   List machines test passed\n');
}

async function runTests() {
  try {
    await testListMachines();
    await testRegisterMachine();
    // ...
    await teardown();
    console.log(' All Machine API tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error(' Test failed:', error);
    process.exit(1);
  }
}

runTests();
```

**Patterns:**
- Arrange-Act-Assert structure
- `beforeEach` for test isolation (reset database/mocks)
- `afterAll` for cleanup
- Descriptive test names starting with "should"

## Mocking

**Framework:** Jest mocks for CLI, custom mocks for V2 API tests

**Next.js Router Mock (jest.setup.js):**
```typescript
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));
```

**Prisma Mock (getter pattern for test injection):**
```typescript
let mockPrismaClient: PrismaClient;
jest.mock('@/lib/db', () => ({
  get prisma() { return mockPrismaClient; }
}));
```

**Fetch Mock (test-utils package):**
```typescript
import { mockFetch, createMockResponse } from '@ccm/test-utils';

const mock = mockFetch()
  .get('/api/settings/env', createSuccessResponse({ envVars: [] }))
  .post('/api/settings/env', createSuccessResponse({ envVar: newVar }))
  .error('GET', '/api/error', new Error('Network error'))
  .build();

// Use in test
const response = await mock('/api/settings/env', { method: 'GET' });
```

**API Request Mock (V2 tests):**
```typescript
export function createMockRequest(url: string, options: {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
  searchParams?: Record<string, string>;
} = {}) {
  const mockUrl = new URL(url, 'http://localhost:3000');
  const mockRequest = {
    method,
    url: mockUrl.toString(),
    nextUrl: mockUrl,
    json: async () => body || {},
    headers: new Headers({ 'Content-Type': 'application/json' })
  } as any;
  return { request: mockRequest, params };
}
```

**What to Mock:**
- External API calls (fetch)
- Database client (Prisma) - use isolated test database
- Next.js navigation hooks
- Console output for CLI tests
- Process.exit for CLI tests

**What NOT to Mock:**
- Business logic functions under test
- Data transformation utilities
- Validation logic

## Fixtures and Factories

**Test Data (factory pattern with counters):**
```typescript
// packages/test-utils/src/factories/machines.ts
let machineCounter = 0;

export function createMachine(overrides?: Partial<Machine>): Machine {
  machineCounter++;
  const now = new Date();

  return {
    id: overrides?.id ?? `machine_${machineCounter}`,
    name: overrides?.name ?? `test-machine-${machineCounter}`,
    hostname: overrides?.hostname ?? `test-host-${machineCounter}.local`,
    platform: overrides?.platform ?? 'darwin',
    arch: overrides?.arch ?? 'arm64',
    homeDir: overrides?.homeDir ?? `/Users/testuser${machineCounter}`,
    lastSeen: overrides?.lastSeen ?? now,
    syncEnabled: overrides?.syncEnabled ?? true,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    ...overrides,
  };
}

// Pre-configured variants
export function createDevMachine(): Machine {
  return createMachine({
    name: 'dev-laptop',
    hostname: 'macbook-pro.local',
    platform: 'darwin',
    isCurrentMachine: true,
  });
}

export function resetMachineCounters(): void {
  machineCounter = 0;
}
```

**Database Test Helpers:**
```typescript
// packages/server/__tests__/api/v2/test-utils.ts
export async function createTestMachine(data?: Partial<{ ... }>) {
  return await prisma.machine.create({
    data: {
      name: data?.name || 'test-machine',
      hostname: data?.hostname || 'test-host',
      platform: data?.platform || 'darwin',
      arch: data?.arch || 'arm64',
      homeDir: data?.homeDir || '/Users/test',
      syncEnabled: data?.syncEnabled ?? true,
    }
  });
}

export async function cleanupTestData() {
  // Clean in dependency order
  await prisma.machineOverride.deleteMany({});
  await prisma.syncLog.deleteMany({});
  await prisma.machine.deleteMany({});
  await prisma.globalHook.deleteMany({});
  await prisma.globalPermission.deleteMany({});
  await prisma.globalEnvVar.deleteMany({});
}
```

**Location:**
- `packages/test-utils/src/factories/` - Reusable factory functions
- `packages/server/__tests__/helpers/` - Server-specific test helpers
- `packages/cli/__tests__/helpers/` - CLI-specific test helpers

## Coverage

**Requirements:**
- Server package has coverage thresholds configured:
```javascript
coverageThreshold: {
  global: {
    statements: 70,
    branches: 60,
    functions: 70,
    lines: 70,
  },
}
```

**View Coverage:**
```bash
# Server
pnpm --filter server test:coverage
# Coverage output: packages/server/coverage/

# CLI
pnpm --filter cli test:coverage
# Coverage output: packages/cli/coverage/

# Test-utils
cd packages/test-utils && pnpm test:coverage
```

**Coverage Exclusions:**
```javascript
collectCoverageFrom: [
  'src/**/*.{js,jsx,ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/*.stories.{js,jsx,ts,tsx}',
  '!src/**/_*.{js,jsx,ts,tsx}',
  '!**/node_modules/**',
  '!**/.next/**',
]
```

## Test Types

**Unit Tests:**
- Business logic in `lib/` directories
- Isolated function testing
- Mock all external dependencies
- Example: `packages/server/__tests__/lib/sync/overrides.test.ts`

**Integration Tests:**
- API route handlers with database
- Use isolated test database
- Real Prisma queries
- Example: `packages/server/__tests__/api/v2/machines/machines.test.ts`

**E2E Tests:**
- Located in root `__tests__/e2e/`
- Test full CLI to server workflows
- Example: `__tests__/e2e/auto-claude.test.ts`

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operations', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
});
```

**Error Testing:**
```typescript
it('should return error if project not found', async () => {
  const result = await syncProject(prisma, {
    projectId: 'non-existent',
    machineId: machine.id,
    syncType: 'full',
  });

  expect(result.success).toBe(false);
  expect(result.errors).toBeDefined();
  expect(result.errors![0]).toContain('Project not found');
});
```

**API Response Assertion:**
```typescript
export function assertSuccess(response: any) {
  if (!response.ok && response.status !== 200 && response.status !== 201) {
    throw new Error(`Expected successful response, got status ${response.status}`);
  }
}

export function assertError(response: any, expectedStatus?: number) {
  if (response.ok || response.status === 200 || response.status === 201) {
    throw new Error(`Expected error response, got status ${response.status}`);
  }
  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
}
```

**Console Mock for CLI:**
```typescript
const consoleMock = mockConsole();
// ... run CLI command
const logs = consoleMock.getLogs();
const output = logs.join('\n');
expect(output).toContain('Success');
consoleMock.restore();
```

**Wait for Async Conditions:**
```typescript
import { waitFor } from '@ccm/test-utils';

await waitFor(() => value === 1, { timeout: 500, interval: 100 });
```

**Test Data Reset:**
```typescript
beforeEach(() => {
  resetAllCounters();  // Reset factory counters
  resetFetchMock();    // Reset fetch mocks
});
```

## Test Utilities Package (@ccm/test-utils)

**Purpose:** Shared test utilities across all packages

**Available Exports:**
```typescript
import {
  // Factories
  createEnvVar, createEnvVars, createApiKeyEnvVar,
  createMachine, createMachines, createDevMachine,
  createHook, createPermission,
  resetAllCounters,

  // Mocks
  mockFetch, createMockResponse, createMockError,
  createMockPrismaClient, createPrismaTestHelper,
  mockEnvVarListResponse, mockEnvVarCreateResponse,

  // Database
  seedEnvVars, seedMinimal, seedComprehensive,

  // Assertions
  assertContains, assertDefined, assertEmpty,

  // Utilities
  waitFor, sleep, retry, measureTime,
} from '@ccm/test-utils';
```

**Usage:**
```typescript
// In package.json
{
  "devDependencies": {
    "@ccm/test-utils": "workspace:*"
  }
}
```

---

*Testing analysis: 2026-01-18*
