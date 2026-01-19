/**
 * Cross-Project Analyzer for CCM v3.0 Smart Recommendations
 *
 * Aggregates and analyzes session data across all projects to identify
 * patterns, technology usage, and optimization opportunities.
 */

import { prisma } from '@/lib/db';
import { detectPatterns, type DetectedPattern } from './pattern-detector';

/**
 * Result of cross-project analysis
 */
export interface CrossProjectAnalysis {
  /** All unique technologies detected across projects */
  technologies: string[];
  /** Detected patterns with statistics */
  patterns: DetectedPattern[];
  /** Number of unique projects analyzed */
  projectCount: number;
  /** Total number of sessions analyzed */
  sessionCount: number;
  /** Technologies by project path */
  techByProject: Record<string, string[]>;
  /** Patterns by project path */
  projectPatterns: Record<string, string[]>;
  /** Average session duration in seconds */
  avgSessionDuration: number;
  /** Total tokens used across all sessions */
  totalTokensUsed: number;
  /** Average tokens per session */
  avgTokensPerSession: number;
  /** Date range of analysis */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Token breakdown */
  tokenBreakdown: {
    context: number;
    total: number;
  };
}

/**
 * Summary of technology usage across projects
 */
export interface TechnologySummary {
  technology: string;
  projectCount: number;
  sessionCount: number;
  commandCount: number;
  lastUsed: Date | null;
  relatedPatterns: string[];
}

/**
 * Project-level analysis result
 */
export interface ProjectAnalysis {
  projectPath: string;
  projectName: string | null;
  sessionCount: number;
  technologies: string[];
  patterns: string[];
  totalTokens: number;
  avgSessionDuration: number;
  lastActivity: Date | null;
}

/**
 * Safely parse JSON array, returning empty array on error
 */
function safeParseArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Analyze session data across all projects for a given machine
 *
 * @param machineId - Machine ID to analyze
 * @param daysBack - Number of days to look back (default: 30)
 * @returns Comprehensive cross-project analysis
 */
export async function analyzeCrossProject(
  machineId: string,
  daysBack: number = 30
): Promise<CrossProjectAnalysis> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // Get all sessions from specified period
  const sessions = await prisma.session.findMany({
    where: {
      machineId,
      startedAt: { gte: cutoffDate }
    },
    orderBy: { startedAt: 'desc' }
  });

  if (sessions.length === 0) {
    return {
      technologies: [],
      patterns: [],
      projectCount: 0,
      sessionCount: 0,
      techByProject: {},
      projectPatterns: {},
      avgSessionDuration: 0,
      totalTokensUsed: 0,
      avgTokensPerSession: 0,
      dateRange: { start: cutoffDate, end: new Date() },
      tokenBreakdown: { context: 0, total: 0 }
    };
  }

  // Aggregate technologies across all projects
  const allTechs = new Set<string>();
  const techByProject = new Map<string, Set<string>>();

  for (const session of sessions) {
    const techs = safeParseArray(session.detectedTechs);
    techs.forEach(t => allTechs.add(t));

    const projectPath = session.projectPath;
    if (projectPath) {
      if (!techByProject.has(projectPath)) {
        techByProject.set(projectPath, new Set());
      }
      techs.forEach(t => techByProject.get(projectPath)!.add(t));
    }
  }

  // Detect patterns across all sessions
  const patterns = detectPatterns(sessions);

  // Aggregate patterns by project
  const projectPatterns = new Map<string, Set<string>>();
  for (const session of sessions) {
    const projectPath = session.projectPath;
    if (!projectPath) continue;

    const sessionPatterns = safeParseArray(session.detectedPatterns);
    if (!projectPatterns.has(projectPath)) {
      projectPatterns.set(projectPath, new Set());
    }
    sessionPatterns.forEach(p =>
      projectPatterns.get(projectPath)!.add(p)
    );
  }

  // Calculate statistics
  const avgSessionDuration = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
    : 0;

  const totalTokensUsed = sessions.reduce((sum, s) => sum + s.tokensUsed, 0);
  const avgTokensPerSession = sessions.length > 0
    ? totalTokensUsed / sessions.length
    : 0;

  // Token breakdown
  const tokenBreakdown = {
    context: sessions.reduce((sum, s) => sum + s.contextTokens, 0),
    total: totalTokensUsed
  };

  // Get date range
  const timestamps = sessions.map(s => s.startedAt);
  const dateRange = {
    start: new Date(Math.min(...timestamps.map(d => d.getTime()))),
    end: new Date(Math.max(...timestamps.map(d => d.getTime())))
  };

  return {
    technologies: Array.from(allTechs).sort(),
    patterns,
    projectCount: techByProject.size,
    sessionCount: sessions.length,
    techByProject: Object.fromEntries(
      Array.from(techByProject.entries()).map(([k, v]) => [k, Array.from(v).sort()])
    ),
    projectPatterns: Object.fromEntries(
      Array.from(projectPatterns.entries()).map(([k, v]) => [k, Array.from(v).sort()])
    ),
    avgSessionDuration: Math.round(avgSessionDuration),
    totalTokensUsed,
    avgTokensPerSession: Math.round(avgTokensPerSession),
    dateRange,
    tokenBreakdown
  };
}

/**
 * Get technology usage summary for a machine
 */
export async function getTechnologySummary(
  machineId: string,
  daysBack: number = 30
): Promise<TechnologySummary[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const sessions = await prisma.session.findMany({
    where: {
      machineId,
      startedAt: { gte: cutoffDate }
    }
  });

  // Aggregate technology usage
  const techStats = new Map<string, {
    projectPaths: Set<string>;
    sessionCount: number;
    commandCount: number;
    lastUsed: Date | null;
    relatedPatterns: Set<string>;
  }>();

  for (const session of sessions) {
    const techs = safeParseArray(session.detectedTechs);
    const commands = safeParseArray(session.commandsRun);
    const patterns = safeParseArray(session.detectedPatterns);

    for (const tech of techs) {
      if (!techStats.has(tech)) {
        techStats.set(tech, {
          projectPaths: new Set(),
          sessionCount: 0,
          commandCount: 0,
          lastUsed: null,
          relatedPatterns: new Set()
        });
      }

      const stats = techStats.get(tech)!;
      stats.sessionCount++;

      if (session.projectPath) {
        stats.projectPaths.add(session.projectPath);
      }

      // Count related commands
      const techCommands = commands.filter(c => c.toLowerCase().includes(tech.toLowerCase()));
      stats.commandCount += techCommands.length;

      // Track last used
      if (!stats.lastUsed || session.startedAt > stats.lastUsed) {
        stats.lastUsed = session.startedAt;
      }

      // Track related patterns
      patterns.forEach(p => stats.relatedPatterns.add(p));
    }
  }

  // Convert to summary array
  return Array.from(techStats.entries())
    .map(([technology, stats]) => ({
      technology,
      projectCount: stats.projectPaths.size,
      sessionCount: stats.sessionCount,
      commandCount: stats.commandCount,
      lastUsed: stats.lastUsed,
      relatedPatterns: Array.from(stats.relatedPatterns)
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount);
}

/**
 * Get analysis for each project
 */
export async function getProjectAnalyses(
  machineId: string,
  daysBack: number = 30
): Promise<ProjectAnalysis[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const sessions = await prisma.session.findMany({
    where: {
      machineId,
      startedAt: { gte: cutoffDate },
      projectPath: { not: null }
    }
  });

  // Group sessions by project path
  const projectSessions = new Map<string, typeof sessions>();

  for (const session of sessions) {
    if (!session.projectPath) continue;

    if (!projectSessions.has(session.projectPath)) {
      projectSessions.set(session.projectPath, []);
    }
    projectSessions.get(session.projectPath)!.push(session);
  }

  // Analyze each project
  const analyses: ProjectAnalysis[] = [];

  for (const [projectPath, projectSessionList] of projectSessions) {
    const technologies = new Set<string>();
    const patterns = new Set<string>();
    let totalTokens = 0;
    let totalDuration = 0;
    let lastActivity: Date | null = null;
    let projectName: string | null = null;

    for (const session of projectSessionList) {
      safeParseArray(session.detectedTechs).forEach(t => technologies.add(t));
      safeParseArray(session.detectedPatterns).forEach(p => patterns.add(p));
      totalTokens += session.tokensUsed;
      totalDuration += session.duration || 0;

      if (!lastActivity || session.startedAt > lastActivity) {
        lastActivity = session.startedAt;
      }

      if (session.projectName) {
        projectName = session.projectName;
      }
    }

    analyses.push({
      projectPath,
      projectName,
      sessionCount: projectSessionList.length,
      technologies: Array.from(technologies).sort(),
      patterns: Array.from(patterns).sort(),
      totalTokens,
      avgSessionDuration: Math.round(totalDuration / projectSessionList.length),
      lastActivity
    });
  }

  // Sort by session count descending
  return analyses.sort((a, b) => b.sessionCount - a.sessionCount);
}

/**
 * Get projects affected by a specific pattern
 */
export async function getProjectsByPattern(
  machineId: string,
  patternType: string,
  daysBack: number = 30
): Promise<string[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const sessions = await prisma.session.findMany({
    where: {
      machineId,
      startedAt: { gte: cutoffDate },
      projectPath: { not: null }
    },
    select: {
      projectPath: true,
      detectedPatterns: true
    }
  });

  const projectPaths = new Set<string>();

  for (const session of sessions) {
    const patterns = safeParseArray(session.detectedPatterns);
    if (patterns.includes(patternType) && session.projectPath) {
      projectPaths.add(session.projectPath);
    }
  }

  return Array.from(projectPaths);
}

/**
 * Get projects using a specific technology
 */
export async function getProjectsByTechnology(
  machineId: string,
  technology: string,
  daysBack: number = 30
): Promise<string[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const sessions = await prisma.session.findMany({
    where: {
      machineId,
      startedAt: { gte: cutoffDate },
      projectPath: { not: null }
    },
    select: {
      projectPath: true,
      detectedTechs: true
    }
  });

  const projectPaths = new Set<string>();

  for (const session of sessions) {
    const techs = safeParseArray(session.detectedTechs);
    if (techs.includes(technology.toLowerCase()) && session.projectPath) {
      projectPaths.add(session.projectPath);
    }
  }

  return Array.from(projectPaths);
}

/**
 * Get trend data for token usage over time
 */
export async function getTokenUsageTrend(
  machineId: string,
  daysBack: number = 30,
  groupByDays: number = 1
): Promise<Array<{ date: string; tokens: number; sessions: number }>> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const sessions = await prisma.session.findMany({
    where: {
      machineId,
      startedAt: { gte: cutoffDate }
    },
    select: {
      startedAt: true,
      tokensUsed: true
    },
    orderBy: { startedAt: 'asc' }
  });

  // Group by date
  const dailyData = new Map<string, { tokens: number; sessions: number }>();

  for (const session of sessions) {
    const dateKey = session.startedAt.toISOString().split('T')[0];

    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, { tokens: 0, sessions: 0 });
    }

    const day = dailyData.get(dateKey)!;
    day.tokens += session.tokensUsed;
    day.sessions++;
  }

  // Convert to array and sort
  return Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      tokens: data.tokens,
      sessions: data.sessions
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
