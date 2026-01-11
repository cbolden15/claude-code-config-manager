#!/usr/bin/env node
import assert from 'node:assert';
import { prisma } from '../../../../../src/lib/db';
import {
  cleanupTestData,
  createTestPermission,
  createMockRequest,
  assertSuccess,
  assertError,
  parseResponse
} from '../../test-utils';

// Import API route handlers
import { GET as PermissionsGET, POST as PermissionsPOST } from '../../../../../src/app/api/settings/permissions/route';
import {
  GET as PermissionGET,
  PUT as PermissionPUT,
  DELETE as PermissionDELETE
} from '../../../../../src/app/api/settings/permissions/[id]/route';
import { POST as ImportPOST } from '../../../../../src/app/api/settings/permissions/import/route';
import { GET as ExportGET } from '../../../../../src/app/api/settings/permissions/export/route';

/**
 * Permissions API Tests
 * Tests all Permissions-related API endpoints
 */

console.log('🧪 Running Permissions API Tests...\n');

// Setup and teardown
async function setup() {
  await cleanupTestData();
}

async function teardown() {
  await cleanupTestData();
}

// Test: GET /api/settings/permissions - List all permissions
async function testListPermissions() {
  console.log('Testing GET /api/settings/permissions (list)...');

  await setup();

  // Create test permissions
  await createTestPermission({
    permission: 'Bash(git:*)',
    action: 'allow',
    category: 'git'
  });
  await createTestPermission({
    permission: 'Bash(docker:*)',
    action: 'deny',
    category: 'docker'
  });
  await createTestPermission({
    permission: 'WebFetch(domain:*.com)',
    action: 'allow',
    category: 'network',
    enabled: false
  });

  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions');
  const response = await PermissionsGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.permissions, 'Response should have permissions array');
  assert(data.stats, 'Response should have stats object');
  assert.strictEqual(data.permissions.length, 3, 'Should have 3 permissions');
  assert.strictEqual(data.stats.total, 3, 'Stats should show total=3');
  assert.strictEqual(data.stats.enabled, 2, 'Stats should show enabled=2');

  console.log('  ✅ List permissions test passed\n');
}

// Test: GET /api/settings/permissions - Filter by action
async function testListPermissionsFilterByAction() {
  console.log('Testing GET /api/settings/permissions (filter by action)...');

  await setup();

  await createTestPermission({ permission: 'Bash(git:*)', action: 'allow' });
  await createTestPermission({ permission: 'Bash(rm:*)', action: 'deny' });
  await createTestPermission({ permission: 'Write(/etc/*)', action: 'deny' });

  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions', {
    searchParams: { action: 'deny' }
  });
  const response = await PermissionsGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.permissions.length, 2, 'Should have 2 deny permissions');
  assert(data.permissions.every((p: any) => p.action === 'deny'), 'All should be deny');

  console.log('  ✅ Filter by action test passed\n');
}

// Test: GET /api/settings/permissions - Filter by category
async function testListPermissionsFilterByCategory() {
  console.log('Testing GET /api/settings/permissions (filter by category)...');

  await setup();

  await createTestPermission({ permission: 'Bash(git:*)', category: 'git' });
  await createTestPermission({ permission: 'WebFetch(domain:*)', category: 'network' });
  await createTestPermission({ permission: 'Bash(docker:*)', category: 'docker' });

  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions', {
    searchParams: { category: 'network' }
  });
  const response = await PermissionsGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.permissions.length, 1, 'Should have 1 network permission');
  assert.strictEqual(data.permissions[0].category, 'network', 'Should be network category');

  console.log('  ✅ Filter by category test passed\n');
}

// Test: POST /api/settings/permissions - Create permission
async function testCreatePermission() {
  console.log('Testing POST /api/settings/permissions...');

  await setup();

  const permissionData = {
    permission: 'Bash(git:*)',
    action: 'allow',
    description: 'Allow all git commands',
    category: 'git',
    priority: 10
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions', {
    method: 'POST',
    body: permissionData
  });

  const response = await PermissionsPOST(request);

  assertSuccess(response);

  const permission = await parseResponse(response);

  assert(permission, 'Response should have permission object');
  assert.strictEqual(permission.permission, 'Bash(git:*)', 'Permission should match');
  assert.strictEqual(permission.action, 'allow', 'Action should match');
  assert.strictEqual(permission.enabled, true, 'Should default to enabled');
  assert.strictEqual(permission.priority, 10, 'Priority should match');

  console.log('  ✅ Create permission test passed\n');
}

// Test: POST /api/settings/permissions - Validation errors
async function testCreatePermissionValidation() {
  console.log('Testing POST /api/settings/permissions (validation)...');

  await setup();

  // Test missing permission
  const { request: req1 } = createMockRequest('http://localhost:3000/api/settings/permissions', {
    method: 'POST',
    body: { action: 'allow' }
  });

  const response1 = await PermissionsPOST(req1);
  assertError(response1, 400);

  // Test missing action
  const { request: req2 } = createMockRequest('http://localhost:3000/api/settings/permissions', {
    method: 'POST',
    body: { permission: 'Bash(git:*)' }
  });

  const response2 = await PermissionsPOST(req2);
  assertError(response2, 400);

  // Test invalid action
  const { request: req3 } = createMockRequest('http://localhost:3000/api/settings/permissions', {
    method: 'POST',
    body: { permission: 'Bash(git:*)', action: 'invalid' }
  });

  const response3 = await PermissionsPOST(req3);
  assertError(response3, 400);

  console.log('  ✅ Create permission validation test passed\n');
}

// Test: POST /api/settings/permissions - Duplicate handling
async function testCreatePermissionDuplicate() {
  console.log('Testing POST /api/settings/permissions (duplicate)...');

  await setup();

  // Create first permission
  await createTestPermission({
    permission: 'Bash(git:*)',
    action: 'allow'
  });

  // Try to create duplicate
  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions', {
    method: 'POST',
    body: {
      permission: 'Bash(git:*)',
      action: 'allow',
      description: 'Duplicate'
    }
  });

  const response = await PermissionsPOST(request);

  // Should fail with 409 Conflict due to unique constraint
  assertError(response, 409);

  console.log('  ✅ Create permission duplicate test passed\n');
}

// Test: GET /api/settings/permissions/[id] - Get single permission
async function testGetPermission() {
  console.log('Testing GET /api/settings/permissions/[id]...');

  await setup();

  const permission = await createTestPermission({
    permission: 'Bash(git:*)',
    action: 'allow'
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/permissions/${permission.id}`,
    { params: { id: permission.id } }
  );

  const response = await PermissionGET(request, { params });

  assertSuccess(response);

  const fetchedPermission = await parseResponse(response);

  assert(fetchedPermission, 'Response should have permission object');
  assert.strictEqual(fetchedPermission.id, permission.id, 'Permission ID should match');
  assert.strictEqual(fetchedPermission.permission, 'Bash(git:*)', 'Permission should match');

  console.log('  ✅ Get permission test passed\n');
}

// Test: GET /api/settings/permissions/[id] - Not found
async function testGetPermissionNotFound() {
  console.log('Testing GET /api/settings/permissions/[id] (not found)...');

  await setup();

  const { request, params } = createMockRequest(
    'http://localhost:3000/api/settings/permissions/nonexistent',
    { params: { id: 'nonexistent' } }
  );

  const response = await PermissionGET(request, { params });

  assertError(response, 404);

  console.log('  ✅ Get permission not found test passed\n');
}

// Test: PUT /api/settings/permissions/[id] - Update permission
async function testUpdatePermission() {
  console.log('Testing PUT /api/settings/permissions/[id]...');

  await setup();

  const permission = await createTestPermission({
    permission: 'Bash(git:*)',
    action: 'allow',
    enabled: true,
    priority: 0
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/permissions/${permission.id}`,
    {
      method: 'PUT',
      params: { id: permission.id },
      body: {
        description: 'Updated description',
        enabled: false,
        priority: 100
      }
    }
  );

  const response = await PermissionPUT(request, { params });

  assertSuccess(response);

  const updatedPermission = await parseResponse(response);

  assert.strictEqual(updatedPermission.description, 'Updated description', 'Description should be updated');
  assert.strictEqual(updatedPermission.enabled, false, 'Enabled should be updated');
  assert.strictEqual(updatedPermission.priority, 100, 'Priority should be updated');

  console.log('  ✅ Update permission test passed\n');
}

// Test: DELETE /api/settings/permissions/[id] - Delete permission
async function testDeletePermission() {
  console.log('Testing DELETE /api/settings/permissions/[id]...');

  await setup();

  const permission = await createTestPermission({
    permission: 'Bash(test:*)',
    action: 'allow'
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/permissions/${permission.id}`,
    {
      method: 'DELETE',
      params: { id: permission.id }
    }
  );

  const response = await PermissionDELETE(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);
  assert(data.success, 'Should return success');

  // Verify permission is deleted
  const deleted = await prisma.globalPermission.findUnique({
    where: { id: permission.id }
  });
  assert.strictEqual(deleted, null, 'Permission should be deleted');

  console.log('  ✅ Delete permission test passed\n');
}

// Test: GET /api/settings/permissions/export - Export permissions
async function testExportPermissions() {
  console.log('Testing GET /api/settings/permissions/export...');

  await setup();

  // Create permissions
  await createTestPermission({
    permission: 'Bash(git:*)',
    action: 'allow',
    enabled: true
  });
  await createTestPermission({
    permission: 'WebFetch(domain:*.com)',
    action: 'deny',
    enabled: true
  });
  await createTestPermission({
    permission: 'Write(/etc/*)',
    action: 'deny',
    enabled: false  // Should not be exported by default
  });

  // Export only enabled permissions
  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions/export?enabled=true');
  const response = await ExportGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.allow, 'Should have allow array');
  assert(data.deny, 'Should have deny array');
  assert(Array.isArray(data.allow), 'Allow should be array');
  assert(Array.isArray(data.deny), 'Deny should be array');
  assert.strictEqual(data.allow.length, 1, 'Should have 1 allow permission');
  assert.strictEqual(data.deny.length, 1, 'Should have 1 deny permission');
  assert(data.allow.includes('Bash(git:*)'), 'Should include git permission');
  assert(data.deny.includes('WebFetch(domain:*.com)'), 'Should include webfetch permission');

  console.log('  ✅ Export permissions test passed\n');
}

// Test: POST /api/settings/permissions/import - Import permissions
async function testImportPermissions() {
  console.log('Testing POST /api/settings/permissions/import...');

  await setup();

  const importData = {
    allow: [
      'Bash(git:*)',
      'Bash(npm:*)',
      'WebFetch(domain:*.com)'
    ],
    deny: [
      'Bash(rm:*)',
      'Write(/etc/*)'
    ]
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions/import', {
    method: 'POST',
    body: importData
  });

  const response = await ImportPOST(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.imported, 5, 'Should import 5 permissions');
  assert.strictEqual(data.skipped, 0, 'Should skip 0 permissions');

  // Verify permissions were created
  const permissions = await prisma.globalPermission.findMany();
  assert.strictEqual(permissions.length, 5, 'Should have 5 permissions');

  // Verify actions
  const allowPerms = permissions.filter(p => p.action === 'allow');
  const denyPerms = permissions.filter(p => p.action === 'deny');
  assert.strictEqual(allowPerms.length, 3, 'Should have 3 allow permissions');
  assert.strictEqual(denyPerms.length, 2, 'Should have 2 deny permissions');

  console.log('  ✅ Import permissions test passed\n');
}

// Test: POST /api/settings/permissions/import - Import additional permissions
async function testImportPermissionsAdditional() {
  console.log('Testing POST /api/settings/permissions/import (additional)...');

  await setup();

  // Create existing permissions
  await createTestPermission({ permission: 'Bash(old:*)', action: 'allow' });
  await createTestPermission({ permission: 'Write(/old/*)', action: 'deny' });

  const importData = {
    allow: ['Bash(new:*)'],
    deny: ['Write(/new/*)']
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions/import', {
    method: 'POST',
    body: importData
  });

  const response = await ImportPOST(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.imported, 2, 'Should import 2 new permissions');

  // Verify both old and new permissions exist
  const permissions = await prisma.globalPermission.findMany();
  assert.strictEqual(permissions.length, 4, 'Should have 4 total permissions');

  console.log('  ✅ Import additional permissions test passed\n');
}

// Test: POST /api/settings/permissions/import - Skip duplicates
async function testImportPermissionsSkipDuplicates() {
  console.log('Testing POST /api/settings/permissions/import (skip duplicates)...');

  await setup();

  // Create existing permission
  await createTestPermission({
    permission: 'Bash(git:*)',
    action: 'allow'
  });

  // Try to import the same permission
  const importData = {
    allow: ['Bash(git:*)'],
    deny: []
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions/import', {
    method: 'POST',
    body: importData
  });

  const response = await ImportPOST(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.imported, 0, 'Should import 0 permissions');
  assert.strictEqual(data.skipped, 1, 'Should skip 1 duplicate permission');

  // Verify still only one permission
  const count = await prisma.globalPermission.count();
  assert.strictEqual(count, 1, 'Should still have only 1 permission');

  console.log('  ✅ Import permissions skip duplicates test passed\n');
}

// Test: POST /api/settings/permissions/import - Validation error
async function testImportPermissionsValidation() {
  console.log('Testing POST /api/settings/permissions/import (validation)...');

  await setup();

  // Test missing permissions object
  const { request } = createMockRequest('http://localhost:3000/api/settings/permissions/import', {
    method: 'POST',
    body: {}
  });

  const response = await ImportPOST(request);

  assertError(response, 400);

  const data = await parseResponse(response);
  assert(data.error, 'Should have error message');

  console.log('  ✅ Import permissions validation test passed\n');
}

// Run all tests
async function runTests() {
  try {
    await testListPermissions();
    await testListPermissionsFilterByAction();
    await testListPermissionsFilterByCategory();
    await testCreatePermission();
    await testCreatePermissionValidation();
    await testCreatePermissionDuplicate();
    await testGetPermission();
    await testGetPermissionNotFound();
    await testUpdatePermission();
    await testDeletePermission();
    await testExportPermissions();
    await testImportPermissions();
    await testImportPermissionsAdditional();
    await testImportPermissionsSkipDuplicates();
    await testImportPermissionsValidation();

    await teardown();

    console.log('✅ All Permissions API tests passed!\n');
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
