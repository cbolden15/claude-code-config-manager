import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteParams = { params: Promise<{ id: string; componentId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: profileId, componentId } = await params;

    const existing = await prisma.profileComponent.findUnique({
      where: {
        profileId_componentId: { profileId, componentId },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Component not in profile' },
        { status: 404 }
      );
    }

    await prisma.profileComponent.delete({
      where: {
        profileId_componentId: { profileId, componentId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/profiles/[id]/components/[componentId] error:', error);
    return NextResponse.json(
      { error: 'Failed to remove component from profile' },
      { status: 500 }
    );
  }
}
