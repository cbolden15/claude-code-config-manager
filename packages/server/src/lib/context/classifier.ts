/**
 * Section Classifier for CCM v3.1 Context Optimizer
 *
 * Classifies CLAUDE.md sections by type and assesses their
 * actionability and staleness for optimization decisions.
 */

import type { ParsedSection, StaleDate } from './analyzer';

/**
 * Section type categories for CLAUDE.md content
 */
export type SectionType =
  | 'project_overview'      // Keep: essential context
  | 'current_phase'         // Keep: active work
  | 'technology_stack'      // Keep: reference
  | 'commands'              // Keep or dedupe with README
  | 'conventions'           // Keep: coding standards
  | 'completed_work'        // Archive: historical
  | 'work_sessions'         // Archive: verbose history
  | 'testing'               // Condense: keep summary
  | 'data_model'            // Keep: reference
  | 'notes'                 // Review: may be stale
  | 'unknown';              // Flag for review

/**
 * Actionability level indicating how useful the section is
 * for active Claude Code sessions
 */
export type ActionabilityLevel = 'high' | 'medium' | 'low';

/**
 * Classified section with type and assessment metadata
 */
export interface ClassifiedSection {
  /** Original parsed section data */
  section: ParsedSection;
  /** Detected section type */
  type: SectionType;
  /** How actionable the content is */
  actionability: ActionabilityLevel;
  /** Staleness score (0-1, higher = more stale) */
  staleness: number;
  /** Confidence in classification (0-1) */
  confidence: number;
  /** Matched keywords that influenced classification */
  matchedKeywords: string[];
  /** Recommendation based on classification */
  recommendation: 'keep' | 'archive' | 'condense' | 'review' | 'dedupe';
}

/**
 * Classification rule definition
 */
interface ClassificationRule {
  type: SectionType;
  /** Keywords to match in section name (case-insensitive) */
  nameKeywords: string[];
  /** Keywords to match in content (case-insensitive) */
  contentKeywords: string[];
  /** Default actionability for this type */
  defaultActionability: ActionabilityLevel;
  /** Default recommendation */
  defaultRecommendation: 'keep' | 'archive' | 'condense' | 'review' | 'dedupe';
  /** Priority (higher = matched first) */
  priority: number;
}

/**
 * Classification rules for section types
 */
const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    type: 'project_overview',
    nameKeywords: ['overview', 'project', 'introduction', 'about', 'summary', 'description'],
    contentKeywords: ['architecture', 'purpose', 'goal', 'objective'],
    defaultActionability: 'high',
    defaultRecommendation: 'keep',
    priority: 90
  },
  {
    type: 'current_phase',
    nameKeywords: ['current', 'phase', 'active', 'in progress', 'now', 'status', 'wip', 'working on'],
    contentKeywords: ['currently', 'working on', 'in progress', 'next steps', 'todo'],
    defaultActionability: 'high',
    defaultRecommendation: 'keep',
    priority: 95
  },
  {
    type: 'technology_stack',
    nameKeywords: ['technology', 'stack', 'tech', 'dependencies', 'tools', 'framework', 'libraries'],
    contentKeywords: ['node', 'react', 'typescript', 'python', 'database', 'prisma', 'next.js'],
    defaultActionability: 'high',
    defaultRecommendation: 'keep',
    priority: 80
  },
  {
    type: 'commands',
    nameKeywords: ['command', 'script', 'run', 'npm', 'pnpm', 'yarn', 'usage', 'cli'],
    contentKeywords: ['npm run', 'pnpm', 'yarn', 'bash', 'sh', './'],
    defaultActionability: 'high',
    defaultRecommendation: 'dedupe',
    priority: 70
  },
  {
    type: 'conventions',
    nameKeywords: ['convention', 'style', 'standard', 'guideline', 'rule', 'pattern', 'practice'],
    contentKeywords: ['always', 'never', 'should', 'must', 'prefer', 'avoid'],
    defaultActionability: 'high',
    defaultRecommendation: 'keep',
    priority: 85
  },
  {
    type: 'completed_work',
    nameKeywords: ['completed', 'done', 'finished', 'historical', 'archive', 'past', 'previous'],
    contentKeywords: ['completed', 'finished', 'done', 'implemented', 'released'],
    defaultActionability: 'low',
    defaultRecommendation: 'archive',
    priority: 75
  },
  {
    type: 'work_sessions',
    nameKeywords: ['session', 'log', 'history', 'changelog', 'updates', 'progress'],
    contentKeywords: ['session', 'worked on', 'updated', 'fixed', 'added', 'removed'],
    defaultActionability: 'low',
    defaultRecommendation: 'archive',
    priority: 70
  },
  {
    type: 'testing',
    nameKeywords: ['test', 'testing', 'spec', 'coverage', 'quality', 'qa'],
    contentKeywords: ['jest', 'vitest', 'pytest', 'test suite', 'coverage', 'assertion'],
    defaultActionability: 'medium',
    defaultRecommendation: 'condense',
    priority: 65
  },
  {
    type: 'data_model',
    nameKeywords: ['data', 'model', 'schema', 'database', 'entity', 'type', 'interface'],
    contentKeywords: ['table', 'column', 'field', 'relation', 'foreign key', 'prisma', 'schema'],
    defaultActionability: 'high',
    defaultRecommendation: 'keep',
    priority: 75
  },
  {
    type: 'notes',
    nameKeywords: ['note', 'todo', 'reminder', 'idea', 'thought', 'consideration', 'question'],
    contentKeywords: ['note:', 'todo:', 'fixme:', 'reminder:', 'idea:'],
    defaultActionability: 'medium',
    defaultRecommendation: 'review',
    priority: 50
  }
];

/**
 * Classify a section by analyzing its name and content
 *
 * @param name - Section header name
 * @param content - Section content
 * @returns Detected section type with confidence
 */
export function classifySection(
  name: string,
  content: string
): { type: SectionType; confidence: number; matchedKeywords: string[] } {
  const lowerName = name.toLowerCase();
  const lowerContent = content.toLowerCase();
  const matchedKeywords: string[] = [];

  let bestMatch: { type: SectionType; score: number; keywords: string[] } | null = null;

  // Sort rules by priority (highest first)
  const sortedRules = [...CLASSIFICATION_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    let score = 0;
    const keywords: string[] = [];

    // Check name keywords (higher weight)
    for (const keyword of rule.nameKeywords) {
      if (lowerName.includes(keyword)) {
        score += 3;
        keywords.push(keyword);
      }
    }

    // Check content keywords (lower weight)
    for (const keyword of rule.contentKeywords) {
      if (lowerContent.includes(keyword)) {
        score += 1;
        keywords.push(keyword);
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { type: rule.type, score, keywords };
    }
  }

  if (bestMatch) {
    // Calculate confidence based on score (max reasonable score ~15)
    const confidence = Math.min(bestMatch.score / 10, 1.0);
    return {
      type: bestMatch.type,
      confidence,
      matchedKeywords: bestMatch.keywords
    };
  }

  return { type: 'unknown', confidence: 0, matchedKeywords: [] };
}

/**
 * Assess actionability of a section
 *
 * Determines how useful the section content is for active
 * Claude Code sessions based on:
 * - Section type
 * - Content recency
 * - Presence of actionable items
 *
 * @param section - The section to assess
 * @param type - Classified section type
 * @param staleDates - Any stale dates found in the section
 * @returns Actionability level
 */
export function assessActionability(
  section: ParsedSection,
  type: SectionType,
  staleDates: StaleDate[] = []
): ActionabilityLevel {
  const rule = CLASSIFICATION_RULES.find(r => r.type === type);
  let actionability = rule?.defaultActionability || 'medium';

  // Reduce actionability if section has many stale dates
  const sectionStaleDates = staleDates.filter(
    sd => sd.lineNumber >= section.startLine && sd.lineNumber <= section.endLine
  );

  if (sectionStaleDates.length > 3) {
    // Many stale dates = lower actionability
    if (actionability === 'high') actionability = 'medium';
    else if (actionability === 'medium') actionability = 'low';
  }

  // Large sections with low-value types are less actionable
  if (section.lineCount > 100 && ['completed_work', 'work_sessions', 'notes'].includes(type)) {
    actionability = 'low';
  }

  // Small sections are usually more focused and actionable
  if (section.lineCount < 20 && actionability === 'medium') {
    actionability = 'high';
  }

  return actionability;
}

/**
 * Assess staleness of a section
 *
 * Returns a score from 0 (fresh) to 1 (very stale) based on:
 * - Date references in content
 * - Section type (historical sections are inherently stale)
 * - Content patterns indicating age
 *
 * @param section - The section to assess
 * @param type - Classified section type
 * @param staleDates - Stale dates found in the content
 * @returns Staleness score (0-1)
 */
export function assessStaleness(
  section: ParsedSection,
  type: SectionType,
  staleDates: StaleDate[] = []
): number {
  let staleness = 0;

  // Filter stale dates to this section
  const sectionStaleDates = staleDates.filter(
    sd => sd.lineNumber >= section.startLine && sd.lineNumber <= section.endLine
  );

  // Add staleness based on date references
  if (sectionStaleDates.length > 0) {
    // Average days old, normalized
    const avgDaysOld = sectionStaleDates.reduce((sum, sd) => sum + sd.daysOld, 0) / sectionStaleDates.length;
    // 365 days old = 0.5 staleness from dates
    staleness += Math.min(avgDaysOld / 730, 0.5);
  }

  // Add staleness based on section type
  const typeStalenessBias: Record<SectionType, number> = {
    'completed_work': 0.4,
    'work_sessions': 0.4,
    'notes': 0.2,
    'testing': 0.1,
    'commands': 0,
    'conventions': 0,
    'data_model': 0,
    'technology_stack': 0,
    'project_overview': 0,
    'current_phase': 0,
    'unknown': 0.1
  };

  staleness += typeStalenessBias[type] || 0;

  // Check for stale content patterns
  const content = section.content.toLowerCase();
  const stalePatterns = [
    'deprecated',
    'obsolete',
    'legacy',
    'old approach',
    'no longer',
    'removed',
    'was using',
    'used to'
  ];

  for (const pattern of stalePatterns) {
    if (content.includes(pattern)) {
      staleness += 0.1;
    }
  }

  return Math.min(staleness, 1.0);
}

/**
 * Get recommendation for a section based on classification
 */
function getRecommendation(
  type: SectionType,
  actionability: ActionabilityLevel,
  staleness: number,
  lineCount: number
): 'keep' | 'archive' | 'condense' | 'review' | 'dedupe' {
  const rule = CLASSIFICATION_RULES.find(r => r.type === type);
  let recommendation = rule?.defaultRecommendation || 'review';

  // Override based on analysis
  if (staleness > 0.7 && actionability === 'low') {
    recommendation = 'archive';
  } else if (lineCount > 150 && actionability !== 'high') {
    recommendation = 'condense';
  } else if (staleness > 0.5 && recommendation === 'keep') {
    recommendation = 'review';
  }

  return recommendation;
}

/**
 * Classify all sections from an analysis
 *
 * @param sections - Parsed sections to classify
 * @param staleDates - Stale dates from analysis
 * @returns Array of classified sections
 */
export function classifySections(
  sections: ParsedSection[],
  staleDates: StaleDate[] = []
): ClassifiedSection[] {
  return sections.map(section => {
    const { type, confidence, matchedKeywords } = classifySection(section.name, section.content);
    const actionability = assessActionability(section, type, staleDates);
    const staleness = assessStaleness(section, type, staleDates);
    const recommendation = getRecommendation(type, actionability, staleness, section.lineCount);

    return {
      section,
      type,
      actionability,
      staleness,
      confidence,
      matchedKeywords,
      recommendation
    };
  });
}

/**
 * Get sections by type
 */
export function getSectionsByType(
  classified: ClassifiedSection[],
  type: SectionType
): ClassifiedSection[] {
  return classified.filter(c => c.type === type);
}

/**
 * Get sections by actionability
 */
export function getSectionsByActionability(
  classified: ClassifiedSection[],
  level: ActionabilityLevel
): ClassifiedSection[] {
  return classified.filter(c => c.actionability === level);
}

/**
 * Get sections needing attention (archive, condense, or review)
 */
export function getSectionsNeedingAttention(classified: ClassifiedSection[]): ClassifiedSection[] {
  return classified.filter(c =>
    c.recommendation === 'archive' ||
    c.recommendation === 'condense' ||
    c.recommendation === 'review'
  );
}

/**
 * Get classification statistics
 */
export function getClassificationStats(classified: ClassifiedSection[]): {
  byType: Record<SectionType, number>;
  byActionability: Record<ActionabilityLevel, number>;
  byRecommendation: Record<string, number>;
  avgStaleness: number;
  avgConfidence: number;
} {
  const byType: Record<SectionType, number> = {
    project_overview: 0,
    current_phase: 0,
    technology_stack: 0,
    commands: 0,
    conventions: 0,
    completed_work: 0,
    work_sessions: 0,
    testing: 0,
    data_model: 0,
    notes: 0,
    unknown: 0
  };

  const byActionability: Record<ActionabilityLevel, number> = {
    high: 0,
    medium: 0,
    low: 0
  };

  const byRecommendation: Record<string, number> = {
    keep: 0,
    archive: 0,
    condense: 0,
    review: 0,
    dedupe: 0
  };

  let totalStaleness = 0;
  let totalConfidence = 0;

  for (const c of classified) {
    byType[c.type]++;
    byActionability[c.actionability]++;
    byRecommendation[c.recommendation]++;
    totalStaleness += c.staleness;
    totalConfidence += c.confidence;
  }

  return {
    byType,
    byActionability,
    byRecommendation,
    avgStaleness: classified.length > 0 ? totalStaleness / classified.length : 0,
    avgConfidence: classified.length > 0 ? totalConfidence / classified.length : 0
  };
}
