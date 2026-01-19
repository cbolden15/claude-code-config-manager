import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/scheduler/tasks/[id]/run
 * Manually trigger a scheduled task execution
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { triggerType = 'manual', machineId } = body;

    // Find the task
    const task = await prisma.scheduledTask.findUnique({
      where: { id },
      include: {
        machine: {
          select: {
            id: true,
            name: true
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

    // Validate trigger type
    const validTriggerTypes = ['scheduled', 'threshold', 'manual', 'api'];
    if (!validTriggerTypes.includes(triggerType)) {
      return NextResponse.json(
        { error: `triggerType must be one of: ${validTriggerTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Use provided machineId or task's machineId
    const executionMachineId = machineId || task.machineId;

    // Create a pending execution record
    const execution = await prisma.taskExecution.create({
      data: {
        taskId: id,
        machineId: executionMachineId,
        status: 'pending',
        triggerType,
        startedAt: new Date()
      }
    });

    // Update task's lastRunAt
    await prisma.scheduledTask.update({
      where: { id },
      data: {
        lastRunAt: new Date()
      }
    });

    // TODO: Actually execute the task via the scheduler engine (Terminal 2)
    // For now, simulate an immediate execution start
    const updatedExecution = await prisma.taskExecution.update({
      where: { id: execution.id },
      data: {
        status: 'running'
      }
    });

    return NextResponse.json({
      executionId: updatedExecution.id,
      taskId: id,
      taskName: task.name,
      status: 'running',
      message: 'Task execution started',
      triggerType
    }, { status: 202 });
  } catch (error) {
    console.error('[POST /api/scheduler/tasks/[id]/run]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
