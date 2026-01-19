import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/context/analyze
 * Analyze a CLAUDE.md file, return sections and issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { machineId, projectPath, filePath = 'CLAUDE.md' } = body;

    if (!machineId || !projectPath) {
      return NextResponse.json(
        { error: 'machineId and projectPath are required' },
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

    // TODO: Call @/lib/context/analyzer.ts (Terminal 2 will implement)
    // For now, create placeholder analysis
    const placeholderSections = JSON.stringify([
      {
        name: 'Project Overview',
        type: 'project_overview',
        startLine: 1,
        endLine: 25,
        lineCount: 25,
        estimatedTokens: 625,
        actionability: 'high',
        staleness: 0
      }
    ]);

    const placeholderIssues = JSON.stringify([
      {
        type: 'oversized_section',
        severity: 'medium',
        section: 'Placeholder',
        description: 'Analysis pending - connect to intelligence engine',
        suggestedAction: 'Wait for Terminal 2 implementation',
        estimatedSavings: 0,
        confidence: 0.5
      }
    ]);

    // Upsert analysis record
    const analysis = await prisma.contextAnalysis.upsert({
      where: {
        machineId_projectPath_filePath: {
          machineId,
          projectPath,
          filePath
        }
      },
      update: {
        totalLines: 0,
        totalTokens: 0,
        sections: placeholderSections,
        issues: placeholderIssues,
        estimatedSavings: 0,
        optimizationScore: 50,
        status: 'analyzed',
        lastAnalyzedAt: new Date()
      },
      create: {
        machineId,
        projectPath,
        filePath,
        totalLines: 0,
        totalTokens: 0,
        sections: placeholderSections,
        issues: placeholderIssues,
        estimatedSavings: 0,
        optimizationScore: 50,
        status: 'analyzed'
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

    return NextResponse.json({
      analysis: {
        ...analysis,
        sections: JSON.parse(analysis.sections),
        issues: JSON.parse(analysis.issues)
      }
    });
  } catch (error) {
    console.error('[POST /api/context/analyze]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/context/analyze
 * Get latest analysis for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const machineId = searchParams.get('machineId');
    const projectPath = searchParams.get('projectPath');

    if (!machineId || !projectPath) {
      return NextResponse.json(
        { error: 'machineId and projectPath are required' },
        { status: 400 }
      );
    }

    const analysis = await prisma.contextAnalysis.findFirst({
      where: {
        machineId,
        projectPath
      },
      orderBy: {
        lastAnalyzedAt: 'desc'
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

    if (!analysis) {
      return NextResponse.json(
        { error: 'No analysis found for this project' },
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
    console.error('[GET /api/context/analyze]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
