/**
 * Track Command
 * CLI command for tracking session activity
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { trackSession, trackManualSession } from '../hooks/session-tracker.js';

/**
 * Create the track command group
 */
export function createTrackCommand(): Command {
  const trackCmd = new Command('track')
    .description('Track session activity for recommendations')
    .option('-v, --verbose', 'Show detailed tracking output')
    .option('-p, --path <path>', 'Project path to track')
    .option('--session-log <path>', 'Path to session log file')
    .action(async (options) => {
      try {
        if (options.verbose) {
          console.log(chalk.blue('Tracking session...'));
        }

        await trackSession({
          projectPath: options.path,
          sessionLog: options.sessionLog,
          verbose: options.verbose,
        });

        if (options.verbose) {
          console.log(chalk.green('Session tracking complete'));
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Manual tracking subcommand for testing
  trackCmd
    .command('manual')
    .description('Manually track session data (for testing)')
    .option('--tools <tools>', 'Comma-separated list of tools used')
    .option('--commands <commands>', 'Comma-separated list of commands run')
    .option('--files <files>', 'Comma-separated list of files accessed')
    .option('--duration <seconds>', 'Session duration in seconds', '60')
    .option('--tokens <tokens>', 'Total tokens used', '0')
    .option('-p, --path <path>', 'Project path')
    .action(async (options) => {
      try {
        console.log(chalk.blue('Tracking manual session data...'));

        const success = await trackManualSession({
          toolsUsed: options.tools ? options.tools.split(',').map((t: string) => t.trim()) : [],
          commandsRun: options.commands ? options.commands.split(',').map((c: string) => c.trim()) : [],
          filesAccessed: options.files ? options.files.split(',').map((f: string) => f.trim()) : [],
          duration: parseInt(options.duration, 10),
          tokens: {
            total: parseInt(options.tokens, 10),
          },
          projectPath: options.path,
        });

        if (success) {
          console.log(chalk.green('Manual session tracked successfully'));
        } else {
          console.log(chalk.yellow('Failed to track session (server may be unavailable)'));
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Status subcommand to check tracking configuration
  trackCmd
    .command('status')
    .description('Show tracking configuration and status')
    .action(async () => {
      const { loadConfig } = await import('../lib/config.js');
      const config = loadConfig();

      console.log(chalk.bold('\nSession Tracking Status\n'));
      console.log(`Server URL: ${chalk.cyan(config.serverUrl)}`);
      console.log(`Machine: ${chalk.cyan(config.machine || 'not configured')}`);

      // Check server connectivity
      try {
        const response = await fetch(`${config.serverUrl}/api/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          console.log(`Server: ${chalk.green('connected')}`);
        } else {
          console.log(`Server: ${chalk.yellow('unreachable (HTTP ' + response.status + ')')}`);
        }
      } catch {
        console.log(`Server: ${chalk.red('not available')}`);
      }

      console.log('\nTracking is ' + chalk.green('enabled'));
      console.log('Sessions are automatically tracked when Claude Code exits\n');
    });

  return trackCmd;
}

// Export for direct use
export { trackSession, trackManualSession };
