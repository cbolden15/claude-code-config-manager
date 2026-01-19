/**
 * Optimization Rules for CCM v3.1 Context Optimizer
 *
 * Pre-configured and user-customizable rules for detecting
 * optimization opportunities in CLAUDE.md files.
 */

import type { ClassifiedSection, SectionType } from './classifier';
import type { DetectedIssue, IssueType, IssueSeverity } from './detector';
import { countTokens } from './analyzer';

/**
 * Rule action types
 */
export type RuleActionType = 'archive' | 'condense' | 'remove' | 'flag' | 'dedupe';

/**
 * Rule action configuration
 */
export interface RuleAction {
  /** Type of action to take */
  type: RuleActionType;
  /** For condense: number of lines to keep */
  keepLines?: number;
  /** For condense: format style */
  format?: 'bullet_summary' | 'first_n_lines' | 'key_points';
  /** For archive: summary template */
  summaryTemplate?: string;
  /** For dedupe: reference file */
  referenceFile?: string;
  /** For dedupe: replacement template */
  replacementTemplate?: string;
  /** For flag: message to show */
  message?: string;
}

/**
 * Optimization rule definition
 */
export interface OptimizationRule {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of what the rule does */
  description?: string;
  /** Rule type/category */
  ruleType: RuleActionType;
  /** Regex pattern to match section headers */
  sectionPattern?: RegExp;
  /** Regex pattern to match content */
  contentPattern?: RegExp;
  /** Section types this rule applies to */
  sectionTypes?: SectionType[];
  /** Minimum age in days before applying */
  ageThreshold?: number;
  /** Minimum lines before applying */
  lineThreshold?: number;
  /** Minimum tokens before applying */
  tokenThreshold?: number;
  /** Staleness threshold (0-1) */
  stalenessThreshold?: number;
  /** Action to take when rule matches */
  action: RuleAction;
  /** Whether rule is enabled */
  enabled: boolean;
  /** Priority (higher = applied first) */
  priority: number;
  /** Issue type to generate */
  issueType?: IssueType;
  /** Severity when this rule matches */
  severity?: IssueSeverity;
}

/**
 * Default optimization rules
 */
export const DEFAULT_RULES: OptimizationRule[] = [
  {
    id: 'archive-completed-work',
    name: 'Archive Completed Work',
    description: 'Archive sections containing completed or historical work',
    ruleType: 'archive',
    sectionPattern: /^#{1,3}\s*(Completed|Done|Finished|Historical|Past|Previous)\s/i,
    sectionTypes: ['completed_work', 'work_sessions'],
    lineThreshold: 50,
    action: {
      type: 'archive',
      summaryTemplate: 'See `.claude/archives/{filename}` for {lineCount} lines of historical work.'
    },
    enabled: true,
    priority: 100,
    issueType: 'completed_work_verbose',
    severity: 'high'
  },
  {
    id: 'condense-work-sessions',
    name: 'Condense Work Sessions',
    description: 'Condense verbose session logs to bullet summaries',
    ruleType: 'condense',
    sectionPattern: /^#{1,3}\s*(Work\s+Sessions?|Session\s+Log|Session\s+History|Updates?|Changelog)/i,
    sectionTypes: ['work_sessions'],
    lineThreshold: 100,
    action: {
      type: 'condense',
      keepLines: 10,
      format: 'bullet_summary'
    },
    enabled: true,
    priority: 90,
    issueType: 'oversized_section',
    severity: 'medium'
  },
  {
    id: 'flag-stale-dates',
    name: 'Flag Stale Dates',
    description: 'Flag content with outdated date references',
    ruleType: 'flag',
    contentPattern: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+202[0-4]\b/i,
    ageThreshold: 60,
    action: {
      type: 'flag',
      message: 'Contains potentially outdated date references'
    },
    enabled: true,
    priority: 50,
    issueType: 'stale_dates',
    severity: 'low'
  },
  {
    id: 'dedupe-readme-installation',
    name: 'Dedupe with README (Installation)',
    description: 'Replace installation instructions with README reference',
    ruleType: 'dedupe',
    sectionPattern: /^#{1,3}\s*(Installation|Setup|Getting\s+Started|Quick\s+Start)/i,
    contentPattern: /(npm|pnpm|yarn)\s+(install|i)\b/,
    lineThreshold: 20,
    action: {
      type: 'dedupe',
      referenceFile: 'README.md',
      replacementTemplate: 'See `README.md` for installation instructions.'
    },
    enabled: true,
    priority: 70,
    issueType: 'duplicate_content',
    severity: 'medium'
  },
  {
    id: 'dedupe-readme-commands',
    name: 'Dedupe with README (Commands)',
    description: 'Replace command reference with README link if duplicated',
    ruleType: 'dedupe',
    sectionPattern: /^#{1,3}\s*(Commands?|Scripts?|NPM\s+Scripts|Available\s+Commands)/i,
    sectionTypes: ['commands'],
    lineThreshold: 30,
    action: {
      type: 'dedupe',
      referenceFile: 'README.md',
      replacementTemplate: 'See `README.md` for available commands.'
    },
    enabled: false, // Disabled by default - commands often need to be in CLAUDE.md
    priority: 60,
    issueType: 'duplicate_content',
    severity: 'low'
  },
  {
    id: 'archive-old-notes',
    name: 'Archive Old Notes',
    description: 'Archive notes sections that are stale',
    ruleType: 'archive',
    sectionPattern: /^#{1,3}\s*(Notes?|Ideas?|Thoughts?|Considerations?)/i,
    sectionTypes: ['notes'],
    stalenessThreshold: 0.7,
    lineThreshold: 30,
    action: {
      type: 'archive',
      summaryTemplate: 'Historical notes archived to `.claude/archives/{filename}`'
    },
    enabled: true,
    priority: 40,
    issueType: 'low_actionability',
    severity: 'low'
  },
  {
    id: 'condense-testing',
    name: 'Condense Testing Sections',
    description: 'Condense verbose testing documentation',
    ruleType: 'condense',
    sectionPattern: /^#{1,3}\s*(Test(s|ing)?|Test\s+Plan|Test\s+Coverage|QA)/i,
    sectionTypes: ['testing'],
    lineThreshold: 150,
    action: {
      type: 'condense',
      keepLines: 40,
      format: 'key_points'
    },
    enabled: true,
    priority: 55,
    issueType: 'oversized_section',
    severity: 'medium'
  },
  {
    id: 'archive-implementation-details',
    name: 'Archive Implementation Details',
    description: 'Archive detailed implementation notes that are no longer current',
    ruleType: 'archive',
    sectionPattern: /^#{1,3}\s*(Implementation|Technical\s+Details?|Design\s+Notes?)/i,
    stalenessThreshold: 0.6,
    lineThreshold: 100,
    action: {
      type: 'archive',
      summaryTemplate: 'Implementation details archived. See `.claude/archives/{filename}` if needed.'
    },
    enabled: true,
    priority: 45,
    issueType: 'low_actionability',
    severity: 'medium'
  },
  {
    id: 'condense-examples',
    name: 'Condense Excessive Examples',
    description: 'Reduce number of code examples',
    ruleType: 'condense',
    contentPattern: /```[\s\S]*?```/g,
    tokenThreshold: 3000,
    action: {
      type: 'condense',
      keepLines: 50,
      format: 'first_n_lines'
    },
    enabled: true,
    priority: 35,
    issueType: 'excessive_examples',
    severity: 'low'
  },
  {
    id: 'flag-large-sections',
    name: 'Flag Large Sections',
    description: 'Flag any section over 200 lines for review',
    ruleType: 'flag',
    lineThreshold: 200,
    action: {
      type: 'flag',
      message: 'Section is over 200 lines - consider splitting or condensing'
    },
    enabled: true,
    priority: 30,
    issueType: 'oversized_section',
    severity: 'high'
  }
];

/**
 * Check if a section matches a rule's patterns
 *
 * @param section - Classified section to check
 * @param rule - Rule to match against
 * @returns Whether the section matches the rule
 */
export function matchesPattern(
  section: ClassifiedSection,
  rule: OptimizationRule
): boolean {
  // Check section types if specified
  if (rule.sectionTypes && rule.sectionTypes.length > 0) {
    if (!rule.sectionTypes.includes(section.type)) {
      return false;
    }
  }

  // Check section name pattern
  if (rule.sectionPattern) {
    if (!rule.sectionPattern.test(section.section.name)) {
      return false;
    }
  }

  // Check content pattern
  if (rule.contentPattern) {
    if (!rule.contentPattern.test(section.section.content)) {
      return false;
    }
  }

  // Check line threshold
  if (rule.lineThreshold !== undefined) {
    if (section.section.lineCount < rule.lineThreshold) {
      return false;
    }
  }

  // Check token threshold
  if (rule.tokenThreshold !== undefined) {
    if (section.section.estimatedTokens < rule.tokenThreshold) {
      return false;
    }
  }

  // Check staleness threshold
  if (rule.stalenessThreshold !== undefined) {
    if (section.staleness < rule.stalenessThreshold) {
      return false;
    }
  }

  return true;
}

/**
 * Apply rules to classified sections and generate issues
 *
 * @param sections - Classified sections to analyze
 * @param rules - Rules to apply (defaults to DEFAULT_RULES)
 * @returns Array of detected issues from rule matches
 */
export function applyRules(
  sections: ClassifiedSection[],
  rules: OptimizationRule[] = DEFAULT_RULES
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  // Filter to enabled rules and sort by priority
  const enabledRules = rules
    .filter(r => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  // Track which sections have been matched to avoid duplicates
  const matchedSections = new Set<string>();

  for (const rule of enabledRules) {
    for (const section of sections) {
      // Skip if already matched by higher priority rule
      const sectionKey = `${section.section.name}:${rule.ruleType}`;
      if (matchedSections.has(sectionKey)) {
        continue;
      }

      if (matchesPattern(section, rule)) {
        matchedSections.add(sectionKey);

        // Estimate savings based on action type
        let estimatedSavings = 0;
        switch (rule.action.type) {
          case 'archive':
            estimatedSavings = Math.round(section.section.estimatedTokens * 0.95);
            break;
          case 'condense':
            const keepLines = rule.action.keepLines || 10;
            const reduction = Math.max(0, section.section.lineCount - keepLines) / section.section.lineCount;
            estimatedSavings = Math.round(section.section.estimatedTokens * reduction);
            break;
          case 'dedupe':
            estimatedSavings = Math.round(section.section.estimatedTokens * 0.9);
            break;
          case 'remove':
            estimatedSavings = section.section.estimatedTokens;
            break;
          case 'flag':
            estimatedSavings = 0; // Flags don't save tokens directly
            break;
        }

        issues.push({
          type: rule.issueType || 'low_actionability',
          severity: rule.severity || 'medium',
          sectionName: section.section.name,
          sectionType: section.type,
          description: rule.description || `Rule "${rule.name}" matched`,
          suggestedAction: getActionDescription(rule.action),
          estimatedSavings,
          confidence: 0.85, // Rule-based detection has consistent confidence
          lineRange: {
            start: section.section.startLine,
            end: section.section.endLine
          },
          details: {
            ruleId: rule.id,
            ruleName: rule.name,
            actionType: rule.action.type,
            matchedThresholds: {
              lines: rule.lineThreshold,
              tokens: rule.tokenThreshold,
              staleness: rule.stalenessThreshold
            }
          }
        });
      }
    }
  }

  return issues;
}

/**
 * Get human-readable action description
 */
function getActionDescription(action: RuleAction): string {
  switch (action.type) {
    case 'archive':
      return action.summaryTemplate
        ? `Archive content: ${action.summaryTemplate}`
        : 'Archive to .claude/archives/ and replace with reference';
    case 'condense':
      return `Condense to ${action.keepLines || 10} lines using ${action.format || 'summary'} format`;
    case 'dedupe':
      return action.replacementTemplate
        ? `Replace with reference: ${action.replacementTemplate}`
        : `Dedupe with ${action.referenceFile || 'README.md'}`;
    case 'remove':
      return 'Remove section entirely';
    case 'flag':
      return action.message || 'Flagged for review';
    default:
      return 'Unknown action';
  }
}

/**
 * Get rule by ID
 */
export function getRuleById(id: string, rules: OptimizationRule[] = DEFAULT_RULES): OptimizationRule | undefined {
  return rules.find(r => r.id === id);
}

/**
 * Get rules by type
 */
export function getRulesByType(
  type: RuleActionType,
  rules: OptimizationRule[] = DEFAULT_RULES
): OptimizationRule[] {
  return rules.filter(r => r.ruleType === type);
}

/**
 * Get enabled rules
 */
export function getEnabledRules(rules: OptimizationRule[] = DEFAULT_RULES): OptimizationRule[] {
  return rules.filter(r => r.enabled);
}

/**
 * Create a custom rule
 */
export function createRule(
  config: Omit<OptimizationRule, 'id'> & { id?: string }
): OptimizationRule {
  return {
    id: config.id || `custom-${Date.now()}`,
    ...config
  };
}

/**
 * Merge custom rules with defaults
 */
export function mergeRules(
  customRules: OptimizationRule[],
  defaults: OptimizationRule[] = DEFAULT_RULES
): OptimizationRule[] {
  const merged = [...defaults];

  for (const custom of customRules) {
    const existingIndex = merged.findIndex(r => r.id === custom.id);
    if (existingIndex >= 0) {
      // Override existing rule
      merged[existingIndex] = custom;
    } else {
      // Add new rule
      merged.push(custom);
    }
  }

  return merged.sort((a, b) => b.priority - a.priority);
}

/**
 * Validate a rule configuration
 */
export function validateRule(rule: Partial<OptimizationRule>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!rule.name) {
    errors.push('Rule must have a name');
  }

  if (!rule.ruleType) {
    errors.push('Rule must have a ruleType');
  }

  if (!rule.action) {
    errors.push('Rule must have an action');
  } else if (!rule.action.type) {
    errors.push('Action must have a type');
  }

  // Must have at least one matching criteria
  if (
    !rule.sectionPattern &&
    !rule.contentPattern &&
    !rule.sectionTypes?.length &&
    rule.lineThreshold === undefined &&
    rule.tokenThreshold === undefined &&
    rule.stalenessThreshold === undefined
  ) {
    errors.push('Rule must have at least one matching criterion (pattern, sectionTypes, or threshold)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
