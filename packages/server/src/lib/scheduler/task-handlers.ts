/**
 * Task Handlers for CCM v3.2
 *
 * Implements handlers for different task types:
 * - analyze: Run context analysis on CLAUDE.md files
 * - optimize: Apply optimization strategies
 * - health_check: Generate health reports
 *
 * Integrates with v3.1 Context Optimizer (@/lib/context)
 *
 * @module scheduler/task-handlers
 */

import { prisma } from '@/lib/db';
import {
  analyze,
  optimize,
  type ContextAnalysis,
  type OptimizationOutput,
  type Strategy,
} from '@/lib/context';
import * as fs from 'fs/promises';
import * as path from 'path';

// Task types
export type TaskType = 'analyze' | 'optimize' | 'health_check' | 'custom';

// Task configuration interfaces
export interface AnalyzeTaskConfig {
  includeHealthScore?: boolean;
  maxProjects?: number;
}

export interface OptimizeTaskConfig {
  strategy?: Strategy;
  dryRun?: boolean;
  minScore?: number; // Only optimize if score below this
  autoApplyThreshold?: number; // Auto-apply if savings above this
}

export interface HealthCheckTaskConfig {
  alertThreshold?: number; // Alert if score below this
  includeRecommendations?: boolean;
}

// Task configuration union type
export type TaskConfig = AnalyzeTaskConfig | OptimizeTaskConfig | HealthCheckTaskConfig;

// Task result structure
export interface TaskResult {
  projectsProcessed: number;
  issuesFound: number;
  tokensSaved: number;
  details?: {
    projects: Array<{
      path: string;
      score: number;
      issues: number;
      savings: number;
      action?: string;
    }>;
    healthScore?: number;
    recommendations?: string[];
  };
}

// Scheduled task interface (matches Prisma model)
interface ScheduledTask {
  id: string;
  machineId: string | null;
  name: string;
  taskType: string;
  taskConfig: string; // JSON
  projectFilter: string | null; // JSON array
}

/**
 * Get projects to process for a task
 *
 * @param task - Scheduled task
 * @returns Array of project paths
 */
async function getProjectsForTask(task: ScheduledTask): Promise<string[]> {
  let projects: string[] = [];

  // Get projects from filter or database
  if (task.projectFilter) {
    try {
      projects = JSON.parse(task.projectFilter);
    } catch {
      projects = [];
    }
  } else {
    // Get all projects for this machine or all machines
    const dbProjects = await prisma.project.findMany({
      where: task.machineId
        ? { machine: task.machineId }
        : {},
      select: { path: true },
    });
    projects = dbProjects.map((p) => p.path);
  }

  return projects;
}

/**
 * Check if a CLAUDE.md file exists for a project
 */
async function getClaudeMdPath(projectPath: string): Promise<string | null> {
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
  try {
    await fs.access(claudeMdPath);
    return claudeMdPath;
  } catch {
    return null;
  }
}

/**
 * Execute an analyze task
 *
 * Analyzes CLAUDE.md files across projects and stores results.
 *
 * @param task - Scheduled task
 * @returns Task result with analysis summary
 */
export async function executeAnalyzeTask(task: ScheduledTask): Promise<TaskResult> {
  const config: AnalyzeTaskConfig = JSON.parse(task.taskConfig || '{}');
  const projects = await getProjectsForTask(task);

  const results: Array<{
    path: string;
    analysis: ContextAnalysis;
  }> = [];
  let totalIssues = 0;

  // Limit projects if specified
  const projectsToProcess = config.maxProjects
    ? projects.slice(0, config.maxProjects)
    : projects;

  for (const projectPath of projectsToProcess) {
    const claudeMdPath = await getClaudeMdPath(projectPath);
    if (!claudeMdPath) continue;

    try {
      const analysis = await analyze(claudeMdPath);
      results.push({ path: projectPath, analysis });
      totalIssues += analysis.issues.length;

      // Store in database
      if (task.machineId) {
        await prisma.contextAnalysis.upsert({
          where: {
            machineId_projectPath_filePath: {
              machineId: task.machineId,
              projectPath,
              filePath: claudeMdPath,
            },
          },
          update: {
            totalLines: analysis.summary.totalLines,
            totalTokens: analysis.summary.totalTokens,
            sections: JSON.stringify(analysis.classified),
            issues: JSON.stringify(analysis.issues),
            estimatedSavings: analysis.summary.estimatedSavings,
            optimizationScore: analysis.optimizationScore,
            status: 'analyzed',
            lastAnalyzedAt: new Date(),
          },
          create: {
            machineId: task.machineId,
            projectPath,
            filePath: claudeMdPath,
            totalLines: analysis.summary.totalLines,
            totalTokens: analysis.summary.totalTokens,
            sections: JSON.stringify(analysis.classified),
            issues: JSON.stringify(analysis.issues),
            estimatedSavings: analysis.summary.estimatedSavings,
            optimizationScore: analysis.optimizationScore,
            status: 'analyzed',
          },
        });
      }
    } catch (error) {
      console.error(`Error analyzing ${projectPath}:`, error);
    }
  }

  // Calculate health score if requested
  let healthScore: number | undefined;
  if (config.includeHealthScore && task.machineId && results.length > 0) {
    const avgScore = Math.round(
      results.reduce((sum, r) => sum + r.analysis.optimizationScore, 0) / results.length
    );
    healthScore = avgScore;

    // Store health score
    await updateHealthScore(task.machineId, avgScore, totalIssues);
  }

  return {
    projectsProcessed: results.length,
    issuesFound: totalIssues,
    tokensSaved: 0, // Analysis doesn't save tokens
    details: {
      projects: results.map((r) => ({
        path: r.path,
        score: r.analysis.optimizationScore,
        issues: r.analysis.issues.length,
        savings: r.analysis.summary.estimatedSavings,
      })),
      healthScore,
    },
  };
}

/**
 * Execute an optimize task
 *
 * Analyzes and optimizes CLAUDE.md files based on strategy.
 *
 * @param task - Scheduled task
 * @returns Task result with optimization summary
 */
export async function executeOptimizeTask(task: ScheduledTask): Promise<TaskResult> {
  const config: OptimizeTaskConfig = JSON.parse(task.taskConfig || '{}');
  const projects = await getProjectsForTask(task);

  let totalProjectsProcessed = 0;
  let totalIssuesFound = 0;
  let totalTokensSaved = 0;

  const projectDetails: Array<{
    path: string;
    score: number;
    issues: number;
    savings: number;
    action?: string;
  }> = [];

  for (const projectPath of projects) {
    const claudeMdPath = await getClaudeMdPath(projectPath);
    if (!claudeMdPath) continue;

    try {
      // Analyze first
      const analysis = await analyze(claudeMdPath);
      totalProjectsProcessed++;
      totalIssuesFound += analysis.issues.length;

      // Check if optimization should be applied
      const shouldOptimize =
        !config.minScore || analysis.optimizationScore < config.minScore;

      const projectDetail: (typeof projectDetails)[0] = {
        path: projectPath,
        score: analysis.optimizationScore,
        issues: analysis.issues.length,
        savings: 0,
        action: 'analyzed',
      };

      if (shouldOptimize && analysis.issues.length > 0) {
        const output = optimize(
          analysis,
          config.strategy || 'moderate',
          projectPath
        );

        projectDetail.savings = output.result.summary.tokensSaved;

        // Check if we should auto-apply
        const shouldApply =
          !config.dryRun &&
          (!config.autoApplyThreshold ||
            output.result.summary.tokensSaved >= config.autoApplyThreshold);

        if (shouldApply) {
          // Write optimized content
          await fs.writeFile(claudeMdPath, output.result.newContent, 'utf-8');
          totalTokensSaved += output.result.summary.tokensSaved;
          projectDetail.action = 'optimized';

          // Store archives
          if (task.machineId) {
            for (const archive of output.archives) {
              const summaryLines = archive.metadata.summary.split('\n').length;
              await prisma.contextArchive.create({
                data: {
                  machineId: task.machineId,
                  projectPath,
                  sourceFile: 'CLAUDE.md',
                  archiveFile: archive.path,
                  sectionName: archive.metadata.sectionName,
                  originalLines: archive.metadata.originalLines,
                  originalTokens: archive.metadata.originalTokens,
                  summaryLines,
                  archivedContent: archive.content,
                  summaryContent: archive.metadata.summary,
                  archiveReason: archive.metadata.reason,
                },
              });
            }
          }

          // Update analysis status
          if (task.machineId) {
            await prisma.contextAnalysis.updateMany({
              where: {
                machineId: task.machineId,
                projectPath,
                filePath: claudeMdPath,
              },
              data: {
                status: 'optimized',
              },
            });
          }
        } else {
          projectDetail.action = config.dryRun ? 'dry_run' : 'skipped';
        }
      }

      projectDetails.push(projectDetail);
    } catch (error) {
      console.error(`Error optimizing ${projectPath}:`, error);
      projectDetails.push({
        path: projectPath,
        score: 0,
        issues: 0,
        savings: 0,
        action: `error: ${error instanceof Error ? error.message : 'unknown'}`,
      });
    }
  }

  return {
    projectsProcessed: totalProjectsProcessed,
    issuesFound: totalIssuesFound,
    tokensSaved: totalTokensSaved,
    details: {
      projects: projectDetails,
    },
  };
}

/**
 * Execute a health check task
 *
 * Generates a health report across all projects.
 *
 * @param task - Scheduled task
 * @returns Task result with health summary
 */
export async function executeHealthCheckTask(task: ScheduledTask): Promise<TaskResult> {
  const config: HealthCheckTaskConfig = JSON.parse(task.taskConfig || '{}');
  const projects = await getProjectsForTask(task);

  let totalProjectsProcessed = 0;
  let totalIssues = 0;
  let totalPotentialSavings = 0;
  const scores: number[] = [];

  const projectDetails: Array<{
    path: string;
    score: number;
    issues: number;
    savings: number;
  }> = [];

  for (const projectPath of projects) {
    const claudeMdPath = await getClaudeMdPath(projectPath);
    if (!claudeMdPath) continue;

    try {
      const analysis = await analyze(claudeMdPath);
      totalProjectsProcessed++;
      totalIssues += analysis.issues.length;
      totalPotentialSavings += analysis.summary.estimatedSavings;
      scores.push(analysis.optimizationScore);

      projectDetails.push({
        path: projectPath,
        score: analysis.optimizationScore,
        issues: analysis.issues.length,
        savings: analysis.summary.estimatedSavings,
      });
    } catch (error) {
      console.error(`Error checking health for ${projectPath}:`, error);
    }
  }

  // Calculate overall health score
  const healthScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  // Generate recommendations if requested
  const recommendations: string[] = [];
  if (config.includeRecommendations) {
    // Sort projects by score (lowest first)
    const sortedProjects = [...projectDetails].sort((a, b) => a.score - b.score);

    // Recommend optimization for lowest scoring projects
    for (const project of sortedProjects.slice(0, 3)) {
      if (project.score < 70) {
        recommendations.push(
          `Optimize ${path.basename(project.path)}: score ${project.score}, potential savings ${project.savings} tokens`
        );
      }
    }

    if (healthScore < 50) {
      recommendations.push(
        'Overall health is poor. Consider running weekly optimization across all projects.'
      );
    }
  }

  // Store health score
  if (task.machineId) {
    await updateHealthScore(task.machineId, healthScore, totalIssues);
  }

  // Check alert threshold
  const shouldAlert =
    config.alertThreshold !== undefined && healthScore < config.alertThreshold;

  return {
    projectsProcessed: totalProjectsProcessed,
    issuesFound: totalIssues,
    tokensSaved: 0, // Health check doesn't save tokens
    details: {
      projects: projectDetails,
      healthScore,
      recommendations: shouldAlert
        ? [`ALERT: Health score ${healthScore} is below threshold ${config.alertThreshold}`, ...recommendations]
        : recommendations,
    },
  };
}

/**
 * Update health score in database
 */
async function updateHealthScore(
  machineId: string,
  contextScore: number,
  activeIssues: number
): Promise<void> {
  // Get previous score for trend calculation
  const previousHealth = await prisma.healthScore.findFirst({
    where: { machineId },
    orderBy: { timestamp: 'desc' },
  });

  const previousScore = previousHealth?.totalScore || contextScore;
  const trend =
    contextScore > previousScore
      ? 'improving'
      : contextScore < previousScore
        ? 'declining'
        : 'stable';

  // Create new health score entry
  await prisma.healthScore.create({
    data: {
      machineId,
      totalScore: contextScore,
      mcpScore: 70, // Default - would need MCP analysis
      skillScore: 70, // Default - would need skill analysis
      contextScore,
      patternScore: 70, // Default - would need pattern analysis
      activeRecommendations: activeIssues,
      appliedRecommendations: 0,
      estimatedDailyWaste: 0,
      estimatedDailySavings: 0,
      previousScore,
      trend,
    },
  });
}

/**
 * Execute a task based on its type
 *
 * Main entry point for task execution.
 *
 * @param task - Scheduled task
 * @returns Task result
 */
export async function executeTask(task: ScheduledTask): Promise<TaskResult> {
  switch (task.taskType as TaskType) {
    case 'analyze':
      return executeAnalyzeTask(task);

    case 'optimize':
      return executeOptimizeTask(task);

    case 'health_check':
      return executeHealthCheckTask(task);

    case 'custom':
      // Custom tasks would need additional handling
      throw new Error('Custom tasks not yet implemented');

    default:
      throw new Error(`Unknown task type: ${task.taskType}`);
  }
}

/**
 * Get metric value for threshold evaluation
 *
 * @param metric - Metric name
 * @param projectPath - Project path
 * @param machineId - Machine ID
 * @returns Current metric value
 */
export async function getMetricValue(
  metric: string,
  projectPath: string,
  machineId: string
): Promise<number> {
  switch (metric) {
    case 'optimization_score': {
      // Get latest analysis for project
      const analysis = await prisma.contextAnalysis.findFirst({
        where: {
          machineId,
          projectPath,
        },
        orderBy: { lastAnalyzedAt: 'desc' },
      });
      return analysis?.optimizationScore || 100;
    }

    case 'token_count': {
      const analysis = await prisma.contextAnalysis.findFirst({
        where: {
          machineId,
          projectPath,
        },
        orderBy: { lastAnalyzedAt: 'desc' },
      });
      return analysis?.totalTokens || 0;
    }

    case 'issue_count': {
      const analysis = await prisma.contextAnalysis.findFirst({
        where: {
          machineId,
          projectPath,
        },
        orderBy: { lastAnalyzedAt: 'desc' },
      });
      const issues = analysis?.issues ? JSON.parse(analysis.issues) : [];
      return issues.length;
    }

    case 'file_size': {
      // Get actual file size
      const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
      try {
        const stats = await fs.stat(claudeMdPath);
        return stats.size;
      } catch {
        return 0;
      }
    }

    default:
      return 0;
  }
}

/**
 * Get average metric value across all projects for a machine
 *
 * @param metric - Metric name
 * @param machineId - Machine ID
 * @returns Average metric value
 */
export async function getAverageMetricValue(
  metric: string,
  machineId: string
): Promise<number> {
  switch (metric) {
    case 'optimization_score': {
      const result = await prisma.contextAnalysis.aggregate({
        where: { machineId },
        _avg: { optimizationScore: true },
      });
      return result._avg.optimizationScore || 100;
    }

    case 'token_count': {
      const result = await prisma.contextAnalysis.aggregate({
        where: { machineId },
        _sum: { totalTokens: true },
      });
      return result._sum.totalTokens || 0;
    }

    case 'issue_count': {
      const analyses = await prisma.contextAnalysis.findMany({
        where: { machineId },
        select: { issues: true },
      });
      return analyses.reduce((sum, a) => {
        const issues = a.issues ? JSON.parse(a.issues) : [];
        return sum + issues.length;
      }, 0);
    }

    default:
      return 0;
  }
}
