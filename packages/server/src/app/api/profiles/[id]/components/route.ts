import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const AddComponentSchema = z.object({
  componentId: z.string(),
  order: z.number().int().min(0).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: profileId } = await params;
    const body = await request.json();
    const validated = AddComponentSchema.parse(body);

    // Verify profile exists
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Verify component exists
    const component = await prisma.component.findUnique({
      where: { id: validated.componentId },
    });
    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    // Get current max order if not specified
    let order = validated.order;
    if (order === undefined) {
      const maxOrder = await prisma.profileComponent.aggregate({
        where: { profileId },
        _max: { order: true },
      });
      order = (maxOrder._max.order ?? -1) + 1;
    }

    const profileComponent = await prisma.profileComponent.create({
      data: {
        profileId,
        componentId: validated.componentId,
        order,
      },
      include: { component: true },
    });

    return NextResponse.json(
      {
        ...profileComponent.component,
        config: JSON.parse(profileComponent.component.config),
        order: profileComponent.order,
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
        { error: 'Component already in profile' },
        { status: 409 }
      );
    }

    console.error('POST /api/profiles/[id]/components error:', error);
    return NextResponse.json(
      { error: 'Failed to add component to profile' },
      { status: 500 }
    );
  }
}
