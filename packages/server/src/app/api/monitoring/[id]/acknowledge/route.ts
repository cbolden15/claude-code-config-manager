import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.monitoringEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Monitoring entry not found' },
        { status: 404 }
      );
    }

    const entry = await prisma.monitoringEntry.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('PUT /api/monitoring/[id]/acknowledge error:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge entry' },
      { status: 500 }
    );
  }
}

// Bulk acknowledge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = body.ids as string[] | undefined;

    if (ids && Array.isArray(ids)) {
      // Acknowledge specific entries
      const result = await prisma.monitoringEntry.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true },
      });

      return NextResponse.json({ acknowledged: result.count });
    } else {
      // Acknowledge all
      const result = await prisma.monitoringEntry.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({ acknowledged: result.count });
    }
  } catch (error) {
    console.error('POST /api/monitoring/[id]/acknowledge error:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge entries' },
      { status: 500 }
    );
  }
}
