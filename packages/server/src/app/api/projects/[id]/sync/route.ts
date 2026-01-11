import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncProject, getSyncStatus } from '@/lib/sync/orchestrator';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const SyncRequestSchema = z.object({
  machineId: z.string().min(1),
  syncType: z.enum(['full', 'incremental', 'selective']).optional(),
  dryRun: z.boolean().optional(),
});

/**
 * POST /api/projects/[id]/sync
 * Trigger a sync operation for a project
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const validated = SyncRequestSchema.parse(body);

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, profileId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.profileId) {
      return NextResponse.json(
        { error: 'Project has no profile assigned' },
        { status: 400 }
      );
    }

    // Verify machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: validated.machineId },
      select: { id: true, name: true, syncEnabled: true },
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    if (!machine.syncEnabled) {
      return NextResponse.json(
        { error: `Sync is disabled for machine: ${machine.name}` },
        { status: 400 }
      );
    }

    // Perform sync operation
    const syncResult = await syncProject(prisma, {
      projectId,
      machineId: validated.machineId,
      syncType: validated.syncType || 'full',
      dryRun: validated.dryRun || false,
    });

    if (!syncResult.success) {
      return NextResponse.json(
        {
          error: 'Sync failed',
          details: syncResult.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      syncLogId: syncResult.syncLogId,
      stats: syncResult.stats,
      filesGenerated: syncResult.files.length,
      dryRun: validated.dryRun || false,
      files: syncResult.files.map((f) => ({
        path: f.path,
        action: f.action,
        contentLength: f.content.length,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/projects/[id]/sync error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync project',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/sync
 * Get sync status for a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');

    if (!machineId) {
      return NextResponse.json(
        { error: 'machineId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true },
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Get sync status
    const status = await getSyncStatus(prisma, projectId, machineId);

    if (!status) {
      return NextResponse.json(
        { error: 'Failed to get sync status' },
        { status: 500 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('GET /api/projects/[id]/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
