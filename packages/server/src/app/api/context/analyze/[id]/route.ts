import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/context/analyze/[id]
 * Get specific analysis with full details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const analysis = await prisma.contextAnalysis.findUnique({
      where: { id },
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

    return NextResponse.json({
      analysis: {
        ...analysis,
        sections: JSON.parse(analysis.sections),
        issues: JSON.parse(analysis.issues)
      }
    });
  } catch (error) {
    console.error('[GET /api/context/analyze/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
