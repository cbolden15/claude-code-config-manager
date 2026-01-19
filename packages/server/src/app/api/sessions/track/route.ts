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
  projectId: z.string().optional(),
  projectPath: z.string().optional(),
  sessionId: z.string().min(1),
  duration: z.number().int().min(0),
  toolsUsed: z.array(z.string()).default([]),
  commandsRun: z.array(z.string()).default([]),
  filesAccessed: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  startupTokens: z.number().int().min(0).default(0),
  totalTokens: z.number().int().min(0).default(0),
  toolTokens: z.number().int().min(0).default(0),
  contextTokens: z.number().int().min(0).default(0),
  detectedTechs: z.array(z.string()).default([]),
  detectedPatterns: z.array(z.string()).default([]),
  timestamp: z.string().datetime().optional()
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

    const timestamp = validated.timestamp ? new Date(validated.timestamp) : new Date();

    // Save session activity
    const sessionActivity = await prisma.sessionActivity.create({
      data: {
        machineId: validated.machineId,
        projectId: validated.projectId,
        sessionId: validated.sessionId,
        projectPath: validated.projectPath,
        duration: validated.duration,
        toolsUsed: JSON.stringify(validated.toolsUsed),
        commandsRun: JSON.stringify(validated.commandsRun),
        filesAccessed: JSON.stringify(validated.filesAccessed),
        errors: JSON.stringify(validated.errors),
        startupTokens: validated.startupTokens,
        totalTokens: validated.totalTokens,
        toolTokens: validated.toolTokens,
        contextTokens: validated.contextTokens,
        detectedTechs: JSON.stringify(validated.detectedTechs),
        detectedPatterns: JSON.stringify(validated.detectedPatterns),
        timestamp
      }
    });

    // Update or create usage patterns
    for (const pattern of validated.detectedPatterns) {
      await prisma.usagePattern.upsert({
        where: {
          machineId_patternType: {
            machineId: validated.machineId,
            patternType: pattern
          }
        },
        update: {
          occurrences: { increment: 1 },
          lastSeen: timestamp,
          // Update project IDs if new project
          ...(validated.projectId && {
            projectIds: await updateProjectIds(
              validated.machineId,
              pattern,
              validated.projectId
            )
          })
        },
        create: {
          machineId: validated.machineId,
          patternType: pattern,
          occurrences: 1,
          lastSeen: timestamp,
          firstSeen: timestamp,
          avgFrequency: 0,
          projectIds: JSON.stringify(validated.projectId ? [validated.projectId] : []),
          technologies: JSON.stringify(validated.detectedTechs),
          confidence: 1.0
        }
      });
    }

    // Update technology usage
    for (const tech of validated.detectedTechs) {
      await prisma.technologyUsage.upsert({
        where: {
          machineId_technology: {
            machineId: validated.machineId,
            technology: tech
          }
        },
        update: {
          sessionCount: { increment: 1 },
          lastUsed: timestamp,
          commandCount: {
            increment: validated.commandsRun.filter(cmd =>
              cmd.toLowerCase().includes(tech.toLowerCase())
            ).length
          }
        },
        create: {
          machineId: validated.machineId,
          technology: tech,
          projectCount: validated.projectId ? 1 : 0,
          sessionCount: 1,
          commandCount: validated.commandsRun.filter(cmd =>
            cmd.toLowerCase().includes(tech.toLowerCase())
          ).length,
          lastUsed: timestamp
        }
      });
    }

    return NextResponse.json({
      success: true,
      sessionActivityId: sessionActivity.id,
      patternsTracked: validated.detectedPatterns.length,
      technologiesTracked: validated.detectedTechs.length
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
 * Helper to update project IDs in usage pattern
 * Adds new projectId if not already present
 */
async function updateProjectIds(
  machineId: string,
  patternType: string,
  newProjectId: string
): Promise<string> {
  const existing = await prisma.usagePattern.findUnique({
    where: {
      machineId_patternType: { machineId, patternType }
    },
    select: { projectIds: true }
  });

  if (!existing) {
    return JSON.stringify([newProjectId]);
  }

  const projectIds: string[] = JSON.parse(existing.projectIds);
  if (!projectIds.includes(newProjectId)) {
    projectIds.push(newProjectId);
  }

  return JSON.stringify(projectIds);
}
