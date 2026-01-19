#!/usr/bin/env node
import assert from 'node:assert';
import { prisma } from '../../../../src/lib/db';
import {
  cleanupTestData,
  createTestMachine,
  createMockRequest,
  assertSuccess,
  assertError,
  parseResponse
} from '../test-utils';

// Import API route handlers
import { GET as MachinesGET, POST as MachinesPOST } from '../../../../src/app/api/machines/route';
import {
  GET as MachineGET,
  PUT as MachinePUT,
  DELETE as MachineDELETE
} from '../../../../src/app/api/machines/[id]/route';
import {
  GET as OverridesGET,
  POST as OverridesPOST
} from '../../../../src/app/api/machines/[id]/overrides/route';

/**
 * Machine API Tests
 * Tests all Machine-related API endpoints
 */

console.log('🧪 Running Machine API Tests...\n');

// Setup and teardown
async function setup() {
  await cleanupTestData();
}

async function teardown() {
  await cleanupTestData();
}

// Test: GET /api/machines - List all machines
async function testListMachines() {
  console.log('Testing GET /api/machines (list)...');

  await setup();

  // Create test machines
  await createTestMachine({ name: 'machine-1', platform: 'darwin' });
  await createTestMachine({ name: 'machine-2', platform: 'linux' });
  await createTestMachine({ name: 'machine-3', platform: 'win32', syncEnabled: false });

  const { request } = createMockRequest('http://localhost:3000/api/machines');
  const response = await MachinesGET(request);

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.machines, 'Response should have machines array');
  assert(data.stats, 'Response should have stats object');
  assert.strictEqual(data.machines.length, 3, 'Should have 3 machines');
  assert.strictEqual(data.stats.totalMachines, 3, 'Stats should show totalMachines=3');
  assert.strictEqual(data.stats.syncEnabled, 2, 'Stats should show syncEnabled=2');

  console.log('  ✅ List machines test passed\n');
}

// Test: POST /api/machines - Register a new machine
async function testRegisterMachine() {
  console.log('Testing POST /api/machines (register)...');

  await setup();

  const machineData = {
    name: 'new-machine',
    hostname: 'new-host',
    platform: 'darwin',
    arch: 'arm64',
    homeDir: '/Users/test'
  };

  const { request } = createMockRequest('http://localhost:3000/api/machines', {
    method: 'POST',
    body: machineData
  });

  const response = await MachinesPOST(request);

  assertSuccess(response);

  const machine = await parseResponse(response);

  assert(machine, 'Response should have machine object');
  assert.strictEqual(machine.name, 'new-machine', 'Machine name should match');
  assert.strictEqual(machine.platform, 'darwin', 'Platform should match');
  assert.strictEqual(machine.syncEnabled, true, 'syncEnabled should default to true');

  console.log('  ✅ Register machine test passed\n');
}

// Test: POST /api/machines - Validation errors
async function testRegisterMachineValidation() {
  console.log('Testing POST /api/machines (validation)...');

  await setup();

  // Test missing name
  const { request: req1 } = createMockRequest('http://localhost:3000/api/machines', {
    method: 'POST',
    body: { platform: 'darwin' }
  });

  const response1 = await MachinesPOST(req1);
  assertError(response1, 400);
  const data1 = await parseResponse(response1);
  assert(data1.error, 'Should have error message');

  // Test missing platform
  const { request: req2 } = createMockRequest('http://localhost:3000/api/machines', {
    method: 'POST',
    body: { name: 'test' }
  });

  const response2 = await MachinesPOST(req2);
  assertError(response2, 400);
  const data2 = await parseResponse(response2);
  assert(data2.error, 'Should have error message');

  console.log('  ✅ Register machine validation test passed\n');
}

// Test: POST /api/machines - Upsert (update existing)
async function testUpsertMachine() {
  console.log('Testing POST /api/machines (upsert)...');

  await setup();

  // Create initial machine
  const initial = await createTestMachine({ name: 'test-machine', hostname: 'old-host' });

  // Register again with same name
  const { request } = createMockRequest('http://localhost:3000/api/machines', {
    method: 'POST',
    body: {
      name: 'test-machine',
      hostname: 'new-host',
      platform: 'linux',
      arch: 'x64'
    }
  });

  const response = await MachinesPOST(request);

  assertSuccess(response);

  const machine = await parseResponse(response);

  assert.strictEqual(machine.id, initial.id, 'Should update existing machine');
  assert.strictEqual(machine.hostname, 'new-host', 'Hostname should be updated');
  assert.strictEqual(machine.platform, 'linux', 'Platform should be updated');

  // Verify only one machine exists
  const count = await prisma.machine.count({ where: { name: 'test-machine' } });
  assert.strictEqual(count, 1, 'Should only have one machine with this name');

  console.log('  ✅ Upsert machine test passed\n');
}

// Test: GET /api/machines/[id] - Get single machine
async function testGetMachine() {
  console.log('Testing GET /api/machines/[id]...');

  await setup();

  const machine = await createTestMachine({ name: 'test-machine' });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/machines/${machine.id}`,
    { params: { id: machine.id } }
  );

  const response = await MachineGET(request, { params });

  assertSuccess(response);

  const fetchedMachine = await parseResponse(response);

  assert(fetchedMachine, 'Response should have machine object');
  assert.strictEqual(fetchedMachine.id, machine.id, 'Machine ID should match');
  assert.strictEqual(fetchedMachine.name, 'test-machine', 'Machine name should match');

  console.log('  ✅ Get machine test passed\n');
}

// Test: GET /api/machines/[id] - Not found
async function testGetMachineNotFound() {
  console.log('Testing GET /api/machines/[id] (not found)...');

  await setup();

  const { request, params } = createMockRequest(
    'http://localhost:3000/api/machines/nonexistent',
    { params: { id: 'nonexistent' } }
  );

  const response = await MachineGET(request, { params });

  assertError(response, 404);
  const data = await parseResponse(response);
  assert(data.error, 'Should have error message');

  console.log('  ✅ Get machine not found test passed\n');
}

// Test: PUT /api/machines/[id] - Update machine
async function testUpdateMachine() {
  console.log('Testing PUT /api/machines/[id]...');

  await setup();

  const machine = await createTestMachine({
    name: 'test-machine',
    syncEnabled: true
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/machines/${machine.id}`,
    {
      method: 'PUT',
      params: { id: machine.id },
      body: {
        syncEnabled: false
      }
    }
  );

  const response = await MachinePUT(request, { params });

  assertSuccess(response);

  const updatedMachine = await parseResponse(response);

  assert.strictEqual(updatedMachine.syncEnabled, false, 'syncEnabled should be updated');

  console.log('  ✅ Update machine test passed\n');
}

// Test: DELETE /api/machines/[id] - Delete machine
async function testDeleteMachine() {
  console.log('Testing DELETE /api/machines/[id]...');

  await setup();

  const machine = await createTestMachine({ name: 'test-machine' });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/machines/${machine.id}`,
    {
      method: 'DELETE',
      params: { id: machine.id }
    }
  );

  const response = await MachineDELETE(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);
  assert(data.success, 'Should return success');

  // Verify machine is deleted
  const deleted = await prisma.machine.findUnique({
    where: { id: machine.id }
  });
  assert.strictEqual(deleted, null, 'Machine should be deleted');

  console.log('  ✅ Delete machine test passed\n');
}

// Test: GET /api/machines/[id]/overrides - Get overrides
async function testGetOverrides() {
  console.log('Testing GET /api/machines/[id]/overrides...');

  await setup();

  const machine = await createTestMachine({ name: 'test-machine' });

  // Create overrides
  await prisma.machineOverride.create({
    data: {
      machineId: machine.id,
      configType: 'hook',
      configKey: 'test-hook',
      action: 'exclude'
    }
  });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/machines/${machine.id}/overrides`,
    { params: { id: machine.id } }
  );

  const response = await OverridesGET(request, { params });

  assertSuccess(response);

  const data = await parseResponse(response);

  assert(data.overrides, 'Response should have overrides array');
  assert.strictEqual(data.overrides.length, 1, 'Should have 1 override');
  assert.strictEqual(data.overrides[0].configType, 'hook', 'Config type should match');

  console.log('  ✅ Get overrides test passed\n');
}

// Test: POST /api/machines/[id]/overrides - Create override
async function testCreateOverride() {
  console.log('Testing POST /api/machines/[id]/overrides...');

  await setup();

  const machine = await createTestMachine({ name: 'test-machine' });

  const { request, params } = createMockRequest(
    `http://localhost:3000/api/machines/${machine.id}/overrides`,
    {
      method: 'POST',
      params: { id: machine.id },
      body: {
        configType: 'mcp_server',
        configKey: 'github',
        action: 'exclude',
        reason: 'Not needed on this machine'
      }
    }
  );

  const response = await OverridesPOST(request, { params });

  assertSuccess(response);

  const override = await parseResponse(response);

  assert(override, 'Response should have override object');
  assert.strictEqual(override.configType, 'mcp_server', 'Config type should match');
  assert.strictEqual(override.action, 'exclude', 'Action should match');
  assert.strictEqual(override.reason, 'Not needed on this machine', 'Reason should match');

  console.log('  ✅ Create override test passed\n');
}

// Test: POST /api/machines/[id]/overrides - Upsert existing override
async function testUpsertOverride() {
  console.log('Testing POST /api/machines/[id]/overrides (upsert)...');

  await setup();

  const machine = await createTestMachine({ name: 'test-machine' });

  // Create initial override
  const initial = await prisma.machineOverride.create({
    data: {
      machineId: machine.id,
      configType: 'hook',
      configKey: 'test-hook',
      action: 'exclude'
    }
  });

  // Upsert with same configType and configKey
  const { request, params } = createMockRequest(
    `http://localhost:3000/api/machines/${machine.id}/overrides`,
    {
      method: 'POST',
      params: { id: machine.id },
      body: {
        configType: 'hook',
        configKey: 'test-hook',
        action: 'include',
        reason: 'Actually needed'
      }
    }
  );

  const response = await OverridesPOST(request, { params });

  // Should fail with 409 Conflict (POST doesn't support upsert, only creates new)
  assertError(response, 409);

  // Verify only one override exists
  const count = await prisma.machineOverride.count({
    where: {
      machineId: machine.id,
      configType: 'hook',
      configKey: 'test-hook'
    }
  });
  assert.strictEqual(count, 1, 'Should only have one override');

  console.log('  ✅ Upsert override test passed\n');
}

// Run all tests
async function runTests() {
  try {
    await testListMachines();
    await testRegisterMachine();
    await testRegisterMachineValidation();
    await testUpsertMachine();
    await testGetMachine();
    await testGetMachineNotFound();
    await testUpdateMachine();
    await testDeleteMachine();
    await testGetOverrides();
    await testCreateOverride();
    await testUpsertOverride();

    await teardown();

    console.log('✅ All Machine API tests passed!\n');
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
