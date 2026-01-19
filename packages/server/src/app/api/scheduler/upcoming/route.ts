import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/scheduler/upcoming
 * Get tasks scheduled to run in the next N hours
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    // Validate hours
    if (isNaN(hours) || hours < 1 || hours > 168) { // Max 1 week
      return NextResponse.json(
        { error: 'hours must be between 1 and 168' },
        { status: 400 }
      );
    }

    const futureTime = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Get tasks with upcoming runs
    const upcomingTasks = await prisma.scheduledTask.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          not: null,
          lte: futureTime
        }
      },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true
          }
        },
        executions: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          select: {
            status: true,
            startedAt: true,
            completedAt: true
          }
        }
      },
      orderBy: { nextRunAt: 'asc' }
    });

    // Format response with time information
    const now = Date.now();
    const upcoming = upcomingTasks.map(task => {
      const nextRunTime = task.nextRunAt ? new Date(task.nextRunAt).getTime() : null;
      const minutesUntilRun = nextRunTime ? Math.round((nextRunTime - now) / 60000) : null;
      const lastExecution = task.executions[0] || null;

      return {
        id: task.id,
        name: task.name,
        description: task.description,
        taskType: task.taskType,
        scheduleType: task.scheduleType,
        cronExpression: task.cronExpression,
        intervalMinutes: task.intervalMinutes,
        nextRunAt: task.nextRunAt,
        minutesUntilRun,
        hoursUntilRun: minutesUntilRun ? Math.round(minutesUntilRun / 60 * 10) / 10 : null,
        machine: task.machine,
        lastExecution: lastExecution ? {
          status: lastExecution.status,
          startedAt: lastExecution.startedAt,
          completedAt: lastExecution.completedAt
        } : null
      };
    });

    // Group by time windows
    const windows = {
      nextHour: upcoming.filter(t => t.minutesUntilRun !== null && t.minutesUntilRun <= 60),
      next6Hours: upcoming.filter(t => t.minutesUntilRun !== null && t.minutesUntilRun > 60 && t.minutesUntilRun <= 360),
      next24Hours: upcoming.filter(t => t.minutesUntilRun !== null && t.minutesUntilRun > 360 && t.minutesUntilRun <= 1440),
      later: upcoming.filter(t => t.minutesUntilRun !== null && t.minutesUntilRun > 1440)
    };

    return NextResponse.json({
      upcoming,
      windows,
      summary: {
        total: upcoming.length,
        nextHour: windows.nextHour.length,
        next6Hours: windows.next6Hours.length,
        next24Hours: windows.next24Hours.length,
        later: windows.later.length
      },
      queryPeriod: {
        hours,
        from: new Date().toISOString(),
        to: futureTime.toISOString()
      }
    });
  } catch (error) {
    console.error('[GET /api/scheduler/upcoming]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
