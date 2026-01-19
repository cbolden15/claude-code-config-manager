# Server Testing Infrastructure

Complete testing setup for the CCM server package with Jest, React Testing Library, and Prisma test database.

## Overview

This testing infrastructure provides:
- ✅ Jest configured for Next.js 14 App Router
- ✅ In-memory SQLite test database
- ✅ Factory functions for test data creation
- ✅ API route testing utilities
- ✅ React component testing with Testing Library
- ✅ Code coverage reporting

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage

# Run tests in CI mode
pnpm test:ci
```

## Directory Structure

```
__tests__/
├── api/                    # API route tests
│   └── machines/          # Machine API tests
│       └── route.test.ts  # Example test file
├── helpers/               # Test utilities
│   ├── db.ts             # Database setup/teardown
│   ├── factories.ts      # Test data factories
│   ├── api.ts            # API testing helpers
│   └── index.ts          # Central export
└── README.md             # This file
```

## Test Database

The test infrastructure uses **in-memory SQLite databases** for isolation and speed.

### Setup and Teardown

Each test suite should use these lifecycle hooks:

```typescript
import { setupTestDatabase, teardownTestDatabase, resetDatabase } from '../helpers'

describe('My Test Suite', () => {
  let prisma: PrismaClient

  // Create test database before all tests
  beforeAll(async () => {
    prisma = await setupTestDatabase()
  })

  // Destroy test database after all tests
  afterAll(async () => {
    await teardownTestDatabase()
  })

  // Reset data between tests
  beforeEach(async () => {
    await resetDatabase()
  })

  // Your tests here...
})
```

### Key Functions

- `setupTestDatabase()` - Creates unique SQLite database and runs schema
- `teardownTestDatabase()` - Disconnects and cleans up database files
- `resetDatabase()` - Clears all data from tables
- `cleanDatabase()` - Alternative cleanup method

## Factory Functions

Factory functions create test data with sensible defaults.

### Available Factories

```typescript
import { createTestMachine, createTestMachineOverride } from '../helpers'

// Create a machine with defaults
const machine = await createTestMachine(prisma)

// Create with overrides
const customMachine = await createTestMachine(prisma, {
  name: 'custom-name',
  platform: 'linux',
  syncEnabled: false
})

// Create machine override
const override = await createTestMachineOverride(prisma, machine.id, {
  configType: 'hook',
  action: 'exclude'
})

// Create machine with related data
const machineWithData = await createTestMachineWithData(prisma, {
  overridesCount: 3,
  syncLogsCount: 5
})
```

### All Factories

- `createTestMachine()` - Create machine
- `createTestMachineOverride()` - Create machine override
- `createTestGlobalHook()` - Create global hook
- `createTestGlobalPermission()` - Create global permission
- `createTestGlobalEnvVar()` - Create global environment variable
- `createTestComponent()` - Create component
- `createTestProfile()` - Create profile
- `createTestMachineWithData()` - Create machine with overrides and sync logs

## API Route Testing

Test Next.js API routes with mock requests and responses.

### Example

```typescript
import { GET, POST } from '@/app/api/machines/route'
import { createMockRequest, parseResponse } from '../helpers'

it('should list machines', async () => {
  // Create mock request
  const request = createMockRequest({
    method: 'GET',
    url: 'http://localhost:3000/api/machines',
    searchParams: { platform: 'darwin' }
  })

  // Call route handler
  const response = await GET(request)

  // Parse response
  const { status, data } = await parseResponse(response)

  // Assertions
  expect(status).toBe(200)
  expect(data.machines).toHaveLength(2)
})
```

### Dynamic Routes

For routes with parameters (e.g., `/api/machines/[id]`):

```typescript
import { GET } from '@/app/api/machines/[id]/route'
import { createMockRequest, createMockParams } from '../helpers'

it('should get machine by id', async () => {
  const request = createMockRequest({
    method: 'GET',
    url: 'http://localhost:3000/api/machines/123'
  })

  const params = createMockParams({ id: '123' })

  const response = await GET(request, params)
  const { status, data } = await parseResponse(response)

  expect(status).toBe(200)
  expect(data.id).toBe('123')
})
```

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should create a machine', async () => {
  // Arrange - Set up test data
  const machineData = {
    name: 'test-machine',
    platform: 'darwin' as const
  }

  // Act - Execute the action being tested
  const request = createMockRequest({
    method: 'POST',
    body: machineData
  })
  const response = await POST(request)
  const { status, data } = await parseResponse(response)

  // Assert - Verify the results
  expect(status).toBe(201)
  expect(data.name).toBe(machineData.name)
})
```

### Testing Error Cases

```typescript
it('should return 400 for invalid data', async () => {
  const request = createMockRequest({
    method: 'POST',
    body: { name: '' } // Invalid: empty name
  })

  const response = await POST(request)
  const { status, data } = await parseResponse(response)

  expect(status).toBe(400)
  expect(data.error).toBe('Validation failed')
  expect(data.details).toBeDefined()
})
```

### Testing Database State

```typescript
it('should update database', async () => {
  // Create initial data
  const machine = await createTestMachine(prisma, { syncEnabled: false })

  // Perform action
  const request = createMockRequest({
    method: 'PUT',
    body: { syncEnabled: true }
  })
  await PUT(request, createMockParams({ id: machine.id }))

  // Verify database state
  const updated = await prisma.machine.findUnique({
    where: { id: machine.id }
  })
  expect(updated?.syncEnabled).toBe(true)
})
```

## Coverage

Coverage thresholds are configured in `jest.config.js`:

```javascript
coverageThresholds: {
  global: {
    statements: 70,
    branches: 60,
    functions: 70,
    lines: 70,
  },
}
```

View coverage report:
```bash
pnpm test:coverage
open coverage/lcov-report/index.html
```

## Best Practices

### ✅ Do's

- **Isolate tests** - Each test should be independent
- **Clean data** - Use `resetDatabase()` between tests
- **Test behavior** - Focus on what the code does, not how
- **Clear names** - Descriptive test names explain what's being tested
- **Arrange-Act-Assert** - Follow AAA pattern consistently
- **Mock external APIs** - Don't make real network calls
- **Test edge cases** - Invalid inputs, empty data, errors

### ❌ Don'ts

- **Don't share state** - Between tests or test files
- **Don't test implementation details** - Test public APIs
- **Don't use real database** - Always use test database
- **Don't skip cleanup** - Always teardown properly
- **Don't write flaky tests** - Tests should be deterministic

## Debugging Tests

### Run single test file
```bash
pnpm test __tests__/api/machines/route.test.ts
```

### Run tests matching pattern
```bash
pnpm test --testNamePattern="should create machine"
```

### Debug with VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## CI/CD Integration

For GitHub Actions or other CI:

```yaml
- name: Run tests
  run: pnpm test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Troubleshooting

### Tests timeout
Increase timeout in test or globally:
```typescript
it('slow test', async () => {
  // test code
}, 10000) // 10 second timeout
```

### Database errors
Ensure Prisma schema is up to date:
```bash
pnpm db:generate
pnpm db:push
```

### Module not found
Check `moduleNameMapper` in `jest.config.js` matches your aliases.

### Can't find test database
The test database is created in `prisma/` directory with a random name. It's automatically cleaned up after tests.

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing/jest)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing/unit-testing)
