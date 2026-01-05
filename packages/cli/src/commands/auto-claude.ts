import chalk from 'chalk';
import { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { api, type AutoClaudeImportRequest, type AutoClaudeImportResponse } from '../lib/api.js';

/**
 * Create and configure the auto-claude command group
 */
export function createAutoClaudeCommand(): Command {
  const autoClaudeCommand = new Command('auto-claude');

  autoClaudeCommand
    .description('Auto-Claude integration commands')
    .addHelpText('before', chalk.bold('Auto-Claude Integration'))
    .addHelpText('after', `

${chalk.gray('Examples:')}
  ${chalk.cyan('ccm auto-claude config --path /path/to/auto-claude')}  Set Auto-Claude backend path
  ${chalk.cyan('ccm auto-claude import --source /path/to/config')}      Import existing Auto-Claude configs
  ${chalk.cyan('ccm auto-claude sync --backend /path/to/backend')}      Sync configs to Auto-Claude backend
  ${chalk.cyan('ccm auto-claude profiles list')}                       List available model profiles
  ${chalk.cyan('ccm auto-claude agents list')}                         List configured agents

${chalk.gray('Integration:')}
  Auto-Claude integration allows CCM to be the single source of truth for both
  Claude Code and Auto-Claude configurations. Import existing configs, manage
  them through CCM's web interface, and sync back to your Auto-Claude installation.

${chalk.gray('Documentation:')}
  For more information, visit: ${chalk.cyan('https://github.com/caleb/claude-code-config-manager')}
`);

  // Placeholder subcommands (to be implemented in subsequent subtasks)

  // Config subcommand
  autoClaudeCommand
    .command('config')
    .description('Configure Auto-Claude backend path and settings')
    .option('-p, --path <path>', 'Set Auto-Claude backend installation path')
    .option('--show', 'Show current Auto-Claude configuration')
    .action(async (options: { path?: string; show?: boolean }) => {
      await autoClaudeConfigCommand(options);
    });

  // Import subcommand
  autoClaudeCommand
    .command('import')
    .description('Import existing Auto-Claude configurations')
    .option('-s, --source <path>', 'Source directory containing Auto-Claude configs')
    .option('--dry-run', 'Preview import without making changes')
    .action(async (options: { source?: string; dryRun?: boolean }) => {
      await autoClaudeImportCommand(options);
    });

  // Sync subcommand - Will be implemented in subtask 6_4
  autoClaudeCommand
    .command('sync')
    .description('Sync configurations to Auto-Claude backend')
    .option('-b, --backend <path>', 'Auto-Claude backend directory path')
    .option('--dry-run', 'Preview sync without writing files')
    .action(async () => {
      console.log(chalk.yellow('Auto-Claude sync command is not yet implemented.'));
      console.log(chalk.gray('This will be available in a future update.'));
    });

  // Profiles subcommand group - Will be implemented in subtask 6_5
  const profilesCommand = autoClaudeCommand
    .command('profiles')
    .description('Manage Auto-Claude model profiles')
    .addHelpText('after', `

${chalk.gray('Examples:')}
  ${chalk.cyan('ccm auto-claude profiles list')}           List all model profiles
  ${chalk.cyan('ccm auto-claude profiles show balanced')}  Show details for a profile
  ${chalk.cyan('ccm auto-claude profiles apply balanced')} Apply profile to current project
`);

  profilesCommand
    .command('list')
    .description('List all available model profiles')
    .action(async () => {
      console.log(chalk.yellow('Auto-Claude profiles list command is not yet implemented.'));
      console.log(chalk.gray('This will be available in a future update.'));
    });

  profilesCommand
    .command('show <profile>')
    .description('Show details for a specific model profile')
    .action(async () => {
      console.log(chalk.yellow('Auto-Claude profiles show command is not yet implemented.'));
      console.log(chalk.gray('This will be available in a future update.'));
    });

  profilesCommand
    .command('apply <profile>')
    .description('Apply model profile to current project')
    .action(async () => {
      console.log(chalk.yellow('Auto-Claude profiles apply command is not yet implemented.'));
      console.log(chalk.gray('This will be available in a future update.'));
    });

  // Agents subcommand group - Will be implemented in subtask 6_6
  const agentsCommand = autoClaudeCommand
    .command('agents')
    .description('Manage Auto-Claude agent configurations')
    .addHelpText('after', `

${chalk.gray('Examples:')}
  ${chalk.cyan('ccm auto-claude agents list')}        List all agent configurations
  ${chalk.cyan('ccm auto-claude agents show coder')}  Show details for a specific agent
`);

  agentsCommand
    .command('list')
    .description('List all available agent configurations')
    .action(async () => {
      console.log(chalk.yellow('Auto-Claude agents list command is not yet implemented.'));
      console.log(chalk.gray('This will be available in a future update.'));
    });

  agentsCommand
    .command('show <agent>')
    .description('Show details for a specific agent configuration')
    .action(async () => {
      console.log(chalk.yellow('Auto-Claude agents show command is not yet implemented.'));
      console.log(chalk.gray('This will be available in a future update.'));
    });

  return autoClaudeCommand;
}

/**
 * Auto-Claude config command implementation
 */
async function autoClaudeConfigCommand(options: { path?: string; show?: boolean }): Promise<void> {
  // Show current configuration
  if (options.show || (!options.path)) {
    console.log(chalk.bold('Auto-Claude Configuration'));
    console.log();

    try {
      // Get current backend path
      const pathResult = await api.getSetting('autoClaudeBackendPath');
      const currentPath = pathResult.data?.value;

      if (pathResult.error || !currentPath) {
        console.log(`  Backend Path: ${chalk.gray('(not configured)')}`);
        console.log();
        console.log(chalk.yellow('No Auto-Claude backend path configured.'));
        console.log(`Use ${chalk.cyan('ccm auto-claude config --path <path>')} to set the backend path.`);
        return;
      }

      console.log(`  Backend Path: ${chalk.cyan(currentPath)}`);

      // Validate current path
      const isValidPath = validateAutoClaudePath(currentPath);
      if (isValidPath.valid) {
        console.log(`  Status:       ${chalk.green('✓ Valid Auto-Claude installation')}`);
        if (isValidPath.version) {
          console.log(`  Version:      ${chalk.cyan(isValidPath.version)}`);
        }
      } else {
        console.log(`  Status:       ${chalk.red('✗ Invalid installation')}`);
        console.log(`  Issue:        ${chalk.red(isValidPath.error)}`);
      }

    } catch (error) {
      console.log(chalk.red('Error retrieving configuration:'), error instanceof Error ? error.message : 'Unknown error');
    }
    return;
  }

  // Set backend path
  if (options.path) {
    const absolutePath = resolve(options.path);
    console.log(`Setting Auto-Claude backend path to: ${chalk.cyan(absolutePath)}`);

    // Validate the path
    const validation = validateAutoClaudePath(absolutePath);
    if (!validation.valid) {
      console.log();
      console.log(chalk.red('✗ Invalid Auto-Claude installation:'), validation.error);
      console.log();
      console.log(chalk.gray('Expected structure:'));
      console.log(chalk.gray('  path/to/auto-claude/'));
      console.log(chalk.gray('  ├── apps/'));
      console.log(chalk.gray('  │   └── backend/'));
      console.log(chalk.gray('  └── (other Auto-Claude files)'));
      process.exit(1);
    }

    try {
      // Save to settings
      const result = await api.setSetting('autoClaudeBackendPath', absolutePath);
      if (result.error) {
        console.log(chalk.red('Error saving configuration:'), result.error);
        process.exit(1);
      }

      console.log();
      console.log(chalk.green('✓ Auto-Claude backend path configured successfully.'));
      if (validation.version) {
        console.log(chalk.gray(`  Detected version: ${validation.version}`));
      }
      console.log();
      console.log('Next steps:');
      console.log(`  • ${chalk.cyan('ccm auto-claude import --source ' + absolutePath)} to import existing configs`);
      console.log(`  • ${chalk.cyan('ccm auto-claude sync')} to sync configs to Auto-Claude backend`);

    } catch (error) {
      console.log(chalk.red('Error saving configuration:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}

/**
 * Auto-Claude import command implementation
 */
async function autoClaudeImportCommand(options: { source?: string; dryRun?: boolean }): Promise<void> {
  console.log(chalk.bold('Auto-Claude Import'));
  console.log();

  // Check for source path
  if (!options.source) {
    console.log(chalk.red('Error: --source <path> is required.'));
    console.log();
    console.log('Usage:');
    console.log(`  ${chalk.cyan('ccm auto-claude import --source /path/to/auto-claude')}`);
    console.log(`  ${chalk.cyan('ccm auto-claude import --source /path/to/auto-claude --dry-run')}`);
    console.log();
    console.log('The source path should point to your Auto-Claude installation directory.');
    return;
  }

  const sourcePath = resolve(options.source);
  console.log(`Import source: ${chalk.cyan(sourcePath)}`);
  if (options.dryRun) {
    console.log(chalk.yellow('Dry run mode: no changes will be made'));
  }
  console.log();

  // Validate source path
  console.log(chalk.gray('Validating Auto-Claude installation...'));
  const validation = validateAutoClaudePath(sourcePath);
  if (!validation.valid) {
    console.log(chalk.red('✗ Invalid Auto-Claude installation:'), validation.error);
    console.log();
    console.log(chalk.gray('Expected structure:'));
    console.log(chalk.gray('  path/to/auto-claude/'));
    console.log(chalk.gray('  ├── apps/'));
    console.log(chalk.gray('  │   └── backend/'));
    console.log(chalk.gray('  │       ├── prompts/'));
    console.log(chalk.gray('  │       └── models.py'));
    console.log(chalk.gray('  └── .auto-claude/.env (optional)'));
    process.exit(1);
  }

  console.log(chalk.green('✓ Valid Auto-Claude installation detected'));
  if (validation.version) {
    console.log(chalk.gray(`  Version: ${validation.version}`));
  }
  console.log();

  // Call import API
  try {
    console.log(chalk.gray('Scanning Auto-Claude installation...'));

    const importResult = await api.autoClaudeImport({
      autoClaudeInstallPath: sourcePath,
      dryRun: options.dryRun || false,
    });

    if (importResult.error) {
      console.log(chalk.red('Import failed:'), importResult.error);
      process.exit(1);
    }

    const result = importResult.data!;

    if (options.dryRun || result.dryRun) {
      // Show preview results
      console.log(chalk.bold('Import Preview'));
      console.log();

      if (result.preview) {
        console.log('Components found:');
        console.log(`  ${chalk.cyan('Agent Configs:')} ${result.preview.agentConfigs}`);
        console.log(`  ${chalk.cyan('Prompts:')} ${result.preview.prompts}`);
        console.log(`  ${chalk.cyan('Model Profiles:')} ${result.preview.modelProfiles}`);
        console.log(`  ${chalk.cyan('Project Config:')} ${result.preview.projectConfig}`);
        console.log();

        const total = result.preview.agentConfigs + result.preview.prompts + result.preview.modelProfiles + result.preview.projectConfig;
        console.log(`${chalk.green('Total components:')} ${total}`);
        console.log();
        console.log(chalk.yellow('This was a dry run - no changes were made.'));
        console.log(`Run without ${chalk.cyan('--dry-run')} to perform the actual import.`);
      }
    } else {
      // Show actual import results
      console.log(chalk.bold('Import Results'));
      console.log();

      if (result.stats) {
        console.log('Components imported:');
        console.log(`  ${chalk.green('✓')} Agent Configs: ${result.stats.agentConfigsImported}`);
        console.log(`  ${chalk.green('✓')} Prompts: ${result.stats.promptsImported}`);
        console.log(`  ${chalk.green('✓')} Model Profiles: ${result.stats.modelProfilesImported}`);
        console.log(`  ${chalk.green('✓')} Project Config: ${result.stats.projectConfigImported}`);
        console.log();

        const total = result.stats.agentConfigsImported + result.stats.promptsImported +
                     result.stats.modelProfilesImported + result.stats.projectConfigImported;
        console.log(`${chalk.green.bold('Total imported:')} ${total} components`);

        // Show any errors
        if (result.stats.errors.length > 0) {
          console.log();
          console.log(chalk.yellow('Import warnings:'));
          for (const error of result.stats.errors) {
            console.log(`  ${chalk.yellow('⚠')} ${error}`);
          }
        }
      }

      console.log();
      console.log(chalk.green.bold('Import completed successfully!'));
      console.log();
      console.log('Next steps:');
      console.log(`  • Visit ${chalk.cyan('/auto-claude')} to manage your imported configurations`);
      console.log(`  • Run ${chalk.cyan('ccm auto-claude agents list')} to see imported agent configs`);
      console.log(`  • Run ${chalk.cyan('ccm auto-claude sync')} to sync changes back to Auto-Claude`);
    }

  } catch (error) {
    console.log(chalk.red('Import failed:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Validate Auto-Claude installation path
 */
function validateAutoClaudePath(path: string): { valid: boolean; error?: string; version?: string } {
  try {
    // Check if path exists
    if (!existsSync(path)) {
      return { valid: false, error: 'Path does not exist' };
    }

    // Check if it's a directory
    const pathStat = statSync(path);
    if (!pathStat.isDirectory()) {
      return { valid: false, error: 'Path is not a directory' };
    }

    // Check for Auto-Claude structure
    const appsPath = join(path, 'apps');
    const backendPath = join(appsPath, 'backend');

    if (!existsSync(appsPath)) {
      return { valid: false, error: 'Missing apps/ directory' };
    }

    if (!existsSync(backendPath)) {
      return { valid: false, error: 'Missing apps/backend/ directory' };
    }

    // Check for backend structure
    const promptsPath = join(backendPath, 'prompts');
    if (!existsSync(promptsPath)) {
      return { valid: false, error: 'Missing apps/backend/prompts/ directory' };
    }

    // Try to detect version (optional)
    let version: string | undefined;
    const packageJsonPath = join(path, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const fs = require('fs');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        version = packageJson.version;
      } catch {
        // Ignore version detection errors
      }
    }

    return { valid: true, version };

  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

/**
 * Main auto-claude command handler
 * This is the entry point when 'ccm auto-claude' is called without subcommands
 */
export async function autoClaudeCommand(): Promise<void> {
  console.log(chalk.bold('Auto-Claude Integration'));
  console.log();
  console.log('CCM Auto-Claude integration allows you to:');
  console.log(`  • ${chalk.cyan('Import')} existing Auto-Claude configurations`);
  console.log(`  • ${chalk.cyan('Manage')} agents, prompts, and model profiles through the web interface`);
  console.log(`  • ${chalk.cyan('Sync')} configurations back to your Auto-Claude installation`);
  console.log();
  console.log('Available commands:');
  console.log(`  ${chalk.cyan('config')}    Configure Auto-Claude backend path and settings`);
  console.log(`  ${chalk.cyan('import')}    Import existing Auto-Claude configurations`);
  console.log(`  ${chalk.cyan('sync')}      Sync configurations to Auto-Claude backend`);
  console.log(`  ${chalk.cyan('profiles')}  Manage Auto-Claude model profiles`);
  console.log(`  ${chalk.cyan('agents')}    Manage Auto-Claude agent configurations`);
  console.log();
  console.log(`Use ${chalk.cyan('ccm auto-claude <command> --help')} for detailed command information.`);
  console.log();
  console.log(`${chalk.gray('Web Interface:')} Visit ${chalk.cyan('/auto-claude')} to manage configurations through the web UI.`);
}