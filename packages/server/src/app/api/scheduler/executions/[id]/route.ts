import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/scheduler/executions/[id]
 * Get a specific execution with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const execution = await prisma.taskExecution.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            taskType: true,
            scheduleType: true,
            cronExpression: true,
            intervalHours: true,
            taskConfig: true,
            machine: {
              select: {
                id: true,
                name: true,
                hostname: true,
                platform: true
              }
            }
          }
        }
      }
    });

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedExecution = {
      ...execution,
      result: execution.result ? JSON.parse(execution.result) : null,
      task: {
        ...execution.task,
        taskConfig: execution.task.taskConfig ? JSON.parse(execution.task.taskConfig) : {}
      }
    };

    return NextResponse.json({ execution: parsedExecution });
  } catch (error) {
    console.error('[GET /api/scheduler/executions/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheduler/executions/[id]/retry
 * Retry a failed execution
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Find the original execution
    const originalExecution = await prisma.taskExecution.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            enabled: true
          }
        }
      }
    });

    if (!originalExecution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Only allow retry of failed executions
    if (originalExecution.status !== 'failed') {
      return NextResponse.json(
        { error: 'Can only retry failed executions' },
        { status: 400 }
      );
    }

    // Check if task still exists and is enabled
    if (!originalExecution.task) {
      return NextResponse.json(
        { error: 'Associated task no longer exists' },
        { status: 404 }
      );
    }

    // Create a new execution as a retry
    const newExecution = await prisma.taskExecution.create({
      data: {
        taskId: originalExecution.taskId,
        status: 'pending',
        triggerType: 'manual' // Retry is considered a manual trigger
      }
    });

    // Update to running status
    const updatedExecution = await prisma.taskExecution.update({
      where: { id: newExecution.id },
      data: {
        status: 'running'
      }
    });

    // Update task's lastRunAt
    await prisma.scheduledTask.update({
      where: { id: originalExecution.taskId },
      data: {
        lastRunAt: new Date()
      }
    });

    return NextResponse.json({
      executionId: updatedExecution.id,
      originalExecutionId: id,
      taskId: originalExecution.taskId,
      taskName: originalExecution.task.name,
      status: 'running',
      message: 'Retry execution started'
    }, { status: 202 });
  } catch (error) {
    console.error('[POST /api/scheduler/executions/[id]/retry]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
