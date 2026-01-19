import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/settings/hooks/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hook = await prisma.globalHook.findUnique({
      where: { id: params.id }
    });

    if (!hook) {
      return NextResponse.json({ error: 'Hook not found' }, { status: 404 });
    }

    return NextResponse.json({ hook });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch hook' }, { status: 500 });
  }
}

// PUT /api/settings/hooks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const hook = await prisma.globalHook.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json({ hook });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update hook' }, { status: 500 });
  }
}

// DELETE /api/settings/hooks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.globalHook.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete hook' }, { status: 500 });
  }
}
