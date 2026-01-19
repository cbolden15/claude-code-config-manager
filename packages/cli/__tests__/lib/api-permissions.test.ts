/**
 * Tests for permissions API client
 */

import { permissionsApi } from '../../src/lib/api-permissions.js';
import {
  mockFetch,
  resetFetchMock,
  mockPermissions,
  mockPermissionsListResponse,
  mockImportResult,
  mockExportResult,
} from '../helpers/api-mocks.js';

describe('permissionsApi', () => {
  beforeEach(() => {
    resetFetchMock();
  });

  describe('list', () => {
    it('should fetch permissions list', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: true,
          data: mockPermissionsListResponse,
        },
      });

      const result = await permissionsApi.list();

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.permissions).toHaveLength(3);
      expect(result.data?.stats.total).toBe(3);
    });

    it('should handle errors', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: false,
          status: 500,
          data: { error: 'Server error' },
        },
      });

      const result = await permissionsApi.list();

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe('get', () => {
    it('should fetch single permission', async () => {
      mockFetch({
        'GET /api/settings/permissions/perm_1': {
          ok: true,
          data: mockPermissions[0],
        },
      });

      const result = await permissionsApi.get('perm_1');

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('perm_1');
    });

    it('should handle not found', async () => {
      mockFetch({
        'GET /api/settings/permissions/invalid': {
          ok: false,
          status: 404,
          data: { error: 'Not found' },
        },
      });

      const result = await permissionsApi.get('invalid');

      expect(result.error).toBeDefined();
      expect(result.error).toContain('Not found');
    });
  });

  describe('create', () => {
    it('should create permission', async () => {
      const newPermission = {
        permission: 'Bash(docker:*)',
        action: 'allow' as const,
        description: 'Test permission',
      };

      mockFetch({
        'POST /api/settings/permissions': {
          ok: true,
          status: 201,
          data: { ...mockPermissions[0], ...newPermission },
        },
      });

      const result = await permissionsApi.create(newPermission);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.permission).toBe('Bash(docker:*)');
    });

    it('should handle validation errors', async () => {
      mockFetch({
        'POST /api/settings/permissions': {
          ok: false,
          status: 400,
          data: { error: 'Invalid permission format' },
        },
      });

      const result = await permissionsApi.create({
        permission: 'invalid',
        action: 'allow',
      });

      expect(result.error).toBeDefined();
    });

    it('should handle duplicate errors', async () => {
      mockFetch({
        'POST /api/settings/permissions': {
          ok: false,
          status: 409,
          data: { error: 'Permission already exists' },
        },
      });

      const result = await permissionsApi.create({
        permission: 'Bash(git:*)',
        action: 'allow',
      });

      expect(result.error).toContain('Permission already exists');
    });
  });

  describe('update', () => {
    it('should update permission', async () => {
      const updates = {
        description: 'Updated description',
        enabled: false,
      };

      mockFetch({
        'PUT /api/settings/permissions/perm_1': {
          ok: true,
          data: { ...mockPermissions[0], ...updates },
        },
      });

      const result = await permissionsApi.update('perm_1', updates);

      expect(result.error).toBeUndefined();
      expect(result.data?.enabled).toBe(false);
    });

    it('should handle not found', async () => {
      mockFetch({
        'PUT /api/settings/permissions/invalid': {
          ok: false,
          status: 404,
          data: { error: 'Not found' },
        },
      });

      const result = await permissionsApi.update('invalid', {});

      expect(result.error).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete permission', async () => {
      mockFetch({
        'DELETE /api/settings/permissions/perm_1': {
          ok: true,
          data: { success: true },
        },
      });

      const result = await permissionsApi.delete('perm_1');

      expect(result.error).toBeUndefined();
      expect(result.data?.success).toBe(true);
    });

    it('should handle not found', async () => {
      mockFetch({
        'DELETE /api/settings/permissions/invalid': {
          ok: false,
          status: 404,
          data: { error: 'Not found' },
        },
      });

      const result = await permissionsApi.delete('invalid');

      expect(result.error).toBeDefined();
    });
  });

  describe('import', () => {
    it('should import permissions', async () => {
      const settings = {
        allow: ['Bash(git:*)'],
        deny: ['Write(path:/etc/*)'],
      };

      mockFetch({
        'POST /api/settings/permissions/import': {
          ok: true,
          data: mockImportResult,
        },
      });

      const result = await permissionsApi.import(settings);

      expect(result.error).toBeUndefined();
      expect(result.data?.imported).toBe(2);
      expect(result.data?.skipped).toBe(1);
    });

    it('should handle import errors', async () => {
      mockFetch({
        'POST /api/settings/permissions/import': {
          ok: false,
          status: 400,
          data: { error: 'Invalid format' },
        },
      });

      const result = await permissionsApi.import({ allow: [], deny: [] });

      expect(result.error).toBeDefined();
    });
  });

  describe('export', () => {
    it('should export permissions', async () => {
      mockFetch({
        'GET /api/settings/permissions/export': {
          ok: true,
          data: mockExportResult,
        },
      });

      const result = await permissionsApi.export();

      expect(result.error).toBeUndefined();
      expect(result.data?.allow).toBeDefined();
      expect(result.data?.deny).toBeDefined();
    });

    it('should apply filters', async () => {
      mockFetch({
        'GET /api/settings/permissions/export?enabled=true&category=git': {
          ok: true,
          data: { allow: ['Bash(git:*)'], deny: [] },
        },
      });

      const result = await permissionsApi.export({
        enabled: true,
        category: 'git',
      });

      expect(result.error).toBeUndefined();
      expect(result.data?.allow).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle connection refused', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('connect ECONNREFUSED'))
      ) as jest.Mock;

      const result = await permissionsApi.list();

      expect(result.error).toContain('Cannot connect to server');
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as jest.Mock;

      const result = await permissionsApi.list();

      expect(result.error).toBeDefined();
    });
  });
});
