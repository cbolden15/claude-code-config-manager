#!/usr/bin/env node
import { prisma } from '../../../src/lib/db';

/**
 * Test Utilities for v2.0 API Tests
 */

/**
 * Helper to create mock NextRequest
 */
export function createMockRequest(url: string, options: {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
  searchParams?: Record<string, string>;
} = {}) {
  const { method = 'GET', body, params = {}, searchParams = {} } = options;

  const mockUrl = new URL(url, 'http://localhost:3000');

  // Add search params
  Object.entries(searchParams).forEach(([key, value]) => {
    mockUrl.searchParams.set(key, value);
  });

  const mockRequest = {
    method,
    url: mockUrl.toString(),
    nextUrl: mockUrl,
    json: async () => body || {},
    headers: new Headers({ 'Content-Type': 'application/json' })
  } as any;

  return { request: mockRequest, params };
}

/**
 * Clean up test data for v2.0 models
 */
export async function cleanupTestData() {
  try {
    // Clean up in order of dependencies
    await prisma.machineOverride.deleteMany({});
    await prisma.syncLog.deleteMany({});
    await prisma.syncState.deleteMany({});
    await prisma.machine.deleteMany({});

    await prisma.globalHook.deleteMany({});
    await prisma.globalPermission.deleteMany({});
    await prisma.globalEnvVar.deleteMany({});

    await prisma.claudeDesktopMcp.deleteMany({});
    await prisma.claudeDesktopPlugin.deleteMany({});
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

/**
 * Create test machine
 */
export async function createTestMachine(data?: Partial<{
  name: string;
  hostname: string;
  platform: string;
  arch: string;
  homeDir: string;
  syncEnabled: boolean;
  isCurrentMachine: boolean;
}>) {
  return await prisma.machine.create({
    data: {
      name: data?.name || 'test-machine',
      hostname: data?.hostname || 'test-host',
      platform: data?.platform || 'darwin',
      arch: data?.arch || 'arm64',
      homeDir: data?.homeDir || '/Users/test',
      syncEnabled: data?.syncEnabled ?? true,
      isCurrentMachine: data?.isCurrentMachine ?? false,
    }
  });
}

/**
 * Create test hook
 */
export async function createTestHook(data?: Partial<{
  hookType: string;
  matcher: string;
  command: string;
  timeout: number;
  description: string;
  enabled: boolean;
  order: number;
  category: string;
  tags: string;
}>) {
  return await prisma.globalHook.create({
    data: {
      hookType: data?.hookType || 'PreToolUse',
      matcher: data?.matcher || '*',
      command: data?.command || 'echo "test"',
      timeout: data?.timeout,
      description: data?.description,
      enabled: data?.enabled ?? true,
      order: data?.order ?? 0,
      category: data?.category,
      tags: data?.tags || '',
    }
  });
}

/**
 * Create test permission
 */
export async function createTestPermission(data?: Partial<{
  permission: string;
  action: string;
  description: string;
  enabled: boolean;
  category: string;
  priority: number;
}>) {
  return await prisma.globalPermission.create({
    data: {
      permission: data?.permission || 'Bash(git:*)',
      action: data?.action || 'allow',
      description: data?.description,
      enabled: data?.enabled ?? true,
      category: data?.category,
      priority: data?.priority ?? 0,
    }
  });
}

/**
 * Create test env var
 */
export async function createTestEnvVar(data?: Partial<{
  key: string;
  value: string;
  encrypted: boolean;
  sensitive: boolean;
  description: string;
  scope: string;
  category: string;
}>) {
  return await prisma.globalEnvVar.create({
    data: {
      key: data?.key || 'TEST_VAR',
      value: data?.value || 'test-value',
      encrypted: data?.encrypted ?? false,
      sensitive: data?.sensitive ?? false,
      description: data?.description,
      scope: data?.scope || 'all',
      category: data?.category,
    }
  });
}

/**
 * Assert response is successful
 */
export function assertSuccess(response: any) {
  if (!response.ok && response.status !== 200 && response.status !== 201) {
    throw new Error(`Expected successful response, got status ${response.status}`);
  }
}

/**
 * Assert response has error
 */
export function assertError(response: any, expectedStatus?: number) {
  if (response.ok || response.status === 200 || response.status === 201) {
    throw new Error(`Expected error response, got status ${response.status}`);
  }
  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
}

/**
 * Parse response JSON
 */
export async function parseResponse(response: any) {
  return await response.json();
}
