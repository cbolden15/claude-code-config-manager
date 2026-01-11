/**
 * Tests for settings permissions commands
 */

import {
  listPermissions,
  addPermission,
  deletePermission,
  importPermissions,
  exportPermissions,
} from '../../src/commands/settings-permissions.js';
import {
  mockFetch,
  resetFetchMock,
  mockPermissionsListResponse,
  mockPermissions,
  mockImportResult,
  mockExportResult,
  mockConsole,
  mockProcessExit,
} from '../helpers/api-mocks.js';
import {
  createTestDir,
  cleanupTestDir,
  createTestSettings,
  stripAnsi,
} from '../helpers/test-utils.js';

describe('settings permissions commands', () => {
  let testDir: string;
  let consoleMock: ReturnType<typeof mockConsole>;
  let exitMock: ReturnType<typeof mockProcessExit>;

  beforeEach(() => {
    testDir = createTestDir();
    consoleMock = mockConsole();
    exitMock = mockProcessExit();
    resetFetchMock();
  });

  afterEach(() => {
    cleanupTestDir(testDir);
    consoleMock.restore();
    exitMock.restore();
  });

  describe('listPermissions', () => {
    it('should list all permissions with statistics', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: true,
          data: mockPermissionsListResponse,
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Permissions');
      expect(output).toContain('Allow Permissions');
      expect(output).toContain('Deny Permissions');
      expect(output).toContain('Bash(git:*)');
      expect(output).toContain('Write(path:/etc/*)');
    });

    it('should filter by action', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: true,
          data: mockPermissionsListResponse,
        },
      });

      await listPermissions({ action: 'allow' });

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Bash(git:*)');
      expect(output).not.toContain('Deny Permissions');
    });

    it('should filter by category', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: true,
          data: mockPermissionsListResponse,
        },
      });

      await listPermissions({ category: 'git' });

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('git');
    });

    it('should show verbose details', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: true,
          data: mockPermissionsListResponse,
        },
      });

      await listPermissions({ verbose: true });

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('ID:');
      expect(output).toContain('Priority:');
    });

    it('should handle API errors', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: false,
          status: 500,
          data: { error: 'Server error' },
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Server error');
    });

    it('should show empty state when no permissions', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: true,
          data: {
            permissions: [],
            grouped: { allow: [], deny: [] },
            stats: {
              total: 0,
              enabled: 0,
              byAction: { allow: 0, deny: 0 },
              byCategory: {},
            },
          },
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('No permissions found');
    });
  });

  describe('addPermission', () => {
    it('should create a new permission', async () => {
      mockFetch({
        'POST /api/settings/permissions': {
          ok: true,
          status: 201,
          data: mockPermissions[0],
        },
      });

      await addPermission('Bash(git:*)', 'allow', {});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Permission created successfully');
      expect(output).toContain('Bash(git:*)');
      expect(output).toContain('allow');
    });

    it('should reject invalid action', async () => {
      await addPermission('Bash(git:*)', 'invalid', {});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Invalid action');
      expect(output).toContain('Must be "allow" or "deny"');
    });

    it('should pass optional parameters', async () => {
      mockFetch({
        'POST /api/settings/permissions': {
          ok: true,
          status: 201,
          data: {
            ...mockPermissions[0],
            description: 'Test description',
            priority: 10,
          },
        },
      });

      await addPermission('Bash(git:*)', 'allow', {
        description: 'Test description',
        priority: '10',
        category: 'git',
      });

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Permission created successfully');
    });

    it('should handle duplicate error', async () => {
      mockFetch({
        'POST /api/settings/permissions': {
          ok: false,
          status: 409,
          data: { error: 'Permission already exists' },
        },
      });

      await addPermission('Bash(git:*)', 'allow', {});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Permission already exists');
    });
  });

  describe('deletePermission', () => {
    it('should delete a permission', async () => {
      mockFetch({
        'DELETE /api/settings/permissions/perm_1': {
          ok: true,
          data: { success: true },
        },
      });

      await deletePermission('perm_1');

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Permission deleted successfully');
    });

    it('should handle not found error', async () => {
      mockFetch({
        'DELETE /api/settings/permissions/invalid': {
          ok: false,
          status: 404,
          data: { error: 'Permission not found' },
        },
      });

      await deletePermission('invalid');

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Permission not found');
    });
  });

  describe('importPermissions', () => {
    it('should import from file', async () => {
      const settingsFile = createTestSettings(testDir, {
        permissions: {
          allow: ['Bash(git:*)'],
          deny: ['Write(path:/etc/*)'],
        },
      });

      mockFetch({
        'POST /api/settings/permissions/import': {
          ok: true,
          data: mockImportResult,
        },
      });

      await importPermissions(settingsFile);

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Import completed');
      expect(output).toContain('Imported: 2');
      expect(output).toContain('Skipped');
    });

    it('should handle settings.local.json format', async () => {
      const settingsFile = createTestSettings(testDir, {
        permissions: {
          allow: ['Bash(git:*)'],
          deny: [],
        },
      });

      mockFetch({
        'POST /api/settings/permissions/import': {
          ok: true,
          data: { imported: 1, skipped: 0, errors: [] },
        },
      });

      await importPermissions(settingsFile);

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Import completed');
    });

    it('should handle file read errors', async () => {
      await importPermissions('/nonexistent/file.json');

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error reading file');
    });

    it('should handle invalid JSON', async () => {
      const settingsFile = createTestSettings(testDir, 'invalid json');

      await importPermissions(settingsFile);

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
    });

    it('should display import errors', async () => {
      const settingsFile = createTestSettings(testDir, {
        allow: ['Bash(git:*)'],
        deny: [],
      });

      mockFetch({
        'POST /api/settings/permissions/import': {
          ok: true,
          data: {
            imported: 0,
            skipped: 0,
            errors: ['Invalid permission format'],
          },
        },
      });

      await importPermissions(settingsFile);

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Errors:');
      expect(output).toContain('Invalid permission format');
    });
  });

  describe('exportPermissions', () => {
    it('should export to stdout when no file specified', async () => {
      mockFetch({
        'GET /api/settings/permissions/export': {
          ok: true,
          data: mockExportResult,
        },
      });

      await exportPermissions(undefined, {});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('allow');
      expect(output).toContain('deny');
      expect(output).toContain('Bash(git:*)');
    });

    it('should export to file when specified', async () => {
      mockFetch({
        'GET /api/settings/permissions/export': {
          ok: true,
          data: mockExportResult,
        },
      });

      const outputFile = `${testDir}/export.json`;
      await exportPermissions(outputFile, {});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Permissions exported to');
      expect(output).toContain('export.json');
    });

    it('should apply enabled filter', async () => {
      mockFetch({
        'GET /api/settings/permissions/export?enabled=true': {
          ok: true,
          data: {
            allow: ['Bash(git:*)'],
            deny: [],
          },
        },
      });

      await exportPermissions(undefined, { enabled: true });

      const logs = consoleMock.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should apply category filter', async () => {
      mockFetch({
        'GET /api/settings/permissions/export?category=git': {
          ok: true,
          data: {
            allow: ['Bash(git:*)'],
            deny: [],
          },
        },
      });

      await exportPermissions(undefined, { category: 'git' });

      const logs = consoleMock.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle API errors', async () => {
      mockFetch({
        'GET /api/settings/permissions/export': {
          ok: false,
          status: 500,
          data: { error: 'Export failed' },
        },
      });

      await exportPermissions(undefined, {});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Export failed');
    });
  });
});
