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
      const validStatuses = ['pending', 'running', 'completed', 'failed', 'skipped'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `status must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      where.status = status;
    }

    if (machineId) {
      where.machineId = machineId;
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
            taskType: true
          }
        },
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset
    });

    // Compute aggregate stats
    const allExecutions = await prisma.taskExecution.findMany({
      where,
      select: {
        status: true,
        tokensSaved: true,
        projectsProcessed: true,
        durationMs: true
      }
    });

    const stats = {
      total,
      completed: allExecutions.filter(e => e.status === 'completed').length,
      failed: allExecutions.filter(e => e.status === 'failed').length,
      running: allExecutions.filter(e => e.status === 'running').length,
      pending: allExecutions.filter(e => e.status === 'pending').length,
      totalTokensSaved: allExecutions.reduce((sum, e) => sum + e.tokensSaved, 0),
      totalProjectsProcessed: allExecutions.reduce((sum, e) => sum + e.projectsProcessed, 0),
      avgDurationMs: allExecutions.length > 0
        ? Math.round(allExecutions.reduce((sum, e) => sum + (e.durationMs || 0), 0) / allExecutions.filter(e => e.durationMs).length)
        : 0
    };

    return NextResponse.json({
      executions,
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
