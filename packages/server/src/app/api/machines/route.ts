import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/**
 * GET /api/machines
 * List all machines with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const platform = searchParams.get('platform');
    const syncEnabledParam = searchParams.get('syncEnabled');

    // Build dynamic where clause
    const where: any = {};
    if (platform) {
      where.platform = platform;
    }
    if (syncEnabledParam !== null) {
      where.syncEnabled = syncEnabledParam === 'true';
    }

    // Fetch machines with counts
    const machines = await prisma.machine.findMany({
      where,
      include: {
        _count: {
          select: {
            overrides: true,
            syncLogs: true
          }
        }
      },
      orderBy: {
        lastSeen: 'desc'
      }
    });

    // Calculate stats
    const totalMachines = machines.length;
    const activeMachines = machines.filter(m => {
      const lastSeenDate = new Date(m.lastSeen);
      const hoursSinceLastSeen = (Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastSeen < 24; // Active if seen in last 24 hours
    }).length;
    const syncEnabledCount = machines.filter(m => m.syncEnabled).length;

    return NextResponse.json({
      machines,
      total: totalMachines,
      stats: {
        totalMachines,
        activeMachines,
        syncEnabled: syncEnabledCount
      }
    });
  } catch (error) {
    console.error('[GET /api/machines]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/machines
 * Register a new machine (or update if exists)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation schema
    const MachineRegisterSchema = z.object({
      name: z.string().min(1).max(200),
      hostname: z.string().optional(),
      platform: z.enum(['darwin', 'linux', 'win32']),
      arch: z.string().optional(),
      homeDir: z.string().optional(),
      isCurrentMachine: z.boolean().default(false)
    });

    const validated = MachineRegisterSchema.parse(body);

    // Check if machine with same name exists
    const existing = await prisma.machine.findUnique({
      where: { name: validated.name },
      include: {
        overrides: true,
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    });

    if (existing) {
      // Update existing machine
      const updated = await prisma.machine.update({
        where: { id: existing.id },
        data: {
          lastSeen: new Date(),
          ...(validated.hostname !== undefined && { hostname: validated.hostname }),
          ...(validated.platform !== undefined && { platform: validated.platform }),
          ...(validated.arch !== undefined && { arch: validated.arch }),
          ...(validated.homeDir !== undefined && { homeDir: validated.homeDir }),
          ...(validated.isCurrentMachine !== undefined && { isCurrentMachine: validated.isCurrentMachine })
        },
        include: {
          overrides: true,
          syncLogs: {
            orderBy: { startedAt: 'desc' },
            take: 10
          }
        }
      });

      return NextResponse.json(updated);
    }

    // If setting as current machine, unset all others
    if (validated.isCurrentMachine) {
      await prisma.machine.updateMany({
        where: { isCurrentMachine: true },
        data: { isCurrentMachine: false }
      });
    }

    // Create new machine
    const machine = await prisma.machine.create({
      data: {
        name: validated.name,
        hostname: validated.hostname,
        platform: validated.platform,
        arch: validated.arch,
        homeDir: validated.homeDir,
        isCurrentMachine: validated.isCurrentMachine,
        syncEnabled: true
      },
      include: {
        overrides: true,
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    });

    return NextResponse.json(machine, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/machines]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
