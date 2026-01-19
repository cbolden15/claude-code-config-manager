import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/scheduler/tasks/[id]
 * Get a specific scheduled task with recent executions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const task = await prisma.scheduledTask.findUnique({
      where: { id },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true,
            platform: true
          }
        },
        executions: {
          take: 20,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            triggerType: true,
            startedAt: true,
            completedAt: true,
            durationMs: true,
            result: true,
            error: true,
            projectsProcessed: true,
            issuesFound: true,
            tokensSaved: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Compute stats
    const allExecutions = await prisma.taskExecution.findMany({
      where: { taskId: id },
      select: {
        status: true,
        tokensSaved: true,
        projectsProcessed: true
      }
    });

    const stats = {
      totalRuns: allExecutions.length,
      successfulRuns: allExecutions.filter(e => e.status === 'completed').length,
      failedRuns: allExecutions.filter(e => e.status === 'failed').length,
      totalTokensSaved: allExecutions.reduce((sum, e) => sum + e.tokensSaved, 0),
      totalProjectsProcessed: allExecutions.reduce((sum, e) => sum + e.projectsProcessed, 0)
    };

    return NextResponse.json({ task: { ...task, stats } });
  } catch (error) {
    console.error('[GET /api/scheduler/tasks/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/scheduler/tasks/[id]
 * Update a scheduled task
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if task exists
    const existingTask = await prisma.scheduledTask.findUnique({
      where: { id }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

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

    // Validate taskType if provided
    if (taskType) {
      const validTaskTypes = ['analyze', 'optimize', 'health_check', 'custom'];
      if (!validTaskTypes.includes(taskType)) {
        return NextResponse.json(
          { error: `taskType must be one of: ${validTaskTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate scheduleType if provided
    if (scheduleType) {
      const validScheduleTypes = ['cron', 'interval', 'threshold', 'manual'];
      if (!validScheduleTypes.includes(scheduleType)) {
        return NextResponse.json(
          { error: `scheduleType must be one of: ${validScheduleTypes.join(', ')}` },
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

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (taskType !== undefined) updateData.taskType = taskType;
    if (scheduleType !== undefined) updateData.scheduleType = scheduleType;
    if (cronExpression !== undefined) updateData.cronExpression = cronExpression;
    if (intervalMinutes !== undefined) updateData.intervalMinutes = intervalMinutes;
    if (thresholdMetric !== undefined) updateData.thresholdMetric = thresholdMetric;
    if (thresholdValue !== undefined) updateData.thresholdValue = thresholdValue;
    if (thresholdOperator !== undefined) updateData.thresholdOperator = thresholdOperator;
    if (projectFilter !== undefined) {
      updateData.projectFilter = projectFilter ? JSON.stringify(projectFilter) : null;
    }
    if (taskConfig !== undefined) {
      updateData.taskConfig = JSON.stringify(taskConfig);
    }
    if (notifyOnSuccess !== undefined) updateData.notifyOnSuccess = notifyOnSuccess;
    if (notifyOnFailure !== undefined) updateData.notifyOnFailure = notifyOnFailure;
    if (webhookIds !== undefined) {
      updateData.webhookIds = webhookIds ? JSON.stringify(webhookIds) : null;
    }
    if (machineId !== undefined) updateData.machineId = machineId || null;
    if (enabled !== undefined) updateData.enabled = enabled;

    // Recalculate nextRunAt if schedule changed
    const finalScheduleType = scheduleType || existingTask.scheduleType;
    const finalCronExpression = cronExpression !== undefined ? cronExpression : existingTask.cronExpression;
    const finalIntervalMinutes = intervalMinutes !== undefined ? intervalMinutes : existingTask.intervalMinutes;

    if (scheduleType || cronExpression !== undefined || intervalMinutes !== undefined) {
      if (finalScheduleType === 'cron' && finalCronExpression) {
        // TODO: Calculate next cron run
        updateData.nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
      } else if (finalScheduleType === 'interval' && finalIntervalMinutes) {
        updateData.nextRunAt = new Date(Date.now() + finalIntervalMinutes * 60 * 1000);
      } else if (finalScheduleType === 'threshold' || finalScheduleType === 'manual') {
        updateData.nextRunAt = null;
      }
    }

    const task = await prisma.scheduledTask.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ task });
  } catch (error) {
    console.error('[PATCH /api/scheduler/tasks/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scheduler/tasks/[id]
 * Delete a scheduled task
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if task exists
    const existingTask = await prisma.scheduledTask.findUnique({
      where: { id }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Delete task (cascades to executions)
    await prisma.scheduledTask.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/scheduler/tasks/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
