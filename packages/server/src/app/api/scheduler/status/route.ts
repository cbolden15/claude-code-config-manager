import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/scheduler/status
 * Get current scheduler status and statistics
 */
export async function GET() {
  try {
    // Get task counts
    const [
      totalTasks,
      enabledTasks,
      disabledTasks
    ] = await Promise.all([
      prisma.scheduledTask.count(),
      prisma.scheduledTask.count({ where: { enabled: true } }),
      prisma.scheduledTask.count({ where: { enabled: false } })
    ]);

    // Get recent executions (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentExecutions = await prisma.taskExecution.findMany({
      where: {
        startedAt: { gte: oneDayAgo }
      },
      select: {
        status: true,
        tokensSaved: true,
        projectsProcessed: true,
        durationMs: true
      }
    });

    const todayStats = {
      total: recentExecutions.length,
      completed: recentExecutions.filter(e => e.status === 'completed').length,
      failed: recentExecutions.filter(e => e.status === 'failed').length,
      running: recentExecutions.filter(e => e.status === 'running').length,
      pending: recentExecutions.filter(e => e.status === 'pending').length,
      tokensSaved: recentExecutions.reduce((sum, e) => sum + e.tokensSaved, 0),
      projectsProcessed: recentExecutions.reduce((sum, e) => sum + e.projectsProcessed, 0)
    };

    // Get currently running tasks
    const runningTasks = await prisma.taskExecution.findMany({
      where: { status: 'running' },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            taskType: true
          }
        }
      }
    });

    // Get next scheduled task
    const nextTask = await prisma.scheduledTask.findFirst({
      where: {
        enabled: true,
        nextRunAt: { not: null }
      },
      orderBy: { nextRunAt: 'asc' },
      select: {
        id: true,
        name: true,
        taskType: true,
        nextRunAt: true
      }
    });

    // Get webhook counts
    const [totalWebhooks, enabledWebhooks] = await Promise.all([
      prisma.webhookConfig.count(),
      prisma.webhookConfig.count({ where: { enabled: true } })
    ]);

    // TODO: Get actual scheduler running state from scheduler engine (Terminal 2)
    // For now, return a default state
    const schedulerRunning = true; // Placeholder

    return NextResponse.json({
      scheduler: {
        running: schedulerRunning,
        checkIntervalMs: 60000, // Default check interval
        maxConcurrentTasks: 3
      },
      tasks: {
        total: totalTasks,
        enabled: enabledTasks,
        disabled: disabledTasks
      },
      webhooks: {
        total: totalWebhooks,
        enabled: enabledWebhooks
      },
      today: todayStats,
      running: runningTasks.map(e => ({
        executionId: e.id,
        taskId: e.task.id,
        taskName: e.task.name,
        taskType: e.task.taskType,
        startedAt: e.startedAt
      })),
      next: nextTask ? {
        taskId: nextTask.id,
        taskName: nextTask.name,
        taskType: nextTask.taskType,
        scheduledFor: nextTask.nextRunAt,
        inMinutes: nextTask.nextRunAt
          ? Math.round((new Date(nextTask.nextRunAt).getTime() - Date.now()) / 60000)
          : null
      } : null
    });
  } catch (error) {
    console.error('[GET /api/scheduler/status]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
