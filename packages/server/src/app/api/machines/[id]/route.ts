import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/machines/[id]
 * Get single machine details with summary stats
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { lastActiveAt: 'desc' },
          take: 10
        },
        healthScores: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        _count: {
          select: {
            projects: true,
            sessions: true,
            patterns: true,
            recommendations: true,
            appliedConfigs: true
          }
        }
      }
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...machine,
      latestHealthScore: machine.healthScores[0] || null,
      healthScores: undefined // Don't include in response
    });
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
      name: z.string().min(1).optional(),
      hostname: z.string().optional(),
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
        ...(validated.name && { name: validated.name }),
        ...(validated.hostname !== undefined && { hostname: validated.hostname }),
        ...(validated.isCurrentMachine !== undefined && { isCurrentMachine: validated.isCurrentMachine }),
        lastSeen: new Date()
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

    // Delete machine (cascades to related records)
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
