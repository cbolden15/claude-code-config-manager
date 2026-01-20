/**
 * Recommendations API Tests
 *
 * Tests for /api/recommendations endpoints with simplified schema
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
import { GET } from '../../../src/app/api/recommendations/route';
import {
  GET as GET_BY_ID,
  DELETE,
  PATCH,
} from '../../../src/app/api/recommendations/[id]/route';
import { POST as APPLY } from '../../../src/app/api/recommendations/[id]/apply/route';
import { POST as GENERATE } from '../../../src/app/api/recommendations/generate/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from '../../helpers/db';

describe('Recommendations API', () => {
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
        name: 'recommendations-test-machine',
        hostname: 'rec-host.local',
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

  // Helper to create a recommendation
  async function createRecommendation(overrides: Record<string, unknown> = {}) {
    return mockPrismaClient.recommendation.create({
      data: {
        machineId: testMachine.id,
        category: 'mcp_server',
        title: 'Test Recommendation',
        description: 'A test recommendation for MCP server',
        priority: 'high',
        configType: 'mcp_server',
        configData: JSON.stringify({ command: 'npx', args: ['test'] }),
        evidence: JSON.stringify({ patterns: ['test'], occurrences: 10 }),
        estimatedTokenSavings: 500,
        confidenceScore: 0.85,
        ...overrides,
      },
    });
  }

  describe('GET /api/recommendations', () => {
    it('should return empty list when no recommendations exist', async () => {
      const request = createRequest('/api/recommendations');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.recommendations).toEqual([]);
      expect(data.stats).toBeDefined();
      expect(data.stats.total).toBe(0);
    });

    it('should return list of recommendations with stats', async () => {
      await createRecommendation();
      await createRecommendation({
        title: 'Second Recommendation',
        category: 'skill',
        configType: 'skill',
      });

      const request = createRequest('/api/recommendations');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveLength(2);
      expect(data.stats.total).toBe(2);
      expect(data.stats.byCategory.mcp_server).toBe(1);
      expect(data.stats.byCategory.skill).toBe(1);
    });

    it('should filter by machineId', async () => {
      await createRecommendation();

      const otherMachine = await mockPrismaClient.machine.create({
        data: { name: 'other-machine', platform: 'linux' },
      });

      await createRecommendation({
        machineId: otherMachine.id,
        title: 'Other Machine Rec',
      });

      const request = createRequest(
        `/api/recommendations?machineId=${testMachine.id}`
      );
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveLength(1);
      expect(data.recommendations[0].title).toBe('Test Recommendation');
    });

    it('should filter by status', async () => {
      await createRecommendation({ status: 'active' });
      await createRecommendation({
        title: 'Applied Rec',
        status: 'applied',
      });

      const request = createRequest('/api/recommendations?status=active');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveLength(1);
      expect(data.recommendations[0].title).toBe('Test Recommendation');
    });

    it('should filter by category', async () => {
      await createRecommendation({ category: 'mcp_server' });
      await createRecommendation({
        title: 'Skill Rec',
        category: 'skill',
        configType: 'skill',
      });

      const request = createRequest('/api/recommendations?category=skill');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveLength(1);
      expect(data.recommendations[0].title).toBe('Skill Rec');
    });

    it('should filter by priority', async () => {
      await createRecommendation({ priority: 'high' });
      await createRecommendation({ title: 'Low Priority', priority: 'low' });

      const request = createRequest('/api/recommendations?priority=high');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveLength(1);
      expect(data.recommendations[0].priority).toBe('high');
    });

    it('should include machine info in response', async () => {
      await createRecommendation();

      const request = createRequest('/api/recommendations');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.recommendations[0].machine.name).toBe(
        'recommendations-test-machine'
      );
    });

    it('should parse JSON fields in response', async () => {
      await createRecommendation({
        configData: JSON.stringify({ test: 'data' }),
        evidence: JSON.stringify({ patterns: ['a', 'b'] }),
      });

      const request = createRequest('/api/recommendations');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.recommendations[0].configData).toEqual({ test: 'data' });
      expect(data.recommendations[0].evidence).toEqual({ patterns: ['a', 'b'] });
    });
  });

  describe('GET /api/recommendations/[id]', () => {
    it('should return recommendation details', async () => {
      const rec = await createRecommendation();

      const request = createRequest(`/api/recommendations/${rec.id}`);
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.id).toBe(rec.id);
      expect(data.title).toBe('Test Recommendation');
      expect(data.machine).toBeDefined();
    });

    it('should return 404 for non-existent recommendation', async () => {
      const request = createRequest('/api/recommendations/non-existent-id');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Recommendation not found');
    });
  });

  describe('DELETE /api/recommendations/[id]', () => {
    it('should dismiss a recommendation', async () => {
      const rec = await createRecommendation();

      const request = createRequest(`/api/recommendations/${rec.id}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recommendation.status).toBe('dismissed');
      expect(data.recommendation.dismissedAt).toBeDefined();
    });

    it('should save dismiss reason if provided', async () => {
      const rec = await createRecommendation();

      const request = createRequest(`/api/recommendations/${rec.id}`, {
        method: 'DELETE',
        body: { reason: 'Not applicable to my workflow' },
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.recommendation.dismissReason).toBe(
        'Not applicable to my workflow'
      );
    });

    it('should return 404 for non-existent recommendation', async () => {
      const request = createRequest('/api/recommendations/non-existent-id', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Recommendation not found');
    });
  });

  describe('PATCH /api/recommendations/[id]', () => {
    it('should update wasHelpful feedback', async () => {
      const rec = await createRecommendation();

      const request = createRequest(`/api/recommendations/${rec.id}`, {
        method: 'PATCH',
        body: { wasHelpful: true },
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.wasHelpful).toBe(true);
    });

    it('should update actualSavings', async () => {
      const rec = await createRecommendation();

      const request = createRequest(`/api/recommendations/${rec.id}`, {
        method: 'PATCH',
        body: { actualSavings: 750 },
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.actualSavings).toBe(750);
    });

    it('should update status', async () => {
      const rec = await createRecommendation();

      const request = createRequest(`/api/recommendations/${rec.id}`, {
        method: 'PATCH',
        body: { status: 'applied' },
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('applied');
    });

    it('should return 404 for non-existent recommendation', async () => {
      const request = createRequest('/api/recommendations/non-existent-id', {
        method: 'PATCH',
        body: { wasHelpful: true },
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Recommendation not found');
    });

    it('should return 400 for invalid status', async () => {
      const rec = await createRecommendation();

      const request = createRequest(`/api/recommendations/${rec.id}`, {
        method: 'PATCH',
        body: { status: 'invalid_status' },
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('POST /api/recommendations/[id]/apply', () => {
    it('should apply a recommendation', async () => {
      const rec = await createRecommendation();

      const request = createRequest(`/api/recommendations/${rec.id}/apply`, {
        method: 'POST',
        body: {},
      });
      const response = await APPLY(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recommendation.status).toBe('applied');
      expect(data.appliedConfig).toBeDefined();
      expect(data.nextSteps).toBeDefined();
    });

    it('should create AppliedConfig when applying', async () => {
      const rec = await createRecommendation();

      const request = createRequest(`/api/recommendations/${rec.id}/apply`, {
        method: 'POST',
        body: {},
      });
      await APPLY(request, {
        params: Promise.resolve({ id: rec.id }),
      });

      const appliedConfigs = await mockPrismaClient.appliedConfig.findMany({
        where: { recommendationId: rec.id },
      });

      expect(appliedConfigs).toHaveLength(1);
      expect(appliedConfigs[0].configName).toBe('Test Recommendation');
      expect(appliedConfigs[0].source).toBe('recommendation');
    });

    it('should return 404 for non-existent recommendation', async () => {
      const request = createRequest(
        '/api/recommendations/non-existent-id/apply',
        {
          method: 'POST',
          body: {},
        }
      );
      const response = await APPLY(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Recommendation not found');
    });

    it('should return 400 for already applied recommendation', async () => {
      const rec = await createRecommendation({ status: 'applied' });

      const request = createRequest(`/api/recommendations/${rec.id}/apply`, {
        method: 'POST',
        body: {},
      });
      const response = await APPLY(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Recommendation already applied');
    });

    it('should return 400 for dismissed recommendation', async () => {
      const rec = await createRecommendation({ status: 'dismissed' });

      const request = createRequest(`/api/recommendations/${rec.id}/apply`, {
        method: 'POST',
        body: {},
      });
      const response = await APPLY(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot apply dismissed recommendation');
    });

    it('should include estimated savings in response', async () => {
      const rec = await createRecommendation({
        estimatedTokenSavings: 1000,
        estimatedTimeSavings: 30,
      });

      const request = createRequest(`/api/recommendations/${rec.id}/apply`, {
        method: 'POST',
        body: {},
      });
      const response = await APPLY(request, {
        params: Promise.resolve({ id: rec.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.estimatedSavings.tokensSaved).toBe(1000);
      expect(data.estimatedSavings.timeSaved).toBe(30);
    });
  });

  describe('POST /api/recommendations/generate', () => {
    it('should return 404 for non-existent machine', async () => {
      const request = createRequest('/api/recommendations/generate', {
        method: 'POST',
        body: { machineId: 'non-existent-id' },
      });
      const response = await GENERATE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Machine not found');
    });

    it('should return empty recommendations when no patterns exist', async () => {
      const request = createRequest('/api/recommendations/generate', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response = await GENERATE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
      expect(data.recommendations).toEqual([]);
    });

    it('should generate recommendations from patterns', async () => {
      // Create a pattern that triggers PostgreSQL MCP recommendation
      await mockPrismaClient.pattern.create({
        data: {
          machineId: testMachine.id,
          type: 'ssh_database_query',
          occurrences: 50,
          confidence: 0.9,
          projectPaths: JSON.stringify(['/project/1', '/project/2']),
        },
      });

      const request = createRequest('/api/recommendations/generate', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response = await GENERATE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should generate both MCP and skill recommendations for ssh_database_query
      expect(data.count).toBeGreaterThan(0);
      expect(data.summary).toBeDefined();
      expect(data.summary.patternsAnalyzed).toBeGreaterThan(0);
    });

    it('should not duplicate recommendations without forceRefresh', async () => {
      await mockPrismaClient.pattern.create({
        data: {
          machineId: testMachine.id,
          type: 'ssh_database_query',
          occurrences: 50,
          confidence: 0.9,
          projectPaths: '[]',
        },
      });

      // First generation
      const request1 = createRequest('/api/recommendations/generate', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response1 = await GENERATE(request1);
      const data1 = await parseResponse(response1);

      // Second generation without forceRefresh
      const request2 = createRequest('/api/recommendations/generate', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response2 = await GENERATE(request2);
      const data2 = await parseResponse(response2);

      expect(data1.count).toBeGreaterThan(0);
      expect(data2.count).toBe(0); // Should skip existing recommendations
    });

    it('should regenerate recommendations with forceRefresh', async () => {
      await mockPrismaClient.pattern.create({
        data: {
          machineId: testMachine.id,
          type: 'ssh_database_query',
          occurrences: 50,
          confidence: 0.9,
          projectPaths: '[]',
        },
      });

      // First generation
      const request1 = createRequest('/api/recommendations/generate', {
        method: 'POST',
        body: { machineId: testMachine.id },
      });
      const response1 = await GENERATE(request1);
      const data1 = await parseResponse(response1);

      // Second generation with forceRefresh
      const request2 = createRequest('/api/recommendations/generate', {
        method: 'POST',
        body: { machineId: testMachine.id, forceRefresh: true },
      });
      const response2 = await GENERATE(request2);
      const data2 = await parseResponse(response2);

      expect(data1.count).toBeGreaterThan(0);
      expect(data2.count).toBeGreaterThan(0); // Should regenerate with forceRefresh
    });

    it('should return 400 for missing machineId', async () => {
      const request = createRequest('/api/recommendations/generate', {
        method: 'POST',
        body: {},
      });
      const response = await GENERATE(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('Recommendation Stats', () => {
    it('should calculate monthly savings from active recommendations', async () => {
      await createRecommendation({
        status: 'active',
        estimatedTokenSavings: 500,
      });
      await createRecommendation({
        title: 'Active 2',
        status: 'active',
        estimatedTokenSavings: 300,
      });
      await createRecommendation({
        title: 'Applied',
        status: 'applied',
        estimatedTokenSavings: 1000, // Should not count
      });

      const request = createRequest('/api/recommendations');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.stats.totalMonthlySavings).toBe(800); // 500 + 300
    });

    it('should track status distribution', async () => {
      await createRecommendation({ status: 'active' });
      await createRecommendation({ title: 'Active 2', status: 'active' });
      await createRecommendation({ title: 'Applied', status: 'applied' });
      await createRecommendation({ title: 'Dismissed', status: 'dismissed' });

      const request = createRequest('/api/recommendations');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.stats.byStatus.active).toBe(2);
      expect(data.stats.byStatus.applied).toBe(1);
      expect(data.stats.byStatus.dismissed).toBe(1);
    });

    it('should track priority distribution', async () => {
      await createRecommendation({ priority: 'critical' });
      await createRecommendation({ title: 'High', priority: 'high' });
      await createRecommendation({ title: 'Medium', priority: 'medium' });

      const request = createRequest('/api/recommendations');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.stats.byPriority.critical).toBe(1);
      expect(data.stats.byPriority.high).toBe(1);
      expect(data.stats.byPriority.medium).toBe(1);
    });
  });
});
