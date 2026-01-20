/**
 * API Machines Client Tests
 *
 * Tests for the machine-related API client functions
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the api module before importing
jest.unstable_mockModule('../../src/lib/api.js', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Import after mocking
const { api } = await import('../../src/lib/api.js');
const {
  listMachines,
  getCurrentMachine,
  registerMachine,
  getMachine,
  updateMachine,
  deleteMachine,
  listOverrides,
  createOverride,
} = await import('../../src/lib/api-machines.js');

const mockedApi = api as jest.Mocked<typeof api>;

describe('API Machines Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listMachines', () => {
    it('should list all machines', async () => {
      const mockResponse = {
        data: {
          machines: [
            { id: '1', name: 'machine-1', platform: 'darwin' },
            { id: '2', name: 'machine-2', platform: 'linux' },
          ],
          total: 2,
          stats: {
            totalMachines: 2,
            activeMachines: 2,
            syncEnabled: 1,
          },
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await listMachines();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/machines');
      expect(result.data?.machines).toHaveLength(2);
      expect(result.data?.stats.totalMachines).toBe(2);
    });

    it('should filter by platform', async () => {
      const mockResponse = {
        data: {
          machines: [{ id: '1', name: 'mac-machine', platform: 'darwin' }],
          total: 1,
          stats: { totalMachines: 1, activeMachines: 1, syncEnabled: 1 },
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await listMachines({ platform: 'darwin' });

      expect(mockedApi.get).toHaveBeenCalledWith('/api/machines?platform=darwin');
      expect(result.data?.machines).toHaveLength(1);
    });

    it('should filter by syncEnabled', async () => {
      const mockResponse = {
        data: {
          machines: [],
          total: 0,
          stats: { totalMachines: 0, activeMachines: 0, syncEnabled: 0 },
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await listMachines({ syncEnabled: true });

      expect(mockedApi.get).toHaveBeenCalledWith('/api/machines?syncEnabled=true');
    });

    it('should handle errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await listMachines();

      expect(result.error).toBe('Network error');
      expect(result.data).toBeUndefined();
    });
  });

  describe('getCurrentMachine', () => {
    it('should get current machine', async () => {
      const mockResponse = {
        data: {
          id: 'current-id',
          name: 'my-laptop',
          platform: 'darwin',
          isCurrentMachine: true,
          overrides: [],
          syncLogs: [],
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await getCurrentMachine();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/machines/current');
      expect(result.data?.name).toBe('my-laptop');
      expect(result.data?.isCurrentMachine).toBe(true);
    });

    it('should handle errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Not found'));

      const result = await getCurrentMachine();

      expect(result.error).toBe('Not found');
    });
  });

  describe('registerMachine', () => {
    it('should register a new machine', async () => {
      const mockResponse = {
        data: {
          id: 'new-id',
          name: 'new-machine',
          hostname: 'new-host.local',
          platform: 'darwin',
          arch: 'arm64',
          isCurrentMachine: false,
          overrides: [],
          syncLogs: [],
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await registerMachine({
        name: 'new-machine',
        hostname: 'new-host.local',
        platform: 'darwin',
        arch: 'arm64',
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/api/machines', {
        name: 'new-machine',
        hostname: 'new-host.local',
        platform: 'darwin',
        arch: 'arm64',
      });
      expect(result.data?.id).toBe('new-id');
    });

    it('should register with isCurrentMachine flag', async () => {
      const mockResponse = {
        data: {
          id: 'current-id',
          name: 'current-machine',
          platform: 'darwin',
          isCurrentMachine: true,
          overrides: [],
          syncLogs: [],
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await registerMachine({
        name: 'current-machine',
        platform: 'darwin',
        isCurrentMachine: true,
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/api/machines', {
        name: 'current-machine',
        platform: 'darwin',
        isCurrentMachine: true,
      });
      expect(result.data?.isCurrentMachine).toBe(true);
    });

    it('should handle registration errors', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Invalid platform'));

      const result = await registerMachine({
        name: 'bad-machine',
        platform: 'darwin',
      });

      expect(result.error).toBe('Invalid platform');
    });
  });

  describe('getMachine', () => {
    it('should get machine by ID', async () => {
      const mockResponse = {
        data: {
          id: 'machine-123',
          name: 'test-machine',
          platform: 'linux',
          overrides: [],
          syncLogs: [],
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await getMachine('machine-123');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/machines/machine-123');
      expect(result.data?.id).toBe('machine-123');
    });

    it('should handle not found', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Machine not found'));

      const result = await getMachine('non-existent');

      expect(result.error).toBe('Machine not found');
    });
  });

  describe('updateMachine', () => {
    it('should enable sync', async () => {
      const mockResponse = {
        data: {
          id: 'machine-123',
          name: 'test-machine',
          syncEnabled: true,
          overrides: [],
          syncLogs: [],
        },
      };

      mockedApi.put.mockResolvedValueOnce(mockResponse);

      const result = await updateMachine('machine-123', { syncEnabled: true });

      expect(mockedApi.put).toHaveBeenCalledWith('/api/machines/machine-123', {
        syncEnabled: true,
      });
      expect(result.data?.syncEnabled).toBe(true);
    });

    it('should set as current machine', async () => {
      const mockResponse = {
        data: {
          id: 'machine-123',
          name: 'test-machine',
          isCurrentMachine: true,
          overrides: [],
          syncLogs: [],
        },
      };

      mockedApi.put.mockResolvedValueOnce(mockResponse);

      const result = await updateMachine('machine-123', { isCurrentMachine: true });

      expect(mockedApi.put).toHaveBeenCalledWith('/api/machines/machine-123', {
        isCurrentMachine: true,
      });
      expect(result.data?.isCurrentMachine).toBe(true);
    });

    it('should handle update errors', async () => {
      mockedApi.put.mockRejectedValueOnce(new Error('Update failed'));

      const result = await updateMachine('machine-123', { syncEnabled: true });

      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteMachine', () => {
    it('should delete machine', async () => {
      const mockResponse = {
        data: { success: true },
      };

      mockedApi.delete.mockResolvedValueOnce(mockResponse);

      const result = await deleteMachine('machine-123');

      expect(mockedApi.delete).toHaveBeenCalledWith('/api/machines/machine-123');
      expect(result.data?.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      mockedApi.delete.mockRejectedValueOnce(new Error('Cannot delete current machine'));

      const result = await deleteMachine('current-machine-id');

      expect(result.error).toBe('Cannot delete current machine');
    });
  });

  describe('listOverrides', () => {
    it('should list machine overrides', async () => {
      const mockResponse = {
        data: {
          overrides: [
            {
              id: 'override-1',
              machineId: 'machine-123',
              configType: 'mcp_server',
              configKey: 'postgres',
              action: 'exclude',
            },
          ],
          total: 1,
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await listOverrides('machine-123');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/machines/machine-123/overrides');
      expect(result.data?.overrides).toHaveLength(1);
    });

    it('should handle errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Machine not found'));

      const result = await listOverrides('non-existent');

      expect(result.error).toBe('Machine not found');
    });
  });

  describe('createOverride', () => {
    it('should create machine override', async () => {
      const mockResponse = {
        data: {
          id: 'new-override',
          machineId: 'machine-123',
          configType: 'hook',
          configKey: 'pre-commit',
          action: 'exclude',
          reason: 'Not needed on this machine',
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await createOverride('machine-123', {
        configType: 'hook',
        configKey: 'pre-commit',
        action: 'exclude',
        reason: 'Not needed on this machine',
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/api/machines/machine-123/overrides', {
        configType: 'hook',
        configKey: 'pre-commit',
        action: 'exclude',
        reason: 'Not needed on this machine',
      });
      expect(result.data?.action).toBe('exclude');
    });

    it('should handle creation errors', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Invalid config type'));

      const result = await createOverride('machine-123', {
        configType: 'mcp_server',
        configKey: 'test',
        action: 'exclude',
      });

      expect(result.error).toBe('Invalid config type');
    });
  });
});
