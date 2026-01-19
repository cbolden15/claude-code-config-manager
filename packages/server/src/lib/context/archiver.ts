/**
 * Archiver for CCM v3.1 Context Optimizer
 *
 * Creates archive files for content removed from CLAUDE.md,
 * generates summaries, and manages archive references.
 */

import { join, dirname } from 'path';
import type { ParsedSection } from './analyzer';
import type { ClassifiedSection } from './classifier';
import { countTokens } from './analyzer';

/**
 * Archive file content
 */
export interface ArchiveContent {
  /** Path where archive should be written */
  path: string;
  /** Full content of the archive file */
  content: string;
  /** Metadata about the archive */
  metadata: ArchiveMetadata;
}

/**
 * Archive metadata
 */
export interface ArchiveMetadata {
  /** Original section name */
  sectionName: string;
  /** Source file */
  sourceFile: string;
  /** When archived */
  archivedAt: Date;
  /** Original line count */
  originalLines: number;
  /** Original token count */
  originalTokens: number;
  /** Reason for archiving */
  reason: string;
  /** Summary generated */
  summary: string;
}

/**
 * Summary options
 */
export interface SummaryOptions {
  /** Maximum lines for the summary */
  maxLines?: number;
  /** Include bullet summary of key points */
  includeBullets?: boolean;
  /** Include date range if applicable */
  includeDateRange?: boolean;
  /** Custom prefix for summary */
  prefix?: string;
}

/**
 * Generate archive file path
 *
 * Creates a path like: .claude/archives/CLAUDE-section-name-2026-01.md
 *
 * @param projectPath - Base project path
 * @param sectionName - Name of the section being archived
 * @param date - Optional date for the archive (defaults to now)
 * @returns Full path to the archive file
 */
export function getArchivePath(
  projectPath: string,
  sectionName: string,
  date: Date = new Date()
): string {
  // Sanitize section name for filename
  const sanitized = sectionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  // Format date as YYYY-MM
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const filename = `CLAUDE-${sanitized}-${dateStr}.md`;

  return join(projectPath, '.claude', 'archives', filename);
}

/**
 * Generate a condensed summary of a section
 *
 * @param section - The section to summarize
 * @param options - Summary generation options
 * @returns Generated summary text
 */
export function generateSummary(
  section: ParsedSection | ClassifiedSection,
  options: SummaryOptions = {}
): string {
  const {
    maxLines = 10,
    includeBullets = true,
    includeDateRange = true,
    prefix = ''
  } = options;

  // Get the actual section data
  const sectionData = 'section' in section ? section.section : section;
  const content = sectionData.content;
  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length <= maxLines) {
    return prefix + content;
  }

  const summary: string[] = [];

  if (prefix) {
    summary.push(prefix);
    summary.push('');
  }

  // Extract key information
  const bullets: string[] = [];
  const dates: string[] = [];

  // Date pattern for extracting date ranges
  const datePattern = /\b(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},?\s+\d{4})\b/g;

  for (const line of lines) {
    // Collect dates
    const dateMatches = line.match(datePattern);
    if (dateMatches) {
      dates.push(...dateMatches);
    }

    // Extract important lines (headers, key items)
    if (
      line.startsWith('##') ||
      line.startsWith('- **') ||
      line.startsWith('* **') ||
      line.match(/^[-*]\s+\[x\]/i) || // Completed checkboxes
      line.includes('Complete') ||
      line.includes('Implement')
    ) {
      bullets.push(line.replace(/^#+\s*/, '').trim());
    }
  }

  // Build summary
  if (includeBullets && bullets.length > 0) {
    summary.push('**Key items:**');
    const uniqueBullets = [...new Set(bullets)].slice(0, maxLines - 3);
    for (const bullet of uniqueBullets) {
      if (!bullet.startsWith('-') && !bullet.startsWith('*')) {
        summary.push(`- ${bullet}`);
      } else {
        summary.push(bullet);
      }
    }
  }

  // Add date range if applicable
  if (includeDateRange && dates.length > 0) {
    const uniqueDates = [...new Set(dates)].sort();
    if (uniqueDates.length >= 2) {
      summary.push('');
      summary.push(`*Date range: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}*`);
    } else if (uniqueDates.length === 1) {
      summary.push('');
      summary.push(`*Date: ${uniqueDates[0]}*`);
    }
  }

  // Add stats
  summary.push('');
  summary.push(`*Original: ${sectionData.lineCount} lines, ~${sectionData.estimatedTokens} tokens*`);

  return summary.join('\n');
}

/**
 * Create archive file content
 *
 * @param section - Section to archive
 * @param projectPath - Project base path
 * @param reason - Reason for archiving
 * @returns Archive content with path and metadata
 */
export function createArchive(
  section: ParsedSection | ClassifiedSection,
  projectPath: string,
  reason: string = 'Optimization'
): ArchiveContent {
  const sectionData = 'section' in section ? section.section : section;
  const sectionType = 'type' in section ? section.type : 'unknown';

  const archivePath = getArchivePath(projectPath, sectionData.name);
  const archivedAt = new Date();

  // Generate summary
  const summary = generateSummary(section, {
    maxLines: 15,
    includeBullets: true,
    includeDateRange: true
  });

  // Build archive file content
  const archiveLines: string[] = [
    `# Archive: ${sectionData.name}`,
    '',
    '---',
    '',
    '## Metadata',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Source | CLAUDE.md |`,
    `| Section | ${sectionData.name} |`,
    `| Type | ${sectionType} |`,
    `| Archived | ${archivedAt.toISOString()} |`,
    `| Original Lines | ${sectionData.lineCount} |`,
    `| Original Tokens | ~${sectionData.estimatedTokens} |`,
    `| Reason | ${reason} |`,
    '',
    '---',
    '',
    '## Summary',
    '',
    summary,
    '',
    '---',
    '',
    '## Original Content',
    '',
    sectionData.content,
    ''
  ];

  return {
    path: archivePath,
    content: archiveLines.join('\n'),
    metadata: {
      sectionName: sectionData.name,
      sourceFile: 'CLAUDE.md',
      archivedAt,
      originalLines: sectionData.lineCount,
      originalTokens: sectionData.estimatedTokens,
      reason,
      summary
    }
  };
}

/**
 * Format archive reference for insertion into CLAUDE.md
 *
 * @param archivePath - Path to the archive file
 * @param lineCount - Number of lines archived
 * @param summary - Optional brief summary
 * @returns Formatted reference text
 */
export function formatArchiveReference(
  archivePath: string,
  lineCount: number,
  summary?: string
): string {
  // Make path relative if it's absolute
  const relativePath = archivePath.includes('.claude/archives')
    ? archivePath.substring(archivePath.indexOf('.claude/archives'))
    : archivePath;

  const lines: string[] = [
    `> **Archived Content**`,
    `>`,
    `> ${lineCount} lines moved to [\`${relativePath}\`](${relativePath})`,
  ];

  if (summary) {
    lines.push(`>`);
    lines.push(`> ${summary}`);
  }

  return lines.join('\n');
}

/**
 * Create multiple archives from sections
 */
export function createArchives(
  sections: Array<ParsedSection | ClassifiedSection>,
  projectPath: string,
  reason: string = 'Bulk optimization'
): ArchiveContent[] {
  return sections.map(section => createArchive(section, projectPath, reason));
}

/**
 * Generate archive directory structure info
 */
export function getArchiveDirectoryInfo(projectPath: string): {
  archiveDir: string;
  pattern: string;
  description: string;
} {
  return {
    archiveDir: join(projectPath, '.claude', 'archives'),
    pattern: 'CLAUDE-{section-name}-{YYYY-MM}.md',
    description: 'Archives are organized by section name and month'
  };
}

/**
 * Extract section references from archived content markers
 */
export function findArchiveReferences(content: string): Array<{
  archivePath: string;
  lineNumber: number;
  context: string;
}> {
  const lines = content.split('\n');
  const references: Array<{
    archivePath: string;
    lineNumber: number;
    context: string;
  }> = [];

  // Pattern for archive references
  const archivePatterns = [
    /\[`([^`]+\.claude\/archives\/[^`]+)`\]/g,
    /`(\.claude\/archives\/[^`]+)`/g,
    /See\s+`([^`]+archives[^`]+)`/gi
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of archivePatterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(line)) !== null) {
        references.push({
          archivePath: match[1],
          lineNumber: i + 1,
          context: line.trim()
        });
      }
    }
  }

  return references;
}

/**
 * Calculate archive statistics
 */
export function calculateArchiveStats(archives: ArchiveContent[]): {
  totalArchives: number;
  totalLines: number;
  totalTokens: number;
  avgLinesPerArchive: number;
  byReason: Record<string, number>;
} {
  const byReason: Record<string, number> = {};

  let totalLines = 0;
  let totalTokens = 0;

  for (const archive of archives) {
    totalLines += archive.metadata.originalLines;
    totalTokens += archive.metadata.originalTokens;

    const reason = archive.metadata.reason;
    byReason[reason] = (byReason[reason] || 0) + 1;
  }

  return {
    totalArchives: archives.length,
    totalLines,
    totalTokens,
    avgLinesPerArchive: archives.length > 0 ? Math.round(totalLines / archives.length) : 0,
    byReason
  };
}

/**
 * Generate restore instructions
 */
export function generateRestoreInstructions(archive: ArchiveContent): string {
  return [
    `# Restore Instructions`,
    ``,
    `To restore this archived content to CLAUDE.md:`,
    ``,
    `1. Open \`CLAUDE.md\``,
    `2. Find the archive reference for "${archive.metadata.sectionName}"`,
    `3. Replace the reference with the content from "Original Content" section below`,
    `4. Optionally delete this archive file`,
    ``,
    `**Original section header:** \`## ${archive.metadata.sectionName}\``,
    ``,
    `**Archived on:** ${archive.metadata.archivedAt.toISOString()}`,
    ``
  ].join('\n');
}
