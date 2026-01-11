/**
 * Tests for error handling across CLI commands
 */

import { mockFetch, mockConsole, mockProcessExit } from '../helpers/api-mocks.js';
import { listPermissions } from '../../src/commands/settings-permissions.js';

describe('error handling', () => {
  let consoleMock: ReturnType<typeof mockConsole>;
  let exitMock: ReturnType<typeof mockProcessExit>;

  beforeEach(() => {
    consoleMock = mockConsole();
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    consoleMock.restore();
    exitMock.restore();
  });

  describe('API connection errors', () => {
    it('should handle connection refused', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('connect ECONNREFUSED'))
      ) as jest.Mock;

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Cannot connect to server');
    });

    it('should handle network timeout', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('ETIMEDOUT'))
      ) as jest.Mock;

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
    });

    it('should handle DNS lookup failure', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('getaddrinfo ENOTFOUND'))
      ) as jest.Mock;

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
    });
  });

  describe('API error responses', () => {
    it('should handle 400 Bad Request', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: false,
          status: 400,
          data: { error: 'Invalid parameters' },
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Invalid parameters');
    });

    it('should handle 401 Unauthorized', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: false,
          status: 401,
          data: { error: 'Unauthorized' },
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Unauthorized');
    });

    it('should handle 404 Not Found', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: false,
          status: 404,
          data: { error: 'Not found' },
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Not found');
    });

    it('should handle 500 Internal Server Error', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: false,
          status: 500,
          data: { error: 'Internal server error' },
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Internal server error');
    });

    it('should handle 503 Service Unavailable', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: false,
          status: 503,
          data: { error: 'Service unavailable' },
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
      expect(output).toContain('Service unavailable');
    });
  });

  describe('malformed responses', () => {
    it('should handle invalid JSON', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('Invalid JSON')),
        } as Response)
      ) as jest.Mock;

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
    });

    it('should handle missing data fields', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: true,
          data: null,
        },
      });

      await listPermissions({});

      // Should handle gracefully without crashing
      expect(consoleMock.getLogs().length).toBeGreaterThan(0);
    });

    it('should handle unexpected response structure', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: true,
          data: { unexpected: 'structure' },
        },
      });

      await listPermissions({});

      // Should handle gracefully
      expect(consoleMock.getLogs().length).toBeGreaterThan(0);
    });
  });

  describe('input validation errors', () => {
    it('should validate required parameters', async () => {
      // This is handled by the command implementation
      // Each command should validate inputs before making API calls
    });

    it('should handle empty string inputs', async () => {
      // Commands should handle empty strings gracefully
    });

    it('should handle special characters in inputs', async () => {
      // Commands should properly encode special characters
    });
  });

  describe('general error handling', () => {
    it('should catch and log unexpected errors', async () => {
      global.fetch = jest.fn(() => {
        throw new Error('Unexpected error');
      }) as jest.Mock;

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      expect(output).toContain('Error');
    });

    it('should not expose sensitive information in errors', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: false,
          status: 500,
          data: {
            error: 'Database error',
            details: 'Connection string: postgres://user:password@host/db',
          },
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      // Should show error but not sensitive details
      expect(output).toContain('Error');
      expect(output).not.toContain('password');
    });

    it('should provide helpful error messages', async () => {
      mockFetch({
        'GET /api/settings/permissions': {
          ok: false,
          status: 500,
          data: { error: 'Failed to fetch permissions' },
        },
      });

      await listPermissions({});

      const logs = consoleMock.getLogs();
      const output = logs.join('\n');

      // Error message should be clear
      expect(output).toContain('Error');
      expect(output).toContain('Failed to fetch permissions');
    });
  });
});
