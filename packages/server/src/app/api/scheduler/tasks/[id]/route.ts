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
            error: true
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

    // Parse result JSON for each execution and compute stats
    const allExecutions = await prisma.taskExecution.findMany({
      where: { taskId: id },
      select: {
        status: true,
        result: true
      }
    });

    let totalTokensSaved = 0;
    let totalProjectsProcessed = 0;

    for (const exec of allExecutions) {
      if (exec.result) {
        try {
          const result = JSON.parse(exec.result);
          totalTokensSaved += result.tokensSaved || 0;
          totalProjectsProcessed += result.projectsProcessed || result.analyzed || 0;
        } catch {
          // Ignore parse errors
        }
      }
    }

    const stats = {
      totalRuns: allExecutions.length,
      successfulRuns: allExecutions.filter(e => e.status === 'completed').length,
      failedRuns: allExecutions.filter(e => e.status === 'failed').length,
      totalTokensSaved,
      totalProjectsProcessed
    };

    // Parse result JSON for recent executions
    const executionsWithParsedResults = task.executions.map(exec => ({
      ...exec,
      result: exec.result ? JSON.parse(exec.result) : null
    }));

    return NextResponse.json({
      task: {
        ...task,
        executions: executionsWithParsedResults,
        stats
      }
    });
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
      intervalHours,
      thresholdMetric,
      thresholdValue,
      thresholdOp,
      taskConfig,
      machineId,
      enabled
    } = body;

    // Validate taskType if provided
    if (taskType) {
      const validTaskTypes = ['analyze_context', 'generate_recommendations', 'health_check'];
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
    if (intervalHours !== undefined) updateData.intervalHours = intervalHours;
    if (thresholdMetric !== undefined) updateData.thresholdMetric = thresholdMetric;
    if (thresholdValue !== undefined) updateData.thresholdValue = thresholdValue;
    if (thresholdOp !== undefined) updateData.thresholdOp = thresholdOp;
    if (taskConfig !== undefined) {
      updateData.taskConfig = JSON.stringify(taskConfig);
    }
    if (machineId !== undefined) updateData.machineId = machineId || null;
    if (enabled !== undefined) updateData.enabled = enabled;

    // Recalculate nextRunAt if schedule changed
    const finalScheduleType = scheduleType || existingTask.scheduleType;
    const finalCronExpression = cronExpression !== undefined ? cronExpression : existingTask.cronExpression;
    const finalIntervalHours = intervalHours !== undefined ? intervalHours : existingTask.intervalHours;

    if (scheduleType || cronExpression !== undefined || intervalHours !== undefined) {
      if (finalScheduleType === 'cron' && finalCronExpression) {
        // TODO: Calculate next cron run
        updateData.nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
      } else if (finalScheduleType === 'interval' && finalIntervalHours) {
        updateData.nextRunAt = new Date(Date.now() + finalIntervalHours * 60 * 60 * 1000);
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
