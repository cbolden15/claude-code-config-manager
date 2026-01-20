/**
 * Machine API Tests
 *
 * Tests for /api/machines endpoints with simplified schema
 */

import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

// Mock Prisma before imports
let mockPrismaClient: PrismaClient;
jest.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaClient;
  },
}));

// Import route handlers after mock
import { GET, POST } from '../../../src/app/api/machines/route';
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from '../../../src/app/api/machines/[id]/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
  getTestPrismaClient,
} from '../../helpers/db';

describe('Machine API', () => {
  beforeAll(async () => {
    mockPrismaClient = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(mockPrismaClient);
  });

  // Helper to create mock NextRequest
  function createRequest(
    url: string,
    options: { method?: string; body?: unknown } = {}
  ): NextRequest {
    const { method = 'GET', body } = options;
    const fullUrl = `http://localhost:3000${url}`;

    return new NextRequest(fullUrl, {
      method,
      ...(body && {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }),
    });
  }

  // Helper to parse JSON response
  async function parseResponse(response: Response) {
    return response.json();
  }

  describe('GET /api/machines', () => {
    it('should return empty list when no machines exist', async () => {
      const request = createRequest('/api/machines');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.machines).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.stats.totalMachines).toBe(0);
      expect(data.stats.activeMachines).toBe(0);
    });

    it('should return list of machines with counts', async () => {
      // Create test machines
      await mockPrismaClient.machine.create({
        data: {
          name: 'test-machine-1',
          hostname: 'host1.local',
          platform: 'darwin',
          arch: 'arm64',
          homeDir: '/Users/test1',
        },
      });
      await mockPrismaClient.machine.create({
        data: {
          name: 'test-machine-2',
          hostname: 'host2.local',
          platform: 'linux',
          arch: 'x64',
          homeDir: '/home/test2',
        },
      });

      const request = createRequest('/api/machines');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.machines).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.stats.totalMachines).toBe(2);
      // Both should be active (just created)
      expect(data.stats.activeMachines).toBe(2);
    });

    it('should filter machines by platform', async () => {
      await mockPrismaClient.machine.create({
        data: {
          name: 'mac-machine',
          platform: 'darwin',
        },
      });
      await mockPrismaClient.machine.create({
        data: {
          name: 'linux-machine',
          platform: 'linux',
        },
      });

      const request = createRequest('/api/machines?platform=darwin');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.machines).toHaveLength(1);
      expect(data.machines[0].name).toBe('mac-machine');
    });

    it('should include _count for related records', async () => {
      const machine = await mockPrismaClient.machine.create({
        data: {
          name: 'machine-with-projects',
          platform: 'darwin',
        },
      });

      // Add some projects
      await mockPrismaClient.project.createMany({
        data: [
          { machineId: machine.id, name: 'project1', path: '/path/1' },
          { machineId: machine.id, name: 'project2', path: '/path/2' },
        ],
      });

      const request = createRequest('/api/machines');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.machines[0]._count.projects).toBe(2);
    });
  });

  describe('POST /api/machines', () => {
    it('should create a new machine', async () => {
      const request = createRequest('/api/machines', {
        method: 'POST',
        body: {
          name: 'new-machine',
          hostname: 'new-host.local',
          platform: 'darwin',
          arch: 'arm64',
          homeDir: '/Users/new',
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.name).toBe('new-machine');
      expect(data.hostname).toBe('new-host.local');
      expect(data.platform).toBe('darwin');
      expect(data.id).toBeDefined();
    });

    it('should update existing machine with same name', async () => {
      // Create initial machine
      await mockPrismaClient.machine.create({
        data: {
          name: 'existing-machine',
          hostname: 'old-host.local',
          platform: 'darwin',
        },
      });

      const request = createRequest('/api/machines', {
        method: 'POST',
        body: {
          name: 'existing-machine',
          hostname: 'new-host.local',
          platform: 'darwin',
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.hostname).toBe('new-host.local');

      // Verify only one machine exists
      const count = await mockPrismaClient.machine.count();
      expect(count).toBe(1);
    });

    it('should unset other machines when setting isCurrentMachine', async () => {
      // Create a current machine
      await mockPrismaClient.machine.create({
        data: {
          name: 'old-current',
          platform: 'darwin',
          isCurrentMachine: true,
        },
      });

      const request = createRequest('/api/machines', {
        method: 'POST',
        body: {
          name: 'new-current',
          platform: 'darwin',
          isCurrentMachine: true,
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.isCurrentMachine).toBe(true);

      // Verify old machine is no longer current
      const oldMachine = await mockPrismaClient.machine.findUnique({
        where: { name: 'old-current' },
      });
      expect(oldMachine?.isCurrentMachine).toBe(false);
    });

    it('should return 400 for invalid platform', async () => {
      const request = createRequest('/api/machines', {
        method: 'POST',
        body: {
          name: 'test-machine',
          platform: 'invalid-platform',
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 400 for missing required fields', async () => {
      const request = createRequest('/api/machines', {
        method: 'POST',
        body: {
          hostname: 'test-host.local',
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('GET /api/machines/[id]', () => {
    it('should return machine details', async () => {
      const machine = await mockPrismaClient.machine.create({
        data: {
          name: 'detail-machine',
          hostname: 'detail-host.local',
          platform: 'darwin',
        },
      });

      const request = createRequest(`/api/machines/${machine.id}`);
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: machine.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.name).toBe('detail-machine');
      expect(data._count).toBeDefined();
    });

    it('should return 404 for non-existent machine', async () => {
      const request = createRequest('/api/machines/non-existent-id');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Machine not found');
    });

    it('should include recent projects', async () => {
      const machine = await mockPrismaClient.machine.create({
        data: {
          name: 'machine-with-projects',
          platform: 'darwin',
        },
      });

      await mockPrismaClient.project.create({
        data: {
          machineId: machine.id,
          name: 'test-project',
          path: '/test/path',
        },
      });

      const request = createRequest(`/api/machines/${machine.id}`);
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: machine.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].name).toBe('test-project');
    });
  });

  describe('PUT /api/machines/[id]', () => {
    it('should update machine name', async () => {
      const machine = await mockPrismaClient.machine.create({
        data: {
          name: 'old-name',
          platform: 'darwin',
        },
      });

      const request = createRequest(`/api/machines/${machine.id}`, {
        method: 'PUT',
        body: { name: 'new-name' },
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: machine.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.name).toBe('new-name');
    });

    it('should return 404 for non-existent machine', async () => {
      const request = createRequest('/api/machines/non-existent-id', {
        method: 'PUT',
        body: { name: 'new-name' },
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Machine not found');
    });

    it('should unset other current machines when setting isCurrentMachine', async () => {
      const machine1 = await mockPrismaClient.machine.create({
        data: {
          name: 'machine-1',
          platform: 'darwin',
          isCurrentMachine: true,
        },
      });

      const machine2 = await mockPrismaClient.machine.create({
        data: {
          name: 'machine-2',
          platform: 'linux',
          isCurrentMachine: false,
        },
      });

      const request = createRequest(`/api/machines/${machine2.id}`, {
        method: 'PUT',
        body: { isCurrentMachine: true },
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: machine2.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.isCurrentMachine).toBe(true);

      // Verify old current is unset
      const updatedMachine1 = await mockPrismaClient.machine.findUnique({
        where: { id: machine1.id },
      });
      expect(updatedMachine1?.isCurrentMachine).toBe(false);
    });
  });

  describe('DELETE /api/machines/[id]', () => {
    it('should delete a machine', async () => {
      const machine = await mockPrismaClient.machine.create({
        data: {
          name: 'to-delete',
          platform: 'darwin',
          isCurrentMachine: false,
        },
      });

      const request = createRequest(`/api/machines/${machine.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: machine.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify deletion
      const deleted = await mockPrismaClient.machine.findUnique({
        where: { id: machine.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent machine', async () => {
      const request = createRequest('/api/machines/non-existent-id', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Machine not found');
    });

    it('should return 409 when trying to delete current machine', async () => {
      const machine = await mockPrismaClient.machine.create({
        data: {
          name: 'current-machine',
          platform: 'darwin',
          isCurrentMachine: true,
        },
      });

      const request = createRequest(`/api/machines/${machine.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: machine.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(409);
      expect(data.error).toBe('Cannot delete current machine');
    });
  });
});
