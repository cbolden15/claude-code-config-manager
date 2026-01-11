/**
 * API Response Mocks
 *
 * Mock responses for API endpoints
 */

import type {
  GlobalEnvVar,
  EnvVarListResponse,
  GlobalHook,
  GlobalPermission,
  Machine,
} from '@ccm/shared';

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return { data };
}

/**
 * Creates an error API response
 */
export function createErrorResponse(error: string, details?: unknown): ApiResponse<never> {
  return { error, details };
}

/**
 * Creates a 404 not found response
 */
export function createNotFoundResponse(resource: string): ApiResponse<never> {
  return {
    error: `${resource} not found`,
  };
}

/**
 * Creates a 409 conflict response
 */
export function createConflictResponse(message: string): ApiResponse<never> {
  return {
    error: message,
  };
}

/**
 * Creates a 400 bad request response
 */
export function createBadRequestResponse(message: string): ApiResponse<never> {
  return {
    error: message,
  };
}

/**
 * Mock environment variables list response
 */
export function mockEnvVarListResponse(envVars: GlobalEnvVar[]): EnvVarListResponse {
  const stats = {
    total: envVars.length,
    encrypted: envVars.filter(ev => ev.encrypted).length,
    sensitive: envVars.filter(ev => ev.sensitive).length,
    byScope: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
  };

  for (const ev of envVars) {
    stats.byScope[ev.scope] = (stats.byScope[ev.scope] || 0) + 1;
    const cat = ev.category || 'other';
    stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
  }

  return {
    envVars: envVars.map(ev => ({
      ...ev,
      value: ev.sensitive ? '********' : ev.value,
      hasValue: true,
    })),
    stats,
  };
}

/**
 * Mock environment variable create response
 */
export function mockEnvVarCreateResponse(envVar: GlobalEnvVar) {
  return {
    envVar,
    message: 'Environment variable created successfully',
  };
}

/**
 * Mock environment variable update response
 */
export function mockEnvVarUpdateResponse(envVar: GlobalEnvVar) {
  return {
    envVar: {
      ...envVar,
      value: envVar.sensitive ? '********' : envVar.value,
      hasValue: true,
    },
    message: 'Environment variable updated successfully',
  };
}

/**
 * Mock environment variable delete response
 */
export function mockEnvVarDeleteResponse() {
  return {
    message: 'Environment variable deleted successfully',
  };
}

/**
 * Mock environment variable export response
 */
export function mockEnvVarExportResponse(envVars: GlobalEnvVar[]) {
  const result: Record<string, string> = {};
  for (const ev of envVars) {
    result[ev.key] = ev.value;
  }
  return { envVars: result };
}

/**
 * Mock hooks list response
 */
export function mockHooksListResponse(hooks: GlobalHook[]) {
  const stats = {
    total: hooks.length,
    enabled: hooks.filter(h => h.enabled).length,
    byType: {} as Record<string, number>,
  };

  for (const hook of hooks) {
    stats.byType[hook.hookType] = (stats.byType[hook.hookType] || 0) + 1;
  }

  return { hooks, stats };
}

/**
 * Mock permissions list response
 */
export function mockPermissionsListResponse(permissions: GlobalPermission[]) {
  const stats = {
    total: permissions.length,
    enabled: permissions.filter(p => p.enabled).length,
    allow: permissions.filter(p => p.action === 'allow').length,
    deny: permissions.filter(p => p.action === 'deny').length,
    byCategory: {} as Record<string, number>,
  };

  for (const perm of permissions) {
    const cat = perm.category || 'other';
    stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
  }

  return { permissions, stats };
}

/**
 * Mock machines list response
 */
export function mockMachinesListResponse(machines: Machine[]) {
  const stats = {
    total: machines.length,
    online: machines.filter(m => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return new Date(m.lastSeen) > fiveMinutesAgo;
    }).length,
    syncEnabled: machines.filter(m => m.syncEnabled).length,
  };

  return { machines, stats };
}

/**
 * Mock health check response
 */
export function mockHealthResponse() {
  return {
    status: 'ok',
    stats: {
      machines: 3,
      envVars: 25,
      hooks: 12,
      permissions: 18,
      uptime: 86400,
    },
  };
}
