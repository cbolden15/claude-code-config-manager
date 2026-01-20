/**
 * Scheduler API Tests
 *
 * Tests for /api/scheduler endpoints with simplified schema
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
import { GET, POST } from '../../../src/app/api/scheduler/tasks/route';
import {
  GET as GET_TASK,
  PATCH,
  DELETE,
} from '../../../src/app/api/scheduler/tasks/[id]/route';
import { POST as RUN_TASK } from '../../../src/app/api/scheduler/tasks/[id]/run/route';
import { GET as GET_STATUS } from '../../../src/app/api/scheduler/status/route';
import { GET as GET_EXECUTIONS } from '../../../src/app/api/scheduler/executions/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from '../../helpers/db';

describe('Scheduler API', () => {
  let testMachine: { id: string; name: string };

  beforeAll(async () => {
    mockPrismaClient = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(mockPrismaClient);

    // Create a test machine for scheduler tests
    testMachine = await mockPrismaClient.machine.create({
      data: {
        name: 'scheduler-test-machine',
        hostname: 'scheduler-host.local',
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

  describe('GET /api/scheduler/tasks', () => {
    it('should return empty list when no tasks exist', async () => {
      const request = createRequest('/api/scheduler/tasks');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.tasks).toEqual([]);
    });

    it('should return list of scheduled tasks', async () => {
      await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Daily Analysis',
          taskType: 'analyze_context',
          scheduleType: 'cron',
          cronExpression: '0 9 * * *',
          machineId: testMachine.id,
        },
      });

      const request = createRequest('/api/scheduler/tasks');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].name).toBe('Daily Analysis');
      expect(data.tasks[0].stats).toBeDefined();
    });

    it('should filter tasks by machineId', async () => {
      await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Machine Task',
          taskType: 'health_check',
          scheduleType: 'interval',
          intervalHours: 24,
          machineId: testMachine.id,
        },
      });

      await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Global Task',
          taskType: 'generate_recommendations',
          scheduleType: 'manual',
        },
      });

      const request = createRequest(
        `/api/scheduler/tasks?machineId=${testMachine.id}`
      );
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].name).toBe('Machine Task');
    });

    it('should filter tasks by enabled status', async () => {
      await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Enabled Task',
          taskType: 'health_check',
          scheduleType: 'manual',
          enabled: true,
        },
      });

      await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Disabled Task',
          taskType: 'health_check',
          scheduleType: 'manual',
          enabled: false,
        },
      });

      const request = createRequest('/api/scheduler/tasks?enabled=true');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].name).toBe('Enabled Task');
    });

    it('should filter tasks by taskType', async () => {
      await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Analysis Task',
          taskType: 'analyze_context',
          scheduleType: 'manual',
        },
      });

      await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Health Task',
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      const request = createRequest(
        '/api/scheduler/tasks?taskType=analyze_context'
      );
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].name).toBe('Analysis Task');
    });
  });

  describe('POST /api/scheduler/tasks', () => {
    it('should create a new scheduled task with cron schedule', async () => {
      const request = createRequest('/api/scheduler/tasks', {
        method: 'POST',
        body: {
          name: 'Daily Analysis',
          taskType: 'analyze_context',
          scheduleType: 'cron',
          cronExpression: '0 9 * * *',
          machineId: testMachine.id,
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.task.name).toBe('Daily Analysis');
      expect(data.task.taskType).toBe('analyze_context');
      expect(data.task.scheduleType).toBe('cron');
      expect(data.task.cronExpression).toBe('0 9 * * *');
      expect(data.task.enabled).toBe(true);
    });

    it('should create a task with interval schedule', async () => {
      const request = createRequest('/api/scheduler/tasks', {
        method: 'POST',
        body: {
          name: 'Hourly Health Check',
          taskType: 'health_check',
          scheduleType: 'interval',
          intervalHours: 1,
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.task.scheduleType).toBe('interval');
      expect(data.task.intervalHours).toBe(1);
    });

    it('should create a task with threshold schedule', async () => {
      const request = createRequest('/api/scheduler/tasks', {
        method: 'POST',
        body: {
          name: 'Low Score Alert',
          taskType: 'generate_recommendations',
          scheduleType: 'threshold',
          thresholdMetric: 'health_score',
          thresholdValue: 50,
          thresholdOp: 'lt',
          machineId: testMachine.id,
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.task.scheduleType).toBe('threshold');
      expect(data.task.thresholdMetric).toBe('health_score');
      expect(data.task.thresholdValue).toBe(50);
      expect(data.task.thresholdOp).toBe('lt');
    });

    it('should return 400 for missing name', async () => {
      const request = createRequest('/api/scheduler/tasks', {
        method: 'POST',
        body: {
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('name is required');
    });

    it('should return 400 for invalid taskType', async () => {
      const request = createRequest('/api/scheduler/tasks', {
        method: 'POST',
        body: {
          name: 'Bad Task',
          taskType: 'invalid_type',
          scheduleType: 'manual',
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('taskType must be one of');
    });

    it('should return 400 when cron schedule missing cronExpression', async () => {
      const request = createRequest('/api/scheduler/tasks', {
        method: 'POST',
        body: {
          name: 'Cron Task',
          taskType: 'health_check',
          scheduleType: 'cron',
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('cronExpression is required');
    });

    it('should return 404 for non-existent machine', async () => {
      const request = createRequest('/api/scheduler/tasks', {
        method: 'POST',
        body: {
          name: 'Task with Bad Machine',
          taskType: 'health_check',
          scheduleType: 'manual',
          machineId: 'non-existent-id',
        },
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Machine not found');
    });
  });

  describe('GET /api/scheduler/tasks/[id]', () => {
    it('should return task details with executions', async () => {
      const task = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Detail Task',
          taskType: 'analyze_context',
          scheduleType: 'manual',
          machineId: testMachine.id,
        },
      });

      // Create an execution
      await mockPrismaClient.taskExecution.create({
        data: {
          taskId: task.id,
          status: 'completed',
          triggerType: 'manual',
          result: JSON.stringify({ tokensSaved: 500, analyzed: 3 }),
          durationMs: 1500,
        },
      });

      const request = createRequest(`/api/scheduler/tasks/${task.id}`);
      const response = await GET_TASK(request, {
        params: Promise.resolve({ id: task.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.task.name).toBe('Detail Task');
      expect(data.task.executions).toHaveLength(1);
      expect(data.task.stats.totalRuns).toBe(1);
      expect(data.task.stats.successfulRuns).toBe(1);
    });

    it('should return 404 for non-existent task', async () => {
      const request = createRequest('/api/scheduler/tasks/non-existent-id');
      const response = await GET_TASK(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });
  });

  describe('PATCH /api/scheduler/tasks/[id]', () => {
    it('should update task name', async () => {
      const task = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Old Name',
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      const request = createRequest(`/api/scheduler/tasks/${task.id}`, {
        method: 'PATCH',
        body: { name: 'New Name' },
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: task.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.task.name).toBe('New Name');
    });

    it('should toggle enabled status', async () => {
      const task = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Toggle Task',
          taskType: 'health_check',
          scheduleType: 'manual',
          enabled: true,
        },
      });

      const request = createRequest(`/api/scheduler/tasks/${task.id}`, {
        method: 'PATCH',
        body: { enabled: false },
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: task.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.task.enabled).toBe(false);
    });

    it('should return 404 for non-existent task', async () => {
      const request = createRequest('/api/scheduler/tasks/non-existent-id', {
        method: 'PATCH',
        body: { name: 'New Name' },
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });
  });

  describe('DELETE /api/scheduler/tasks/[id]', () => {
    it('should delete a task', async () => {
      const task = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'To Delete',
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      const request = createRequest(`/api/scheduler/tasks/${task.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: task.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify deletion
      const deleted = await mockPrismaClient.scheduledTask.findUnique({
        where: { id: task.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const request = createRequest('/api/scheduler/tasks/non-existent-id', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });
  });

  describe('POST /api/scheduler/tasks/[id]/run', () => {
    it('should manually trigger task execution', async () => {
      const task = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Manual Task',
          taskType: 'health_check',
          scheduleType: 'manual',
          machineId: testMachine.id,
        },
      });

      const request = createRequest(`/api/scheduler/tasks/${task.id}/run`, {
        method: 'POST',
        body: {},
      });

      const response = await RUN_TASK(request, {
        params: Promise.resolve({ id: task.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(202);
      expect(data.taskId).toBe(task.id);
      expect(data.status).toBe('running');
      expect(data.triggerType).toBe('manual');
    });

    it('should return 404 for non-existent task', async () => {
      const request = createRequest(
        '/api/scheduler/tasks/non-existent-id/run',
        {
          method: 'POST',
          body: {},
        }
      );

      const response = await RUN_TASK(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });

    it('should return 400 for invalid trigger type', async () => {
      const task = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Trigger Test',
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      const request = createRequest(`/api/scheduler/tasks/${task.id}/run`, {
        method: 'POST',
        body: { triggerType: 'invalid' },
      });

      const response = await RUN_TASK(request, {
        params: Promise.resolve({ id: task.id }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('triggerType must be one of');
    });
  });

  describe('GET /api/scheduler/status', () => {
    it('should return scheduler status', async () => {
      const request = createRequest('/api/scheduler/status');
      const response = await GET_STATUS();
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.scheduler).toBeDefined();
      expect(data.scheduler.running).toBe(true);
      expect(data.tasks).toBeDefined();
      expect(data.today).toBeDefined();
    });

    it('should include task counts', async () => {
      await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Enabled Task',
          taskType: 'health_check',
          scheduleType: 'manual',
          enabled: true,
        },
      });

      await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Disabled Task',
          taskType: 'health_check',
          scheduleType: 'manual',
          enabled: false,
        },
      });

      const request = createRequest('/api/scheduler/status');
      const response = await GET_STATUS();
      const data = await parseResponse(response);

      expect(data.tasks.total).toBe(2);
      expect(data.tasks.enabled).toBe(1);
      expect(data.tasks.disabled).toBe(1);
    });
  });

  describe('GET /api/scheduler/executions', () => {
    it('should return empty list when no executions exist', async () => {
      const request = createRequest('/api/scheduler/executions');
      const response = await GET_EXECUTIONS(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.executions).toEqual([]);
      expect(data.pagination).toBeDefined();
      expect(data.stats).toBeDefined();
    });

    it('should return list of executions', async () => {
      const task = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Execution Test',
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      await mockPrismaClient.taskExecution.create({
        data: {
          taskId: task.id,
          status: 'completed',
          triggerType: 'manual',
          durationMs: 1000,
          result: JSON.stringify({ tokensSaved: 100 }),
        },
      });

      const request = createRequest('/api/scheduler/executions');
      const response = await GET_EXECUTIONS(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.executions).toHaveLength(1);
      expect(data.executions[0].status).toBe('completed');
    });

    it('should filter executions by status', async () => {
      const task = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Status Filter Test',
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      await mockPrismaClient.taskExecution.create({
        data: {
          taskId: task.id,
          status: 'completed',
          triggerType: 'manual',
        },
      });

      await mockPrismaClient.taskExecution.create({
        data: {
          taskId: task.id,
          status: 'failed',
          triggerType: 'manual',
        },
      });

      const request = createRequest('/api/scheduler/executions?status=completed');
      const response = await GET_EXECUTIONS(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.executions).toHaveLength(1);
      expect(data.executions[0].status).toBe('completed');
    });

    it('should return 400 for invalid status', async () => {
      const request = createRequest('/api/scheduler/executions?status=invalid');
      const response = await GET_EXECUTIONS(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('status must be one of');
    });

    it('should filter executions by taskId', async () => {
      const task1 = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Task 1',
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      const task2 = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Task 2',
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      await mockPrismaClient.taskExecution.create({
        data: { taskId: task1.id, status: 'completed', triggerType: 'manual' },
      });

      await mockPrismaClient.taskExecution.create({
        data: { taskId: task2.id, status: 'completed', triggerType: 'manual' },
      });

      const request = createRequest(
        `/api/scheduler/executions?taskId=${task1.id}`
      );
      const response = await GET_EXECUTIONS(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.executions).toHaveLength(1);
      expect(data.executions[0].taskId).toBe(task1.id);
    });

    it('should include stats in response', async () => {
      const task = await mockPrismaClient.scheduledTask.create({
        data: {
          name: 'Stats Test',
          taskType: 'health_check',
          scheduleType: 'manual',
        },
      });

      await mockPrismaClient.taskExecution.createMany({
        data: [
          {
            taskId: task.id,
            status: 'completed',
            triggerType: 'manual',
            durationMs: 1000,
            result: JSON.stringify({ tokensSaved: 100 }),
          },
          {
            taskId: task.id,
            status: 'failed',
            triggerType: 'manual',
            error: 'Test error',
          },
        ],
      });

      const request = createRequest('/api/scheduler/executions');
      const response = await GET_EXECUTIONS(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.stats.total).toBe(2);
      expect(data.stats.completed).toBe(1);
      expect(data.stats.failed).toBe(1);
      expect(data.stats.totalTokensSaved).toBe(100);
    });
  });
});
