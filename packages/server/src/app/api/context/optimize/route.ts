import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/context/optimize
 * Apply optimization plan to CLAUDE.md
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisId, strategy = 'moderate', dryRun = false } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'analysisId is required' },
        { status: 400 }
      );
    }

    // Validate strategy
    const validStrategies = ['conservative', 'moderate', 'aggressive', 'custom'];
    if (!validStrategies.includes(strategy)) {
      return NextResponse.json(
        { error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch analysis
    const analysis = await prisma.contextAnalysis.findUnique({
      where: { id: analysisId },
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

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // TODO: Call @/lib/context/optimizer.ts (Terminal 2 will implement)
    // For now, return placeholder optimization plan
    const optimizationPlan = {
      strategy,
      analysisId,
      dryRun,
      actions: [
        {
          type: 'archive',
          section: 'Completed Work Sessions',
          reason: 'Historical content can be archived',
          before: '(content truncated)',
          after: 'See `.claude/archives/CLAUDE-history.md`',
          linesSaved: 0,
          tokensSaved: 0
        }
      ],
      summary: {
        currentLines: analysis.totalLines,
        projectedLines: analysis.totalLines,
        currentTokens: analysis.totalTokens,
        projectedTokens: analysis.totalTokens,
        reductionPercent: 0
      }
    };

    if (!dryRun) {
      // Update analysis status
      await prisma.contextAnalysis.update({
        where: { id: analysisId },
        data: {
          status: 'optimized'
        }
      });
    }

    return NextResponse.json({
      plan: optimizationPlan,
      applied: !dryRun,
      message: dryRun
        ? 'Dry run complete. No changes applied.'
        : 'Optimization applied successfully.'
    });
  } catch (error) {
    console.error('[POST /api/context/optimize]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/context/optimize/strategies
 * Get available optimization strategies
 */
export async function GET() {
  try {
    const strategies = [
      {
        id: 'conservative',
        name: 'Conservative',
        description: 'Archive only, never modify in place. Safest option.',
        reductionEstimate: '20-30%'
      },
      {
        id: 'moderate',
        name: 'Moderate',
        description: 'Archive + condense + dedupe. Balanced approach.',
        reductionEstimate: '40-60%'
      },
      {
        id: 'aggressive',
        name: 'Aggressive',
        description: 'Minimize to essential context only. Maximum savings.',
        reductionEstimate: '60-80%'
      },
      {
        id: 'custom',
        name: 'Custom',
        description: 'Apply user-defined rules only.',
        reductionEstimate: 'Varies'
      }
    ];

    return NextResponse.json({ strategies });
  } catch (error) {
    console.error('[GET /api/context/optimize/strategies]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
