/**
 * Database Test Setup
 *
 * Utilities for setting up test databases
 */

/**
 * In-memory database configuration for testing
 */
export const TEST_DATABASE_URL = 'file::memory:?cache=shared';

/**
 * Test database configuration
 */
export interface TestDbConfig {
  databaseUrl?: string;
  logQueries?: boolean;
  resetBetweenTests?: boolean;
}

/**
 * Creates a test database configuration
 */
export function createTestDbConfig(overrides?: Partial<TestDbConfig>): TestDbConfig {
  return {
    databaseUrl: overrides?.databaseUrl ?? TEST_DATABASE_URL,
    logQueries: overrides?.logQueries ?? false,
    resetBetweenTests: overrides?.resetBetweenTests ?? true,
  };
}

/**
 * Database seeder interface
 */
export interface DbSeeder {
  seed(): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Creates a mock Prisma client for testing
 */
export function createMockPrismaClient() {
  return {
    globalEnvVar: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    globalHook: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    globalPermission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    machine: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    machineOverride: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({})),
    $disconnect: vi.fn(),
  };
}

/**
 * Type for mock Prisma client
 */
export type MockPrismaClient = ReturnType<typeof createMockPrismaClient>;

/**
 * Helper to setup mock Prisma responses
 */
export class PrismaTestHelper {
  constructor(private mockClient: MockPrismaClient) {}

  /**
   * Mock findMany to return specific data
   */
  mockFindMany<T>(model: keyof MockPrismaClient, data: T[]) {
    (this.mockClient[model] as any).findMany.mockResolvedValue(data);
    return this;
  }

  /**
   * Mock findUnique to return specific data
   */
  mockFindUnique<T>(model: keyof MockPrismaClient, data: T | null) {
    (this.mockClient[model] as any).findUnique.mockResolvedValue(data);
    return this;
  }

  /**
   * Mock create to return specific data
   */
  mockCreate<T>(model: keyof MockPrismaClient, data: T) {
    (this.mockClient[model] as any).create.mockResolvedValue(data);
    return this;
  }

  /**
   * Mock update to return specific data
   */
  mockUpdate<T>(model: keyof MockPrismaClient, data: T) {
    (this.mockClient[model] as any).update.mockResolvedValue(data);
    return this;
  }

  /**
   * Mock delete to return specific data
   */
  mockDelete<T>(model: keyof MockPrismaClient, data: T) {
    (this.mockClient[model] as any).delete.mockResolvedValue(data);
    return this;
  }

  /**
   * Mock count to return specific number
   */
  mockCount(model: keyof MockPrismaClient, count: number) {
    (this.mockClient[model] as any).count.mockResolvedValue(count);
    return this;
  }

  /**
   * Reset all mocks
   */
  reset() {
    Object.values(this.mockClient).forEach((model) => {
      if (typeof model === 'object' && model !== null) {
        Object.values(model).forEach((method) => {
          if (typeof method === 'function' && 'mockReset' in method) {
            (method as any).mockReset();
          }
        });
      }
    });
    return this;
  }
}

/**
 * Creates a Prisma test helper
 */
export function createPrismaTestHelper(mockClient?: MockPrismaClient): PrismaTestHelper {
  return new PrismaTestHelper(mockClient ?? createMockPrismaClient());
}

// Note: vi is from vitest, imported globally
declare const vi: any;
