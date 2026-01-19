/**
 * Context Optimizer for CCM v3.1
 *
 * Intelligent CLAUDE.md optimization engine that analyzes, recommends,
 * and applies context file improvements to reduce token waste.
 *
 * @module context
 */

// Re-export all types and functions from submodules
export * from './analyzer';
export * from './classifier';
export * from './detector';
export * from './optimizer';
export * from './archiver';
export * from './rules';

// Import for orchestration functions
import {
  analyzeFile,
  analyzeContent,
  type AnalysisResult,
  countTokens
} from './analyzer';
import {
  classifySections,
  type ClassifiedSection,
  getClassificationStats
} from './classifier';
import {
  detectIssues,
  type DetectedIssue,
  getIssueStats,
  getTotalEstimatedSavings
} from './detector';
import {
  generatePlan,
  applyPlan,
  getRecommendedStrategy,
  type OptimizationPlan,
  type OptimizationResult,
  type Strategy
} from './optimizer';
import {
  createArchive,
  type ArchiveContent
} from './archiver';
import {
  applyRules,
  DEFAULT_RULES,
  type OptimizationRule
} from './rules';

/**
 * Complete analysis result with all optimization information
 */
export interface ContextAnalysis {
  /** File analysis data */
  analysis: AnalysisResult;
  /** Classified sections */
  classified: ClassifiedSection[];
  /** Detected issues */
  issues: DetectedIssue[];
  /** Recommended optimization strategy */
  recommendedStrategy: Strategy;
  /** Optimization score (0-100, higher = more optimized) */
  optimizationScore: number;
  /** Summary statistics */
  summary: {
    totalLines: number;
    totalTokens: number;
    sectionsCount: number;
    issuesCount: number;
    estimatedSavings: number;
    savingsPercent: number;
  };
}

/**
 * Perform complete analysis of a CLAUDE.md file
 *
 * This is the main entry point for analyzing context files.
 * It orchestrates parsing, classification, and issue detection.
 *
 * @param filePath - Path to the CLAUDE.md file
 * @param rules - Optional custom rules (defaults to DEFAULT_RULES)
 * @returns Complete context analysis
 *
 * @example
 * ```typescript
 * const analysis = await analyze('/path/to/project/CLAUDE.md');
 * console.log(`Optimization score: ${analysis.optimizationScore}`);
 * console.log(`Potential savings: ${analysis.summary.estimatedSavings} tokens`);
 * ```
 */
export async function analyze(
  filePath: string,
  rules: OptimizationRule[] = DEFAULT_RULES
): Promise<ContextAnalysis> {
  // Step 1: Parse the file
  const analysis = await analyzeFile(filePath);

  // Step 2: Classify sections
  const classified = classifySections(analysis.sections, analysis.staleDates);

  // Step 3: Detect issues using both heuristics and rules
  const heuristicIssues = detectIssues(classified, analysis.staleDates);
  const ruleIssues = applyRules(classified, rules);

  // Merge and dedupe issues
  const issueMap = new Map<string, DetectedIssue>();
  for (const issue of [...heuristicIssues, ...ruleIssues]) {
    const key = `${issue.sectionName}:${issue.type}`;
    if (!issueMap.has(key) || issue.estimatedSavings > issueMap.get(key)!.estimatedSavings) {
      issueMap.set(key, issue);
    }
  }
  const issues = Array.from(issueMap.values());

  // Step 4: Calculate optimization score
  const estimatedSavings = getTotalEstimatedSavings(issues);
  const savingsPercent = analysis.totalTokens > 0
    ? Math.round((estimatedSavings / analysis.totalTokens) * 100)
    : 0;

  // Score is inversely related to potential savings
  // 100 = no issues, 0 = could save 100% of tokens
  const optimizationScore = Math.max(0, 100 - savingsPercent);

  // Step 5: Get recommended strategy
  const recommendedStrategy = getRecommendedStrategy(analysis, issues);

  return {
    analysis,
    classified,
    issues,
    recommendedStrategy,
    optimizationScore,
    summary: {
      totalLines: analysis.totalLines,
      totalTokens: analysis.totalTokens,
      sectionsCount: classified.length,
      issuesCount: issues.length,
      estimatedSavings,
      savingsPercent
    }
  };
}

/**
 * Analyze content directly (without file I/O)
 *
 * @param content - Raw CLAUDE.md content
 * @param rules - Optional custom rules
 * @returns Complete context analysis
 */
export function analyzeContentSync(
  content: string,
  rules: OptimizationRule[] = DEFAULT_RULES
): ContextAnalysis {
  const analysis = analyzeContent(content);
  const classified = classifySections(analysis.sections, analysis.staleDates);

  const heuristicIssues = detectIssues(classified, analysis.staleDates);
  const ruleIssues = applyRules(classified, rules);

  const issueMap = new Map<string, DetectedIssue>();
  for (const issue of [...heuristicIssues, ...ruleIssues]) {
    const key = `${issue.sectionName}:${issue.type}`;
    if (!issueMap.has(key) || issue.estimatedSavings > issueMap.get(key)!.estimatedSavings) {
      issueMap.set(key, issue);
    }
  }
  const issues = Array.from(issueMap.values());

  const estimatedSavings = getTotalEstimatedSavings(issues);
  const savingsPercent = analysis.totalTokens > 0
    ? Math.round((estimatedSavings / analysis.totalTokens) * 100)
    : 0;
  const optimizationScore = Math.max(0, 100 - savingsPercent);
  const recommendedStrategy = getRecommendedStrategy(analysis, issues);

  return {
    analysis,
    classified,
    issues,
    recommendedStrategy,
    optimizationScore,
    summary: {
      totalLines: analysis.totalLines,
      totalTokens: analysis.totalTokens,
      sectionsCount: classified.length,
      issuesCount: issues.length,
      estimatedSavings,
      savingsPercent
    }
  };
}

/**
 * Complete optimization result
 */
export interface OptimizationOutput {
  /** Optimization result */
  result: OptimizationResult;
  /** Archives created */
  archives: ArchiveContent[];
  /** Plan that was applied */
  plan: OptimizationPlan;
}

/**
 * Optimize a CLAUDE.md file
 *
 * Generates and applies an optimization plan based on analysis.
 *
 * @param contextAnalysis - Previous analysis result
 * @param strategy - Strategy to use (or uses recommended)
 * @param projectPath - Project path for archives
 * @returns Optimization output with new content and archives
 *
 * @example
 * ```typescript
 * const analysis = await analyze('/path/to/CLAUDE.md');
 * const output = optimize(analysis, 'moderate', '/path/to/project');
 * console.log(`Saved ${output.result.summary.tokensSaved} tokens`);
 * console.log(`New content: ${output.result.newContent}`);
 * ```
 */
export function optimize(
  contextAnalysis: ContextAnalysis,
  strategy?: Strategy,
  projectPath: string = '.'
): OptimizationOutput {
  const selectedStrategy = strategy || contextAnalysis.recommendedStrategy;

  // Generate plan
  const plan = generatePlan(
    contextAnalysis.analysis,
    contextAnalysis.classified,
    contextAnalysis.issues,
    selectedStrategy
  );

  // Apply plan
  const result = applyPlan(plan, contextAnalysis.analysis.rawContent);

  // Create archives for archived sections
  const archives: ArchiveContent[] = [];
  for (const action of result.appliedActions) {
    if (action.type === 'archive') {
      const section = contextAnalysis.classified.find(
        c => c.section.name === action.sectionName
      );
      if (section) {
        archives.push(createArchive(section, projectPath, action.reason));
      }
    }
  }

  return {
    result,
    archives,
    plan
  };
}

/**
 * Calculate context optimization score for health calculator
 *
 * Returns a score from 0-100 based on how well optimized the context is.
 *
 * @param content - CLAUDE.md content
 * @returns Optimization score (0-100)
 */
export function calculateContextOptimizationScore(content: string): number {
  if (!content || content.trim().length === 0) {
    return 100; // Empty context is fully optimized
  }

  const analysis = analyzeContentSync(content);
  return analysis.optimizationScore;
}

/**
 * Get quick stats about a CLAUDE.md file
 *
 * @param content - File content
 * @returns Quick statistics
 */
export function getQuickStats(content: string): {
  lines: number;
  tokens: number;
  sections: number;
  score: number;
} {
  const tokens = countTokens(content);
  const lines = content.split('\n').length;
  const analysis = analyzeContentSync(content);

  return {
    lines,
    tokens,
    sections: analysis.classified.length,
    score: analysis.optimizationScore
  };
}

/**
 * Check if content needs optimization
 *
 * @param content - CLAUDE.md content
 * @param threshold - Score threshold (default 70)
 * @returns Whether optimization is recommended
 */
export function needsOptimization(content: string, threshold: number = 70): boolean {
  const analysis = analyzeContentSync(content);
  return analysis.optimizationScore < threshold;
}

/**
 * Get optimization recommendations as strings
 *
 * @param content - CLAUDE.md content
 * @returns Array of recommendation strings
 */
export function getRecommendations(content: string): string[] {
  const analysis = analyzeContentSync(content);
  const recommendations: string[] = [];

  if (analysis.issues.length === 0) {
    recommendations.push('Content is well optimized. No issues detected.');
    return recommendations;
  }

  // Group by severity
  const highIssues = analysis.issues.filter(i => i.severity === 'high');
  const mediumIssues = analysis.issues.filter(i => i.severity === 'medium');

  for (const issue of highIssues) {
    recommendations.push(`[HIGH] ${issue.description} → ${issue.suggestedAction}`);
  }

  for (const issue of mediumIssues.slice(0, 3)) {
    recommendations.push(`[MEDIUM] ${issue.description} → ${issue.suggestedAction}`);
  }

  if (analysis.summary.estimatedSavings > 0) {
    recommendations.push(
      `Total potential savings: ~${analysis.summary.estimatedSavings} tokens (${analysis.summary.savingsPercent}%)`
    );
  }

  return recommendations;
}
