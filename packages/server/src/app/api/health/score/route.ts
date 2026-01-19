import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/health/score
 * Get optimization health score for a machine
 *
 * Query params:
 * - machineId: Machine ID (required)
 * - calculate: If 'true', recalculate score before returning
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const machineId = searchParams.get('machineId');
    const shouldCalculate = searchParams.get('calculate') === 'true';

    if (!machineId) {
      return NextResponse.json(
        { error: 'machineId is required' },
        { status: 400 }
      );
    }

    // Verify machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: machineId }
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Calculate new score if requested
    if (shouldCalculate) {
      await calculateHealthScore(machineId);
    }

    // Get latest health score
    const latestScore = await prisma.healthScore.findFirst({
      where: { machineId },
      orderBy: { timestamp: 'desc' },
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

    if (!latestScore) {
      // No score yet - calculate one
      const newScore = await calculateHealthScore(machineId);
      return NextResponse.json(newScore);
    }

    // Get score history (last 30 entries)
    const history = await prisma.healthScore.findMany({
      where: { machineId },
      orderBy: { timestamp: 'desc' },
      take: 30,
      select: {
        score: true,
        mcpScore: true,
        skillScore: true,
        contextScore: true,
        patternScore: true,
        timestamp: true,
        trend: true
      }
    });

    return NextResponse.json({
      current: latestScore,
      history: history.reverse(), // Oldest to newest for charting
      insights: generateInsights(latestScore)
    });
  } catch (error) {
    console.error('[GET /api/health/score]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/score
 * Force recalculation of health score
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { machineId } = body;

    if (!machineId) {
      return NextResponse.json(
        { error: 'machineId is required' },
        { status: 400 }
      );
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId }
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    const score = await calculateHealthScore(machineId);

    return NextResponse.json({
      success: true,
      score
    });
  } catch (error) {
    console.error('[POST /api/health/score]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate and save health score for a machine
 */
async function calculateHealthScore(machineId: string) {
  // Get active recommendations
  const activeRecommendations = await prisma.recommendation.findMany({
    where: { machineId, status: 'active' }
  });

  // Get applied recommendations
  const appliedRecommendations = await prisma.recommendation.findMany({
    where: { machineId, status: 'applied' }
  });

  // Get dismissed recommendations
  const dismissedRecommendations = await prisma.recommendation.findMany({
    where: { machineId, status: 'dismissed' }
  });

  // Calculate MCP Score (0-100)
  // Higher score = fewer active MCP recommendations (more optimized)
  const mcpActive = activeRecommendations.filter(r => r.category === 'mcp_server');
  const mcpApplied = appliedRecommendations.filter(r => r.category === 'mcp_server');
  const mcpTotal = mcpActive.length + mcpApplied.length;
  const mcpScore = mcpTotal === 0 ? 100 : Math.round((mcpApplied.length / mcpTotal) * 100);

  // Calculate Skill Score (0-100)
  const skillActive = activeRecommendations.filter(r => r.category === 'skill');
  const skillApplied = appliedRecommendations.filter(r => r.category === 'skill');
  const skillTotal = skillActive.length + skillApplied.length;
  const skillScore = skillTotal === 0 ? 100 : Math.round((skillApplied.length / skillTotal) * 100);

  // Calculate Context Score (0-100)
  const contextActive = activeRecommendations.filter(r => r.category === 'context');
  const contextApplied = appliedRecommendations.filter(r => r.category === 'context');
  const contextTotal = contextActive.length + contextApplied.length;
  const contextScore = contextTotal === 0 ? 75 : Math.round((contextApplied.length / contextTotal) * 100);

  // Calculate Pattern Score (0-100)
  // Based on pattern optimization
  const patterns = await prisma.pattern.findMany({
    where: { machineId }
  });
  const highConfidencePatterns = patterns.filter(p => p.confidence >= 0.8);
  const patternScore = patterns.length === 0
    ? 100
    : Math.round((highConfidencePatterns.length / patterns.length) * 100);

  // Calculate total score (weighted average)
  const score = Math.round(
    mcpScore * 0.35 +      // MCP optimization is most impactful
    skillScore * 0.30 +    // Skills provide significant savings
    contextScore * 0.20 +  // Context efficiency matters
    patternScore * 0.15    // Pattern optimization helps
  );

  // Calculate estimated waste (tokens from active recommendations - monthly)
  const estimatedMonthlyWaste = activeRecommendations.reduce(
    (sum, r) => sum + r.estimatedTokenSavings,
    0
  );

  // Calculate estimated savings (from applied recommendations - monthly)
  const estimatedMonthlySavings = appliedRecommendations.reduce(
    (sum, r) => sum + r.estimatedTokenSavings,
    0
  );

  // Get previous score for trend calculation
  const previousScoreRecord = await prisma.healthScore.findFirst({
    where: { machineId },
    orderBy: { timestamp: 'desc' }
  });

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (previousScoreRecord) {
    const diff = score - previousScoreRecord.score;
    if (diff >= 5) trend = 'improving';
    else if (diff <= -5) trend = 'declining';
  }

  // Save health score
  const healthScore = await prisma.healthScore.create({
    data: {
      machineId,
      score,
      mcpScore,
      skillScore,
      contextScore,
      patternScore,
      activeRecommendations: activeRecommendations.length,
      appliedRecommendations: appliedRecommendations.length,
      dismissedRecommendations: dismissedRecommendations.length,
      estimatedMonthlyWaste,
      estimatedMonthlySavings,
      previousScore: previousScoreRecord?.score,
      trend
    },
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

  return healthScore;
}

/**
 * Generate actionable insights from health score
 */
function generateInsights(scoreRecord: {
  score: number;
  mcpScore: number;
  skillScore: number;
  contextScore: number;
  patternScore: number;
  activeRecommendations: number;
  estimatedMonthlyWaste: number;
}) {
  const insights: string[] = [];

  // Overall assessment
  if (scoreRecord.score >= 90) {
    insights.push('Excellent! Your configuration is highly optimized.');
  } else if (scoreRecord.score >= 70) {
    insights.push('Good configuration with room for improvement.');
  } else if (scoreRecord.score >= 50) {
    insights.push('Moderate optimization. Consider applying more recommendations.');
  } else {
    insights.push('Significant optimization opportunities available.');
  }

  // MCP insights
  if (scoreRecord.mcpScore < 50) {
    insights.push('MCP servers could significantly reduce your token usage.');
  }

  // Skill insights
  if (scoreRecord.skillScore < 50) {
    insights.push('Custom skills can automate repetitive workflows.');
  }

  // Context insights
  if (scoreRecord.contextScore < 50) {
    insights.push('Your CLAUDE.md files could benefit from optimization.');
  }

  // Waste insights
  if (scoreRecord.estimatedMonthlyWaste > 5000) {
    insights.push(`You could save ~${scoreRecord.estimatedMonthlyWaste} tokens/month by applying recommendations.`);
  }

  // Action insight
  if (scoreRecord.activeRecommendations > 0) {
    insights.push(`Review ${scoreRecord.activeRecommendations} active recommendation(s) in the dashboard.`);
  }

  return insights;
}
