import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/context/archives/[id]
 * Get archive content
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const archive = await prisma.contextArchive.findUnique({
      where: { id },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true
          }
        }
      }
    });

    if (!archive) {
      return NextResponse.json(
        { error: 'Archive not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ archive });
  } catch (error) {
    console.error('[GET /api/context/archives/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/context/archives/[id]
 * Delete an archive
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const archive = await prisma.contextArchive.findUnique({
      where: { id }
    });

    if (!archive) {
      return NextResponse.json(
        { error: 'Archive not found' },
        { status: 404 }
      );
    }

    await prisma.contextArchive.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Archive deleted successfully'
    });
  } catch (error) {
    console.error('[DELETE /api/context/archives/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
