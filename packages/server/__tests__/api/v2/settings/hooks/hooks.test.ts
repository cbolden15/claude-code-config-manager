#!/usr/bin/env node
import assert from 'node:assert';
import { prisma } from '../../../../../src/lib/db';
import {
  cleanupTestData,
  createTestHook,
  createMockRequest,
  assertSuccess,
  assertError,
  parseResponse
} from '../../test-utils';

// Import API route handlers
import { GET as HooksGET, POST as HooksPOST } from '../../../../../src/app/api/settings/hooks/route';
import {
  GET as HookGET,
  PUT as HookPUT,
  DELETE as HookDELETE
} from '../../../../../src/app/api/settings/hooks/[id]/route';
import { POST as ImportPOST } from '../../../../../src/app/api/settings/hooks/import/route';
import { GET as ExportGET } from '../../../../../src/app/api/settings/hooks/export/route';

/**
 * Hooks API Tests
 * Tests all Hooks-related API endpoints
 */

console.log('🧪 Running Hooks API Tests...\n');

// Setup and teardown
async function setup() {
  await cleanupTestData();
}

async function teardown() {
  await cleanupTestData();
}

// Test: GET /api/settings/hooks - List all hooks
async function testListHooks() {
  console.log('Testing GET /api/settings/hooks (list)...');

  await setup();

  // Create test hooks
  await createTestHook({
    hookType: 'PreToolUse',
    matcher: 'Write',
    command: 'echo "pre"',
    category: 'logging'
  });
  await createTestHook({
    hookType: 'PostToolUse',
    matcher: 'Edit',
    command: 'git add .',
    category: 'git'
  });
  await createTestHook({
    hookType: 'PostToolUse',
    matcher: 'Write',
    command: 'prettier --write',
    category: 'formatting',
    enabled: false
  });

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks');
  const response = await HooksGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.hooks, 'Response should have hooks array');
  assert(data.grouped, 'Response should have grouped object');
  assert(data.stats, 'Response should have stats object');
  assert.strictEqual(data.hooks.length, 3, 'Should have 3 hooks');
  assert.strictEqual(data.stats.total, 3, 'Stats should show total=3');
  assert.strictEqual(data.stats.enabled, 2, 'Stats should show enabled=2');
  assert(data.grouped.PreToolUse, 'Should have PreToolUse group');
  assert(data.grouped.PostToolUse, 'Should have PostToolUse group');
  assert.strictEqual(data.grouped.PostToolUse.length, 2, 'PostToolUse should have 2 hooks');

  console.log('  ✅ List hooks test passed\n');
}

// Test: GET /api/settings/hooks - Filter by hookType
async function testListHooksFilterByType() {
  console.log('Testing GET /api/settings/hooks (filter by type)...');

  await setup();

  await createTestHook({ hookType: 'PreToolUse', command: 'echo "pre"' });
  await createTestHook({ hookType: 'PostToolUse', command: 'echo "post"' });
  await createTestHook({ hookType: 'PostToolUse', command: 'echo "post2"' });

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks', {
    searchParams: { hookType: 'PostToolUse' }
  });
  const response = await HooksGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.hooks.length, 2, 'Should have 2 PostToolUse hooks');
  assert(data.hooks.every((h: any) => h.hookType === 'PostToolUse'), 'All should be PostToolUse');

  console.log('  ✅ Filter by type test passed\n');
}

// Test: GET /api/settings/hooks - Filter by category
async function testListHooksFilterByCategory() {
  console.log('Testing GET /api/settings/hooks (filter by category)...');

  await setup();

  await createTestHook({ command: 'git add .', category: 'git' });
  await createTestHook({ command: 'prettier', category: 'formatting' });
  await createTestHook({ command: 'git commit', category: 'git' });

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks', {
    searchParams: { category: 'git' }
  });
  const response = await HooksGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.hooks.length, 2, 'Should have 2 git hooks');
  assert(data.hooks.every((h: any) => h.category === 'git'), 'All should be git category');

  console.log('  ✅ Filter by category test passed\n');
}

// Test: GET /api/settings/hooks - Filter by enabled
async function testListHooksFilterByEnabled() {
  console.log('Testing GET /api/settings/hooks (filter by enabled)...');

  await setup();

  await createTestHook({ command: 'enabled 1', enabled: true });
  await createTestHook({ command: 'enabled 2', enabled: true });
  await createTestHook({ command: 'disabled', enabled: false });

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks', {
    searchParams: { enabled: 'true' }
  });
  const response = await HooksGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.hooks.length, 2, 'Should have 2 enabled hooks');
  assert(data.hooks.every((h: any) => h.enabled === true), 'All should be enabled');

  console.log('  ✅ Filter by enabled test passed\n');
}

// Test: POST /api/settings/hooks - Create hook
async function testCreateHook() {
  console.log('Testing POST /api/settings/hooks...');

  await setup();

  const hookData = {
    hookType: 'PostToolUse',
    matcher: 'Edit|Write',
    command: 'git add .',
    description: 'Auto-stage changes',
    category: 'git',
    timeout: 5
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks', {
    method: 'POST',
    body: hookData
  });

  const response = await HooksPOST(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.hook, 'Response should have hook object');
  assert.strictEqual(data.hook.hookType, 'PostToolUse', 'Hook type should match');
  assert.strictEqual(data.hook.matcher, 'Edit|Write', 'Matcher should match');
  assert.strictEqual(data.hook.command, 'git add .', 'Command should match');
  assert.strictEqual(data.hook.enabled, true, 'Should default to enabled');
  assert.strictEqual(data.hook.timeout, 5, 'Timeout should match');

  console.log('  ✅ Create hook test passed\n');
}

// Test: POST /api/settings/hooks - Validation errors
async function testCreateHookValidation() {
  console.log('Testing POST /api/settings/hooks (validation)...');

  await setup();

  // Test missing hookType
  const { request: req1 } = createMockRequest('http://localhost:3000/api/settings/hooks', {
    method: 'POST',
    body: { matcher: '*', command: 'echo test' }
  });

  const response1 = await HooksPOST(req1);
  assertError(response1, 400);

  // Test missing matcher
  const { request: req2 } = createMockRequest('http://localhost:3000/api/settings/hooks', {
    method: 'POST',
    body: { hookType: 'PreToolUse', command: 'echo test' }
  });

  const response2 = await HooksPOST(req2);
  assertError(response2, 400);

  // Test missing command
  const { request: req3 } = createMockRequest('http://localhost:3000/api/settings/hooks', {
    method: 'POST',
    body: { hookType: 'PreToolUse', matcher: '*' }
  });

  const response3 = await HooksPOST(req3);
  assertError(response3, 400);

  console.log('  ✅ Create hook validation test passed\n');
}

// Test: GET /api/settings/hooks/[id] - Get single hook
async function testGetHook() {
  console.log('Testing GET /api/settings/hooks/[id]...');

  await setup();

  const hook = await createTestHook({
    hookType: 'PreToolUse',
    command: 'echo test'
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/hooks/${hook.id}`,
    { params: { id: hook.id } }
  );

  const response = await HookGET(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.hook, 'Response should have hook object');
  assert.strictEqual(data.hook.id, hook.id, 'Hook ID should match');
  assert.strictEqual(data.hook.command, 'echo test', 'Command should match');

  console.log('  ✅ Get hook test passed\n');
}

// Test: GET /api/settings/hooks/[id] - Not found
async function testGetHookNotFound() {
  console.log('Testing GET /api/settings/hooks/[id] (not found)...');

  await setup();

  const { request, params } = createMockRequest(
    'http://localhost:3000/api/settings/hooks/nonexistent',
    { params: { id: 'nonexistent' } }
  );

  const response = await HookGET(request, { params });

  assertError(response, 404);

  console.log('  ✅ Get hook not found test passed\n');
}

// Test: PUT /api/settings/hooks/[id] - Update hook
async function testUpdateHook() {
  console.log('Testing PUT /api/settings/hooks/[id]...');

  await setup();

  const hook = await createTestHook({
    command: 'echo original',
    enabled: true
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/hooks/${hook.id}`,
    {
      method: 'PUT',
      params: { id: hook.id },
      body: {
        command: 'echo updated',
        enabled: false,
        description: 'Updated description'
      }
    }
  );

  const response = await HookPUT(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.hook.command, 'echo updated', 'Command should be updated');
  assert.strictEqual(data.hook.enabled, false, 'Enabled should be updated');
  assert.strictEqual(data.hook.description, 'Updated description', 'Description should be updated');

  console.log('  ✅ Update hook test passed\n');
}

// Test: DELETE /api/settings/hooks/[id] - Delete hook
async function testDeleteHook() {
  console.log('Testing DELETE /api/settings/hooks/[id]...');

  await setup();

  const hook = await createTestHook({ command: 'echo test' });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/hooks/${hook.id}`,
    {
      method: 'DELETE',
      params: { id: hook.id }
    }
  );

  const response = await HookDELETE(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);
  assert(data.success, 'Should return success');

  // Verify hook is deleted
  const deleted = await prisma.globalHook.findUnique({
    where: { id: hook.id }
  });
  assert.strictEqual(deleted, null, 'Hook should be deleted');

  console.log('  ✅ Delete hook test passed\n');
}

// Test: GET /api/settings/hooks/export - Export hooks
async function testExportHooks() {
  console.log('Testing GET /api/settings/hooks/export...');

  await setup();

  // Create hooks
  await createTestHook({
    hookType: 'PreToolUse',
    matcher: 'Write',
    command: 'echo "pre"',
    enabled: true
  });
  await createTestHook({
    hookType: 'PostToolUse',
    matcher: 'Edit',
    command: 'git add .',
    timeout: 5,
    enabled: true
  });
  await createTestHook({
    hookType: 'PostToolUse',
    matcher: 'Write',
    command: 'disabled command',
    enabled: false  // Should not be exported
  });

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks/export');
  const response = await ExportGET();

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.hooks, 'Response should have hooks object');
  assert.strictEqual(data.count, 2, 'Should export 2 enabled hooks');
  assert(data.hooks.PreToolUse, 'Should have PreToolUse group');
  assert(data.hooks.PostToolUse, 'Should have PostToolUse group');

  // Verify format
  const preHooks = data.hooks.PreToolUse;
  assert(Array.isArray(preHooks), 'PreToolUse should be array');
  assert.strictEqual(preHooks[0].matcher, 'Write', 'Matcher should match');
  assert(Array.isArray(preHooks[0].hooks), 'Should have hooks array');
  assert.strictEqual(preHooks[0].hooks[0].type, 'command', 'Should have type');
  assert.strictEqual(preHooks[0].hooks[0].command, 'echo "pre"', 'Command should match');

  const postHooks = data.hooks.PostToolUse;
  assert.strictEqual(postHooks[0].hooks[0].timeout, 5, 'Timeout should be included');

  console.log('  ✅ Export hooks test passed\n');
}

// Test: POST /api/settings/hooks/import - Import hooks (dry run)
async function testImportHooksDryRun() {
  console.log('Testing POST /api/settings/hooks/import (dry run)...');

  await setup();

  const importData = {
    hooks: {
      SessionStart: [{
        matcher: '*',
        hooks: [{
          type: 'command',
          command: 'echo "session started"',
          timeout: 5
        }]
      }],
      PostToolUse: [{
        matcher: 'Write|Edit',
        hooks: [
          {
            type: 'command',
            command: 'prettier --write',
            timeout: 10
          },
          {
            type: 'command',
            command: 'git add .'
          }
        ]
      }]
    },
    dryRun: true
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks/import', {
    method: 'POST',
    body: importData
  });

  const response = await ImportPOST(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.dryRun, true, 'Should be dry run');
  assert(data.preview, 'Should have preview');
  assert.strictEqual(data.preview.total, 3, 'Should preview 3 hooks');
  assert(data.preview.byType, 'Should have byType breakdown');
  assert.strictEqual(data.preview.byType.SessionStart, 1, 'Should have 1 SessionStart');
  assert.strictEqual(data.preview.byType.PostToolUse, 2, 'Should have 2 PostToolUse');

  // Verify no hooks were actually created
  const count = await prisma.globalHook.count();
  assert.strictEqual(count, 0, 'No hooks should be created in dry run');

  console.log('  ✅ Import hooks dry run test passed\n');
}

// Test: POST /api/settings/hooks/import - Import hooks (actual import)
async function testImportHooks() {
  console.log('Testing POST /api/settings/hooks/import (actual)...');

  await setup();

  const importData = {
    hooks: {
      PreToolUse: [{
        matcher: 'Bash',
        hooks: [{
          type: 'command',
          command: 'echo "pre bash"'
        }]
      }],
      PostToolUse: [{
        matcher: 'Edit',
        hooks: [{
          type: 'command',
          command: 'git add .',
          timeout: 5
        }]
      }]
    },
    replace: false,
    dryRun: false
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks/import', {
    method: 'POST',
    body: importData
  });

  const response = await ImportPOST(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.success, true, 'Should be successful');
  assert.strictEqual(data.imported, 2, 'Should import 2 hooks');
  assert.strictEqual(data.skipped, 0, 'Should skip 0 hooks');
  assert.strictEqual(data.errors.length, 0, 'Should have no errors');

  // Verify hooks were created
  const hooks = await prisma.globalHook.findMany();
  assert.strictEqual(hooks.length, 2, 'Should have 2 hooks');

  // Check auto-detection worked
  const gitHook = hooks.find(h => h.command === 'git add .');
  assert(gitHook, 'Should have git hook');
  assert.strictEqual(gitHook.category, 'git', 'Should auto-detect git category');

  console.log('  ✅ Import hooks test passed\n');
}

// Test: POST /api/settings/hooks/import - Import with replace
async function testImportHooksReplace() {
  console.log('Testing POST /api/settings/hooks/import (replace)...');

  await setup();

  // Create existing hooks
  await createTestHook({ command: 'existing 1' });
  await createTestHook({ command: 'existing 2' });

  const importData = {
    hooks: {
      PreToolUse: [{
        matcher: '*',
        hooks: [{
          type: 'command',
          command: 'new hook'
        }]
      }]
    },
    replace: true,
    dryRun: false
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks/import', {
    method: 'POST',
    body: importData
  });

  const response = await ImportPOST(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.success, true, 'Should be successful');
  assert.strictEqual(data.imported, 1, 'Should import 1 hook');

  // Verify old hooks were deleted
  const hooks = await prisma.globalHook.findMany();
  assert.strictEqual(hooks.length, 1, 'Should only have 1 hook');
  assert.strictEqual(hooks[0].command, 'new hook', 'Should have new hook');

  console.log('  ✅ Import hooks replace test passed\n');
}

// Test: POST /api/settings/hooks/import - Skip duplicates
async function testImportHooksSkipDuplicates() {
  console.log('Testing POST /api/settings/hooks/import (skip duplicates)...');

  await setup();

  // Create existing hook
  await createTestHook({
    hookType: 'PreToolUse',
    matcher: '*',
    command: 'existing command'
  });

  // Try to import the same hook
  const importData = {
    hooks: {
      PreToolUse: [{
        matcher: '*',
        hooks: [{
          type: 'command',
          command: 'existing command'
        }]
      }]
    },
    replace: false,
    dryRun: false
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks/import', {
    method: 'POST',
    body: importData
  });

  const response = await ImportPOST(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.imported, 0, 'Should import 0 hooks');
  assert.strictEqual(data.skipped, 1, 'Should skip 1 duplicate hook');

  // Verify still only one hook
  const count = await prisma.globalHook.count();
  assert.strictEqual(count, 1, 'Should still have only 1 hook');

  console.log('  ✅ Import hooks skip duplicates test passed\n');
}

// Test: POST /api/settings/hooks/import - Validation error
async function testImportHooksValidation() {
  console.log('Testing POST /api/settings/hooks/import (validation)...');

  await setup();

  // Test missing hooks object
  const { request } = createMockRequest('http://localhost:3000/api/settings/hooks/import', {
    method: 'POST',
    body: { dryRun: false }
  });

  const response = await ImportPOST(request);

  assertError(response, 400);

  const data = await parseResponse(response);
  assert(data.error, 'Should have error message');

  console.log('  ✅ Import hooks validation test passed\n');
}

// Run all tests
async function runTests() {
  try {
    await testListHooks();
    await testListHooksFilterByType();
    await testListHooksFilterByCategory();
    await testListHooksFilterByEnabled();
    await testCreateHook();
    await testCreateHookValidation();
    await testGetHook();
    await testGetHookNotFound();
    await testUpdateHook();
    await testDeleteHook();
    await testExportHooks();
    await testImportHooksDryRun();
    await testImportHooks();
    await testImportHooksReplace();
    await testImportHooksSkipDuplicates();
    await testImportHooksValidation();

    await teardown();

    console.log('✅ All Hooks API tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await teardown();
    process.exit(1);
  }
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
