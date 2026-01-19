import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const CreateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string(),
  claudeMdTemplate: z.string().optional().nullable(),
  componentIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      include: {
        components: {
          include: {
            component: true,
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const parsed = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      claudeMdTemplate: p.claudeMdTemplate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      componentCount: p.components.length,
      projectCount: p._count.projects,
      components: p.components.map((pc) => ({
        ...pc.component,
        config: JSON.parse(pc.component.config),
        order: pc.order,
      })),
    }));

    return NextResponse.json({
      profiles: parsed,
      total: parsed.length,
    });
  } catch (error) {
    console.error('GET /api/profiles error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateProfileSchema.parse(body);

    const profile = await prisma.profile.create({
      data: {
        name: validated.name,
        description: validated.description,
        claudeMdTemplate: validated.claudeMdTemplate ?? null,
        ...(validated.componentIds && {
          components: {
            create: validated.componentIds.map((componentId, index) => ({
              componentId,
              order: index,
            })),
          },
        }),
      },
      include: {
        components: {
          include: { component: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(
      {
        ...profile,
        components: profile.components.map((pc) => ({
          ...pc.component,
          config: JSON.parse(pc.component.config),
          order: pc.order,
        })),
      },
      { status: 201 }
    );
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
        { error: 'Profile with this name already exists' },
        { status: 409 }
      );
    }

    console.error('POST /api/profiles error:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}
