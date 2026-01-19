/**
 * Health Score Calculator for CCM v3.0
 *
 * Calculates an overall health score (0-100) for a machine based on
 * how well optimized its Claude Code configuration is.
 */

import { prisma } from '@/lib/db';
import { analyzeCrossProject } from '@/lib/recommendations/cross-project-analyzer';

/**
 * Health score result
 */
export interface HealthScoreResult {
  /** Overall score (0-100) */
  totalScore: number;
  /** MCP server optimization score (0-100) */
  mcpScore: number;
  /** Skill utilization score (0-100) */
  skillScore: number;
  /** Context efficiency score (0-100) */
  contextScore: number;
  /** Pattern optimization score (0-100) */
  patternScore: number;
  /** Number of active recommendations */
  activeRecommendations: number;
  /** Number of applied recommendations */
  appliedRecommendations: number;
  /** Estimated tokens wasted per day */
  estimatedDailyWaste: number;
  /** Estimated tokens saved per day (from applied recommendations) */
  estimatedDailySavings: number;
  /** Previous score (if available) */
  previousScore: number | null;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'declining';
  /** Detailed breakdown by category */
  breakdown: HealthBreakdown;
  /** Recommendations summary */
  recommendationsSummary: RecommendationsSummary;
}

/**
 * Detailed score breakdown
 */
export interface HealthBreakdown {
  mcp: {
    score: number;
    available: number;
    recommended: number;
    applied: number;
    details: string;
  };
  skills: {
    score: number;
    available: number;
    recommended: number;
    applied: number;
    details: string;
  };
  context: {
    score: number;
    avgTokensPerSession: number;
    startupTokens: number;
    details: string;
  };
  patterns: {
    score: number;
    detected: number;
    optimized: number;
    details: string;
  };
}

/**
 * Recommendations summary
 */
export interface RecommendationsSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: {
    mcp_server: number;
    skill: number;
  };
  topRecommendation: {
    title: string;
    savings: number;
  } | null;
}

/**
 * Category weights for overall score calculation
 */
const CATEGORY_WEIGHTS = {
  mcp: 0.35,
  skills: 0.30,
  context: 0.20,
  patterns: 0.15
};

/**
 * Calculate MCP optimization score
 */
async function calculateMcpScore(
  machineId: string
): Promise<{ score: number; available: number; recommended: number; applied: number }> {
  const recommendations = await prisma.recommendation.findMany({
    where: {
      machineId,
      type: 'mcp_server'
    }
  });

  const active = recommendations.filter(r => r.status === 'active');
  const applied = recommendations.filter(r => r.status === 'applied');
  const total = active.length + applied.length;

  if (total === 0) {
    // No recommendations = fully optimized or not enough data
    return { score: 100, available: 0, recommended: 0, applied: 0 };
  }

  // Score based on ratio of applied to total recommendations
  const score = Math.round((applied.length / total) * 100);

  return {
    score,
    available: total,
    recommended: active.length,
    applied: applied.length
  };
}

/**
 * Calculate skill utilization score
 */
async function calculateSkillScore(
  machineId: string
): Promise<{ score: number; available: number; recommended: number; applied: number }> {
  const recommendations = await prisma.recommendation.findMany({
    where: {
      machineId,
      type: 'skill'
    }
  });

  const active = recommendations.filter(r => r.status === 'active');
  const applied = recommendations.filter(r => r.status === 'applied');
  const total = active.length + applied.length;

  if (total === 0) {
    return { score: 100, available: 0, recommended: 0, applied: 0 };
  }

  const score = Math.round((applied.length / total) * 100);

  return {
    score,
    available: total,
    recommended: active.length,
    applied: applied.length
  };
}

/**
 * Calculate context efficiency score
 */
async function calculateContextScore(
  machineId: string,
  daysBack: number
): Promise<{ score: number; avgTokensPerSession: number; startupTokens: number }> {
  const analysis = await analyzeCrossProject(machineId, daysBack);

  if (analysis.sessionCount === 0) {
    return { score: 100, avgTokensPerSession: 0, startupTokens: 0 };
  }

  const avgTokensPerSession = analysis.avgTokensPerSession;
  const avgStartupTokens = analysis.tokenBreakdown.startup / analysis.sessionCount;

  // Scoring based on token efficiency
  // Lower tokens = better score
  // Baseline: 50k tokens per session is average, below 30k is excellent
  let score: number;

  if (avgTokensPerSession <= 20000) {
    score = 100;
  } else if (avgTokensPerSession <= 30000) {
    score = 90;
  } else if (avgTokensPerSession <= 50000) {
    score = 75;
  } else if (avgTokensPerSession <= 75000) {
    score = 60;
  } else if (avgTokensPerSession <= 100000) {
    score = 45;
  } else {
    score = 30;
  }

  // Penalty for high startup tokens (indicates large CLAUDE.md or context)
  // High startup tokens suggest context could be optimized
  if (avgStartupTokens > 10000) {
    score = Math.max(score - 10, 0);
  } else if (avgStartupTokens > 5000) {
    score = Math.max(score - 5, 0);
  }

  return {
    score,
    avgTokensPerSession: Math.round(avgTokensPerSession),
    startupTokens: Math.round(avgStartupTokens)
  };
}

/**
 * Calculate pattern optimization score
 */
async function calculatePatternScore(
  machineId: string,
  daysBack: number
): Promise<{ score: number; detected: number; optimized: number }> {
  const patterns = await prisma.usagePattern.findMany({
    where: { machineId }
  });

  const recommendations = await prisma.recommendation.findMany({
    where: { machineId }
  });

  if (patterns.length === 0) {
    return { score: 100, detected: 0, optimized: 0 };
  }

  // High confidence patterns that have corresponding applied recommendations
  const highConfidencePatterns = patterns.filter(p => p.confidence >= 0.7);

  // Check which patterns have applied recommendations
  const appliedRecs = recommendations.filter(r => r.status === 'applied');
  const appliedPatternTypes = new Set<string>();

  for (const rec of appliedRecs) {
    try {
      const patterns = JSON.parse(rec.detectedPatterns) as string[];
      patterns.forEach(p => appliedPatternTypes.add(p));
    } catch {
      // Ignore parse errors
    }
  }

  const optimizedPatterns = highConfidencePatterns.filter(p =>
    appliedPatternTypes.has(p.patternType)
  );

  const score = highConfidencePatterns.length === 0
    ? 100
    : Math.round((optimizedPatterns.length / highConfidencePatterns.length) * 100);

  return {
    score,
    detected: highConfidencePatterns.length,
    optimized: optimizedPatterns.length
  };
}

/**
 * Get recommendations summary
 */
async function getRecommendationsSummary(
  machineId: string
): Promise<RecommendationsSummary> {
  const recommendations = await prisma.recommendation.findMany({
    where: {
      machineId,
      status: 'active'
    },
    orderBy: { dailySavings: 'desc' }
  });

  const summary: RecommendationsSummary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byType: {
      mcp_server: 0,
      skill: 0
    },
    topRecommendation: null
  };

  for (const rec of recommendations) {
    // Count by priority
    switch (rec.priority) {
      case 'critical':
        summary.critical++;
        break;
      case 'high':
        summary.high++;
        break;
      case 'medium':
        summary.medium++;
        break;
      case 'low':
        summary.low++;
        break;
    }

    // Count by type
    if (rec.type === 'mcp_server') {
      summary.byType.mcp_server++;
    } else if (rec.type === 'skill') {
      summary.byType.skill++;
    }
  }

  // Get top recommendation
  if (recommendations.length > 0) {
    const top = recommendations[0];
    summary.topRecommendation = {
      title: top.title,
      savings: top.dailySavings
    };
  }

  return summary;
}

/**
 * Calculate complete health score for a machine
 *
 * @param machineId - Machine ID to calculate score for
 * @param daysBack - Number of days of data to analyze (default: 30)
 * @param saveToDatabase - Whether to persist the score (default: true)
 * @returns Complete health score result
 */
export async function calculateHealthScore(
  machineId: string,
  daysBack: number = 30,
  saveToDatabase: boolean = true
): Promise<HealthScoreResult> {
  // Calculate all category scores in parallel
  const [mcpResult, skillResult, contextResult, patternResult] = await Promise.all([
    calculateMcpScore(machineId),
    calculateSkillScore(machineId),
    calculateContextScore(machineId, daysBack),
    calculatePatternScore(machineId, daysBack)
  ]);

  // Calculate weighted total score
  const totalScore = Math.round(
    mcpResult.score * CATEGORY_WEIGHTS.mcp +
    skillResult.score * CATEGORY_WEIGHTS.skills +
    contextResult.score * CATEGORY_WEIGHTS.context +
    patternResult.score * CATEGORY_WEIGHTS.patterns
  );

  // Get recommendations data
  const recommendations = await prisma.recommendation.findMany({
    where: { machineId }
  });

  const activeRecs = recommendations.filter(r => r.status === 'active');
  const appliedRecs = recommendations.filter(r => r.status === 'applied');

  const estimatedDailyWaste = activeRecs.reduce(
    (sum, r) => sum + r.dailySavings,
    0
  );

  const estimatedDailySavings = appliedRecs.reduce(
    (sum, r) => sum + r.dailySavings,
    0
  );

  // Get previous score for trend
  const previousHealth = await prisma.healthScore.findFirst({
    where: { machineId },
    orderBy: { timestamp: 'desc' }
  });

  const previousScore = previousHealth?.totalScore || null;

  // Calculate trend
  let trend: 'improving' | 'stable' | 'declining';
  if (previousScore === null) {
    trend = 'stable';
  } else if (totalScore > previousScore + 5) {
    trend = 'improving';
  } else if (totalScore < previousScore - 5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // Get recommendations summary
  const recommendationsSummary = await getRecommendationsSummary(machineId);

  // Build breakdown
  const breakdown: HealthBreakdown = {
    mcp: {
      score: mcpResult.score,
      available: mcpResult.available,
      recommended: mcpResult.recommended,
      applied: mcpResult.applied,
      details: mcpResult.recommended === 0
        ? 'All MCP servers optimized'
        : `${mcpResult.recommended} MCP server${mcpResult.recommended === 1 ? '' : 's'} recommended`
    },
    skills: {
      score: skillResult.score,
      available: skillResult.available,
      recommended: skillResult.recommended,
      applied: skillResult.applied,
      details: skillResult.recommended === 0
        ? 'All skills optimized'
        : `${skillResult.recommended} skill${skillResult.recommended === 1 ? '' : 's'} recommended`
    },
    context: {
      score: contextResult.score,
      avgTokensPerSession: contextResult.avgTokensPerSession,
      startupTokens: contextResult.startupTokens,
      details: contextResult.score >= 75
        ? 'Context usage is efficient'
        : contextResult.score >= 50
          ? 'Context could be more efficient'
          : 'High context usage detected'
    },
    patterns: {
      score: patternResult.score,
      detected: patternResult.detected,
      optimized: patternResult.optimized,
      details: patternResult.detected === 0
        ? 'No patterns detected yet'
        : `${patternResult.optimized}/${patternResult.detected} patterns optimized`
    }
  };

  // Save to database if requested
  if (saveToDatabase) {
    await prisma.healthScore.create({
      data: {
        machineId,
        totalScore,
        mcpScore: mcpResult.score,
        skillScore: skillResult.score,
        contextScore: contextResult.score,
        patternScore: patternResult.score,
        activeRecommendations: activeRecs.length,
        appliedRecommendations: appliedRecs.length,
        estimatedDailyWaste,
        estimatedDailySavings,
        previousScore,
        trend
      }
    });
  }

  return {
    totalScore,
    mcpScore: mcpResult.score,
    skillScore: skillResult.score,
    contextScore: contextResult.score,
    patternScore: patternResult.score,
    activeRecommendations: activeRecs.length,
    appliedRecommendations: appliedRecs.length,
    estimatedDailyWaste,
    estimatedDailySavings,
    previousScore,
    trend,
    breakdown,
    recommendationsSummary
  };
}

/**
 * Get health score history for a machine
 */
export async function getHealthScoreHistory(
  machineId: string,
  limit: number = 30
) {
  return prisma.healthScore.findMany({
    where: { machineId },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
}

/**
 * Get the latest health score for a machine
 */
export async function getLatestHealthScore(
  machineId: string
) {
  return prisma.healthScore.findFirst({
    where: { machineId },
    orderBy: { timestamp: 'desc' }
  });
}

/**
 * Calculate health score trend over time
 */
export async function getHealthScoreTrend(
  machineId: string,
  daysBack: number = 30
): Promise<Array<{ date: string; score: number; trend: string }>> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const scores = await prisma.healthScore.findMany({
    where: {
      machineId,
      timestamp: { gte: cutoffDate }
    },
    orderBy: { timestamp: 'asc' }
  });

  return scores.map(s => ({
    date: s.timestamp.toISOString().split('T')[0],
    score: s.totalScore,
    trend: s.trend
  }));
}

/**
 * Get improvement suggestions based on health score
 */
export function getImprovementSuggestions(
  healthScore: HealthScoreResult
): string[] {
  const suggestions: string[] = [];

  // MCP suggestions
  if (healthScore.mcpScore < 50) {
    suggestions.push(`Apply ${healthScore.breakdown.mcp.recommended} recommended MCP servers to improve database and service access`);
  } else if (healthScore.mcpScore < 80) {
    suggestions.push('Consider enabling remaining MCP server recommendations');
  }

  // Skill suggestions
  if (healthScore.skillScore < 50) {
    suggestions.push(`Create ${healthScore.breakdown.skills.recommended} recommended skills to automate repetitive workflows`);
  } else if (healthScore.skillScore < 80) {
    suggestions.push('Additional skills could streamline your workflow');
  }

  // Context suggestions
  if (healthScore.contextScore < 50) {
    suggestions.push('Consider splitting large CLAUDE.md files into focused contexts');
  } else if (healthScore.contextScore < 75) {
    suggestions.push('Review context files for optimization opportunities');
  }

  // Pattern suggestions
  if (healthScore.patternScore < 50) {
    suggestions.push('Several detected patterns could be optimized with skills or MCP servers');
  }

  // Priority suggestions
  if (healthScore.recommendationsSummary.critical > 0) {
    suggestions.push(`${healthScore.recommendationsSummary.critical} critical recommendation(s) available with high impact`);
  }

  if (suggestions.length === 0 && healthScore.totalScore >= 90) {
    suggestions.push('Excellent optimization! Keep monitoring for new opportunities.');
  }

  return suggestions;
}
