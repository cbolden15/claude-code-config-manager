import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const UpdateComponentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  sourceUrl: z.string().url().optional().nullable(),
  version: z.string().optional().nullable(),
  tags: z.string().optional(),
  enabled: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const component = await prisma.component.findUnique({
      where: { id },
      include: {
        profiles: {
          include: {
            profile: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...component,
      config: JSON.parse(component.config),
      profiles: component.profiles.map((p) => p.profile),
    });
  } catch (error) {
    console.error('GET /api/components/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch component' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateComponentSchema.parse(body);

    const existing = await prisma.component.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    const component = await prisma.component.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && {
          description: validated.description,
        }),
        ...(validated.config && { config: JSON.stringify(validated.config) }),
        ...(validated.sourceUrl !== undefined && {
          sourceUrl: validated.sourceUrl,
        }),
        ...(validated.version !== undefined && { version: validated.version }),
        ...(validated.tags !== undefined && { tags: validated.tags }),
        ...(validated.enabled !== undefined && { enabled: validated.enabled }),
      },
    });

    return NextResponse.json({
      ...component,
      config: JSON.parse(component.config),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('PUT /api/components/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update component' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.component.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    await prisma.component.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/components/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete component' },
      { status: 500 }
    );
  }
}
