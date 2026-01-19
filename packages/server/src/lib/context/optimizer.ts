/**
 * Optimizer for CCM v3.1 Context Optimizer
 *
 * Generates and applies optimization plans for CLAUDE.md files
 * based on detected issues and user-selected strategies.
 */

import type { ClassifiedSection } from './classifier';
import type { DetectedIssue, IssueType } from './detector';
import type { AnalysisResult, ParsedSection } from './analyzer';
import { countTokens } from './analyzer';

/**
 * Optimization strategy levels
 */
export type Strategy = 'conservative' | 'moderate' | 'aggressive' | 'custom';

/**
 * Types of optimization actions
 */
export type ActionType = 'archive' | 'condense' | 'remove' | 'move' | 'dedupe';

/**
 * A single optimization action
 */
export interface OptimizationAction {
  /** Type of action */
  type: ActionType;
  /** Section being optimized */
  sectionName: string;
  /** Reason for this action */
  reason: string;
  /** Original content (may be truncated for display) */
  before: string;
  /** New content or reference */
  after: string;
  /** Lines that will be saved */
  linesSaved: number;
  /** Tokens that will be saved */
  tokensSaved: number;
  /** Line range affected */
  lineRange: { start: number; end: number };
  /** Related issue if applicable */
  issueType?: IssueType;
  /** Priority order for applying */
  priority: number;
}

/**
 * Complete optimization plan
 */
export interface OptimizationPlan {
  /** Strategy used to generate this plan */
  strategy: Strategy;
  /** List of actions to apply */
  actions: OptimizationAction[];
  /** Summary statistics */
  summary: {
    currentLines: number;
    projectedLines: number;
    currentTokens: number;
    projectedTokens: number;
    reductionPercent: number;
    actionsCount: number;
  };
  /** When the plan was generated */
  generatedAt: Date;
  /** Sections that will be preserved */
  preservedSections: string[];
  /** Warnings or notes */
  warnings: string[];
}

/**
 * Result of applying an optimization plan
 */
export interface OptimizationResult {
  /** Whether the optimization was successful */
  success: boolean;
  /** New content after optimization */
  newContent: string;
  /** Actions that were applied */
  appliedActions: OptimizationAction[];
  /** Actions that failed */
  failedActions: Array<{ action: OptimizationAction; error: string }>;
  /** Summary of changes */
  summary: {
    originalLines: number;
    newLines: number;
    originalTokens: number;
    newTokens: number;
    linesSaved: number;
    tokensSaved: number;
    reductionPercent: number;
  };
}

/**
 * Strategy configurations
 */
const STRATEGY_CONFIG: Record<Strategy, {
  archiveThreshold: number;      // Min lines to archive
  condenseThreshold: number;     // Min lines to condense
  includeIssueTypes: IssueType[];
  preserveTypes: string[];       // Section types to always preserve
  maxActions: number;
}> = {
  conservative: {
    archiveThreshold: 200,
    condenseThreshold: 300,
    includeIssueTypes: ['oversized_section', 'completed_work_verbose'],
    preserveTypes: ['project_overview', 'current_phase', 'technology_stack', 'commands', 'conventions', 'data_model'],
    maxActions: 3
  },
  moderate: {
    archiveThreshold: 100,
    condenseThreshold: 150,
    includeIssueTypes: ['oversized_section', 'completed_work_verbose', 'stale_dates', 'duplicate_content'],
    preserveTypes: ['project_overview', 'current_phase', 'technology_stack', 'conventions'],
    maxActions: 10
  },
  aggressive: {
    archiveThreshold: 50,
    condenseThreshold: 75,
    includeIssueTypes: ['oversized_section', 'completed_work_verbose', 'stale_dates', 'duplicate_content', 'low_actionability', 'excessive_examples'],
    preserveTypes: ['project_overview', 'current_phase'],
    maxActions: 50
  },
  custom: {
    archiveThreshold: 100,
    condenseThreshold: 150,
    includeIssueTypes: [],
    preserveTypes: [],
    maxActions: 100
  }
};

/**
 * Truncate content for display
 */
function truncateContent(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

/**
 * Generate archive reference text
 */
function generateArchiveReference(sectionName: string, lineCount: number, archivePath: string): string {
  return `> **Archived:** See \`${archivePath}\` for ${lineCount} lines of historical content.`;
}

/**
 * Generate condensed summary
 */
function generateCondensedSummary(section: ParsedSection, maxLines: number = 10): string {
  const lines = section.content.split('\n').filter(l => l.trim());

  if (lines.length <= maxLines) {
    return section.content;
  }

  // Extract key information
  const summary: string[] = [];

  // Keep headers and important lines
  for (const line of lines) {
    if (summary.length >= maxLines - 1) break;

    // Prioritize headers, bullet points, and key info
    if (
      line.startsWith('#') ||
      line.startsWith('-') ||
      line.startsWith('*') ||
      line.startsWith('|') ||
      line.includes(':') ||
      line.match(/^\d+\./)
    ) {
      summary.push(line);
    }
  }

  // Add note about condensed content
  summary.push(`\n> *Condensed from ${lines.length} lines. See archives for full details.*`);

  return summary.join('\n');
}

/**
 * Generate dedupe reference
 */
function generateDedupeReference(sectionName: string, targetFile: string): string {
  return `> See \`${targetFile}\` for ${sectionName.toLowerCase()} information.`;
}

/**
 * Generate optimization plan based on analysis and strategy
 *
 * @param analysis - Analysis result from analyzer
 * @param classified - Classified sections
 * @param issues - Detected issues
 * @param strategy - Optimization strategy to use
 * @param customConfig - Custom configuration (for 'custom' strategy)
 * @returns Optimization plan
 */
export function generatePlan(
  analysis: AnalysisResult,
  classified: ClassifiedSection[],
  issues: DetectedIssue[],
  strategy: Strategy,
  customConfig?: Partial<typeof STRATEGY_CONFIG.custom>
): OptimizationPlan {
  const config = strategy === 'custom'
    ? { ...STRATEGY_CONFIG.custom, ...customConfig }
    : STRATEGY_CONFIG[strategy];

  const actions: OptimizationAction[] = [];
  const warnings: string[] = [];
  const preservedSections: string[] = [];

  // Filter issues based on strategy
  const relevantIssues = issues.filter(i =>
    config.includeIssueTypes.length === 0 || config.includeIssueTypes.includes(i.type)
  );

  // Process each classified section
  for (const c of classified) {
    // Check if section should be preserved
    if (config.preserveTypes.includes(c.type)) {
      preservedSections.push(c.section.name);
      continue;
    }

    // Find issues for this section
    const sectionIssues = relevantIssues.filter(i => i.sectionName === c.section.name);

    if (sectionIssues.length === 0) {
      // No issues, but check if section meets thresholds
      if (c.section.lineCount >= config.archiveThreshold && c.actionability === 'low') {
        // Archive large, low-actionability sections
        const archivePath = `.claude/archives/CLAUDE-${c.section.name.toLowerCase().replace(/\s+/g, '-')}.md`;

        actions.push({
          type: 'archive',
          sectionName: c.section.name,
          reason: `Section has ${c.section.lineCount} lines with low actionability`,
          before: truncateContent(c.section.content),
          after: generateArchiveReference(c.section.name, c.section.lineCount, archivePath),
          linesSaved: c.section.lineCount - 2,
          tokensSaved: c.section.estimatedTokens - countTokens(generateArchiveReference(c.section.name, c.section.lineCount, archivePath)),
          lineRange: { start: c.section.startLine, end: c.section.endLine },
          priority: 2
        });
      } else if (c.section.lineCount >= config.condenseThreshold) {
        // Condense large sections
        const condensed = generateCondensedSummary(c.section, 15);

        actions.push({
          type: 'condense',
          sectionName: c.section.name,
          reason: `Section has ${c.section.lineCount} lines, condensing to summary`,
          before: truncateContent(c.section.content),
          after: truncateContent(condensed),
          linesSaved: c.section.lineCount - condensed.split('\n').length,
          tokensSaved: c.section.estimatedTokens - countTokens(condensed),
          lineRange: { start: c.section.startLine, end: c.section.endLine },
          priority: 3
        });
      } else {
        preservedSections.push(c.section.name);
      }
      continue;
    }

    // Process based on issue type
    for (const issue of sectionIssues) {
      let action: OptimizationAction | null = null;

      switch (issue.type) {
        case 'oversized_section':
        case 'completed_work_verbose':
        case 'low_actionability': {
          const archivePath = `.claude/archives/CLAUDE-${c.section.name.toLowerCase().replace(/\s+/g, '-')}.md`;
          action = {
            type: 'archive',
            sectionName: c.section.name,
            reason: issue.description,
            before: truncateContent(c.section.content),
            after: generateArchiveReference(c.section.name, c.section.lineCount, archivePath),
            linesSaved: c.section.lineCount - 2,
            tokensSaved: issue.estimatedSavings,
            lineRange: issue.lineRange,
            issueType: issue.type,
            priority: issue.severity === 'high' ? 1 : issue.severity === 'medium' ? 2 : 3
          };
          break;
        }

        case 'duplicate_content': {
          action = {
            type: 'dedupe',
            sectionName: c.section.name,
            reason: issue.description,
            before: truncateContent(c.section.content),
            after: generateDedupeReference(c.section.name, 'README.md'),
            linesSaved: c.section.lineCount - 2,
            tokensSaved: issue.estimatedSavings,
            lineRange: issue.lineRange,
            issueType: issue.type,
            priority: 2
          };
          break;
        }

        case 'excessive_examples': {
          const condensed = generateCondensedSummary(c.section, 20);
          action = {
            type: 'condense',
            sectionName: c.section.name,
            reason: issue.description,
            before: truncateContent(c.section.content),
            after: truncateContent(condensed),
            linesSaved: c.section.lineCount - condensed.split('\n').length,
            tokensSaved: issue.estimatedSavings,
            lineRange: issue.lineRange,
            issueType: issue.type,
            priority: 3
          };
          break;
        }

        case 'stale_dates': {
          // Stale dates usually indicate content should be reviewed
          warnings.push(`Section "${c.section.name}" has stale date references - review recommended`);
          break;
        }
      }

      if (action) {
        // Avoid duplicate actions for same section
        if (!actions.some(a => a.sectionName === action!.sectionName)) {
          actions.push(action);
        }
      }
    }
  }

  // Sort by priority and limit
  const sortedActions = actions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, config.maxActions);

  // Calculate summary
  const totalLinesSaved = sortedActions.reduce((sum, a) => sum + a.linesSaved, 0);
  const totalTokensSaved = sortedActions.reduce((sum, a) => sum + a.tokensSaved, 0);
  const projectedLines = analysis.totalLines - totalLinesSaved;
  const projectedTokens = analysis.totalTokens - totalTokensSaved;
  const reductionPercent = analysis.totalTokens > 0
    ? Math.round((totalTokensSaved / analysis.totalTokens) * 100)
    : 0;

  return {
    strategy,
    actions: sortedActions,
    summary: {
      currentLines: analysis.totalLines,
      projectedLines: Math.max(0, projectedLines),
      currentTokens: analysis.totalTokens,
      projectedTokens: Math.max(0, projectedTokens),
      reductionPercent,
      actionsCount: sortedActions.length
    },
    generatedAt: new Date(),
    preservedSections,
    warnings
  };
}

/**
 * Apply an optimization plan to content
 *
 * @param plan - The optimization plan to apply
 * @param content - Original content
 * @returns Optimization result with new content
 */
export function applyPlan(
  plan: OptimizationPlan,
  content: string
): OptimizationResult {
  const lines = content.split('\n');
  const appliedActions: OptimizationAction[] = [];
  const failedActions: Array<{ action: OptimizationAction; error: string }> = [];

  // Sort actions by line number descending (apply from end to start to preserve line numbers)
  const sortedActions = [...plan.actions].sort((a, b) => b.lineRange.start - a.lineRange.start);

  for (const action of sortedActions) {
    try {
      const { start, end } = action.lineRange;

      // Validate line range
      if (start < 1 || end > lines.length || start > end) {
        failedActions.push({
          action,
          error: `Invalid line range: ${start}-${end} (file has ${lines.length} lines)`
        });
        continue;
      }

      // Generate replacement content
      let replacement: string[];

      switch (action.type) {
        case 'archive': {
          // Replace with archive reference
          const archivePath = `.claude/archives/CLAUDE-${action.sectionName.toLowerCase().replace(/\s+/g, '-')}.md`;
          replacement = [
            `## ${action.sectionName}`,
            '',
            generateArchiveReference(action.sectionName, end - start + 1, archivePath),
            ''
          ];
          break;
        }

        case 'condense': {
          // Get original section header
          const headerLine = lines[start - 1];
          const originalContent = lines.slice(start, end).join('\n');
          const condensed = generateCondensedSummary(
            { content: originalContent, name: action.sectionName } as ParsedSection,
            15
          );
          replacement = [headerLine, '', ...condensed.split('\n'), ''];
          break;
        }

        case 'dedupe': {
          replacement = [
            `## ${action.sectionName}`,
            '',
            generateDedupeReference(action.sectionName, 'README.md'),
            ''
          ];
          break;
        }

        case 'remove': {
          replacement = [];
          break;
        }

        case 'move': {
          // Move is complex - just mark as needing manual intervention
          failedActions.push({
            action,
            error: 'Move actions require manual intervention'
          });
          continue;
        }

        default:
          replacement = lines.slice(start - 1, end);
      }

      // Apply the replacement
      lines.splice(start - 1, end - start + 1, ...replacement);
      appliedActions.push(action);
    } catch (error) {
      failedActions.push({
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const newContent = lines.join('\n');
  const newTokens = countTokens(newContent);
  const originalTokens = countTokens(content);

  return {
    success: failedActions.length === 0,
    newContent,
    appliedActions,
    failedActions,
    summary: {
      originalLines: content.split('\n').length,
      newLines: lines.length,
      originalTokens,
      newTokens,
      linesSaved: content.split('\n').length - lines.length,
      tokensSaved: originalTokens - newTokens,
      reductionPercent: originalTokens > 0
        ? Math.round(((originalTokens - newTokens) / originalTokens) * 100)
        : 0
    }
  };
}

/**
 * Preview plan without applying
 */
export function previewPlan(plan: OptimizationPlan): {
  actions: Array<{
    type: ActionType;
    section: string;
    reason: string;
    savings: string;
  }>;
  summary: string;
} {
  return {
    actions: plan.actions.map(a => ({
      type: a.type,
      section: a.sectionName,
      reason: a.reason,
      savings: `${a.linesSaved} lines / ~${a.tokensSaved} tokens`
    })),
    summary: `${plan.actions.length} actions | ${plan.summary.reductionPercent}% reduction | ${plan.summary.currentTokens - plan.summary.projectedTokens} tokens saved`
  };
}

/**
 * Get strategy description
 */
export function getStrategyDescription(strategy: Strategy): string {
  switch (strategy) {
    case 'conservative':
      return 'Archive only large historical sections. Preserves most content.';
    case 'moderate':
      return 'Archive historical content, condense verbose sections, dedupe with README.';
    case 'aggressive':
      return 'Minimize to essential context only. Maximum token savings.';
    case 'custom':
      return 'Apply custom rules and thresholds.';
  }
}

/**
 * Get recommended strategy based on analysis
 */
export function getRecommendedStrategy(
  analysis: AnalysisResult,
  issues: DetectedIssue[]
): Strategy {
  const totalTokens = analysis.totalTokens;
  const highSeverityIssues = issues.filter(i => i.severity === 'high').length;
  const totalSavings = issues.reduce((sum, i) => sum + i.estimatedSavings, 0);
  const savingsPercent = totalTokens > 0 ? (totalSavings / totalTokens) * 100 : 0;

  if (totalTokens > 20000 || highSeverityIssues >= 3 || savingsPercent > 50) {
    return 'aggressive';
  }

  if (totalTokens > 10000 || highSeverityIssues >= 1 || savingsPercent > 30) {
    return 'moderate';
  }

  return 'conservative';
}
