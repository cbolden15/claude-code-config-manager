import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  claudeMdTemplate: z.string().optional().nullable(),
  componentIds: z.array(z.string()).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        components: {
          include: { component: true },
          orderBy: { order: 'asc' },
        },
        projects: {
          select: {
            id: true,
            name: true,
            path: true,
            machine: true,
            lastSyncedAt: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...profile,
      components: profile.components.map((pc) => ({
        ...pc.component,
        config: JSON.parse(pc.component.config),
        order: pc.order,
      })),
    });
  } catch (error) {
    console.error('GET /api/profiles/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateProfileSchema.parse(body);

    const existing = await prisma.profile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // If componentIds provided, replace all components
    if (validated.componentIds) {
      await prisma.profileComponent.deleteMany({
        where: { profileId: id },
      });
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && {
          description: validated.description,
        }),
        ...(validated.claudeMdTemplate !== undefined && {
          claudeMdTemplate: validated.claudeMdTemplate,
        }),
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

    return NextResponse.json({
      ...profile,
      components: profile.components.map((pc) => ({
        ...pc.component,
        config: JSON.parse(pc.component.config),
        order: pc.order,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('PUT /api/profiles/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.profile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    await prisma.profile.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/profiles/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}
