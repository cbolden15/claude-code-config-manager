import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/context/archives
 * List archives for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const machineId = searchParams.get('machineId');
    const projectPath = searchParams.get('projectPath');

    // Build where clause
    const where: any = {};

    if (machineId) {
      where.machineId = machineId;
    }

    if (projectPath) {
      where.projectPath = projectPath;
    }

    const archives = await prisma.contextArchive.findMany({
      where,
      orderBy: {
        archivedAt: 'desc'
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

    // Calculate stats
    const stats = {
      total: archives.length,
      totalLinesArchived: archives.reduce((sum, a) => sum + a.originalLines, 0),
      totalTokensArchived: archives.reduce((sum, a) => sum + a.originalTokens, 0),
      byReason: {
        completed_work: archives.filter(a => a.archiveReason === 'completed_work').length,
        outdated: archives.filter(a => a.archiveReason === 'outdated').length,
        verbose: archives.filter(a => a.archiveReason === 'verbose').length,
        duplicate: archives.filter(a => a.archiveReason === 'duplicate').length
      }
    };

    return NextResponse.json({
      archives: archives.map(archive => ({
        ...archive,
        // Truncate content for list view
        archivedContent: archive.archivedContent.length > 500
          ? archive.archivedContent.substring(0, 500) + '...'
          : archive.archivedContent,
        summaryContent: archive.summaryContent
      })),
      stats
    });
  } catch (error) {
    console.error('[GET /api/context/archives]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
