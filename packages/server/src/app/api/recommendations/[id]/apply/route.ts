import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/recommendations/[id]/apply
 * Apply a recommendation - marks it as applied and tracks impact
 *
 * For MCP servers: stores config that CLI will sync to .mcp.json
 * For skills: stores skill template that CLI will create
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        machine: true
      }
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    if (recommendation.status === 'applied') {
      return NextResponse.json(
        { error: 'Recommendation already applied' },
        { status: 400 }
      );
    }

    if (recommendation.status === 'dismissed') {
      return NextResponse.json(
        { error: 'Cannot apply dismissed recommendation' },
        { status: 400 }
      );
    }

    // Mark recommendation as applied
    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: 'applied',
        appliedAt: new Date()
      }
    });

    // Create impact metric to track before/after savings
    // Get baseline from recent session data before applying
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = await prisma.sessionActivity.findMany({
      where: {
        machineId: recommendation.machineId,
        timestamp: { gte: thirtyDaysAgo }
      },
      select: {
        totalTokens: true
      }
    });

    const avgTokensPerSession = recentSessions.length > 0
      ? Math.round(recentSessions.reduce((sum, s) => sum + s.totalTokens, 0) / recentSessions.length)
      : 0;

    await prisma.impactMetric.create({
      data: {
        machineId: recommendation.machineId,
        recommendationId: recommendation.id,
        metricType: 'token_savings',
        beforeValue: avgTokensPerSession,
        afterValue: 0, // Will be calculated after 7+ days
        improvement: 0, // Will be calculated later
        measurementStart: new Date(),
        measurementEnd: new Date() // Will be updated when measured
      }
    });

    // Update technology usage if applicable
    const configTemplate = recommendation.configTemplate
      ? JSON.parse(recommendation.configTemplate)
      : null;

    // If this is an MCP server recommendation, link it to technology usage
    if (recommendation.type === 'mcp_server') {
      const detectedPatterns = JSON.parse(recommendation.detectedPatterns) as string[];

      // Find related technology
      for (const pattern of detectedPatterns) {
        const tech = patternToTechnology(pattern);
        if (tech) {
          await prisma.technologyUsage.updateMany({
            where: {
              machineId: recommendation.machineId,
              technology: tech
            },
            data: {
              hasRecommendation: true,
              recommendationId: recommendation.id
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      recommendation: {
        id: updated.id,
        status: updated.status,
        appliedAt: updated.appliedAt,
        type: updated.type,
        recommendedItem: updated.recommendedItem
      },
      configTemplate,
      nextSteps: recommendation.type === 'mcp_server'
        ? 'Run "ccm sync" to sync the MCP server configuration to your machine.'
        : 'Run "ccm sync" to create the skill on your machine.',
      estimatedSavings: {
        daily: recommendation.dailySavings,
        monthly: recommendation.monthlySavings
      }
    });
  } catch (error) {
    console.error('[POST /api/recommendations/[id]/apply]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Map pattern types to technologies
 */
function patternToTechnology(pattern: string): string | null {
  const mapping: Record<string, string> = {
    'ssh_database_query': 'postgresql',
    'git_workflow': 'git',
    'n8n_workflow_management': 'n8n',
    'docker_management': 'docker',
    'service_health_check': 'monitoring',
    'frequent_file_search': 'search'
  };

  return mapping[pattern] || null;
}
