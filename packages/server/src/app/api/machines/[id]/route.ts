import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/machines/[id]
 * Get single machine details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        overrides: {
          orderBy: { createdAt: 'desc' }
        },
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(machine);
  } catch (error) {
    console.error('[GET /api/machines/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/machines/[id]
 * Update machine settings
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validation schema
    const MachineUpdateSchema = z.object({
      syncEnabled: z.boolean().optional(),
      isCurrentMachine: z.boolean().optional()
    });

    const validated = MachineUpdateSchema.parse(body);

    // Check machine exists
    const existing = await prisma.machine.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    // If setting as current machine, unset all others
    if (validated.isCurrentMachine === true) {
      await prisma.machine.updateMany({
        where: {
          id: { not: id },
          isCurrentMachine: true
        },
        data: { isCurrentMachine: false }
      });
    }

    // Update machine
    const updated = await prisma.machine.update({
      where: { id },
      data: {
        ...(validated.syncEnabled !== undefined && { syncEnabled: validated.syncEnabled }),
        ...(validated.isCurrentMachine !== undefined && { isCurrentMachine: validated.isCurrentMachine })
      },
      include: {
        overrides: {
          orderBy: { createdAt: 'desc' }
        },
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[PUT /api/machines/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/machines/[id]
 * Delete a machine
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check machine exists
    const machine = await prisma.machine.findUnique({
      where: { id }
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of current machine
    if (machine.isCurrentMachine) {
      return NextResponse.json(
        { error: 'Cannot delete current machine' },
        { status: 409 }
      );
    }

    // Delete machine (cascades to overrides and syncLogs)
    await prisma.machine.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/machines/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
