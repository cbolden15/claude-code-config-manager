# WS1.1 Machine API Tests - Fixed ✅

**Status:** Complete
**Date:** 2026-01-11
**Test Count:** 9 tests, all passing

## Overview

Fixed the Machine API integration tests by applying the same Prisma mocking pattern used for the Sync API tests. The tests were previously failing because they were using the production Prisma client instead of the test database.

## What Was Fixed

### Problem
The Machine API route tests were failing with:
```
The table `main.Machine` does not exist in the current database.
```

This occurred because the API routes import `prisma` from `@/lib/db`, which connects to the production database, not the test database.

### Solution
Applied the same getter-based Prisma mocking pattern used in the Sync API tests:

```typescript
// Create a mock module for the database client
let mockPrismaClient: PrismaClient

jest.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaClient
  },
}))

// Import routes AFTER the mock
import { GET, POST } from '@/app/api/machines/route'

// Set the mock in beforeAll
beforeAll(async () => {
  prisma = await setupTestDatabase()
  mockPrismaClient = prisma
})
```

## Test Coverage

### File: `__tests__/api/machines/route.test.ts`

#### GET /api/machines (4 tests)
- ✅ should return empty list when no machines exist
- ✅ should return list of machines
- ✅ should filter machines by platform
- ✅ should filter machines by sync status

#### POST /api/machines (5 tests)
- ✅ should create a new machine
- ✅ should update existing machine on duplicate name (upsert behavior)
- ✅ should unset other machines when setting as current
- ✅ should return 400 for invalid platform
- ✅ should return 400 for missing required fields

## Test Results

```
PASS  __tests__/api/machines/route.test.ts
  GET /api/machines
    ✓ should return empty list when no machines exist (10 ms)
    ✓ should return list of machines (6 ms)
    ✓ should filter machines by platform (5 ms)
    ✓ should filter machines by sync status (5 ms)
  POST /api/machines
    ✓ should create a new machine (6 ms)
    ✓ should update existing machine on duplicate name (6 ms)
    ✓ should unset other machines when setting as current (6 ms)
    ✓ should return 400 for invalid platform (3 ms)
    ✓ should return 400 for missing required fields (2 ms)

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Time:        1.924 s
```

## Running the Tests

```bash
# Run machine API tests only
npx jest __tests__/api/machines/route.test.ts --no-coverage

# Run all passing tests
npx jest __tests__/lib/sync --no-coverage
npx jest __tests__/api/machines/route.test.ts --no-coverage
npx jest __tests__/api/projects/sync.test.ts --no-coverage

# Run all tests
pnpm test
```

## Changes Made

### Modified: `__tests__/api/machines/route.test.ts`

1. **Added Prisma Mock Setup** (lines 15-22)
   ```typescript
   let mockPrismaClient: PrismaClient

   jest.mock('@/lib/db', () => ({
     get prisma() {
       return mockPrismaClient
     },
   }))
   ```

2. **Updated Test Suite Setup** (2 locations)
   - GET /api/machines describe block
   - POST /api/machines describe block

   Changed:
   ```typescript
   beforeAll(async () => {
     prisma = await setupTestDatabase()
   })
   ```

   To:
   ```typescript
   beforeAll(async () => {
     prisma = await setupTestDatabase()
     mockPrismaClient = prisma
   })
   ```

## What's Tested

### ✅ Machine Registration
- Create new machines
- Update existing machines (upsert by name)
- Set current machine (only one can be current)
- Default values (syncEnabled defaults to true)

### ✅ Machine Listing
- Empty state
- Multiple machines
- Stats calculation (total, active, sync enabled)
- Filtering by platform
- Filtering by sync status

### ✅ Validation
- Invalid platform enum
- Missing required fields
- Zod schema validation

### ✅ HTTP Status Codes
- 200 OK (successful GET, successful upsert)
- 201 Created (new machine created)
- 400 Bad Request (validation errors)

## Not Yet Tested

The following Machine API endpoints exist but don't have tests yet:
- GET /api/machines/[id] - Get single machine
- PUT /api/machines/[id] - Update machine settings
- DELETE /api/machines/[id] - Delete machine
- GET /api/machines/current - Get/register current machine
- GET /api/machines/[id]/overrides - List overrides
- POST /api/machines/[id]/overrides - Create override

These endpoints may have tests in the Node script at `__tests__/api/v2/machines/machines.test.ts` (different test framework).

## Pattern for Future API Tests

When creating integration tests for Next.js App Router API routes, use this pattern:

1. **Create mock variable** before imports
2. **Mock @/lib/db** with getter function
3. **Import routes** after mock
4. **Set mockPrismaClient** in beforeAll to test database instance

This ensures API routes use the test database instead of production.

## Overall Test Status

**Passing Test Suites:** 4
- ✅ `__tests__/lib/sync/orchestrator.test.ts` (16 tests)
- ✅ `__tests__/lib/sync/overrides.test.ts` (11 tests)
- ✅ `__tests__/api/projects/sync.test.ts` (16 tests)
- ✅ `__tests__/api/machines/route.test.ts` (9 tests)

**Total Passing Tests:** 52

**Failing Test Suites:** 13 (mostly related to auto-claude features, missing utilities, or empty test files)

## Next Steps

1. ✅ WS5 Sync System Testing - Complete
2. ✅ WS1.1 Machine API Tests - Complete
3. ⏭️ Consider adding tests for remaining Machine API endpoints
4. ⏭️ Fix failing test suites (auto-claude, generators)
5. ⏭️ Continue with next work stream items

## Summary

The Machine API tests are now working correctly with 9/9 tests passing. The Prisma mocking pattern is proven and can be reused for other API route tests. The test infrastructure is solid and ready for expansion.
