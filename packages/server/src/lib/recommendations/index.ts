/**
 * Smart Recommendations System for CCM v3.0
 *
 * This module provides the main entry point for the recommendation engine,
 * combining pattern detection, cross-project analysis, and recommendation
 * generation for MCP servers and skills.
 */

import { prisma } from '@/lib/db';
import { generateMcpRecommendations, type RecommendationInput } from './mcp-recommender';
import { generateSkillRecommendations } from './skill-recommender';
import { analyzeCrossProject, type CrossProjectAnalysis } from './cross-project-analyzer';
import { detectPatterns, type DetectedPattern } from './pattern-detector';

// Re-export types and functions
export type { DetectedPattern } from './pattern-detector';
export type { CrossProjectAnalysis, TechnologySummary, ProjectAnalysis } from './cross-project-analyzer';
export type { RecommendationInput } from './mcp-recommender';

export {
  detectPatterns,
  detectSessionPatterns,
  getPatternDefinition,
  getAllPatternTypes,
  calculatePatternConfidence
} from './pattern-detector';

export {
  analyzeCrossProject,
  getTechnologySummary,
  getProjectAnalyses,
  getProjectsByPattern,
  getProjectsByTechnology,
  getTokenUsageTrend
} from './cross-project-analyzer';

export {
  generateMcpRecommendations,
  getMcpServerDefinition,
  getAllMcpServerDefinitions,
  shouldRecommendMcpServer
} from './mcp-recommender';

export {
  generateSkillRecommendations,
  getSkillDefinition,
  getAllSkillDefinitions,
  generateSkillContent,
  shouldRecommendSkill
} from './skill-recommender';

/**
 * Result of full recommendation generation
 */
export interface GenerateRecommendationsResult {
  /** All generated recommendations */
  recommendations: RecommendationInput[];
  /** MCP server recommendations */
  mcpRecommendations: RecommendationInput[];
  /** Skill recommendations */
  skillRecommendations: RecommendationInput[];
  /** Cross-project analysis used for generation */
  analysis: CrossProjectAnalysis;
  /** Number of recommendations saved to database */
  savedCount: number;
  /** Timestamp of generation */
  generatedAt: Date;
}

/**
 * Generate all recommendations for a machine
 *
 * This is the main entry point for recommendation generation.
 * It combines MCP server and skill recommendations, calculates savings,
 * and persists results to the database.
 *
 * @param machineId - Machine ID to generate recommendations for
 * @param daysBack - Number of days to analyze (default: 30)
 * @param saveToDatabase - Whether to save recommendations to database (default: true)
 * @returns Full recommendation generation result
 */
export async function generateAllRecommendations(
  machineId: string,
  daysBack: number = 30,
  saveToDatabase: boolean = true
): Promise<GenerateRecommendationsResult> {
  // Get cross-project analysis
  const analysis = await analyzeCrossProject(machineId, daysBack);

  // Generate both types of recommendations in parallel
  const [mcpRecs, skillRecs] = await Promise.all([
    generateMcpRecommendations(machineId, daysBack),
    generateSkillRecommendations(machineId, daysBack)
  ]);

  const allRecs = [...mcpRecs, ...skillRecs];

  // Sort by priority and then by token savings
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allRecs.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (b.tokenSavings || 0) - (a.tokenSavings || 0);
  });

  let savedCount = 0;

  // Save to database if requested
  if (saveToDatabase) {
    for (const rec of allRecs) {
      try {
        // Build evidence JSON
        const evidence = {
          patterns: rec.detectedPatterns,
          occurrences: rec.occurrenceCount,
          projects: rec.projectsAffected,
          example: rec.exampleUsage
        };

        await prisma.recommendation.create({
          data: {
            machineId,
            category: rec.type,
            title: rec.title,
            description: rec.reason,
            priority: rec.priority,
            evidence: JSON.stringify(evidence),
            estimatedTokenSavings: rec.monthlySavings || rec.tokenSavings * 30,
            estimatedTimeSavings: rec.timeSavings,
            confidenceScore: rec.confidenceScore,
            configType: rec.type,
            configData: rec.configTemplate ? JSON.stringify(rec.configTemplate) : '{}',
            status: 'active'
          }
        });
        savedCount++;
      } catch (error) {
        console.error(`Failed to save recommendation ${rec.recommendedItem}:`, error);
      }
    }
  }

  return {
    recommendations: allRecs,
    mcpRecommendations: mcpRecs,
    skillRecommendations: skillRecs,
    analysis,
    savedCount,
    generatedAt: new Date()
  };
}

/**
 * Get active recommendations for a machine
 */
export async function getActiveRecommendations(
  machineId: string,
  options?: {
    category?: 'mcp_server' | 'skill';
    priority?: 'critical' | 'high' | 'medium' | 'low';
    limit?: number;
  }
) {
  const where: Record<string, unknown> = {
    machineId,
    status: 'active'
  };

  if (options?.category) {
    where.category = options.category;
  }
  if (options?.priority) {
    where.priority = options.priority;
  }

  return prisma.recommendation.findMany({
    where,
    orderBy: [
      { priority: 'asc' },
      { confidenceScore: 'desc' },
      { estimatedTokenSavings: 'desc' }
    ],
    take: options?.limit
  });
}

/**
 * Get recommendation statistics for a machine
 */
export async function getRecommendationStats(machineId: string) {
  const recommendations = await prisma.recommendation.findMany({
    where: { machineId }
  });

  const active = recommendations.filter(r => r.status === 'active');
  const applied = recommendations.filter(r => r.status === 'applied');
  const dismissed = recommendations.filter(r => r.status === 'dismissed');

  const potentialMonthlySavings = active.reduce((sum, r) => sum + r.estimatedTokenSavings, 0);
  const realizedMonthlySavings = applied.reduce((sum, r) => sum + r.estimatedTokenSavings, 0);

  const byPriority = {
    critical: active.filter(r => r.priority === 'critical').length,
    high: active.filter(r => r.priority === 'high').length,
    medium: active.filter(r => r.priority === 'medium').length,
    low: active.filter(r => r.priority === 'low').length
  };

  const byCategory: Record<string, number> = {};
  for (const rec of active) {
    byCategory[rec.category] = (byCategory[rec.category] || 0) + 1;
  }

  return {
    total: recommendations.length,
    active: active.length,
    applied: applied.length,
    dismissed: dismissed.length,
    potentialMonthlySavings,
    realizedMonthlySavings,
    byPriority,
    byCategory,
    averageConfidence: active.length > 0
      ? active.reduce((sum, r) => sum + r.confidenceScore, 0) / active.length
      : 0
  };
}

/**
 * Apply a recommendation
 */
export async function applyRecommendation(
  recommendationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!recommendation) {
      return { success: false, error: 'Recommendation not found' };
    }

    if (recommendation.status !== 'active') {
      return { success: false, error: `Recommendation is already ${recommendation.status}` };
    }

    // Mark as applied
    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'applied',
        appliedAt: new Date()
      }
    });

    // Create AppliedConfig to track the active configuration
    await prisma.appliedConfig.create({
      data: {
        machineId: recommendation.machineId,
        configType: recommendation.configType,
        configName: recommendation.title,
        configData: recommendation.configData,
        recommendationId: recommendation.id,
        source: 'recommendation',
        enabled: true
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to apply recommendation:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Dismiss a recommendation
 */
export async function dismissRecommendation(
  recommendationId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!recommendation) {
      return { success: false, error: 'Recommendation not found' };
    }

    if (recommendation.status !== 'active') {
      return { success: false, error: `Recommendation is already ${recommendation.status}` };
    }

    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissReason: reason || null
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to dismiss recommendation:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Provide feedback on an applied recommendation
 */
export async function provideRecommendationFeedback(
  recommendationId: string,
  wasUseful: boolean,
  actualSavings?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!recommendation) {
      return { success: false, error: 'Recommendation not found' };
    }

    if (recommendation.status !== 'applied') {
      return { success: false, error: 'Recommendation must be applied before providing feedback' };
    }

    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        wasHelpful: wasUseful,
        actualSavings: actualSavings || null
      }
    });

    // Update AppliedConfig with usage data if we have actual savings
    if (actualSavings !== undefined) {
      await prisma.appliedConfig.updateMany({
        where: { recommendationId },
        data: {
          tokensSaved: actualSavings,
          lastUsedAt: new Date()
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to provide feedback:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Archive old recommendations that are no longer relevant
 */
export async function archiveStaleRecommendations(
  machineId: string,
  daysStale: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysStale);

  const result = await prisma.recommendation.updateMany({
    where: {
      machineId,
      status: 'active',
      updatedAt: { lt: cutoffDate }
    },
    data: {
      status: 'expired'
    }
  });

  return result.count;
}

/**
 * Refresh recommendations by regenerating them
 */
export async function refreshRecommendations(
  machineId: string,
  daysBack: number = 30
): Promise<GenerateRecommendationsResult> {
  // Archive stale active recommendations first
  await archiveStaleRecommendations(machineId, 90);

  // Generate fresh recommendations
  return generateAllRecommendations(machineId, daysBack, true);
}
