import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/recommendations/[id]/apply
 * Apply a recommendation - marks it as applied and creates AppliedConfig
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

    // Parse config data
    const configData = recommendation.configData
      ? JSON.parse(recommendation.configData)
      : {};

    // Create AppliedConfig to track the active configuration
    const appliedConfig = await prisma.appliedConfig.create({
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

    return NextResponse.json({
      success: true,
      recommendation: {
        id: updated.id,
        status: updated.status,
        appliedAt: updated.appliedAt,
        category: updated.category,
        title: updated.title
      },
      appliedConfig: {
        id: appliedConfig.id,
        configType: appliedConfig.configType,
        configName: appliedConfig.configName
      },
      configData,
      nextSteps: getNextSteps(recommendation.category),
      estimatedSavings: {
        tokensSaved: recommendation.estimatedTokenSavings,
        timeSaved: recommendation.estimatedTimeSavings
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
 * Get next steps based on recommendation category
 */
function getNextSteps(category: string): string {
  switch (category) {
    case 'mcp_server':
      return 'The MCP server configuration has been saved. Add it to your .mcp.json to enable.';
    case 'skill':
      return 'The skill template has been saved. Create the skill file in .claude/skills/.';
    case 'hook':
      return 'The hook configuration has been saved. Add it to your settings.json.';
    case 'context':
      return 'Run "ccm context optimize" to apply the context optimization.';
    default:
      return 'Configuration has been saved and is ready to use.';
  }
}
