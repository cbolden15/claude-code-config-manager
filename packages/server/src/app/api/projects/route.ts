import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1),
  machineId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');

    const where: Record<string, unknown> = {};

    if (machineId) {
      where.machineId = machineId;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        machine: {
          select: { id: true, name: true, hostname: true, platform: true },
        },
      },
      orderBy: [{ lastActiveAt: 'desc' }, { name: 'asc' }],
    });

    // Parse JSON fields
    const projectsWithParsedFields = projects.map(project => ({
      ...project,
      detectedTechs: project.detectedTechs ? JSON.parse(project.detectedTechs) : [],
      detectedPatterns: project.detectedPatterns ? JSON.parse(project.detectedPatterns) : [],
    }));

    return NextResponse.json({
      projects: projectsWithParsedFields,
      total: projects.length,
    });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateProjectSchema.parse(body);

    // Verify machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: validated.machineId },
    });
    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Check for existing project with same path on this machine
    const existing = await prisma.project.findFirst({
      where: {
        path: validated.path,
        machineId: validated.machineId,
      },
    });

    if (existing) {
      // Update existing project
      const updated = await prisma.project.update({
        where: { id: existing.id },
        data: {
          name: validated.name,
          lastActiveAt: new Date(),
        },
        include: {
          machine: {
            select: { id: true, name: true, hostname: true, platform: true },
          },
        },
      });

      return NextResponse.json({
        ...updated,
        detectedTechs: updated.detectedTechs ? JSON.parse(updated.detectedTechs) : [],
        detectedPatterns: updated.detectedPatterns ? JSON.parse(updated.detectedPatterns) : [],
      });
    }

    // Create new project
    const project = await prisma.project.create({
      data: {
        name: validated.name,
        path: validated.path,
        machineId: validated.machineId,
        lastActiveAt: new Date(),
      },
      include: {
        machine: {
          select: { id: true, name: true, hostname: true, platform: true },
        },
      },
    });

    return NextResponse.json({
      ...project,
      detectedTechs: [],
      detectedPatterns: [],
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Project with this path and machine already exists' },
        { status: 409 }
      );
    }

    console.error('POST /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
