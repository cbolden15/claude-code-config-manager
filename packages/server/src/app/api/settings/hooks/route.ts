import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/settings/hooks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hookType = searchParams.get('hookType');
    const category = searchParams.get('category');
    const enabled = searchParams.get('enabled');

    const where: any = {};
    if (hookType) where.hookType = hookType;
    if (category) where.category = category;
    if (enabled !== null) where.enabled = enabled === 'true';

    const hooks = await prisma.globalHook.findMany({
      where,
      orderBy: [
        { hookType: 'asc' },
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Group by hookType for UI
    const grouped = hooks.reduce((acc, hook) => {
      if (!acc[hook.hookType]) {
        acc[hook.hookType] = [];
      }
      acc[hook.hookType].push(hook);
      return acc;
    }, {} as Record<string, typeof hooks>);

    return NextResponse.json({
      hooks,
      grouped,
      stats: {
        total: hooks.length,
        enabled: hooks.filter(h => h.enabled).length,
        byType: Object.fromEntries(
          Object.entries(grouped).map(([k, v]) => [k, v.length])
        )
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch hooks' }, { status: 500 });
  }
}

// POST /api/settings/hooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hookType, matcher, command, timeout, description, category, enabled, order } = body;

    if (!hookType || !matcher || !command) {
      return NextResponse.json(
        { error: 'hookType, matcher, and command are required' },
        { status: 400 }
      );
    }

    const hook = await prisma.globalHook.create({
      data: {
        hookType,
        matcher,
        command,
        timeout,
        description,
        category,
        enabled: enabled ?? true,
        order: order ?? 0,
      }
    });

    return NextResponse.json({ hook }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create hook' }, { status: 500 });
  }
}
