import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const CreateMonitoringEntrySchema = z.object({
  source: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  url: z.string().url().optional().nullable(),
  severity: z.enum(['info', 'warning', 'important']).default('info'),
});

const BulkCreateSchema = z.object({
  entries: z.array(CreateMonitoringEntrySchema),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (source) {
      where.source = source;
    }

    if (isRead !== null) {
      where.isRead = isRead === 'true';
    }

    const entries = await prisma.monitoringEntry.findMany({
      where,
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.monitoringEntry.count({
      where: { isRead: false },
    });

    return NextResponse.json({
      entries,
      total: entries.length,
      unreadCount,
    });
  } catch (error) {
    console.error('GET /api/monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both single entry and bulk entries (from n8n)
    if (body.entries) {
      const validated = BulkCreateSchema.parse(body);

      const created = await prisma.monitoringEntry.createMany({
        data: validated.entries.map((entry) => ({
          source: entry.source,
          title: entry.title,
          content: entry.content,
          url: entry.url ?? null,
          severity: entry.severity,
        })),
      });

      return NextResponse.json(
        { created: created.count },
        { status: 201 }
      );
    } else {
      const validated = CreateMonitoringEntrySchema.parse(body);

      const entry = await prisma.monitoringEntry.create({
        data: {
          source: validated.source,
          title: validated.title,
          content: validated.content,
          url: validated.url ?? null,
          severity: validated.severity,
        },
      });

      return NextResponse.json(entry, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to create monitoring entry' },
      { status: 500 }
    );
  }
}
