/**
 * CLAUDE.md Analyzer for CCM v3.1 Context Optimizer
 *
 * Parses and analyzes CLAUDE.md files to extract sections, count tokens,
 * and detect optimization opportunities.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Represents a parsed section from CLAUDE.md
 */
export interface ParsedSection {
  /** Section header name */
  name: string;
  /** Header level (1-6 based on # count) */
  level: number;
  /** Starting line number (1-indexed) */
  startLine: number;
  /** Ending line number (1-indexed) */
  endLine: number;
  /** Number of lines in section */
  lineCount: number;
  /** Raw content of the section (excluding header) */
  content: string;
  /** Estimated token count */
  estimatedTokens: number;
}

/**
 * Result of analyzing a CLAUDE.md file
 */
export interface AnalysisResult {
  /** Path to the analyzed file */
  filePath: string;
  /** Total number of lines */
  totalLines: number;
  /** Total estimated tokens */
  totalTokens: number;
  /** Parsed sections */
  sections: ParsedSection[];
  /** Stale date references found */
  staleDates: StaleDate[];
  /** Raw file content */
  rawContent: string;
  /** Analysis timestamp */
  analyzedAt: Date;
}

/**
 * Stale date reference detected in content
 */
export interface StaleDate {
  /** The date string found */
  dateString: string;
  /** Line number where found */
  lineNumber: number;
  /** Context around the date */
  context: string;
  /** How many days old the reference is */
  daysOld: number;
}

/**
 * Estimate token count from text
 *
 * Uses approximation of ~4 characters per token (OpenAI/Claude average).
 * This is a rough estimate; actual tokenization varies by model.
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function countTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }
  // ~4 characters per token is a reasonable approximation
  // Accounting for whitespace and special characters
  return Math.ceil(text.length / 4);
}

/**
 * Parse CLAUDE.md content into sections
 *
 * Detects markdown headers (# through ######) and splits content
 * into logical sections.
 *
 * @param content - Raw markdown content
 * @returns Array of parsed sections
 */
export function parseClaudeMd(content: string): ParsedSection[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const lines = content.split('\n');
  const sections: ParsedSection[] = [];

  // Regex to match markdown headers
  const headerRegex = /^(#{1,6})\s+(.+)$/;

  let currentSection: {
    name: string;
    level: number;
    startLine: number;
    contentLines: string[];
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1; // 1-indexed
    const line = lines[i];
    const match = line.match(headerRegex);

    if (match) {
      // Found a header - save previous section if exists
      if (currentSection) {
        const content = currentSection.contentLines.join('\n').trim();
        sections.push({
          name: currentSection.name,
          level: currentSection.level,
          startLine: currentSection.startLine,
          endLine: lineNumber - 1,
          lineCount: lineNumber - currentSection.startLine,
          content,
          estimatedTokens: countTokens(content)
        });
      }

      // Start new section
      currentSection = {
        name: match[2].trim(),
        level: match[1].length,
        startLine: lineNumber,
        contentLines: []
      };
    } else if (currentSection) {
      // Add line to current section
      currentSection.contentLines.push(line);
    }
  }

  // Don't forget the last section
  if (currentSection) {
    const content = currentSection.contentLines.join('\n').trim();
    sections.push({
      name: currentSection.name,
      level: currentSection.level,
      startLine: currentSection.startLine,
      endLine: lines.length,
      lineCount: lines.length - currentSection.startLine + 1,
      content,
      estimatedTokens: countTokens(content)
    });
  }

  return sections;
}

/**
 * Detect stale/outdated date references in content
 *
 * Identifies date references that may be outdated, such as:
 * - Specific dates more than 30 days old
 * - Year references from previous years
 * - Month/Year combinations that are old
 *
 * @param content - Content to scan for stale dates
 * @returns Array of stale date references
 */
export function detectStaleDates(content: string): StaleDate[] {
  if (!content) {
    return [];
  }

  const lines = content.split('\n');
  const staleDates: StaleDate[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  // Pattern for full dates: "January 15, 2025" or "Jan 15 2025" or "2025-01-15"
  const fullDatePatterns = [
    // "January 15, 2025" or "January 15 2025"
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
    // "Jan 15, 2025"
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
    // ISO format "2025-01-15"
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    // "01/15/2025" or "01-15-2025"
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g
  ];

  // Month name to number mapping
  const monthMap: Record<string, number> = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    // Check full date patterns
    for (const pattern of fullDatePatterns) {
      pattern.lastIndex = 0; // Reset regex state
      let match;

      while ((match = pattern.exec(line)) !== null) {
        let parsedDate: Date | null = null;
        const dateString = match[0];

        // Try to parse the date based on pattern type
        if (match[1].length === 4 && !isNaN(parseInt(match[1]))) {
          // ISO format: YYYY-MM-DD
          parsedDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        } else if (!isNaN(parseInt(match[3])) && match[3].length === 4) {
          // Month name format or MM/DD/YYYY
          const monthStr = match[1].toLowerCase();
          if (monthMap[monthStr] !== undefined) {
            parsedDate = new Date(parseInt(match[3]), monthMap[monthStr], parseInt(match[2]));
          } else {
            // MM/DD/YYYY format
            parsedDate = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
          }
        }

        if (parsedDate && !isNaN(parsedDate.getTime())) {
          const daysOld = Math.floor((now.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));

          // Consider dates more than 30 days old as potentially stale
          if (daysOld > 30) {
            // Get context (surrounding text, truncated)
            const contextStart = Math.max(0, match.index - 30);
            const contextEnd = Math.min(line.length, match.index + dateString.length + 30);
            const context = line.substring(contextStart, contextEnd).trim();

            staleDates.push({
              dateString,
              lineNumber,
              context: context.length < line.length ? `...${context}...` : context,
              daysOld
            });
          }
        }
      }
    }

    // Check for year-only references to old years
    const yearPattern = /\b(202[0-4])\b/g;
    let yearMatch;
    while ((yearMatch = yearPattern.exec(line)) !== null) {
      const year = parseInt(yearMatch[1]);
      if (year < currentYear) {
        const daysOld = Math.floor((now.getTime() - new Date(year, 11, 31).getTime()) / (1000 * 60 * 60 * 24));

        // Skip if this looks like a version number or code
        const surroundingText = line.substring(
          Math.max(0, yearMatch.index - 5),
          Math.min(line.length, yearMatch.index + 10)
        );
        if (surroundingText.includes('v') || surroundingText.includes('.') || surroundingText.includes('version')) {
          continue;
        }

        const contextStart = Math.max(0, yearMatch.index - 30);
        const contextEnd = Math.min(line.length, yearMatch.index + 10);
        const context = line.substring(contextStart, contextEnd).trim();

        staleDates.push({
          dateString: yearMatch[1],
          lineNumber,
          context: context.length < line.length ? `...${context}...` : context,
          daysOld
        });
      }
    }
  }

  // Deduplicate by line number and date string
  const seen = new Set<string>();
  return staleDates.filter(sd => {
    const key = `${sd.lineNumber}:${sd.dateString}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Analyze a CLAUDE.md file
 *
 * Performs comprehensive analysis including:
 * - Section parsing
 * - Token counting
 * - Stale date detection
 *
 * @param filePath - Path to the CLAUDE.md file
 * @returns Complete analysis result
 */
export async function analyzeFile(filePath: string): Promise<AnalysisResult> {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const rawContent = await readFile(filePath, 'utf-8');
  const lines = rawContent.split('\n');
  const sections = parseClaudeMd(rawContent);
  const staleDates = detectStaleDates(rawContent);

  return {
    filePath,
    totalLines: lines.length,
    totalTokens: countTokens(rawContent),
    sections,
    staleDates,
    rawContent,
    analyzedAt: new Date()
  };
}

/**
 * Analyze CLAUDE.md content directly (without file read)
 *
 * @param content - Raw markdown content
 * @param filePath - Optional path for metadata
 * @returns Complete analysis result
 */
export function analyzeContent(content: string, filePath: string = 'CLAUDE.md'): AnalysisResult {
  const lines = content.split('\n');
  const sections = parseClaudeMd(content);
  const staleDates = detectStaleDates(content);

  return {
    filePath,
    totalLines: lines.length,
    totalTokens: countTokens(content),
    sections,
    staleDates,
    rawContent: content,
    analyzedAt: new Date()
  };
}

/**
 * Get section by name (case-insensitive partial match)
 */
export function findSection(sections: ParsedSection[], name: string): ParsedSection | undefined {
  const lowerName = name.toLowerCase();
  return sections.find(s => s.name.toLowerCase().includes(lowerName));
}

/**
 * Get sections by level
 */
export function getSectionsByLevel(sections: ParsedSection[], level: number): ParsedSection[] {
  return sections.filter(s => s.level === level);
}

/**
 * Calculate section statistics
 */
export function getSectionStats(sections: ParsedSection[]): {
  totalSections: number;
  totalLines: number;
  totalTokens: number;
  avgLinesPerSection: number;
  avgTokensPerSection: number;
  largestSection: ParsedSection | null;
  smallestSection: ParsedSection | null;
} {
  if (sections.length === 0) {
    return {
      totalSections: 0,
      totalLines: 0,
      totalTokens: 0,
      avgLinesPerSection: 0,
      avgTokensPerSection: 0,
      largestSection: null,
      smallestSection: null
    };
  }

  const totalLines = sections.reduce((sum, s) => sum + s.lineCount, 0);
  const totalTokens = sections.reduce((sum, s) => sum + s.estimatedTokens, 0);

  const sorted = [...sections].sort((a, b) => b.lineCount - a.lineCount);

  return {
    totalSections: sections.length,
    totalLines,
    totalTokens,
    avgLinesPerSection: Math.round(totalLines / sections.length),
    avgTokensPerSection: Math.round(totalTokens / sections.length),
    largestSection: sorted[0],
    smallestSection: sorted[sorted.length - 1]
  };
}
