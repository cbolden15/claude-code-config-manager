import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/context/archives/restore
 * Restore content from archive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { archiveId } = body;

    if (!archiveId) {
      return NextResponse.json(
        { error: 'archiveId is required' },
        { status: 400 }
      );
    }

    const archive = await prisma.contextArchive.findUnique({
      where: { id: archiveId },
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

    if (!archive) {
      return NextResponse.json(
        { error: 'Archive not found' },
        { status: 404 }
      );
    }

    // TODO: Call @/lib/context/archiver.ts (Terminal 2 will implement)
    // The actual restoration would:
    // 1. Read current CLAUDE.md
    // 2. Find the summary placeholder
    // 3. Replace with original archived content
    // 4. Delete the archive record

    // For now, return the content that would be restored
    return NextResponse.json({
      archive: {
        id: archive.id,
        sourceFile: archive.sourceFile,
        sectionName: archive.sectionName,
        archiveReason: archive.archiveReason,
        archivedAt: archive.archivedAt
      },
      restoreContent: {
        originalContent: archive.archivedContent,
        originalLines: archive.originalLines,
        originalTokens: archive.originalTokens,
        currentSummary: archive.summaryContent,
        summaryLines: archive.summaryLines
      },
      instructions: {
        message: 'Archive content ready for restoration.',
        note: 'Full restoration requires CLI or Terminal 2 implementation.',
        targetFile: archive.sourceFile,
        projectPath: archive.projectPath
      }
    });
  } catch (error) {
    console.error('[POST /api/context/archives/restore]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
