# CLI Test Suite

Comprehensive test suite for the CCM CLI package.

## Overview

This test suite provides full coverage for CLI commands, API clients, and error handling using Jest with TypeScript and ESM support.

## Structure

```
__tests__/
├── commands/              # Command implementation tests
│   ├── settings-permissions.test.ts
│   ├── error-handling.test.ts
│   └── auto-claude.test.ts
├── lib/                   # API client tests
│   └── api-permissions.test.ts
└── helpers/               # Test utilities and mocks
    ├── api-mocks.ts
    └── test-utils.ts
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test settings-permissions

# Run tests matching pattern
pnpm test permissions
```

## Test Utilities

### API Mocks (`helpers/api-mocks.ts`)

Mock utilities for simulating API responses:

```typescript
import { mockFetch, mockPermissions } from '../helpers/api-mocks';

// Mock API responses
mockFetch({
  'GET /api/settings/permissions': {
    ok: true,
    data: mockPermissionsListResponse,
  },
  'POST /api/settings/permissions': {
    ok: true,
    status: 201,
    data: mockPermissions[0],
  },
});
```

**Available Mocks:**
- `mockFetch(responses)` - Mock fetch with custom responses
- `resetFetchMock()` - Reset fetch mock
- `mockConsole()` - Capture console output
- `mockProcessExit()` - Capture process.exit calls
- `mockPermissions` - Sample permission data
- `mockMachine` - Sample machine data

### Test Utilities (`helpers/test-utils.ts`)

Common utilities for test setup:

```typescript
import {
  createTestDir,
  cleanupTestDir,
  createTestSettings,
  stripAnsi,
} from '../helpers/test-utils';

// Create temporary test directory
const testDir = createTestDir();

// Create test config file
createTestSettings(testDir, {
  permissions: {
    allow: ['Bash(git:*)'],
    deny: [],
  },
});

// Clean up after test
cleanupTestDir(testDir);
```

**Available Utilities:**
- `createTestDir(prefix)` - Create temp directory
- `cleanupTestDir(dir)` - Remove temp directory
- `createTestConfig(dir, config)` - Create .ccm.json
- `createTestSettings(dir, settings)` - Create settings.local.json
- `stripAnsi(str)` - Remove ANSI color codes
- `mockEnv(vars)` - Mock environment variables
- `wait(ms)` - Wait for async operations

## Writing Tests

### Test Structure

```typescript
import { mockFetch, mockConsole } from '../helpers/api-mocks';
import { commandFunction } from '../../src/commands/your-command';

describe('your command', () => {
  let consoleMock: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    consoleMock = mockConsole();
  });

  afterEach(() => {
    consoleMock.restore();
  });

  it('should do something', async () => {
    mockFetch({
      'GET /api/endpoint': {
        ok: true,
        data: { /* mock data */ },
      },
    });

    await commandFunction({});

    const output = consoleMock.getLogs().join('\n');
    expect(output).toContain('expected text');
  });
});
```

### Testing Commands

1. **Mock API responses** before calling command
2. **Capture console output** using `mockConsole()`
3. **Call command function** with test options
4. **Assert on output** using captured logs
5. **Verify API calls** if needed

### Testing Error Handling

```typescript
it('should handle API errors', async () => {
  mockFetch({
    'GET /api/endpoint': {
      ok: false,
      status: 500,
      data: { error: 'Server error' },
    },
  });

  await commandFunction({});

  const output = consoleMock.getLogs().join('\n');
  expect(output).toContain('Error');
  expect(output).toContain('Server error');
});
```

### Testing File Operations

```typescript
import { createTestDir, cleanupTestDir } from '../helpers/test-utils';

it('should import from file', async () => {
  const testDir = createTestDir();

  try {
    const file = createTestSettings(testDir, { /* data */ });
    await importCommand(file);
    // assertions
  } finally {
    cleanupTestDir(testDir);
  }
});
```

## Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Test Categories

### 1. Command Tests

Test CLI command implementations:
- ✅ settings-permissions.test.ts - Permissions commands
- ✅ auto-claude.test.ts - Auto-Claude commands
- 🔄 settings-hooks.test.ts - Hooks commands (TODO)
- 🔄 settings-env.test.ts - Environment commands (TODO)
- 🔄 machine.test.ts - Machine commands (TODO)

### 2. API Client Tests

Test API client modules:
- ✅ api-permissions.test.ts - Permissions API client
- 🔄 api-hooks.test.ts - Hooks API client (TODO)
- 🔄 api-env.test.ts - Env API client (TODO)
- 🔄 api-machines.test.ts - Machines API client (TODO)

### 3. Error Handling Tests

Test error scenarios:
- ✅ error-handling.test.ts - Connection errors, API errors, validation errors

### 4. Integration Tests

Test command flows:
- 🔄 integration.test.ts - End-to-end command flows (TODO)

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Mock External Calls**: Always mock API calls and file operations
3. **Clean Up**: Always restore mocks and clean up temp files
4. **Use Descriptive Names**: Test names should clearly describe what they test
5. **Test Edge Cases**: Include error cases, empty states, and boundary conditions
6. **Avoid Flakiness**: Don't rely on timing or external state

## Troubleshooting

### ESM Issues

If you encounter ESM import errors:
- Ensure `"type": "module"` is set in package.json
- Use `.js` extensions in imports even for `.ts` files
- Use `node --experimental-vm-modules` for Jest

### Mock Issues

If mocks aren't working:
- Call `resetFetchMock()` in `afterEach()`
- Ensure mock is set up before calling the function
- Check that URL patterns match exactly

### Coverage Issues

To improve coverage:
- Add tests for edge cases
- Test error branches
- Test all command options
- Test validation logic

## CI Integration

Tests run automatically on:
- Pull requests
- Pushes to main
- Release tags

CI command:
```bash
pnpm test:coverage
```

Coverage reports are uploaded to coverage tracking service.
