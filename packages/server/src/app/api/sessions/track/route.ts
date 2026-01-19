import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/**
 * POST /api/sessions/track
 * Track a Claude Code session activity
 * Called by CLI at session end to record usage data
 */

const SessionTrackSchema = z.object({
  machineId: z.string().min(1),
  sessionId: z.string().min(1),
  projectPath: z.string().optional(),
  projectName: z.string().optional(),
  duration: z.number().int().min(0).optional(),
  toolsUsed: z.array(z.string()).default([]),
  commandsRun: z.array(z.string()).default([]),
  filesAccessed: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  tokensUsed: z.number().int().min(0).default(0),
  contextTokens: z.number().int().min(0).default(0),
  detectedTechs: z.array(z.string()).default([]),
  detectedPatterns: z.array(z.string()).default([]),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SessionTrackSchema.parse(body);

    // Verify machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: validated.machineId }
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const startedAt = validated.startedAt ? new Date(validated.startedAt) : now;
    const endedAt = validated.endedAt ? new Date(validated.endedAt) : now;

    // Save session
    const session = await prisma.session.create({
      data: {
        machineId: validated.machineId,
        sessionId: validated.sessionId,
        projectPath: validated.projectPath,
        projectName: validated.projectName,
        startedAt,
        endedAt,
        duration: validated.duration,
        toolsUsed: JSON.stringify(validated.toolsUsed),
        commandsRun: JSON.stringify(validated.commandsRun),
        filesAccessed: JSON.stringify(validated.filesAccessed),
        errors: JSON.stringify(validated.errors),
        tokensUsed: validated.tokensUsed,
        contextTokens: validated.contextTokens,
        detectedTechs: JSON.stringify(validated.detectedTechs),
        detectedPatterns: JSON.stringify(validated.detectedPatterns)
      }
    });

    // Update or create patterns
    for (const patternType of validated.detectedPatterns) {
      await prisma.pattern.upsert({
        where: {
          machineId_type: {
            machineId: validated.machineId,
            type: patternType
          }
        },
        update: {
          occurrences: { increment: 1 },
          lastSeen: endedAt,
          // Update project paths if new project
          ...(validated.projectPath && {
            projectPaths: await updateProjectPaths(
              validated.machineId,
              patternType,
              validated.projectPath
            )
          })
        },
        create: {
          machineId: validated.machineId,
          type: patternType,
          occurrences: 1,
          lastSeen: endedAt,
          firstSeen: startedAt,
          avgPerWeek: 0,
          projectPaths: JSON.stringify(validated.projectPath ? [validated.projectPath] : []),
          technologies: JSON.stringify(validated.detectedTechs),
          confidence: 1.0
        }
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      patternsTracked: validated.detectedPatterns.length,
      technologiesDetected: validated.detectedTechs.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/sessions/track]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper to update project paths in pattern
 * Adds new projectPath if not already present
 */
async function updateProjectPaths(
  machineId: string,
  type: string,
  newProjectPath: string
): Promise<string> {
  const existing = await prisma.pattern.findUnique({
    where: {
      machineId_type: { machineId, type }
    },
    select: { projectPaths: true }
  });

  if (!existing) {
    return JSON.stringify([newProjectPath]);
  }

  const projectPaths: string[] = JSON.parse(existing.projectPaths);
  if (!projectPaths.includes(newProjectPath)) {
    projectPaths.push(newProjectPath);
  }

  return JSON.stringify(projectPaths);
}
