/**
 * Health Score Module for CCM v3.0
 *
 * This module provides the main entry point for health score calculation
 * and tracking. The health score measures how well optimized a machine's
 * Claude Code configuration is.
 */

// Re-export all types and functions from calculator
export type {
  HealthScoreResult,
  HealthBreakdown,
  RecommendationsSummary
} from './calculator';

export {
  calculateHealthScore,
  getHealthScoreHistory,
  getLatestHealthScore,
  getHealthScoreTrend,
  getImprovementSuggestions,
  // v3.1: CLAUDE.md optimization
  getClaudeMdOptimizationScore
} from './calculator';

import { prisma } from '@/lib/db';
import {
  calculateHealthScore,
  getLatestHealthScore,
  type HealthScoreResult
} from './calculator';

/**
 * Quick health check result (lighter weight than full calculation)
 */
export interface QuickHealthCheck {
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  activeIssues: number;
  potentialSavings: number;
  lastUpdated: Date | null;
  needsRecalculation: boolean;
}

/**
 * Get a quick health check without full recalculation
 *
 * This is useful for dashboard displays where you want
 * to show the score without the overhead of full calculation.
 */
export async function getQuickHealthCheck(
  machineId: string
): Promise<QuickHealthCheck> {
  const latest = await getLatestHealthScore(machineId);

  if (!latest) {
    // No health score exists, calculate it
    const calculated = await calculateHealthScore(machineId);
    return {
      score: calculated.totalScore,
      trend: calculated.trend,
      activeIssues: calculated.activeRecommendations,
      potentialSavings: calculated.estimatedDailyWaste,
      lastUpdated: new Date(),
      needsRecalculation: false
    };
  }

  // Check if score is stale (older than 24 hours)
  const hoursSinceUpdate =
    (Date.now() - latest.timestamp.getTime()) / (1000 * 60 * 60);
  const needsRecalculation = hoursSinceUpdate > 24;

  return {
    score: latest.totalScore,
    trend: latest.trend as 'improving' | 'stable' | 'declining',
    activeIssues: latest.activeRecommendations,
    potentialSavings: latest.estimatedDailyWaste,
    lastUpdated: latest.timestamp,
    needsRecalculation
  };
}

/**
 * Refresh health score if stale
 *
 * Only recalculates if the score is older than the specified
 * number of hours.
 */
export async function refreshHealthScoreIfStale(
  machineId: string,
  maxAgeHours: number = 24
): Promise<HealthScoreResult> {
  const latest = await getLatestHealthScore(machineId);

  if (latest) {
    const hoursSinceUpdate =
      (Date.now() - latest.timestamp.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate < maxAgeHours) {
      // Score is still fresh, return existing data
      // Convert database record to HealthScoreResult format
      return {
        totalScore: latest.totalScore,
        mcpScore: latest.mcpScore,
        skillScore: latest.skillScore,
        contextScore: latest.contextScore,
        patternScore: latest.patternScore,
        activeRecommendations: latest.activeRecommendations,
        appliedRecommendations: latest.appliedRecommendations,
        estimatedDailyWaste: latest.estimatedDailyWaste,
        estimatedDailySavings: latest.estimatedDailySavings,
        previousScore: latest.previousScore,
        trend: latest.trend as 'improving' | 'stable' | 'declining',
        breakdown: {
          mcp: {
            score: latest.mcpScore,
            available: 0,
            recommended: 0,
            applied: 0,
            details: ''
          },
          skills: {
            score: latest.skillScore,
            available: 0,
            recommended: 0,
            applied: 0,
            details: ''
          },
          context: {
            score: latest.contextScore,
            avgTokensPerSession: 0,
            startupTokens: 0,
            details: ''
          },
          patterns: {
            score: latest.patternScore,
            detected: 0,
            optimized: 0,
            details: ''
          }
        },
        recommendationsSummary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          byType: { mcp_server: 0, skill: 0 },
          topRecommendation: null
        }
      };
    }
  }

  // Score is stale or doesn't exist, recalculate
  return calculateHealthScore(machineId);
}

/**
 * Get health score comparison between two machines
 */
export async function compareHealthScores(
  machineId1: string,
  machineId2: string
): Promise<{
  machine1: HealthScoreResult;
  machine2: HealthScoreResult;
  comparison: {
    totalDiff: number;
    mcpDiff: number;
    skillDiff: number;
    contextDiff: number;
    patternDiff: number;
    winner: 'machine1' | 'machine2' | 'tie';
  };
}> {
  const [score1, score2] = await Promise.all([
    calculateHealthScore(machineId1, 30, false),
    calculateHealthScore(machineId2, 30, false)
  ]);

  return {
    machine1: score1,
    machine2: score2,
    comparison: {
      totalDiff: score1.totalScore - score2.totalScore,
      mcpDiff: score1.mcpScore - score2.mcpScore,
      skillDiff: score1.skillScore - score2.skillScore,
      contextDiff: score1.contextScore - score2.contextScore,
      patternDiff: score1.patternScore - score2.patternScore,
      winner:
        score1.totalScore > score2.totalScore
          ? 'machine1'
          : score2.totalScore > score1.totalScore
            ? 'machine2'
            : 'tie'
    }
  };
}

/**
 * Get aggregate health stats across all machines
 */
export async function getAggregateHealthStats(): Promise<{
  machineCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalActiveIssues: number;
  totalPotentialSavings: number;
  scoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    fair: number; // 50-69
    needsWork: number; // 0-49
  };
}> {
  // Get latest score for each machine
  const machines = await prisma.machine.findMany({
    select: { id: true }
  });

  if (machines.length === 0) {
    return {
      machineCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalActiveIssues: 0,
      totalPotentialSavings: 0,
      scoreDistribution: { excellent: 0, good: 0, fair: 0, needsWork: 0 }
    };
  }

  const latestScores = await Promise.all(
    machines.map(m => getLatestHealthScore(m.id))
  );

  const validScores = latestScores.filter(Boolean);

  if (validScores.length === 0) {
    return {
      machineCount: machines.length,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalActiveIssues: 0,
      totalPotentialSavings: 0,
      scoreDistribution: { excellent: 0, good: 0, fair: 0, needsWork: 0 }
    };
  }

  const scores = validScores.map(s => s!.totalScore);
  const distribution = { excellent: 0, good: 0, fair: 0, needsWork: 0 };

  for (const score of scores) {
    if (score >= 90) distribution.excellent++;
    else if (score >= 70) distribution.good++;
    else if (score >= 50) distribution.fair++;
    else distribution.needsWork++;
  }

  return {
    machineCount: machines.length,
    averageScore: Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    ),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    totalActiveIssues: validScores.reduce(
      (sum, s) => sum + (s?.activeRecommendations || 0),
      0
    ),
    totalPotentialSavings: validScores.reduce(
      (sum, s) => sum + (s?.estimatedDailyWaste || 0),
      0
    ),
    scoreDistribution: distribution
  };
}

/**
 * Delete old health score records
 *
 * Keeps only the specified number of most recent records per machine.
 */
export async function cleanupHealthScoreHistory(
  machineId: string,
  keepCount: number = 90
): Promise<number> {
  // Get IDs of scores to keep
  const toKeep = await prisma.healthScore.findMany({
    where: { machineId },
    orderBy: { timestamp: 'desc' },
    take: keepCount,
    select: { id: true }
  });

  const keepIds = toKeep.map(s => s.id);

  // Delete all other scores
  const result = await prisma.healthScore.deleteMany({
    where: {
      machineId,
      id: { notIn: keepIds }
    }
  });

  return result.count;
}

/**
 * Get health score grade (A, B, C, D, F)
 */
export function getHealthGrade(score: number): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
} {
  if (score >= 90) {
    return { grade: 'A', label: 'Excellent', color: 'green' };
  } else if (score >= 80) {
    return { grade: 'B', label: 'Good', color: 'blue' };
  } else if (score >= 70) {
    return { grade: 'C', label: 'Fair', color: 'yellow' };
  } else if (score >= 60) {
    return { grade: 'D', label: 'Needs Work', color: 'orange' };
  } else {
    return { grade: 'F', label: 'Critical', color: 'red' };
  }
}
