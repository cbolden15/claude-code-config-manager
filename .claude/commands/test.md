# Run Tests

Run test suites for this project.

## Arguments

`$ARGUMENTS` specifies which tests to run:
- (empty) - Run all tests
- `server` - Run server package Jest tests
- `cli` - Run CLI package Jest tests
- `v2` - Run v2 API tests (custom runner)
- `v2:machines` - Run v2 machines API tests only
- `v2:hooks` - Run v2 hooks API tests only
- `v2:permissions` - Run v2 permissions API tests only
- `v2:env` - Run v2 env vars API tests only
- `coverage` - Run with coverage report

## Process

1. **Identify test suite** from arguments
2. **Run the appropriate command**:

| Argument | Command |
|----------|---------|
| (empty) | `pnpm --filter server test && pnpm --filter cli test` |
| `server` | `pnpm --filter server test` |
| `cli` | `pnpm --filter cli test` |
| `v2` | `pnpm --filter server test:v2` |
| `v2:machines` | `pnpm --filter server test:v2:machines` |
| `v2:hooks` | `pnpm --filter server test:v2:hooks` |
| `v2:permissions` | `pnpm --filter server test:v2:permissions` |
| `v2:env` | `pnpm --filter server test:v2:env` |
| `coverage` | `pnpm --filter server test:coverage` |

3. **Report results** including pass/fail counts

## Examples

```
/test           # Run all tests
/test server    # Run server tests only
/test v2        # Run v2 API tests
/test coverage  # Run with coverage
```

## Test Locations

- Server tests: `packages/server/__tests__/`
- CLI tests: `packages/cli/__tests__/`
- V2 API tests: `packages/server/__tests__/api/v2/`
- Test utilities: `packages/test-utils/`
