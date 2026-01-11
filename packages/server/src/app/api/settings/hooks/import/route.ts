import { NextRequest, NextResponse } from 'next/server';
import { parseClaudeHooks, importHooks } from '@/lib/hooks';

// POST /api/settings/hooks/import
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hooks: rawHooks, replace = false, dryRun = false } = body;

    if (!rawHooks || typeof rawHooks !== 'object') {
      return NextResponse.json(
        { error: 'hooks object is required' },
        { status: 400 }
      );
    }

    // Parse from Claude format
    const parsed = parseClaudeHooks(rawHooks);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        preview: {
          total: parsed.length,
          byType: parsed.reduce((acc, h) => {
            acc[h.hookType] = (acc[h.hookType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        hooks: parsed
      });
    }

    const result = await importHooks(parsed, replace);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import hooks' }, { status: 500 });
  }
}
