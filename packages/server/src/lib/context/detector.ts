/**
 * Issue Detector for CCM v3.1 Context Optimizer
 *
 * Detects optimization opportunities in CLAUDE.md files
 * based on classified sections and content analysis.
 */

import type { ClassifiedSection, SectionType } from './classifier';
import type { StaleDate } from './analyzer';
import { countTokens } from './analyzer';

/**
 * Types of optimization issues that can be detected
 */
export type IssueType =
  | 'oversized_section'        // Section exceeds threshold
  | 'completed_work_verbose'   // Detailed history that could be summarized
  | 'outdated_reference'       // References non-existent files/phases
  | 'duplicate_content'        // Same info exists in README/docs
  | 'stale_dates'              // References old dates as "current"
  | 'low_actionability'        // Content unlikely to help current work
  | 'excessive_examples';      // Too many code examples

/**
 * Severity levels for detected issues
 */
export type IssueSeverity = 'high' | 'medium' | 'low';

/**
 * A detected optimization issue
 */
export interface DetectedIssue {
  /** Type of issue */
  type: IssueType;
  /** Severity level */
  severity: IssueSeverity;
  /** Section where issue was found */
  sectionName: string;
  /** Section type */
  sectionType: SectionType;
  /** Human-readable description */
  description: string;
  /** Suggested action to resolve */
  suggestedAction: string;
  /** Estimated tokens that could be saved */
  estimatedSavings: number;
  /** Confidence in the detection (0-1) */
  confidence: number;
  /** Line range affected */
  lineRange: { start: number; end: number };
  /** Additional details/evidence */
  details: Record<string, unknown>;
}

/**
 * Detection thresholds
 */
const THRESHOLDS = {
  /** Lines above which a section is considered oversized */
  oversizedLines: 100,
  /** Tokens above which a section is oversized */
  oversizedTokens: 2500,
  /** Lines for completed work to be verbose */
  completedWorkVerboseLines: 50,
  /** Number of code blocks for excessive examples */
  excessiveExamples: 5,
  /** Staleness score to flag as stale */
  stalenessThreshold: 0.6,
  /** Number of stale dates to flag */
  staleDatesCount: 3
};

/**
 * Calculate severity based on potential token savings
 */
export function calculateSeverity(estimatedSavings: number): IssueSeverity {
  if (estimatedSavings >= 5000) return 'high';
  if (estimatedSavings >= 1000) return 'medium';
  return 'low';
}

/**
 * Estimate token savings for an issue
 */
export function estimateTokenSavings(
  issue: Omit<DetectedIssue, 'estimatedSavings' | 'severity'>
): number {
  const { type, details } = issue;

  switch (type) {
    case 'oversized_section': {
      // Assume we can reduce to ~30% of original
      const currentTokens = (details.currentTokens as number) || 0;
      return Math.round(currentTokens * 0.7);
    }
    case 'completed_work_verbose': {
      // Can usually condense to ~5-10 lines summary
      const currentLines = (details.currentLines as number) || 0;
      const currentTokens = (details.currentTokens as number) || 0;
      const targetLines = 10;
      const reduction = Math.max(0, (currentLines - targetLines) / currentLines);
      return Math.round(currentTokens * reduction);
    }
    case 'duplicate_content': {
      // Can replace with reference, saving ~90%
      const currentTokens = (details.currentTokens as number) || 0;
      return Math.round(currentTokens * 0.9);
    }
    case 'stale_dates': {
      // Usually part of larger stale content
      return (details.affectedLines as number) * 10 || 50;
    }
    case 'low_actionability': {
      // Archive entirely
      const currentTokens = (details.currentTokens as number) || 0;
      return Math.round(currentTokens * 0.95);
    }
    case 'excessive_examples': {
      // Keep 1-2 examples, remove rest
      const exampleCount = (details.exampleCount as number) || 0;
      const tokensPerExample = (details.avgTokensPerExample as number) || 100;
      return Math.round((exampleCount - 2) * tokensPerExample);
    }
    case 'outdated_reference': {
      // Small savings, mostly cleanup
      return 50;
    }
    default:
      return 0;
  }
}

/**
 * Detect oversized sections
 */
function detectOversizedSections(classified: ClassifiedSection[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  for (const c of classified) {
    if (
      c.section.lineCount > THRESHOLDS.oversizedLines ||
      c.section.estimatedTokens > THRESHOLDS.oversizedTokens
    ) {
      const partialIssue = {
        type: 'oversized_section' as IssueType,
        sectionName: c.section.name,
        sectionType: c.type,
        description: `Section "${c.section.name}" is ${c.section.lineCount} lines (~${c.section.estimatedTokens} tokens), exceeding recommended limits`,
        suggestedAction: c.type === 'completed_work' || c.type === 'work_sessions'
          ? 'Archive to separate file and replace with summary'
          : 'Condense content or split into focused sub-sections',
        confidence: 0.95,
        lineRange: { start: c.section.startLine, end: c.section.endLine },
        details: {
          currentLines: c.section.lineCount,
          currentTokens: c.section.estimatedTokens,
          thresholdLines: THRESHOLDS.oversizedLines,
          thresholdTokens: THRESHOLDS.oversizedTokens
        }
      };

      const estimatedSavings = estimateTokenSavings(partialIssue);

      issues.push({
        ...partialIssue,
        severity: calculateSeverity(estimatedSavings),
        estimatedSavings
      });
    }
  }

  return issues;
}

/**
 * Detect verbose completed work sections
 */
function detectCompletedWorkVerbose(classified: ClassifiedSection[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  for (const c of classified) {
    if (
      (c.type === 'completed_work' || c.type === 'work_sessions') &&
      c.section.lineCount > THRESHOLDS.completedWorkVerboseLines
    ) {
      const partialIssue = {
        type: 'completed_work_verbose' as IssueType,
        sectionName: c.section.name,
        sectionType: c.type,
        description: `Completed work section "${c.section.name}" has ${c.section.lineCount} lines of historical content`,
        suggestedAction: 'Archive detailed history and keep only summary of key accomplishments',
        confidence: 0.9,
        lineRange: { start: c.section.startLine, end: c.section.endLine },
        details: {
          currentLines: c.section.lineCount,
          currentTokens: c.section.estimatedTokens,
          threshold: THRESHOLDS.completedWorkVerboseLines
        }
      };

      const estimatedSavings = estimateTokenSavings(partialIssue);

      issues.push({
        ...partialIssue,
        severity: calculateSeverity(estimatedSavings),
        estimatedSavings
      });
    }
  }

  return issues;
}

/**
 * Detect sections with stale date references
 */
function detectStaleDateIssues(
  classified: ClassifiedSection[],
  staleDates: StaleDate[]
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  // Group stale dates by section
  for (const c of classified) {
    const sectionStaleDates = staleDates.filter(
      sd => sd.lineNumber >= c.section.startLine && sd.lineNumber <= c.section.endLine
    );

    if (sectionStaleDates.length >= THRESHOLDS.staleDatesCount) {
      const avgDaysOld = Math.round(
        sectionStaleDates.reduce((sum, sd) => sum + sd.daysOld, 0) / sectionStaleDates.length
      );

      const partialIssue = {
        type: 'stale_dates' as IssueType,
        sectionName: c.section.name,
        sectionType: c.type,
        description: `Section "${c.section.name}" contains ${sectionStaleDates.length} outdated date references (avg ${avgDaysOld} days old)`,
        suggestedAction: 'Update or remove stale date references; archive historical content',
        confidence: 0.85,
        lineRange: { start: c.section.startLine, end: c.section.endLine },
        details: {
          staleDateCount: sectionStaleDates.length,
          avgDaysOld,
          examples: sectionStaleDates.slice(0, 3).map(sd => sd.dateString),
          affectedLines: sectionStaleDates.length
        }
      };

      const estimatedSavings = estimateTokenSavings(partialIssue);

      issues.push({
        ...partialIssue,
        severity: calculateSeverity(estimatedSavings),
        estimatedSavings
      });
    }
  }

  return issues;
}

/**
 * Detect low actionability sections
 */
function detectLowActionability(classified: ClassifiedSection[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  for (const c of classified) {
    if (
      c.actionability === 'low' &&
      c.staleness > THRESHOLDS.stalenessThreshold &&
      c.section.lineCount > 30
    ) {
      const partialIssue = {
        type: 'low_actionability' as IssueType,
        sectionName: c.section.name,
        sectionType: c.type,
        description: `Section "${c.section.name}" has low actionability (${Math.round(c.staleness * 100)}% stale) and ${c.section.lineCount} lines`,
        suggestedAction: 'Archive or remove; content unlikely to benefit active sessions',
        confidence: c.confidence * 0.9,
        lineRange: { start: c.section.startLine, end: c.section.endLine },
        details: {
          actionability: c.actionability,
          staleness: c.staleness,
          currentLines: c.section.lineCount,
          currentTokens: c.section.estimatedTokens
        }
      };

      const estimatedSavings = estimateTokenSavings(partialIssue);

      issues.push({
        ...partialIssue,
        severity: calculateSeverity(estimatedSavings),
        estimatedSavings
      });
    }
  }

  return issues;
}

/**
 * Detect excessive code examples
 */
function detectExcessiveExamples(classified: ClassifiedSection[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  // Regex to find code blocks
  const codeBlockRegex = /```[\s\S]*?```/g;

  for (const c of classified) {
    const codeBlocks = c.section.content.match(codeBlockRegex) || [];

    if (codeBlocks.length > THRESHOLDS.excessiveExamples) {
      const totalCodeTokens = codeBlocks.reduce((sum, block) => sum + countTokens(block), 0);
      const avgTokensPerExample = Math.round(totalCodeTokens / codeBlocks.length);

      const partialIssue = {
        type: 'excessive_examples' as IssueType,
        sectionName: c.section.name,
        sectionType: c.type,
        description: `Section "${c.section.name}" has ${codeBlocks.length} code examples (~${totalCodeTokens} tokens)`,
        suggestedAction: 'Keep 1-2 representative examples; move others to separate documentation',
        confidence: 0.8,
        lineRange: { start: c.section.startLine, end: c.section.endLine },
        details: {
          exampleCount: codeBlocks.length,
          totalCodeTokens,
          avgTokensPerExample,
          threshold: THRESHOLDS.excessiveExamples
        }
      };

      const estimatedSavings = estimateTokenSavings(partialIssue);

      issues.push({
        ...partialIssue,
        severity: calculateSeverity(estimatedSavings),
        estimatedSavings
      });
    }
  }

  return issues;
}

/**
 * Detect potential duplicate content with README or docs
 */
function detectDuplicateContent(classified: ClassifiedSection[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  // Sections that commonly duplicate README content
  const duplicateProneSections = ['commands', 'technology_stack'];
  const duplicateKeywords = [
    'installation', 'setup', 'getting started', 'quick start',
    'npm install', 'pnpm install', 'yarn install',
    'requirements', 'prerequisites'
  ];

  for (const c of classified) {
    if (duplicateProneSections.includes(c.type)) {
      const lowerContent = c.section.content.toLowerCase();
      const matchedKeywords = duplicateKeywords.filter(kw => lowerContent.includes(kw));

      if (matchedKeywords.length >= 2) {
        const partialIssue = {
          type: 'duplicate_content' as IssueType,
          sectionName: c.section.name,
          sectionType: c.type,
          description: `Section "${c.section.name}" may duplicate content from README.md`,
          suggestedAction: 'Replace with reference to README.md to reduce duplication',
          confidence: 0.7,
          lineRange: { start: c.section.startLine, end: c.section.endLine },
          details: {
            matchedKeywords,
            currentLines: c.section.lineCount,
            currentTokens: c.section.estimatedTokens
          }
        };

        const estimatedSavings = estimateTokenSavings(partialIssue);

        issues.push({
          ...partialIssue,
          severity: calculateSeverity(estimatedSavings),
          estimatedSavings
        });
      }
    }
  }

  return issues;
}

/**
 * Detect all optimization issues
 *
 * @param classified - Classified sections to analyze
 * @param staleDates - Stale dates from content analysis
 * @returns Array of detected issues sorted by severity and savings
 */
export function detectIssues(
  classified: ClassifiedSection[],
  staleDates: StaleDate[] = []
): DetectedIssue[] {
  const allIssues: DetectedIssue[] = [
    ...detectOversizedSections(classified),
    ...detectCompletedWorkVerbose(classified),
    ...detectStaleDateIssues(classified, staleDates),
    ...detectLowActionability(classified),
    ...detectExcessiveExamples(classified),
    ...detectDuplicateContent(classified)
  ];

  // Sort by severity (high first) then by estimated savings (high first)
  const severityOrder: Record<IssueSeverity, number> = { high: 0, medium: 1, low: 2 };

  return allIssues.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.estimatedSavings - a.estimatedSavings;
  });
}

/**
 * Get issues by type
 */
export function getIssuesByType(issues: DetectedIssue[], type: IssueType): DetectedIssue[] {
  return issues.filter(i => i.type === type);
}

/**
 * Get issues by severity
 */
export function getIssuesBySeverity(issues: DetectedIssue[], severity: IssueSeverity): DetectedIssue[] {
  return issues.filter(i => i.severity === severity);
}

/**
 * Get total estimated savings
 */
export function getTotalEstimatedSavings(issues: DetectedIssue[]): number {
  return issues.reduce((sum, i) => sum + i.estimatedSavings, 0);
}

/**
 * Get issue statistics
 */
export function getIssueStats(issues: DetectedIssue[]): {
  total: number;
  bySeverity: Record<IssueSeverity, number>;
  byType: Record<IssueType, number>;
  totalSavings: number;
  avgConfidence: number;
} {
  const bySeverity: Record<IssueSeverity, number> = { high: 0, medium: 0, low: 0 };
  const byType: Record<IssueType, number> = {
    oversized_section: 0,
    completed_work_verbose: 0,
    outdated_reference: 0,
    duplicate_content: 0,
    stale_dates: 0,
    low_actionability: 0,
    excessive_examples: 0
  };

  let totalConfidence = 0;

  for (const issue of issues) {
    bySeverity[issue.severity]++;
    byType[issue.type]++;
    totalConfidence += issue.confidence;
  }

  return {
    total: issues.length,
    bySeverity,
    byType,
    totalSavings: getTotalEstimatedSavings(issues),
    avgConfidence: issues.length > 0 ? totalConfidence / issues.length : 0
  };
}
