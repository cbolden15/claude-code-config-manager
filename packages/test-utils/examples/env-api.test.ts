/**
 * Example Test: Environment Variables API
 *
 * Demonstrates usage of test-utils for testing env var functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Factories
  createEnvVar,
  createEnvVars,
  createApiKeyEnvVar,
  resetAllCounters,

  // Mocks
  createMockPrismaClient,
  createPrismaTestHelper,
  mockEnvVarListResponse,
  mockEnvVarCreateResponse,
  mockFetch,
  createSuccessResponse,

  // Utilities
  assertContains,
  assertDefined,
  waitFor,

  // Seeders
  seedEnvVars,
} from '../src';

describe('Environment Variables API', () => {
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let helper: ReturnType<typeof createPrismaTestHelper>;

  beforeEach(() => {
    resetAllCounters();
    prisma = createMockPrismaClient();
    helper = createPrismaTestHelper(prisma);
  });

  describe('listEnvVars', () => {
    it('should return all environment variables', async () => {
      // Arrange
      const envVars = createEnvVars(5);
      helper.mockFindMany('globalEnvVar', envVars);

      // Act
      const result = mockEnvVarListResponse(envVars);

      // Assert
      expect(result.envVars).toHaveLength(5);
      expect(result.stats.total).toBe(5);
    });

    it('should mask sensitive values', async () => {
      // Arrange
      const sensitiveVar = createEnvVar({
        key: 'SECRET',
        value: 'secret-value',
        sensitive: true
      });
      helper.mockFindMany('globalEnvVar', [sensitiveVar]);

      // Act
      const result = mockEnvVarListResponse([sensitiveVar]);

      // Assert
      expect(result.envVars[0].value).toBe('********');
      expect(result.envVars[0].hasValue).toBe(true);
    });

    it('should calculate stats correctly', async () => {
      // Arrange
      const envVars = [
        createEnvVar({ encrypted: true, scope: 'all' }),
        createEnvVar({ sensitive: true, scope: 'claude-code' }),
        createEnvVar({ encrypted: true, sensitive: true, scope: 'all' }),
      ];

      // Act
      const result = mockEnvVarListResponse(envVars);

      // Assert
      expect(result.stats.total).toBe(3);
      expect(result.stats.encrypted).toBe(2);
      expect(result.stats.sensitive).toBe(2);
      expect(result.stats.byScope['all']).toBe(2);
      expect(result.stats.byScope['claude-code']).toBe(1);
    });
  });

  describe('createEnvVar', () => {
    it('should create an environment variable', async () => {
      // Arrange
      const newVar = createEnvVar({ key: 'NEW_VAR', value: 'test' });
      helper.mockCreate('globalEnvVar', newVar);

      // Act
      const result = mockEnvVarCreateResponse(newVar);

      // Assert
      assertDefined(result.envVar);
      expect(result.envVar.key).toBe('NEW_VAR');
      expect(result.message).toContain('created successfully');
    });

    it('should encrypt sensitive values', async () => {
      // Arrange
      const apiKey = createApiKeyEnvVar();
      helper.mockCreate('globalEnvVar', apiKey);

      // Act
      const result = mockEnvVarCreateResponse(apiKey);

      // Assert
      expect(result.envVar.encrypted).toBe(true);
      expect(result.envVar.sensitive).toBe(true);
    });
  });

  describe('with fetch mocking', () => {
    it('should mock API calls', async () => {
      // Arrange
      const envVars = seedEnvVars();
      const mock = mockFetch()
        .get('/api/settings/env', createSuccessResponse(
          mockEnvVarListResponse(envVars)
        ))
        .build();

      // Act
      const response = await mock('/api/settings/env', { method: 'GET' });
      const data = await response.json();

      // Assert
      expect(data.envVars).toHaveLength(8);
      assertContains(data.envVars, { key: 'VAR_ALL' });
    });

    it('should handle POST requests', async () => {
      // Arrange
      const newVar = createEnvVar();
      const mock = mockFetch()
        .post('/api/settings/env', createSuccessResponse(
          mockEnvVarCreateResponse(newVar)
        ))
        .build();

      // Act
      const response = await mock('/api/settings/env', {
        method: 'POST',
        body: JSON.stringify({ key: 'TEST', value: 'test' }),
      });
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(data.envVar).toBeDefined();
    });
  });

  describe('with test utilities', () => {
    it('should use custom assertions', () => {
      const envVars = createEnvVars(3);

      assertContains(envVars, { enabled: true });
      expect(() => assertContains(envVars, { key: 'NONEXISTENT' })).toThrow();
    });

    it('should wait for conditions', async () => {
      let value = 0;
      setTimeout(() => { value = 1; }, 100);

      await waitFor(() => value === 1, { timeout: 500 });
      expect(value).toBe(1);
    });
  });
});
