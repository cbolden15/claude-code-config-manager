#!/usr/bin/env node
/**
 * CCM CLI - Claude Code Config Manager
 *
 * Simplified for v4.0 - Smart Recommendations Core
 *
 * Commands:
 *   config             - View or update CLI configuration
 *   machine            - Machine registration and management
 *   track              - Session tracking
 *   recommendations    - Smart recommendations
 *   context            - CLAUDE.md optimization
 *   schedule           - Scheduled automation
 */

import { program } from 'commander';
import chalk from 'chalk';
import {
  configCommand,
  createMachineCommand,
  createTrackCommand,
  createRecommendationsCommand,
  createContextCommand,
  createScheduleCommand
} from './commands/index.js';

program
  .name('ccm')
  .description('Claude Code Config Manager - Intelligent optimization for Claude Code')
  .version('4.0.0');

// Config command
program
  .command('config')
  .description('View or update CLI configuration')
  .option('-s, --server-url <url>', 'Set the server URL')
  .option('-m, --machine <name>', 'Set the machine name')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    try {
      await configCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Machine command group
program.addCommand(createMachineCommand());

// Track command group - Session tracking
program.addCommand(createTrackCommand());

// Recommendations command group - Smart recommendations
program.addCommand(createRecommendationsCommand());

// Context optimizer command group - CLAUDE.md optimization
program.addCommand(createContextCommand());

// Scheduler command group - Scheduled automation
program.addCommand(createScheduleCommand());

// Default command - show status/health
program
  .command('status', { isDefault: true })
  .description('Show health score and top recommendations')
  .action(async () => {
    console.log(chalk.cyan('\nCCM Status'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.yellow('Run `ccm recommendations list` to see recommendations'));
    console.log(chalk.yellow('Run `ccm context analyze` to analyze CLAUDE.md'));
  });

// Show help if no command specified
program.showHelpAfterError();

program.parse();
