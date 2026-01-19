import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/context/optimize/preview
 * Preview optimization changes without applying
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisId, strategy = 'moderate' } = body;

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

    const issues = JSON.parse(analysis.issues);
    const sections = JSON.parse(analysis.sections);

    // TODO: Call @/lib/context/optimizer.ts (Terminal 2 will implement)
    // Generate preview based on strategy
    const strategyMultipliers: Record<string, number> = {
      conservative: 0.25,
      moderate: 0.50,
      aggressive: 0.75,
      custom: 0.40
    };

    const multiplier = strategyMultipliers[strategy] || 0.50;
    const projectedSavings = Math.floor(analysis.totalTokens * multiplier);
    const projectedLines = Math.floor(analysis.totalLines * (1 - multiplier));

    // Generate placeholder actions based on issues
    const actions = issues.map((issue: any) => ({
      type: issue.type === 'completed_work_verbose' ? 'archive' : 'condense',
      section: issue.section,
      reason: issue.description,
      before: `[${issue.section} content - ${Math.floor(analysis.totalLines / issues.length)} lines]`,
      after: issue.type === 'completed_work_verbose'
        ? `See \`.claude/archives/CLAUDE-history.md\` for ${issue.section}`
        : `[Condensed summary - ${Math.floor(analysis.totalLines / issues.length * 0.2)} lines]`,
      linesSaved: Math.floor((analysis.totalLines / issues.length) * multiplier),
      tokensSaved: Math.floor((analysis.totalTokens / issues.length) * multiplier)
    }));

    const preview = {
      strategy,
      analysisId,
      analysis: {
        id: analysis.id,
        projectPath: analysis.projectPath,
        filePath: analysis.filePath,
        currentLines: analysis.totalLines,
        currentTokens: analysis.totalTokens,
        currentScore: analysis.currentScore,
        potentialScore: analysis.potentialScore
      },
      projectedChanges: {
        actions,
        summary: {
          currentLines: analysis.totalLines,
          projectedLines,
          currentTokens: analysis.totalTokens,
          projectedTokens: analysis.totalTokens - projectedSavings,
          reductionPercent: Math.round(multiplier * 100),
          tokensSaved: projectedSavings
        }
      },
      warnings: analysis.totalTokens < 1000 ? [
        'File is already small. Optimization may have minimal impact.'
      ] : []
    };

    return NextResponse.json({ preview });
  } catch (error) {
    console.error('[POST /api/context/optimize/preview]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
