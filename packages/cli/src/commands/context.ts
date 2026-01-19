/**
 * Context Optimizer Command
 * CLI commands for managing CLAUDE.md context optimization
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../lib/config.js';

interface ContextAnalysis {
  id: string;
  filePath: string;
  totalLines: number;
  totalTokens: number;
  optimizationScore: number;
  estimatedSavings: number;
  lastAnalyzedAt: string;
  sections: string;
  issues: string;
}

interface OptimizationIssue {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  section: string;
  description: string;
  suggestedAction: string;
  estimatedSavings: number;
  confidence: number;
}

interface ContextArchive {
  id: string;
  sourceFile: string;
  archiveFile: string;
  sectionName: string;
  originalLines: number;
  originalTokens: number;
  archiveReason: string;
  archivedAt: string;
  archivedContent?: string;
}

interface OptimizationRule {
  id: string;
  name: string;
  description: string | null;
  ruleType: string;
  enabled: boolean;
  priority: number;
}

interface AnalyzeResponse {
  analysis: ContextAnalysis | null;
  message?: string;
}

interface OptimizeResponse {
  success: boolean;
  applied: number;
  tokensSaved: number;
  message?: string;
}

interface ArchivesResponse {
  archives: ContextArchive[];
}

interface RulesResponse {
  rules: OptimizationRule[];
}

/**
 * Format a table for CLI output
 */
function formatTable(data: Record<string, string | number>[]): string {
  if (data.length === 0) return '';

  const keys = Object.keys(data[0]);
  const widths = keys.map((key) => {
    const maxValueLength = Math.max(
      ...data.map((row) => String(row[key]).length),
      key.length
    );
    return Math.min(maxValueLength, 40); // Cap column width
  });

  const separator = widths.map((w) => '-'.repeat(w + 2)).join('+');
  const header = keys.map((key, i) => key.padEnd(widths[i])).join(' | ');

  const rows = data.map((row) =>
    keys.map((key, i) => {
      const val = String(row[key]);
      return val.length > widths[i] ? val.slice(0, widths[i] - 3) + '...' : val.padEnd(widths[i]);
    }).join(' | ')
  );

  return [header, separator, ...rows].join('\n');
}

/**
 * Get severity color
 */
function getSeverityColor(severity: string): (str: string) => string {
  switch (severity.toLowerCase()) {
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.blue;
    default:
      return chalk.white;
  }
}

/**
 * Get score color
 */
function getScoreColor(score: number): (str: string) => string {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  if (score >= 40) return chalk.magenta;
  return chalk.red;
}

/**
 * Create the context command group
 */
export function createContextCommand(): Command {
  const ctxCmd = new Command('context')
    .alias('ctx')
    .description('Manage CLAUDE.md context optimization');

  // Analyze command
  ctxCmd
    .command('analyze')
    .description('Analyze CLAUDE.md for optimization opportunities')
    .option('--project <path>', 'Project path to analyze')
    .option('-v, --verbose', 'Show detailed output')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();
        const params = new URLSearchParams();

        if (options.project) {
          params.set('projectPath', options.project);
        }

        console.log(chalk.blue('Analyzing CLAUDE.md...\n'));

        const response = await fetch(
          `${config.serverUrl}/api/context/analyze`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              machineId: config.machine,
              projectPath: options.project || process.cwd(),
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json() as AnalyzeResponse;

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (!data.analysis) {
          console.log(chalk.yellow('No CLAUDE.md found or unable to analyze.'));
          return;
        }

        const analysis = data.analysis;
        const scoreColor = getScoreColor(analysis.optimizationScore);

        console.log(chalk.bold('CLAUDE.md Analysis Results\n'));
        console.log(`File: ${chalk.cyan(analysis.filePath)}`);
        console.log(`Lines: ${analysis.totalLines.toLocaleString()}`);
        console.log(`Tokens: ~${(analysis.totalTokens / 1000).toFixed(1)}k`);
        console.log(`Optimization Score: ${scoreColor(analysis.optimizationScore + '/100')}`);
        console.log(`Potential Savings: ${chalk.green('-' + (analysis.estimatedSavings / 1000).toFixed(1) + 'k tokens')}`);

        // Parse and show issues
        let issues: OptimizationIssue[] = [];
        try {
          issues = JSON.parse(analysis.issues || '[]');
        } catch {
          // Invalid JSON
        }

        if (issues.length > 0) {
          console.log('\n' + chalk.bold('Optimization Opportunities:\n'));

          const table = issues.map((issue) => ({
            Severity: getSeverityColor(issue.severity)(issue.severity.toUpperCase()),
            Section: issue.section.length > 25 ? issue.section.slice(0, 22) + '...' : issue.section,
            Type: issue.type.replace(/_/g, ' '),
            Savings: `~${(issue.estimatedSavings / 1000).toFixed(1)}k`,
          }));

          console.log(formatTable(table));

          if (options.verbose) {
            console.log('\n' + chalk.bold('Details:\n'));
            issues.forEach((issue, i) => {
              const severityColor = getSeverityColor(issue.severity);
              console.log(`${i + 1}. ${severityColor(issue.severity.toUpperCase())}: ${issue.section}`);
              console.log(`   ${issue.description}`);
              console.log(`   Suggested: ${chalk.gray(issue.suggestedAction)}`);
              console.log();
            });
          }

          console.log('\nRun ' + chalk.cyan('ccm context optimize') + ' to apply optimizations');
          console.log('Run ' + chalk.cyan('ccm context optimize --dry-run') + ' to preview changes');
        } else {
          console.log(chalk.green('\nYour CLAUDE.md is well optimized!'));
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Optimize command
  ctxCmd
    .command('optimize')
    .description('Apply optimizations to CLAUDE.md')
    .option('--dry-run', 'Preview changes without applying')
    .option('--strategy <name>', 'Optimization strategy (conservative, moderate, aggressive)', 'moderate')
    .option('--auto-approve', 'Apply without confirmation')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        if (options.dryRun) {
          console.log(chalk.blue('Dry run - previewing optimizations...\n'));
        } else {
          console.log(chalk.blue('Applying optimizations...\n'));
        }

        const response = await fetch(
          `${config.serverUrl}/api/context/optimize`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              machineId: config.machine,
              projectPath: process.cwd(),
              strategy: options.strategy,
              dryRun: options.dryRun,
              autoApprove: options.autoApprove,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json() as OptimizeResponse;

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (result.success) {
          if (options.dryRun) {
            console.log(chalk.yellow(`Would apply ${result.applied} optimization(s)`));
            console.log(chalk.yellow(`Would save ~${(result.tokensSaved / 1000).toFixed(1)}k tokens`));
            console.log('\nRun without --dry-run to apply changes.');
          } else {
            console.log(chalk.green(`Applied ${result.applied} optimization(s)`));
            console.log(chalk.green(`Saved ~${(result.tokensSaved / 1000).toFixed(1)}k tokens`));
          }
        } else {
          console.log(chalk.yellow(result.message || 'No optimizations applied'));
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Status command
  ctxCmd
    .command('status')
    .description('Show current optimization status')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/context/analyze?machineId=${config.machine}&projectPath=${encodeURIComponent(process.cwd())}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json() as AnalyzeResponse;

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (!data.analysis) {
          console.log(chalk.yellow('No analysis available. Run: ccm context analyze'));
          return;
        }

        const analysis = data.analysis;
        const scoreColor = getScoreColor(analysis.optimizationScore);

        console.log(chalk.bold('\nContext Optimization Status\n'));
        console.log(`Score: ${scoreColor(analysis.optimizationScore + '/100')}`);
        console.log(`Lines: ${analysis.totalLines.toLocaleString()}`);
        console.log(`Tokens: ~${(analysis.totalTokens / 1000).toFixed(1)}k`);
        console.log(`Potential Savings: ${chalk.green('-' + (analysis.estimatedSavings / 1000).toFixed(1) + 'k tokens')}`);
        console.log(`Last Analyzed: ${new Date(analysis.lastAnalyzedAt).toLocaleString()}`);

        // Count issues by severity
        let issues: OptimizationIssue[] = [];
        try {
          issues = JSON.parse(analysis.issues || '[]');
        } catch {
          // Invalid JSON
        }

        const highCount = issues.filter(i => i.severity === 'high').length;
        const mediumCount = issues.filter(i => i.severity === 'medium').length;
        const lowCount = issues.filter(i => i.severity === 'low').length;

        if (issues.length > 0) {
          console.log(`\nIssues: ${chalk.red(highCount + ' high')}, ${chalk.yellow(mediumCount + ' medium')}, ${chalk.blue(lowCount + ' low')}`);
        } else {
          console.log(chalk.green('\nNo optimization issues found!'));
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Archives command group
  const archivesCmd = ctxCmd
    .command('archives')
    .description('Manage archived content');

  // List archives
  archivesCmd
    .command('list')
    .description('List all archives')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/context/archives?machineId=${config.machine}&projectPath=${encodeURIComponent(process.cwd())}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json() as ArchivesResponse;

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (data.archives.length === 0) {
          console.log(chalk.yellow('\nNo archives found.'));
          console.log('Archives are created when you optimize your CLAUDE.md.\n');
          return;
        }

        console.log(chalk.bold('\nContext Archives\n'));

        const table = data.archives.map((a) => ({
          ID: a.id.slice(0, 8),
          Section: a.sectionName.length > 25 ? a.sectionName.slice(0, 22) + '...' : a.sectionName,
          Lines: a.originalLines,
          Tokens: `~${(a.originalTokens / 1000).toFixed(1)}k`,
          Reason: a.archiveReason.replace(/_/g, ' '),
          Date: new Date(a.archivedAt).toLocaleDateString(),
        }));

        console.log(formatTable(table));
        console.log('\nRun ' + chalk.cyan('ccm context archives show <id>') + ' to view content');
        console.log('Run ' + chalk.cyan('ccm context archives restore <id>') + ' to restore\n');
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Show archive
  archivesCmd
    .command('show <id>')
    .description('Show archive content')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/context/archives/${id}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const archive = await response.json() as ContextArchive;

        if (options.json) {
          console.log(JSON.stringify(archive, null, 2));
          return;
        }

        console.log(chalk.bold('\nArchive: ' + archive.sectionName + '\n'));
        console.log(`ID: ${chalk.cyan(archive.id)}`);
        console.log(`Source: ${archive.sourceFile}`);
        console.log(`Archive File: ${archive.archiveFile}`);
        console.log(`Lines: ${archive.originalLines}`);
        console.log(`Tokens: ~${(archive.originalTokens / 1000).toFixed(1)}k`);
        console.log(`Reason: ${archive.archiveReason.replace(/_/g, ' ')}`);
        console.log(`Archived: ${new Date(archive.archivedAt).toLocaleString()}`);

        if (archive.archivedContent) {
          console.log('\n' + chalk.bold('Content:\n'));
          console.log(chalk.gray('-'.repeat(60)));
          console.log(archive.archivedContent);
          console.log(chalk.gray('-'.repeat(60)));
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Restore archive
  archivesCmd
    .command('restore <id>')
    .description('Restore content from archive')
    .action(async (id) => {
      try {
        const config = loadConfig();

        console.log(chalk.blue('Restoring archive...\n'));

        const response = await fetch(
          `${config.serverUrl}/api/context/archives/restore`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archiveId: id }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log(chalk.green('Archive restored successfully!'));
        console.log('Run ' + chalk.cyan('ccm context analyze') + ' to refresh analysis.\n');
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Rules command group
  const rulesCmd = ctxCmd
    .command('rules')
    .description('Manage optimization rules');

  // List rules
  rulesCmd
    .command('list')
    .description('List optimization rules')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/context/rules?machineId=${config.machine}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json() as RulesResponse;

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (data.rules.length === 0) {
          console.log(chalk.yellow('\nNo custom rules configured.'));
          console.log('Default optimization rules are applied automatically.\n');
          return;
        }

        console.log(chalk.bold('\nOptimization Rules\n'));

        const table = data.rules.map((r) => ({
          ID: r.id.slice(0, 8),
          Name: r.name.length > 25 ? r.name.slice(0, 22) + '...' : r.name,
          Type: r.ruleType,
          Enabled: r.enabled ? chalk.green('Yes') : chalk.gray('No'),
          Priority: r.priority,
        }));

        console.log(formatTable(table));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Disable rule
  rulesCmd
    .command('disable <id>')
    .description('Disable an optimization rule')
    .action(async (id) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/context/rules/${id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: false }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log(chalk.green('Rule disabled successfully.'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Enable rule
  rulesCmd
    .command('enable <id>')
    .description('Enable an optimization rule')
    .action(async (id) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/context/rules/${id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log(chalk.green('Rule enabled successfully.'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return ctxCmd;
}
