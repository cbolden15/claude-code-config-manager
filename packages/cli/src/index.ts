#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { configCommand } from './commands/config.js';
import { listCommand } from './commands/list.js';
import { initCommand } from './commands/init.js';
import { applyCommand } from './commands/apply.js';
import { syncCommand } from './commands/sync.js';

program
  .name('ccm')
  .description('Claude Code Config Manager - Manage project configurations')
  .version('0.1.0');

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

// List command
program
  .command('list <type>')
  .alias('ls')
  .description('List profiles, components, or projects')
  .option('-t, --type <type>', 'Filter components by type')
  .option('-m, --machine <name>', 'Filter projects by machine')
  .action(async (type, options) => {
    try {
      await listCommand(type, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Init command
program
  .command('init [name]')
  .description('Initialize a new project with Claude Code configuration')
  .option('-p, --profile <profile>', 'Profile to use')
  .option('-d, --description <desc>', 'Project description')
  .option('--dry-run', 'Preview without writing files')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (name, options) => {
    try {
      await initCommand(name, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Apply command
program
  .command('apply')
  .description('Apply profile configuration to a project')
  .option('--path <path>', 'Project path (defaults to current directory)')
  .option('-p, --profile <profile>', 'Profile to apply')
  .option('--dry-run', 'Preview without writing files')
  .action(async (options) => {
    try {
      await applyCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Sync project configuration from server')
  .option('--path <path>', 'Project path (defaults to current directory)')
  .option('--dry-run', 'Preview without writing files')
  .action(async (options) => {
    try {
      await syncCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Show help if no command specified
program.showHelpAfterError();

program.parse();
