import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/recommendations
 * List recommendations with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const machineId = searchParams.get('machineId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const configType = searchParams.get('configType');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (machineId) {
      where.machineId = machineId;
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (priority) {
      where.priority = priority;
    }

    if (configType) {
      where.configType = configType;
    }

    // Fetch recommendations
    const recommendations = await prisma.recommendation.findMany({
      where,
      orderBy: [
        { priority: 'asc' }, // critical first
        { confidenceScore: 'desc' },
        { createdAt: 'desc' }
      ],
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

    // Parse JSON fields and transform priority order for sorting
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const transformed = recommendations
      .map(rec => ({
        ...rec,
        evidence: JSON.parse(rec.evidence),
        configData: JSON.parse(rec.configData)
      }))
      .sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
                            (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidenceScore - a.confidenceScore;
      });

    // Calculate stats
    const stats = {
      total: recommendations.length,
      byStatus: {
        active: recommendations.filter(r => r.status === 'active').length,
        applied: recommendations.filter(r => r.status === 'applied').length,
        dismissed: recommendations.filter(r => r.status === 'dismissed').length,
        expired: recommendations.filter(r => r.status === 'expired').length
      },
      byPriority: {
        critical: recommendations.filter(r => r.priority === 'critical').length,
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length
      },
      byCategory: {
        mcp_server: recommendations.filter(r => r.category === 'mcp_server').length,
        skill: recommendations.filter(r => r.category === 'skill').length,
        hook: recommendations.filter(r => r.category === 'hook').length,
        permission: recommendations.filter(r => r.category === 'permission').length,
        context: recommendations.filter(r => r.category === 'context').length,
        workflow: recommendations.filter(r => r.category === 'workflow').length
      },
      totalMonthlySavings: recommendations
        .filter(r => r.status === 'active')
        .reduce((sum, r) => sum + r.estimatedTokenSavings, 0)
    };

    return NextResponse.json({
      recommendations: transformed,
      stats
    });
  } catch (error) {
    console.error('[GET /api/recommendations]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
