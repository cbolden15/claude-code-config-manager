/**
 * Sessions API Tests
 *
 * Tests for /api/sessions endpoints with simplified schema
 */

import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

// Mock Prisma before imports
let mockPrismaClient: PrismaClient;
jest.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaClient;
  },
}));

// Import route handlers after mock
import { POST as TRACK_SESSION } from '../../../src/app/api/sessions/track/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from '../../helpers/db';

describe('Sessions API', () => {
  let testMachine: { id: string; name: string };

  beforeAll(async () => {
    mockPrismaClient = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(mockPrismaClient);

    // Create a test machine
    testMachine = await mockPrismaClient.machine.create({
      data: {
        name: 'sessions-test-machine',
        hostname: 'sessions-host.local',
        platform: 'darwin',
      },
    });
  });

  // Helper to create mock NextRequest
  function createRequest(
    url: string,
    options: { method?: string; body?: unknown } = {}
  ): NextRequest {
    const { method = 'GET', body } = options;
    const fullUrl = `http://localhost:3000${url}`;

    return new NextRequest(fullUrl, {
      method,
      ...(body && {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }),
    });
  }

  // Helper to parse JSON response
  async function parseResponse(response: Response) {
    return response.json();
  }

  describe('POST /api/sessions/track', () => {
    it('should track a basic session', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'test-session-123',
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBeDefined();
    });

    it('should track session with project info', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'project-session-123',
          projectPath: '/Users/test/my-project',
          projectName: 'my-project',
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify session was saved
      const session = await mockPrismaClient.session.findUnique({
        where: { sessionId: 'project-session-123' },
      });
      expect(session?.projectPath).toBe('/Users/test/my-project');
      expect(session?.projectName).toBe('my-project');
    });

    it('should track session with tools and commands', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'tools-session-123',
          toolsUsed: ['Read', 'Bash', 'Edit'],
          commandsRun: ['git status', 'npm install'],
          filesAccessed: ['/src/index.ts', '/package.json'],
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify session was saved with tools
      const session = await mockPrismaClient.session.findUnique({
        where: { sessionId: 'tools-session-123' },
      });
      expect(JSON.parse(session!.toolsUsed)).toEqual(['Read', 'Bash', 'Edit']);
      expect(JSON.parse(session!.commandsRun)).toEqual([
        'git status',
        'npm install',
      ]);
    });

    it('should track session with token usage', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'tokens-session-123',
          tokensUsed: 5000,
          contextTokens: 2000,
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify token counts
      const session = await mockPrismaClient.session.findUnique({
        where: { sessionId: 'tokens-session-123' },
      });
      expect(session?.tokensUsed).toBe(5000);
      expect(session?.contextTokens).toBe(2000);
    });

    it('should track session with detected technologies', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'techs-session-123',
          detectedTechs: ['postgresql', 'docker', 'nextjs'],
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.technologiesDetected).toBe(3);

      // Verify technologies were saved
      const session = await mockPrismaClient.session.findUnique({
        where: { sessionId: 'techs-session-123' },
      });
      expect(JSON.parse(session!.detectedTechs)).toEqual([
        'postgresql',
        'docker',
        'nextjs',
      ]);
    });

    it('should track session and create patterns', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'patterns-session-123',
          projectPath: '/Users/test/my-project',
          detectedPatterns: ['git_workflow', 'ssh_database_query'],
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.patternsTracked).toBe(2);

      // Verify patterns were created
      const patterns = await mockPrismaClient.pattern.findMany({
        where: { machineId: testMachine.id },
      });
      expect(patterns).toHaveLength(2);
      expect(patterns.map((p) => p.type)).toContain('git_workflow');
      expect(patterns.map((p) => p.type)).toContain('ssh_database_query');
    });

    it('should increment pattern occurrences for existing patterns', async () => {
      // Create an existing pattern
      await mockPrismaClient.pattern.create({
        data: {
          machineId: testMachine.id,
          type: 'git_workflow',
          occurrences: 5,
          confidence: 0.9,
          projectPaths: '[]',
        },
      });

      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'increment-session-123',
          detectedPatterns: ['git_workflow'],
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify pattern was updated
      const pattern = await mockPrismaClient.pattern.findUnique({
        where: {
          machineId_type: {
            machineId: testMachine.id,
            type: 'git_workflow',
          },
        },
      });
      expect(pattern?.occurrences).toBe(6);
    });

    it('should add project paths to pattern', async () => {
      // Create a pattern with existing project paths
      await mockPrismaClient.pattern.create({
        data: {
          machineId: testMachine.id,
          type: 'git_workflow',
          occurrences: 1,
          confidence: 0.9,
          projectPaths: JSON.stringify(['/existing/project']),
        },
      });

      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'paths-session-123',
          projectPath: '/new/project',
          detectedPatterns: ['git_workflow'],
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify project path was added
      const pattern = await mockPrismaClient.pattern.findUnique({
        where: {
          machineId_type: {
            machineId: testMachine.id,
            type: 'git_workflow',
          },
        },
      });
      const projectPaths = JSON.parse(pattern!.projectPaths);
      expect(projectPaths).toContain('/existing/project');
      expect(projectPaths).toContain('/new/project');
    });

    it('should not duplicate project paths', async () => {
      // Create a pattern with existing project path
      await mockPrismaClient.pattern.create({
        data: {
          machineId: testMachine.id,
          type: 'git_workflow',
          occurrences: 1,
          confidence: 0.9,
          projectPaths: JSON.stringify(['/same/project']),
        },
      });

      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'no-dupe-session-123',
          projectPath: '/same/project',
          detectedPatterns: ['git_workflow'],
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);

      // Verify no duplicate
      const pattern = await mockPrismaClient.pattern.findUnique({
        where: {
          machineId_type: {
            machineId: testMachine.id,
            type: 'git_workflow',
          },
        },
      });
      const projectPaths = JSON.parse(pattern!.projectPaths);
      expect(projectPaths).toHaveLength(1);
    });

    it('should track session duration', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'duration-session-123',
          duration: 3600, // 1 hour
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);

      // Verify duration
      const session = await mockPrismaClient.session.findUnique({
        where: { sessionId: 'duration-session-123' },
      });
      expect(session?.duration).toBe(3600);
    });

    it('should track session errors', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'errors-session-123',
          errors: ['ENOENT', 'Connection refused'],
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);

      // Verify errors
      const session = await mockPrismaClient.session.findUnique({
        where: { sessionId: 'errors-session-123' },
      });
      expect(JSON.parse(session!.errors)).toEqual([
        'ENOENT',
        'Connection refused',
      ]);
    });

    it('should return 404 for non-existent machine', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: 'non-existent-id',
          sessionId: 'orphan-session-123',
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Machine not found');
    });

    it('should return 400 for missing machineId', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          sessionId: 'no-machine-session',
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 400 for missing sessionId', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should handle datetime fields', async () => {
      const startedAt = new Date('2025-01-15T10:00:00Z').toISOString();
      const endedAt = new Date('2025-01-15T11:00:00Z').toISOString();

      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'datetime-session-123',
          startedAt,
          endedAt,
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);

      // Verify timestamps
      const session = await mockPrismaClient.session.findUnique({
        where: { sessionId: 'datetime-session-123' },
      });
      expect(session?.startedAt.toISOString()).toBe(startedAt);
      expect(session?.endedAt?.toISOString()).toBe(endedAt);
    });

    it('should track comprehensive session data', async () => {
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'comprehensive-session-123',
          projectPath: '/Users/test/fullstack-app',
          projectName: 'fullstack-app',
          duration: 7200,
          toolsUsed: ['Read', 'Bash', 'Edit', 'Grep', 'Glob'],
          commandsRun: [
            'git status',
            'npm install',
            'docker compose up',
            'psql -h localhost',
          ],
          filesAccessed: ['/src/index.ts', '/package.json', '/docker-compose.yml'],
          errors: [],
          tokensUsed: 15000,
          contextTokens: 5000,
          detectedTechs: ['postgresql', 'docker', 'nextjs', 'typescript'],
          detectedPatterns: ['git_workflow', 'ssh_database_query', 'docker_management'],
        },
      });

      const response = await TRACK_SESSION(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.patternsTracked).toBe(3);
      expect(data.technologiesDetected).toBe(4);

      // Verify all patterns were created
      const patterns = await mockPrismaClient.pattern.findMany({
        where: { machineId: testMachine.id },
      });
      expect(patterns).toHaveLength(3);
    });
  });

  describe('Pattern Tracking', () => {
    it('should update lastSeen when pattern is detected again', async () => {
      const firstSeen = new Date('2025-01-01T00:00:00Z');

      // Create existing pattern
      await mockPrismaClient.pattern.create({
        data: {
          machineId: testMachine.id,
          type: 'git_workflow',
          occurrences: 5,
          confidence: 0.9,
          firstSeen,
          lastSeen: firstSeen,
          projectPaths: '[]',
        },
      });

      const newEndedAt = new Date('2025-01-15T12:00:00Z').toISOString();
      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'update-lastseen-session',
          detectedPatterns: ['git_workflow'],
          endedAt: newEndedAt,
        },
      });

      const response = await TRACK_SESSION(request);
      await parseResponse(response);

      // Verify lastSeen was updated
      const pattern = await mockPrismaClient.pattern.findUnique({
        where: {
          machineId_type: {
            machineId: testMachine.id,
            type: 'git_workflow',
          },
        },
      });
      expect(pattern?.lastSeen.toISOString()).toBe(newEndedAt);
      expect(pattern?.firstSeen.toISOString()).toBe(firstSeen.toISOString()); // Should not change
    });

    it('should set firstSeen for new patterns', async () => {
      const startedAt = new Date('2025-01-15T10:00:00Z').toISOString();

      const request = createRequest('/api/sessions/track', {
        method: 'POST',
        body: {
          machineId: testMachine.id,
          sessionId: 'new-pattern-session',
          detectedPatterns: ['new_pattern_type'],
          startedAt,
        },
      });

      const response = await TRACK_SESSION(request);
      await parseResponse(response);

      // Verify firstSeen was set
      const pattern = await mockPrismaClient.pattern.findUnique({
        where: {
          machineId_type: {
            machineId: testMachine.id,
            type: 'new_pattern_type',
          },
        },
      });
      expect(pattern?.firstSeen.toISOString()).toBe(startedAt);
    });
  });
});
