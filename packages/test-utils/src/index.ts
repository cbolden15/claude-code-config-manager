/**
 * CCM Test Utils
 *
 * Comprehensive test utilities for CCM project
 *
 * @example
 * ```ts
 * import { createEnvVar, mockFetch, createSuccessResponse } from '@ccm/test-utils';
 *
 * const envVar = createEnvVar({ key: 'TEST_KEY', value: 'test' });
 * const mock = mockFetch()
 *   .get('/api/settings/env', createSuccessResponse({ envVars: [envVar] }))
 *   .build();
 * ```
 */

// Factories
export * from './factories';

// Mocks
export * from './mocks';

// Database utilities
export * from './db';

// Test utilities
export * from './utils';
