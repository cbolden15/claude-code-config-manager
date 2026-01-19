import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/scheduler/tasks
 * List all scheduled tasks with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');
    const enabled = searchParams.get('enabled');
    const taskType = searchParams.get('taskType');

    const where: Record<string, unknown> = {};

    if (machineId) {
      where.machineId = machineId;
    }

    if (enabled !== null && enabled !== undefined) {
      where.enabled = enabled === 'true';
    }

    if (taskType) {
      where.taskType = taskType;
    }

    const tasks = await prisma.scheduledTask.findMany({
      where,
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true
          }
        },
        executions: {
          take: 5,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            durationMs: true,
            projectsProcessed: true,
            issuesFound: true,
            tokensSaved: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute stats for each task
    const tasksWithStats = tasks.map(task => {
      const recentExecutions = task.executions;
      const successfulRuns = recentExecutions.filter(e => e.status === 'completed').length;
      const failedRuns = recentExecutions.filter(e => e.status === 'failed').length;
      const totalTokensSaved = recentExecutions.reduce((sum, e) => sum + e.tokensSaved, 0);

      return {
        ...task,
        stats: {
          recentRuns: recentExecutions.length,
          successfulRuns,
          failedRuns,
          totalTokensSaved
        }
      };
    });

    return NextResponse.json({ tasks: tasksWithStats });
  } catch (error) {
    console.error('[GET /api/scheduler/tasks]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheduler/tasks
 * Create a new scheduled task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      taskType,
      scheduleType,
      cronExpression,
      intervalMinutes,
      thresholdMetric,
      thresholdValue,
      thresholdOperator,
      projectFilter,
      taskConfig,
      notifyOnSuccess,
      notifyOnFailure,
      webhookIds,
      machineId,
      enabled
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required and must be a string' },
        { status: 400 }
      );
    }

    const validTaskTypes = ['analyze', 'optimize', 'health_check', 'custom'];
    if (!taskType || !validTaskTypes.includes(taskType)) {
      return NextResponse.json(
        { error: `taskType must be one of: ${validTaskTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const validScheduleTypes = ['cron', 'interval', 'threshold', 'manual'];
    if (!scheduleType || !validScheduleTypes.includes(scheduleType)) {
      return NextResponse.json(
        { error: `scheduleType must be one of: ${validScheduleTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate schedule-specific fields
    if (scheduleType === 'cron' && !cronExpression) {
      return NextResponse.json(
        { error: 'cronExpression is required for cron schedule type' },
        { status: 400 }
      );
    }

    if (scheduleType === 'interval' && !intervalMinutes) {
      return NextResponse.json(
        { error: 'intervalMinutes is required for interval schedule type' },
        { status: 400 }
      );
    }

    if (scheduleType === 'threshold') {
      if (!thresholdMetric || !thresholdValue || !thresholdOperator) {
        return NextResponse.json(
          { error: 'thresholdMetric, thresholdValue, and thresholdOperator are required for threshold schedule type' },
          { status: 400 }
        );
      }

      const validMetrics = ['optimization_score', 'token_count', 'issue_count', 'file_size'];
      if (!validMetrics.includes(thresholdMetric)) {
        return NextResponse.json(
          { error: `thresholdMetric must be one of: ${validMetrics.join(', ')}` },
          { status: 400 }
        );
      }

      const validOperators = ['lt', 'gt', 'eq', 'lte', 'gte'];
      if (!validOperators.includes(thresholdOperator)) {
        return NextResponse.json(
          { error: `thresholdOperator must be one of: ${validOperators.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate machineId if provided
    if (machineId) {
      const machine = await prisma.machine.findUnique({
        where: { id: machineId }
      });
      if (!machine) {
        return NextResponse.json(
          { error: 'Machine not found' },
          { status: 404 }
        );
      }
    }

    // Calculate nextRunAt based on schedule type
    let nextRunAt: Date | null = null;
    if (scheduleType === 'cron' && cronExpression) {
      // TODO: Calculate next cron run (Terminal 2 will provide cron parsing)
      // For now, set to 1 hour from now as placeholder
      nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
    } else if (scheduleType === 'interval' && intervalMinutes) {
      nextRunAt = new Date(Date.now() + intervalMinutes * 60 * 1000);
    }

    const task = await prisma.scheduledTask.create({
      data: {
        name,
        description: description || null,
        taskType,
        scheduleType,
        cronExpression: cronExpression || null,
        intervalMinutes: intervalMinutes || null,
        thresholdMetric: thresholdMetric || null,
        thresholdValue: thresholdValue || null,
        thresholdOperator: thresholdOperator || null,
        projectFilter: projectFilter ? JSON.stringify(projectFilter) : null,
        taskConfig: taskConfig ? JSON.stringify(taskConfig) : '{}',
        notifyOnSuccess: notifyOnSuccess ?? false,
        notifyOnFailure: notifyOnFailure ?? true,
        webhookIds: webhookIds ? JSON.stringify(webhookIds) : null,
        machineId: machineId || null,
        enabled: enabled ?? true,
        nextRunAt
      },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true
          }
        }
      }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/scheduler/tasks]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
