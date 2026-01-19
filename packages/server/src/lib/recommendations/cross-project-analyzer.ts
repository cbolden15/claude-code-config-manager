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
  /** Technologies by project ID */
  techByProject: Record<string, string[]>;
  /** Patterns by project ID */
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
    startup: number;
    tool: number;
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
  projectId: string;
  projectPath: string | null;
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
  const sessions = await prisma.sessionActivity.findMany({
    where: {
      machineId,
      timestamp: { gte: cutoffDate }
    },
    orderBy: { timestamp: 'desc' }
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
      tokenBreakdown: { startup: 0, tool: 0, context: 0, total: 0 }
    };
  }

  // Aggregate technologies across all projects
  const allTechs = new Set<string>();
  const techByProject = new Map<string, Set<string>>();

  for (const session of sessions) {
    const techs = safeParseArray(session.detectedTechs);
    techs.forEach(t => allTechs.add(t));

    const projectId = session.projectId;
    if (projectId) {
      if (!techByProject.has(projectId)) {
        techByProject.set(projectId, new Set());
      }
      techs.forEach(t => techByProject.get(projectId)!.add(t));
    }
  }

  // Detect patterns across all sessions
  const patterns = detectPatterns(sessions);

  // Aggregate patterns by project
  const projectPatterns = new Map<string, Set<string>>();
  for (const session of sessions) {
    const projectId = session.projectId;
    if (!projectId) continue;

    const sessionPatterns = safeParseArray(session.detectedPatterns);
    if (!projectPatterns.has(projectId)) {
      projectPatterns.set(projectId, new Set());
    }
    sessionPatterns.forEach(p =>
      projectPatterns.get(projectId)!.add(p)
    );
  }

  // Calculate statistics
  const avgSessionDuration = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
    : 0;

  const totalTokensUsed = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  const avgTokensPerSession = sessions.length > 0
    ? totalTokensUsed / sessions.length
    : 0;

  // Token breakdown
  const tokenBreakdown = {
    startup: sessions.reduce((sum, s) => sum + s.startupTokens, 0),
    tool: sessions.reduce((sum, s) => sum + s.toolTokens, 0),
    context: sessions.reduce((sum, s) => sum + s.contextTokens, 0),
    total: totalTokensUsed
  };

  // Get date range
  const timestamps = sessions.map(s => s.timestamp);
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

  const sessions = await prisma.sessionActivity.findMany({
    where: {
      machineId,
      timestamp: { gte: cutoffDate }
    }
  });

  // Aggregate technology usage
  const techStats = new Map<string, {
    projectIds: Set<string>;
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
          projectIds: new Set(),
          sessionCount: 0,
          commandCount: 0,
          lastUsed: null,
          relatedPatterns: new Set()
        });
      }

      const stats = techStats.get(tech)!;
      stats.sessionCount++;

      if (session.projectId) {
        stats.projectIds.add(session.projectId);
      }

      // Count related commands
      const techCommands = commands.filter(c => c.toLowerCase().includes(tech.toLowerCase()));
      stats.commandCount += techCommands.length;

      // Track last used
      if (!stats.lastUsed || session.timestamp > stats.lastUsed) {
        stats.lastUsed = session.timestamp;
      }

      // Track related patterns
      patterns.forEach(p => stats.relatedPatterns.add(p));
    }
  }

  // Convert to summary array
  return Array.from(techStats.entries())
    .map(([technology, stats]) => ({
      technology,
      projectCount: stats.projectIds.size,
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

  const sessions = await prisma.sessionActivity.findMany({
    where: {
      machineId,
      timestamp: { gte: cutoffDate },
      projectId: { not: null }
    }
  });

  // Group sessions by project
  const projectSessions = new Map<string, typeof sessions>();

  for (const session of sessions) {
    if (!session.projectId) continue;

    if (!projectSessions.has(session.projectId)) {
      projectSessions.set(session.projectId, []);
    }
    projectSessions.get(session.projectId)!.push(session);
  }

  // Analyze each project
  const analyses: ProjectAnalysis[] = [];

  for (const [projectId, projectSessionList] of projectSessions) {
    const technologies = new Set<string>();
    const patterns = new Set<string>();
    let totalTokens = 0;
    let totalDuration = 0;
    let lastActivity: Date | null = null;
    let projectPath: string | null = null;

    for (const session of projectSessionList) {
      safeParseArray(session.detectedTechs).forEach(t => technologies.add(t));
      safeParseArray(session.detectedPatterns).forEach(p => patterns.add(p));
      totalTokens += session.totalTokens;
      totalDuration += session.duration;

      if (!lastActivity || session.timestamp > lastActivity) {
        lastActivity = session.timestamp;
      }

      if (session.projectPath) {
        projectPath = session.projectPath;
      }
    }

    analyses.push({
      projectId,
      projectPath,
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

  const sessions = await prisma.sessionActivity.findMany({
    where: {
      machineId,
      timestamp: { gte: cutoffDate },
      projectId: { not: null }
    },
    select: {
      projectId: true,
      detectedPatterns: true
    }
  });

  const projectIds = new Set<string>();

  for (const session of sessions) {
    const patterns = safeParseArray(session.detectedPatterns);
    if (patterns.includes(patternType) && session.projectId) {
      projectIds.add(session.projectId);
    }
  }

  return Array.from(projectIds);
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

  const sessions = await prisma.sessionActivity.findMany({
    where: {
      machineId,
      timestamp: { gte: cutoffDate },
      projectId: { not: null }
    },
    select: {
      projectId: true,
      detectedTechs: true
    }
  });

  const projectIds = new Set<string>();

  for (const session of sessions) {
    const techs = safeParseArray(session.detectedTechs);
    if (techs.includes(technology.toLowerCase()) && session.projectId) {
      projectIds.add(session.projectId);
    }
  }

  return Array.from(projectIds);
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

  const sessions = await prisma.sessionActivity.findMany({
    where: {
      machineId,
      timestamp: { gte: cutoffDate }
    },
    select: {
      timestamp: true,
      totalTokens: true
    },
    orderBy: { timestamp: 'asc' }
  });

  // Group by date
  const dailyData = new Map<string, { tokens: number; sessions: number }>();

  for (const session of sessions) {
    const dateKey = session.timestamp.toISOString().split('T')[0];

    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, { tokens: 0, sessions: 0 });
    }

    const day = dailyData.get(dateKey)!;
    day.tokens += session.totalTokens;
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
