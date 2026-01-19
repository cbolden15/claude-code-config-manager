/**
 * Recommendations Command
 * CLI commands for managing smart recommendations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../lib/config.js';

interface Recommendation {
  id: string;
  type: string;
  recommendedItem: string;
  category: string;
  title: string;
  reason: string;
  detectedPatterns: string;
  occurrenceCount: number;
  projectsAffected: string;
  exampleUsage?: string;
  timeSavings: number;
  tokenSavings: number;
  dailySavings: number;
  monthlySavings: number;
  confidenceScore: number;
  priority: string;
  status: string;
  configTemplate?: string;
}

interface RecommendationsListResponse {
  recommendations: Recommendation[];
  total: number;
}

interface RecommendationDetailResponse extends Recommendation {}

interface GenerateResponse {
  success: boolean;
  count: number;
  recommendations: Recommendation[];
}

interface ApplyResponse {
  success: boolean;
  message?: string;
}

interface HealthScoreResponse {
  totalScore: number;
  mcpScore: number;
  skillScore: number;
  contextScore: number;
  patternScore: number;
  activeRecommendations: number;
  appliedRecommendations: number;
  estimatedDailyWaste: number;
  estimatedDailySavings: number;
  trend: string;
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
    return maxValueLength;
  });

  const separator = widths.map((w) => '-'.repeat(w + 2)).join('+');
  const header = keys.map((key, i) => key.padEnd(widths[i])).join(' | ');

  const rows = data.map((row) =>
    keys.map((key, i) => String(row[key]).padEnd(widths[i])).join(' | ')
  );

  return [header, separator, ...rows].join('\n');
}

/**
 * Get priority color
 */
function getPriorityColor(priority: string): (str: string) => string {
  switch (priority.toLowerCase()) {
    case 'critical':
      return chalk.red;
    case 'high':
      return chalk.yellow;
    case 'medium':
      return chalk.blue;
    case 'low':
      return chalk.gray;
    default:
      return chalk.white;
  }
}

/**
 * Create the recommendations command group
 */
export function createRecommendationsCommand(): Command {
  const recCmd = new Command('recommendations')
    .alias('rec')
    .description('Manage smart recommendations');

  // List recommendations
  recCmd
    .command('list')
    .description('List active recommendations')
    .option('--type <type>', 'Filter by type (mcp_server, skill)')
    .option('--priority <priority>', 'Filter by priority (critical, high, medium, low)')
    .option('--category <category>', 'Filter by category')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();
        const params = new URLSearchParams();
        params.set('status', 'active');

        if (options.type) params.set('type', options.type);
        if (options.priority) params.set('priority', options.priority);
        if (options.category) params.set('category', options.category);

        const response = await fetch(
          `${config.serverUrl}/api/recommendations?${params}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json() as RecommendationsListResponse;

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (data.recommendations.length === 0) {
          console.log(chalk.yellow('\nNo active recommendations found.'));
          console.log('Keep using Claude Code to generate recommendations based on your usage patterns.\n');
          return;
        }

        console.log(chalk.bold('\nSmart Recommendations\n'));

        const table = data.recommendations.map((r) => ({
          ID: r.id.slice(0, 8),
          Priority: getPriorityColor(r.priority)(r.priority.toUpperCase()),
          Type: r.type === 'mcp_server' ? 'MCP' : 'Skill',
          Item: r.recommendedItem.length > 20 ? r.recommendedItem.slice(0, 17) + '...' : r.recommendedItem,
          'Daily Savings': `${r.dailySavings} tokens`,
          Confidence: `${Math.round(r.confidenceScore * 100)}%`
        }));

        console.log(formatTable(table));

        const totalSavings = data.recommendations.reduce(
          (sum, r) => sum + r.dailySavings,
          0
        );

        console.log('\n' + chalk.green(`Total potential daily savings: ${totalSavings.toLocaleString()} tokens`));
        console.log(chalk.gray(`Monthly: ~${(totalSavings * 30).toLocaleString()} tokens\n`));
        console.log('Run ' + chalk.cyan('ccm rec show <id>') + ' for details');
        console.log('Run ' + chalk.cyan('ccm rec apply <id>') + ' to apply a recommendation\n');
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Show recommendation details
  recCmd
    .command('show <id>')
    .description('Show recommendation details')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const config = loadConfig();
        const response = await fetch(
          `${config.serverUrl}/api/recommendations/${id}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const rec = await response.json() as RecommendationDetailResponse;

        if (options.json) {
          console.log(JSON.stringify(rec, null, 2));
          return;
        }

        const priorityColor = getPriorityColor(rec.priority);

        console.log('\n' + chalk.bold(rec.title));
        console.log('='.repeat(rec.title.length) + '\n');
        console.log(rec.reason + '\n');

        console.log(chalk.bold('Details:'));
        console.log(`  ID: ${chalk.cyan(rec.id)}`);
        console.log(`  Type: ${rec.type === 'mcp_server' ? 'MCP Server' : 'Skill'}`);
        console.log(`  Item: ${chalk.cyan(rec.recommendedItem)}`);
        console.log(`  Category: ${rec.category}`);
        console.log(`  Priority: ${priorityColor(rec.priority.toUpperCase())}`);
        console.log(`  Confidence: ${Math.round(rec.confidenceScore * 100)}%`);
        console.log(`  Status: ${rec.status}`);

        console.log('\n' + chalk.bold('Impact:'));
        console.log(`  Occurrences: ${rec.occurrenceCount} times in 30 days`);
        console.log(`  Time savings: ${rec.timeSavings}s per use`);
        console.log(`  Token savings: ${rec.tokenSavings} per use`);
        console.log(`  Daily savings: ${chalk.green(rec.dailySavings + ' tokens')}`);
        console.log(`  Monthly savings: ${chalk.green((rec.dailySavings * 30).toLocaleString() + ' tokens')}`);

        // Parse and show patterns
        try {
          const patterns = JSON.parse(rec.detectedPatterns) as string[];
          if (patterns.length > 0) {
            console.log('\n' + chalk.bold('Detected Patterns:'));
            patterns.forEach((p) => console.log(`  - ${p.replace(/_/g, ' ')}`));
          }
        } catch {
          // Invalid JSON
        }

        // Show example
        if (rec.exampleUsage) {
          console.log('\n' + chalk.bold('Example Usage:'));
          console.log(chalk.gray(`  ${rec.exampleUsage}`));
        }

        // Show affected projects
        try {
          const projects = JSON.parse(rec.projectsAffected) as string[];
          if (projects.length > 0) {
            console.log('\n' + chalk.bold('Affected Projects:'));
            projects.forEach((p) => console.log(`  - ${p}`));
          }
        } catch {
          // Invalid JSON
        }

        // Show config template
        if (rec.configTemplate) {
          try {
            const config = JSON.parse(rec.configTemplate);
            console.log('\n' + chalk.bold('Configuration:'));
            console.log(chalk.gray(JSON.stringify(config, null, 2)));
          } catch {
            // Invalid JSON
          }
        }

        console.log('\nRun ' + chalk.cyan(`ccm rec apply ${id}`) + ' to apply this recommendation\n');
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Apply recommendation
  recCmd
    .command('apply <id>')
    .description('Apply a recommendation')
    .option('--dry-run', 'Preview without applying')
    .action(async (id, options) => {
      try {
        const config = loadConfig();

        if (options.dryRun) {
          console.log(chalk.blue('Dry run - showing what would be applied...\n'));
        } else {
          console.log(chalk.blue('Applying recommendation...\n'));
        }

        const response = await fetch(
          `${config.serverUrl}/api/recommendations/${id}/apply`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dryRun: options.dryRun })
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json() as ApplyResponse;

        if (result.success) {
          if (options.dryRun) {
            console.log(chalk.yellow('Dry run complete. Use without --dry-run to apply.\n'));
          } else {
            console.log(chalk.green('Recommendation applied successfully!\n'));
            console.log('Run ' + chalk.cyan('ccm sync') + ' to sync changes to your machine.');
          }
        } else {
          console.log(chalk.yellow(result.message || 'Failed to apply recommendation'));
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Dismiss recommendation
  recCmd
    .command('dismiss <id>')
    .description('Dismiss a recommendation')
    .option('-r, --reason <reason>', 'Reason for dismissing')
    .action(async (id, options) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/recommendations/${id}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: options.reason })
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log(chalk.green('Recommendation dismissed.\n'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Generate/analyze recommendations
  recCmd
    .command('analyze')
    .description('Analyze usage patterns and generate new recommendations')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        console.log(chalk.blue('Analyzing usage patterns...\n'));

        const response = await fetch(
          `${config.serverUrl}/api/recommendations/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ machineId: config.machine })
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json() as GenerateResponse;

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.green(`Generated ${result.count} recommendations\n`));

        if (result.count > 0) {
          console.log('Run ' + chalk.cyan('ccm rec list') + ' to view them.\n');
        } else {
          console.log('Not enough usage data yet. Keep using Claude Code!\n');
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Health command (shortcut)
  recCmd
    .command('health')
    .description('Show health score summary')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/health/score`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const health = await response.json() as HealthScoreResponse;

        if (options.json) {
          console.log(JSON.stringify(health, null, 2));
          return;
        }

        console.log('\n' + chalk.bold('Optimization Health Score\n'));

        const scoreColor =
          health.totalScore >= 80 ? chalk.green :
          health.totalScore >= 60 ? chalk.yellow :
          chalk.red;

        console.log(`Overall Score: ${scoreColor(health.totalScore + '/100')}`);
        console.log(`Trend: ${health.trend}`);
        console.log();
        console.log('Category Scores:');
        console.log(`  MCP Optimization: ${health.mcpScore}`);
        console.log(`  Skill Utilization: ${health.skillScore}`);
        console.log(`  Context Efficiency: ${health.contextScore}`);
        console.log(`  Pattern Optimization: ${health.patternScore}`);
        console.log();
        console.log(`Active Recommendations: ${health.activeRecommendations}`);
        console.log(`Applied Recommendations: ${health.appliedRecommendations}`);
        console.log();
        console.log(`Estimated Daily Waste: ${chalk.red(health.estimatedDailyWaste.toLocaleString() + ' tokens')}`);
        console.log(`Estimated Daily Savings: ${chalk.green(health.estimatedDailySavings.toLocaleString() + ' tokens')}`);
        console.log();
        console.log('Run ' + chalk.cyan('ccm rec list') + ' to view recommendations.\n');
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return recCmd;
}
