import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/scheduler/executions
 * List task executions with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const status = searchParams.get('status');
    const machineId = searchParams.get('machineId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = {};

    if (taskId) {
      where.taskId = taskId;
    }

    if (status) {
      const validStatuses = ['pending', 'running', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `status must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      where.status = status;
    }

    // Filter by machine through task
    if (machineId) {
      where.task = { machineId };
    }

    // Get total count for pagination
    const total = await prisma.taskExecution.count({ where });

    const executions = await prisma.taskExecution.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            name: true,
            taskType: true,
            machine: {
              select: {
                id: true,
                name: true,
                hostname: true
              }
            }
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset
    });

    // Parse result JSON and compute stats
    const parsedExecutions = executions.map(exec => ({
      ...exec,
      result: exec.result ? JSON.parse(exec.result) : null
    }));

    // Compute aggregate stats from all matching executions
    const allExecutions = await prisma.taskExecution.findMany({
      where,
      select: {
        status: true,
        result: true,
        durationMs: true
      }
    });

    // Parse results and aggregate stats
    let totalTokensSaved = 0;
    let totalProjectsProcessed = 0;
    let totalDuration = 0;
    let durationCount = 0;

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
      if (exec.durationMs) {
        totalDuration += exec.durationMs;
        durationCount++;
      }
    }

    const stats = {
      total,
      completed: allExecutions.filter(e => e.status === 'completed').length,
      failed: allExecutions.filter(e => e.status === 'failed').length,
      running: allExecutions.filter(e => e.status === 'running').length,
      pending: allExecutions.filter(e => e.status === 'pending').length,
      totalTokensSaved,
      totalProjectsProcessed,
      avgDurationMs: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0
    };

    return NextResponse.json({
      executions: parsedExecutions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + executions.length < total
      },
      stats
    });
  } catch (error) {
    console.error('[GET /api/scheduler/executions]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
