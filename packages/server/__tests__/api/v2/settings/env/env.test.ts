#!/usr/bin/env node
import assert from 'node:assert';
import { prisma } from '../../../../../src/lib/db';
import {
  cleanupTestData,
  createTestEnvVar,
  createMockRequest,
  assertSuccess,
  assertError,
  parseResponse
} from '../../test-utils';

// Import API route handlers
import { GET as EnvVarsGET, POST as EnvVarsPOST } from '../../../../../src/app/api/settings/env/route';
import {
  GET as EnvVarGET,
  PATCH as EnvVarPATCH,
  DELETE as EnvVarDELETE
} from '../../../../../src/app/api/settings/env/[id]/route';
import { GET as ExportGET } from '../../../../../src/app/api/settings/env/export/route';

/**
 * Environment Variables API Tests
 * Tests all Env vars-related API endpoints
 */

console.log('🧪 Running Environment Variables API Tests...\n');

// Setup and teardown
async function setup() {
  await cleanupTestData();
}

async function teardown() {
  await cleanupTestData();
}

// Test: GET /api/settings/env - List all env vars
async function testListEnvVars() {
  console.log('Testing GET /api/settings/env (list)...');

  await setup();

  // Create test env vars
  await createTestEnvVar({
    key: 'API_KEY',
    value: 'secret123',
    sensitive: true,
    category: 'api_keys'
  });
  await createTestEnvVar({
    key: 'DATABASE_URL',
    value: 'postgresql://localhost',
    sensitive: true,
    category: 'database'
  });
  await createTestEnvVar({
    key: 'NODE_ENV',
    value: 'development',
    sensitive: false,
    category: 'other'
  });

  const { request } = createMockRequest('http://localhost:3000/api/settings/env');
  const response = await EnvVarsGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.envVars, 'Response should have envVars array');
  assert(data.stats, 'Response should have stats object');
  assert.strictEqual(data.envVars.length, 3, 'Should have 3 env vars');
  assert.strictEqual(data.stats.total, 3, 'Stats should show total=3');

  // Verify sensitive values are masked
  const apiKey = data.envVars.find((e: any) => e.key === 'API_KEY');
  assert(apiKey, 'Should have API_KEY');
  assert.strictEqual(apiKey.value, '********', 'Sensitive value should be masked');

  console.log('  ✅ List env vars test passed\n');
}

// Test: GET /api/settings/env - Filter by scope
async function testListEnvVarsFilterByScope() {
  console.log('Testing GET /api/settings/env (filter by scope)...');

  await setup();

  await createTestEnvVar({ key: 'VAR1', scope: 'all' });
  await createTestEnvVar({ key: 'VAR2', scope: 'claude-desktop' });
  await createTestEnvVar({ key: 'VAR3', scope: 'claude-code' });

  const { request } = createMockRequest('http://localhost:3000/api/settings/env', {
    searchParams: { scope: 'claude-desktop' }
  });
  const response = await EnvVarsGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.envVars.length, 1, 'Should have 1 claude-desktop var');
  assert.strictEqual(data.envVars[0].scope, 'claude-desktop', 'Should be claude-desktop scope');

  console.log('  ✅ Filter by scope test passed\n');
}

// Test: GET /api/settings/env - Filter by category
async function testListEnvVarsFilterByCategory() {
  console.log('Testing GET /api/settings/env (filter by category)...');

  await setup();

  await createTestEnvVar({ key: 'API_KEY', category: 'api_keys' });
  await createTestEnvVar({ key: 'DB_URL', category: 'database' });
  await createTestEnvVar({ key: 'WEBHOOK_URL', category: 'webhooks' });

  const { request } = createMockRequest('http://localhost:3000/api/settings/env', {
    searchParams: { category: 'api_keys' }
  });
  const response = await EnvVarsGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert.strictEqual(data.envVars.length, 1, 'Should have 1 api_keys var');
  assert.strictEqual(data.envVars[0].category, 'api_keys', 'Should be api_keys category');

  console.log('  ✅ Filter by category test passed\n');
}

// Test: POST /api/settings/env - Create env var
async function testCreateEnvVar() {
  console.log('Testing POST /api/settings/env...');

  await setup();

  const envVarData = {
    key: 'NEW_API_KEY',
    value: 'secret-value-123',
    sensitive: true,
    encrypted: false,
    description: 'API key for service',
    scope: 'all',
    category: 'api_keys'
  };

  const { request } = createMockRequest('http://localhost:3000/api/settings/env', {
    method: 'POST',
    body: envVarData
  });

  const response = await EnvVarsPOST(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.envVar, 'Response should have envVar object');
  assert.strictEqual(data.envVar.key, 'NEW_API_KEY', 'Key should match');
  // Value is encrypted when sensitive=true, so we check encrypted flag and that value exists
  assert.strictEqual(data.envVar.sensitive, true, 'Sensitive should match');
  assert.strictEqual(data.envVar.encrypted, true, 'Should be encrypted when sensitive');
  assert(data.envVar.value.length > 0, 'Value should exist (encrypted)');
  assert.strictEqual(data.envVar.scope, 'all', 'Scope should match');

  console.log('  ✅ Create env var test passed\n');
}

// Test: POST /api/settings/env - Validation errors
async function testCreateEnvVarValidation() {
  console.log('Testing POST /api/settings/env (validation)...');

  await setup();

  // Test missing key
  const { request: req1 } = createMockRequest('http://localhost:3000/api/settings/env', {
    method: 'POST',
    body: { value: 'test' }
  });

  const response1 = await EnvVarsPOST(req1);
  assertError(response1, 400);

  // Test missing value
  const { request: req2 } = createMockRequest('http://localhost:3000/api/settings/env', {
    method: 'POST',
    body: { key: 'TEST' }
  });

  const response2 = await EnvVarsPOST(req2);
  assertError(response2, 400);

  console.log('  ✅ Create env var validation test passed\n');
}

// Test: POST /api/settings/env - Duplicate key
async function testCreateEnvVarDuplicate() {
  console.log('Testing POST /api/settings/env (duplicate key)...');

  await setup();

  // Create first env var
  await createTestEnvVar({ key: 'DUPLICATE_KEY', value: 'value1' });

  // Try to create duplicate
  const { request } = createMockRequest('http://localhost:3000/api/settings/env', {
    method: 'POST',
    body: {
      key: 'DUPLICATE_KEY',
      value: 'value2'
    }
  });

  const response = await EnvVarsPOST(request);

  // Should fail with 409 Conflict due to duplicate key
  assertError(response, 409);

  console.log('  ✅ Create env var duplicate test passed\n');
}

// Test: GET /api/settings/env/[id] - Get single env var
async function testGetEnvVar() {
  console.log('Testing GET /api/settings/env/[id]...');

  await setup();

  const envVar = await createTestEnvVar({
    key: 'TEST_VAR',
    value: 'test-value'
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/env/${envVar.id}`,
    { params: { id: envVar.id } }
  );

  const response = await EnvVarGET(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.envVar, 'Response should have envVar object');
  assert.strictEqual(data.envVar.id, envVar.id, 'ID should match');
  assert.strictEqual(data.envVar.key, 'TEST_VAR', 'Key should match');

  console.log('  ✅ Get env var test passed\n');
}

// Test: GET /api/settings/env/[id] - Not found
async function testGetEnvVarNotFound() {
  console.log('Testing GET /api/settings/env/[id] (not found)...');

  await setup();

  const { request, params } = createMockRequest(
    'http://localhost:3000/api/settings/env/nonexistent',
    { params: { id: 'nonexistent' } }
  );

  const response = await EnvVarGET(request, { params });

  assertError(response, 404);

  console.log('  ✅ Get env var not found test passed\n');
}

// Test: GET /api/settings/env/[id] - Sensitive value masking
async function testGetEnvVarSensitiveMasking() {
  console.log('Testing GET /api/settings/env/[id] (sensitive masking)...');

  await setup();

  const envVar = await createTestEnvVar({
    key: 'SECRET_KEY',
    value: 'super-secret-value',
    sensitive: true
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/env/${envVar.id}`,
    { params: { id: envVar.id } }
  );

  const response = await EnvVarGET(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);

  // Sensitive values should be masked when retrieved
  assert.strictEqual(data.envVar.value, '********', 'Sensitive value should be masked');

  console.log('  ✅ Get env var sensitive masking test passed\n');
}

// Test: PUT /api/settings/env/[id] - Update env var
async function testUpdateEnvVar() {
  console.log('Testing PUT /api/settings/env/[id]...');

  await setup();

  const envVar = await createTestEnvVar({
    key: 'TEST_VAR',
    value: 'original-value',
    sensitive: false
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/env/${envVar.id}`,
    {
      method: 'PATCH',
      params: { id: envVar.id },
      body: {
        value: 'updated-value',
        sensitive: true,
        description: 'Updated description'
      }
    }
  );

  const response = await EnvVarPATCH(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);

  // Value is masked in response when sensitive=true
  assert.strictEqual(data.envVar.value, '********', 'Value should be masked');
  assert.strictEqual(data.envVar.sensitive, true, 'Sensitive should be updated');
  assert.strictEqual(data.envVar.description, 'Updated description', 'Description should be updated');

  console.log('  ✅ Update env var test passed\n');
}

// Test: DELETE /api/settings/env/[id] - Delete env var
async function testDeleteEnvVar() {
  console.log('Testing DELETE /api/settings/env/[id]...');

  await setup();

  const envVar = await createTestEnvVar({
    key: 'TO_DELETE',
    value: 'test'
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/settings/env/${envVar.id}`,
    {
      method: 'DELETE',
      params: { id: envVar.id }
    }
  );

  const response = await EnvVarDELETE(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);
  assert(data.message, 'Should return success message');

  // Verify env var is deleted
  const deleted = await prisma.globalEnvVar.findUnique({
    where: { id: envVar.id }
  });
  assert.strictEqual(deleted, null, 'Env var should be deleted');

  console.log('  ✅ Delete env var test passed\n');
}

// Test: GET /api/settings/env/export - Export env vars
async function testExportEnvVars() {
  console.log('Testing GET /api/settings/env/export...');

  await setup();

  // Create env vars
  await createTestEnvVar({
    key: 'PUBLIC_VAR',
    value: 'public-value',
    sensitive: false
  });
  await createTestEnvVar({
    key: 'SECRET_KEY',
    value: 'secret-value',
    sensitive: true
  });
  await createTestEnvVar({
    key: 'DATABASE_URL',
    value: 'postgresql://localhost',
    sensitive: true
  });

  const { request } = createMockRequest('http://localhost:3000/api/settings/env/export');
  const response = await ExportGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.envVars, 'Response should have envVars object');
  assert.strictEqual(Object.keys(data.envVars).length, 3, 'Should export 3 env vars');

  // Verify format (key-value pairs)
  assert(data.envVars.PUBLIC_VAR, 'Should have PUBLIC_VAR');
  assert(data.envVars.SECRET_KEY, 'Should have SECRET_KEY');
  assert(data.envVars.DATABASE_URL, 'Should have DATABASE_URL');

  // Check if values are present (may be masked or not depending on implementation)
  assert.strictEqual(typeof data.envVars.PUBLIC_VAR, 'string', 'Value should be string');

  console.log('  ✅ Export env vars test passed\n');
}

// Test: Scope filtering for different scopes
async function testScopeFiltering() {
  console.log('Testing scope filtering...');

  await setup();

  await createTestEnvVar({ key: 'ALL_VAR', scope: 'all' });
  await createTestEnvVar({ key: 'DESKTOP_VAR', scope: 'claude-desktop' });
  await createTestEnvVar({ key: 'CODE_VAR', scope: 'claude-code' });
  await createTestEnvVar({ key: 'CLI_VAR', scope: 'cli' });

  // Test each scope
  const scopes = ['all', 'claude-desktop', 'claude-code', 'cli'];

  for (const scope of scopes) {
    const { request } = createMockRequest('http://localhost:3000/api/settings/env', {
      searchParams: { scope }
    });
    const response = await EnvVarsGET(request);
    const data = await parseResponse(response);

    assert.strictEqual(data.envVars.length, 1, `Should have 1 var for scope ${scope}`);
    assert.strictEqual(data.envVars[0].scope, scope, `Should match scope ${scope}`);
  }

  console.log('  ✅ Scope filtering test passed\n');
}

// Test: Category filtering for different categories
async function testCategoryFiltering() {
  console.log('Testing category filtering...');

  await setup();

  await createTestEnvVar({ key: 'API_KEY', category: 'api_keys' });
  await createTestEnvVar({ key: 'PATH_VAR', category: 'paths' });
  await createTestEnvVar({ key: 'WEBHOOK', category: 'webhooks' });
  await createTestEnvVar({ key: 'DB_URL', category: 'database' });

  const categories = ['api_keys', 'paths', 'webhooks', 'database'];

  for (const category of categories) {
    const { request } = createMockRequest('http://localhost:3000/api/settings/env', {
      searchParams: { category }
    });
    const response = await EnvVarsGET(request);
    const data = await parseResponse(response);

    assert.strictEqual(data.envVars.length, 1, `Should have 1 var for category ${category}`);
    assert.strictEqual(data.envVars[0].category, category, `Should match category ${category}`);
  }

  console.log('  ✅ Category filtering test passed\n');
}

// Test: Encryption flag handling
async function testEncryptionFlag() {
  console.log('Testing encryption flag...');

  await setup();

  const encryptedVar = await createTestEnvVar({
    key: 'ENCRYPTED_VAR',
    value: 'encrypted-value',
    encrypted: true,
    sensitive: true
  });

  const normalVar = await createTestEnvVar({
    key: 'NORMAL_VAR',
    value: 'normal-value',
    encrypted: false,
    sensitive: false
  });

  // Verify encrypted flag is stored correctly
  const retrieved = await prisma.globalEnvVar.findUnique({
    where: { id: encryptedVar.id }
  });

  assert.strictEqual(retrieved?.encrypted, true, 'Encrypted flag should be true');

  const normalRetrieved = await prisma.globalEnvVar.findUnique({
    where: { id: normalVar.id }
  });

  assert.strictEqual(normalRetrieved?.encrypted, false, 'Encrypted flag should be false');

  console.log('  ✅ Encryption flag test passed\n');
}

// Run all tests
async function runTests() {
  try {
    await testListEnvVars();
    await testListEnvVarsFilterByScope();
    await testListEnvVarsFilterByCategory();
    await testCreateEnvVar();
    await testCreateEnvVarValidation();
    await testCreateEnvVarDuplicate();
    await testGetEnvVar();
    await testGetEnvVarNotFound();
    await testGetEnvVarSensitiveMasking();
    await testUpdateEnvVar();
    await testDeleteEnvVar();
    await testExportEnvVars();
    await testScopeFiltering();
    await testCategoryFiltering();
    await testEncryptionFlag();

    await teardown();

    console.log('✅ All Environment Variables API tests passed!\n');
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
