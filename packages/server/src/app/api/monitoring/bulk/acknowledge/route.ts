import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    let ids: string[] | undefined;

    // Try to parse body, but allow empty body for "acknowledge all"
    try {
      const body = await request.json();
      ids = body.ids;
    } catch {
      // Empty body means acknowledge all
    }

    if (ids && Array.isArray(ids)) {
      // Acknowledge specific entries
      const result = await prisma.monitoringEntry.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true },
      });

      return NextResponse.json({ acknowledged: result.count });
    } else {
      // Acknowledge all unread
      const result = await prisma.monitoringEntry.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({ acknowledged: result.count });
    }
  } catch (error) {
    console.error('POST /api/monitoring/bulk/acknowledge error:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge entries' },
      { status: 500 }
    );
  }
}
