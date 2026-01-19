import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exportToClaudeFormat } from '@/lib/hooks';

// GET /api/settings/hooks/export
export async function GET() {
  try {
    const hooks = await prisma.globalHook.findMany({
      where: { enabled: true },
      orderBy: [
        { hookType: 'asc' },
        { order: 'asc' }
      ]
    });

    const exported = exportToClaudeFormat(hooks);

    return NextResponse.json({
      hooks: exported,
      count: hooks.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to export hooks' }, { status: 500 });
  }
}
