import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/machines/[id]/overrides
 * List all overrides for a machine
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Get all overrides
    const overrides = await prisma.machineOverride.findMany({
      where: { machineId: id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      overrides,
      total: overrides.length
    });
  } catch (error) {
    console.error('[GET /api/machines/[id]/overrides]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/machines/[id]/overrides
 * Create a new override for a machine
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validation schema
    const MachineOverrideCreateSchema = z.object({
      configType: z.enum(['mcp_server', 'hook', 'permission', 'env_var', 'plugin']),
      configKey: z.string().min(1),
      action: z.enum(['include', 'exclude', 'modify']),
      overrideData: z.string().optional(),
      reason: z.string().optional()
    });

    const validated = MachineOverrideCreateSchema.parse(body);

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

    // Check for duplicate override
    const existing = await prisma.machineOverride.findFirst({
      where: {
        machineId: id,
        configType: validated.configType,
        configKey: validated.configKey
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Override already exists for this config' },
        { status: 409 }
      );
    }

    // Create override
    const override = await prisma.machineOverride.create({
      data: {
        machineId: id,
        configType: validated.configType,
        configKey: validated.configKey,
        action: validated.action,
        overrideData: validated.overrideData,
        reason: validated.reason
      }
    });

    return NextResponse.json(override, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/machines/[id]/overrides]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
