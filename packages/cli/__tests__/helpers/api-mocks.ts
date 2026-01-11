/**
 * API Mock Utilities for CLI Testing
 *
 * Provides mock implementations of API responses for testing CLI commands
 */

import type {
  GlobalPermission,
  PermissionsListResponse,
  PermissionsImportResult,
  ClaudeSettingsPermissions,
} from '@ccm/shared';

/**
 * Mock global fetch for API calls
 */
export function mockFetch(responses: Record<string, any>) {
  global.fetch = jest.fn((url: string | URL, options?: RequestInit) => {
    const urlString = url.toString();
    const method = options?.method || 'GET';
    const key = `${method} ${urlString}`;

    // Find matching response
    for (const [pattern, response] of Object.entries(responses)) {
      const [patternMethod, patternUrl] = pattern.split(' ');

      if (patternMethod === method) {
        // Exact match or pattern match
        if (urlString.includes(patternUrl) || patternUrl === '*') {
          return Promise.resolve({
            ok: response.ok ?? true,
            status: response.status ?? 200,
            json: async () => response.data,
          } as Response);
        }
      }
    }

    // Default 404 response
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    } as Response);
  }) as jest.Mock;
}

/**
 * Reset fetch mock
 */
export function resetFetchMock() {
  if (global.fetch && typeof global.fetch === 'function' && 'mockClear' in global.fetch) {
    (global.fetch as jest.Mock).mockClear();
  }
}

/**
 * Mock permissions data
 */
export const mockPermissions: GlobalPermission[] = [
  {
    id: 'perm_1',
    permission: 'Bash(git:*)',
    action: 'allow',
    description: 'Allow all git commands',
    enabled: true,
    category: 'git',
    priority: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'perm_2',
    permission: 'Write(path:/etc/*)',
    action: 'deny',
    description: 'Protect system files',
    enabled: true,
    category: 'file',
    priority: 5,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: 'perm_3',
    permission: 'WebFetch(domain:github.com)',
    action: 'allow',
    description: null,
    enabled: false,
    category: 'network',
    priority: 0,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
];

export const mockPermissionsListResponse: PermissionsListResponse = {
  permissions: mockPermissions,
  grouped: {
    allow: mockPermissions.filter((p) => p.action === 'allow'),
    deny: mockPermissions.filter((p) => p.action === 'deny'),
  },
  stats: {
    total: 3,
    enabled: 2,
    byAction: {
      allow: 2,
      deny: 1,
    },
    byCategory: {
      git: 1,
      file: 1,
      network: 1,
    },
  },
};

export const mockImportResult: PermissionsImportResult = {
  imported: 2,
  skipped: 1,
  errors: [],
};

export const mockExportResult: ClaudeSettingsPermissions = {
  allow: ['Bash(git:*)', 'WebFetch(domain:github.com)'],
  deny: ['Write(path:/etc/*)'],
};

/**
 * Mock machine data
 */
export const mockMachine = {
  id: 'machine_1',
  name: 'test-machine',
  hostname: 'test-machine.local',
  platform: 'darwin',
  arch: 'arm64',
  osVersion: 'macOS 14.0',
  homeDir: '/Users/test',
  claudeConfigDir: '/Users/test/.claude',
  lastSeen: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockMachinesList = {
  machines: [mockMachine],
  total: 1,
};

/**
 * Mock console output
 */
export function mockConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const logs: string[] = [];
  const errors: string[] = [];

  console.log = jest.fn((...args: any[]) => {
    logs.push(args.join(' '));
  });

  console.error = jest.fn((...args: any[]) => {
    errors.push(args.join(' '));
  });

  return {
    logs,
    errors,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
    },
    getLogs: () => logs,
    getErrors: () => errors,
  };
}

/**
 * Mock process.exit
 */
export function mockProcessExit() {
  const originalExit = process.exit;
  const exitCodes: number[] = [];

  process.exit = jest.fn((code?: number) => {
    exitCodes.push(code || 0);
  }) as any;

  return {
    exitCodes,
    restore: () => {
      process.exit = originalExit;
    },
    getExitCodes: () => exitCodes,
  };
}
