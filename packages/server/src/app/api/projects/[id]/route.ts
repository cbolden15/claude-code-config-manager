import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true,
            platform: true
          }
        }
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    return NextResponse.json({
      ...project,
      detectedTechs: project.detectedTechs ? JSON.parse(project.detectedTechs) : [],
      detectedPatterns: project.detectedPatterns ? JSON.parse(project.detectedPatterns) : [],
    });
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateProjectSchema.parse(body);

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        lastActiveAt: new Date(),
      },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true,
            platform: true
          }
        }
      },
    });

    return NextResponse.json({
      ...project,
      detectedTechs: project.detectedTechs ? JSON.parse(project.detectedTechs) : [],
      detectedPatterns: project.detectedPatterns ? JSON.parse(project.detectedPatterns) : [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('PUT /api/projects/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
