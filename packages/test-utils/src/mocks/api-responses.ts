/**
 * API Response Mocks
 *
 * Mock responses for API endpoints
 */

import type { Machine } from '@ccm/shared';

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
 * Mock machines list response
 */
export function mockMachinesListResponse(machines: Machine[]) {
  const stats = {
    total: machines.length,
    online: machines.filter(m => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return new Date(m.lastSeen) > fiveMinutesAgo;
    }).length,
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
      projects: 10,
      sessions: 50,
      patterns: 15,
    },
  };
}
