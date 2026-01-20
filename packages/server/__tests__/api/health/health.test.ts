/**
 * Health API Tests
 *
 * Tests for /api/health endpoints with simplified schema
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
import { GET as GET_HEALTH } from '../../../src/app/api/health/route';
import {
  GET as GET_SCORE,
  POST as POST_SCORE,
} from '../../../src/app/api/health/score/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from '../../helpers/db';

describe('Health API', () => {
  let testMachine: { id: string; name: string };

  beforeAll(async () => {
    mockPrismaClient = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(mockPrismaClient);

    // Create a test machine for health score tests
    testMachine = await mockPrismaClient.machine.create({
      data: {
        name: 'health-test-machine',
        hostname: 'health-host.local',
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

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const request = createRequest('/api/health');
      const response = await GET_HEALTH(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });
  });

  describe('GET /api/health/score', () => {
    it('should return 400 when machineId is missing', async () => {
      const request = createRequest('/api/health/score');
      const response = await GET_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('machineId is required');
    });

    it('should return 404 for non-existent machine', async () => {
      const request = createRequest('/api/health/score?machineId=non-existent');
      const response = await GET_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Machine not found');
    });

    it('should calculate and return new score when none exists', async () => {
      const request = createRequest(
        `/api/health/score?machineId=${testMachine.id}`
      );
      const response = await GET_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      // New machine with no recommendations should have high scores
      expect(data.score).toBeGreaterThanOrEqual(75);
      expect(data.mcpScore).toBeDefined();
      expect(data.skillScore).toBeDefined();
      expect(data.contextScore).toBeDefined();
      expect(data.patternScore).toBeDefined();
    });

    it('should return existing score with history', async () => {
      // Create a health score
      await mockPrismaClient.healthScore.create({
        data: {
          machineId: testMachine.id,
          score: 85,
          mcpScore: 90,
          skillScore: 80,
          contextScore: 85,
          patternScore: 80,
          activeRecommendations: 2,
          appliedRecommendations: 5,
          dismissedRecommendations: 1,
          estimatedMonthlyWaste: 2000,
          estimatedMonthlySavings: 5000,
          trend: 'improving',
        },
      });

      const request = createRequest(
        `/api/health/score?machineId=${testMachine.id}`
      );
      const response = await GET_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.current.score).toBe(85);
      expect(data.history).toBeDefined();
      expect(data.insights).toBeDefined();
      expect(Array.isArray(data.insights)).toBe(true);
    });

    it('should include machine info in response', async () => {
      await mockPrismaClient.healthScore.create({
        data: {
          machineId: testMachine.id,
          score: 75,
          mcpScore: 80,
          skillScore: 70,
          contextScore: 75,
          patternScore: 70,
          activeRecommendations: 3,
          appliedRecommendations: 2,
          dismissedRecommendations: 0,
          estimatedMonthlyWaste: 3000,
          estimatedMonthlySavings: 2000,
          trend: 'stable',
        },
      });

      const request = createRequest(
        `/api/health/score?machineId=${testMachine.id}`
      );
      const response = await GET_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.current.machine.name).toBe('health-test-machine');
    });

    it('should recalculate score when calculate=true', async () => {
      // Create initial score
      await mockPrismaClient.healthScore.create({
        data: {
          machineId: testMachine.id,
          score: 50,
          mcpScore: 50,
          skillScore: 50,
          contextScore: 50,
          patternScore: 50,
          activeRecommendations: 10,
          appliedRecommendations: 0,
          dismissedRecommendations: 0,
          estimatedMonthlyWaste: 10000,
          estimatedMonthlySavings: 0,
          trend: 'stable',
        },
      });

      const request = createRequest(
        `/api/health/score?machineId=${testMachine.id}&calculate=true`
      );
      const response = await GET_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      // New calculation should exist (may be different from old)
      expect(data.current.score).toBeDefined();

      // Verify two scores now exist
      const scoreCount = await mockPrismaClient.healthScore.count({
        where: { machineId: testMachine.id },
      });
      expect(scoreCount).toBe(2);
    });
  });

  describe('POST /api/health/score', () => {
    it('should return 400 when machineId is missing', async () => {
      const request = createRequest('/api/health/score', {
        method: 'POST',
        body: {},
      });
      const response = await POST_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('machineId is required');
    });

    it('should return 404 for non-existent machine', async () => {
      const request = createRequest('/api/health/score', {
        method: 'POST',
        body: { machineId: 'non-existent' },
      });
      const response = await POST_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Machine not found');
    });

    it('should calculate new score for machine', async () => {
      const request = createRequest('/api/health/score', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response = await POST_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.score).toBeDefined();
      expect(data.score.machineId).toBe(testMachine.id);
    });

    it('should calculate score based on recommendations', async () => {
      // Create some recommendations
      await mockPrismaClient.recommendation.createMany({
        data: [
          {
            machineId: testMachine.id,
            category: 'mcp_server',
            title: 'Enable PostgreSQL MCP',
            description: 'You have run 50 database queries that could use PostgreSQL MCP',
            priority: 'high',
            configType: 'mcp_server',
            evidence: JSON.stringify({ patterns: ['database_query'], occurrences: 50 }),
            confidenceScore: 0.9,
            estimatedTokenSavings: 1000,
            status: 'active',
          },
          {
            machineId: testMachine.id,
            category: 'mcp_server',
            title: 'Enable GitHub MCP',
            description: 'You have run 30 git commands that could use GitHub MCP',
            priority: 'medium',
            configType: 'mcp_server',
            evidence: JSON.stringify({ patterns: ['git_workflow'], occurrences: 30 }),
            confidenceScore: 0.85,
            estimatedTokenSavings: 500,
            status: 'applied',
          },
        ],
      });

      const request = createRequest('/api/health/score', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response = await POST_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.score.activeRecommendations).toBe(1);
      expect(data.score.appliedRecommendations).toBe(1);
      // MCP score should be 50% (1 applied / 2 total)
      expect(data.score.mcpScore).toBe(50);
    });

    it('should track score trend over time', async () => {
      // Create initial low score
      await mockPrismaClient.healthScore.create({
        data: {
          machineId: testMachine.id,
          score: 50,
          mcpScore: 50,
          skillScore: 50,
          contextScore: 50,
          patternScore: 50,
          activeRecommendations: 5,
          appliedRecommendations: 0,
          dismissedRecommendations: 0,
          estimatedMonthlyWaste: 5000,
          estimatedMonthlySavings: 0,
          trend: 'stable',
        },
      });

      // Recalculate (should be higher now with no active recommendations)
      const request = createRequest('/api/health/score', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response = await POST_SCORE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.score.previousScore).toBe(50);
      // New score with no recommendations should be higher
      expect(data.score.score).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Health Score Calculation', () => {
    it('should give 100% MCP score when all MCP recommendations are applied', async () => {
      await mockPrismaClient.recommendation.createMany({
        data: [
          {
            machineId: testMachine.id,
            category: 'mcp_server',
            title: 'PostgreSQL',
            description: 'Enable PostgreSQL MCP for database queries',
            priority: 'high',
            configType: 'mcp_server',
            confidenceScore: 0.9,
            estimatedTokenSavings: 100,
            status: 'applied',
          },
          {
            machineId: testMachine.id,
            category: 'mcp_server',
            title: 'GitHub',
            description: 'Enable GitHub MCP for git workflows',
            priority: 'high',
            configType: 'mcp_server',
            confidenceScore: 0.9,
            estimatedTokenSavings: 100,
            status: 'applied',
          },
        ],
      });

      const request = createRequest('/api/health/score', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response = await POST_SCORE(request);
      const data = await parseResponse(response);

      expect(data.score.mcpScore).toBe(100);
    });

    it('should factor patterns into pattern score', async () => {
      // Create patterns with varying confidence
      await mockPrismaClient.pattern.createMany({
        data: [
          {
            machineId: testMachine.id,
            type: 'git_workflow',
            occurrences: 50,
            confidence: 0.95,
            projectPaths: '[]',
          },
          {
            machineId: testMachine.id,
            type: 'database_query',
            occurrences: 30,
            confidence: 0.5,
            projectPaths: '[]',
          },
        ],
      });

      const request = createRequest('/api/health/score', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response = await POST_SCORE(request);
      const data = await parseResponse(response);

      // 1 out of 2 patterns has high confidence (>=0.8)
      expect(data.score.patternScore).toBe(50);
    });

    it('should calculate monthly waste from active recommendations', async () => {
      await mockPrismaClient.recommendation.createMany({
        data: [
          {
            machineId: testMachine.id,
            category: 'mcp_server',
            title: 'MCP 1',
            description: 'Enable MCP 1 for optimization',
            priority: 'high',
            configType: 'mcp_server',
            confidenceScore: 0.9,
            estimatedTokenSavings: 1000,
            status: 'active',
          },
          {
            machineId: testMachine.id,
            category: 'mcp_server',
            title: 'MCP 2',
            description: 'Enable MCP 2 for optimization',
            priority: 'high',
            configType: 'mcp_server',
            confidenceScore: 0.9,
            estimatedTokenSavings: 2000,
            status: 'active',
          },
        ],
      });

      const request = createRequest('/api/health/score', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response = await POST_SCORE(request);
      const data = await parseResponse(response);

      expect(data.score.estimatedMonthlyWaste).toBe(3000);
    });
  });

  describe('Health Insights', () => {
    it('should generate insights for low scores', async () => {
      // Create a poor health score
      await mockPrismaClient.healthScore.create({
        data: {
          machineId: testMachine.id,
          score: 30,
          mcpScore: 20,
          skillScore: 30,
          contextScore: 40,
          patternScore: 35,
          activeRecommendations: 10,
          appliedRecommendations: 1,
          dismissedRecommendations: 0,
          estimatedMonthlyWaste: 10000,
          estimatedMonthlySavings: 500,
          trend: 'declining',
        },
      });

      const request = createRequest(
        `/api/health/score?machineId=${testMachine.id}`
      );
      const response = await GET_SCORE(request);
      const data = await parseResponse(response);

      expect(data.insights).toBeDefined();
      expect(data.insights.length).toBeGreaterThan(0);
      // Should have insight about significant optimization opportunities
      expect(
        data.insights.some((i: string) =>
          i.includes('optimization opportunities')
        )
      ).toBe(true);
    });
  });
});
