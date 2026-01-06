import chalk from 'chalk';
import { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { api, type AutoClaudeImportRequest, type AutoClaudeImportResponse, type AutoClaudeSyncRequest, type AutoClaudeSyncResponse, type AutoClaudeModelProfilesResponse, type AutoClaudeModelProfileDetail } from '../lib/api.js';

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

  // Sync subcommand
  autoClaudeCommand
    .command('sync')
    .description('Sync configurations to Auto-Claude backend')
    .option('-b, --backend <path>', 'Auto-Claude backend directory path')
    .option('--dry-run', 'Preview sync without writing files')
    .action(async (options: { backend?: string; dryRun?: boolean }) => {
      await autoClaudeSyncCommand(options);
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
    .option('-v, --verbose', 'Show detailed phase analysis for each profile')
    .option('-f, --format <format>', 'Output format: table (default), json', 'table')
    .action(async (options: { verbose?: boolean; format?: string }) => {
      await autoClaudeProfilesListCommand(options);
    });

  profilesCommand
    .command('show <profile>')
    .description('Show details for a specific model profile')
    .option('-f, --format <format>', 'Output format: table (default), json', 'table')
    .action(async (profile: string, options: { format?: string }) => {
      await autoClaudeProfilesShowCommand(profile, options);
    });

  profilesCommand
    .command('apply <profile>')
    .description('Apply model profile to current project')
    .option('--project-id <id>', 'Specific project ID to apply profile to')
    .option('--project-name <name>', 'Specific project name to apply profile to')
    .action(async (profile: string, options: { projectId?: string; projectName?: string }) => {
      await autoClaudeProfilesApplyCommand(profile, options);
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
 * Auto-Claude sync command implementation
 */
async function autoClaudeSyncCommand(options: { backend?: string; dryRun?: boolean }): Promise<void> {
  console.log(chalk.bold('Auto-Claude Sync'));
  console.log();

  let backendPath: string;

  // Determine backend path
  if (options.backend) {
    // Use provided backend path
    backendPath = resolve(options.backend);
    console.log(`Backend path: ${chalk.cyan(backendPath)} ${chalk.gray('(from --backend option)')}`);
  } else {
    // Use configured backend path
    console.log(chalk.gray('Getting configured Auto-Claude backend path...'));

    try {
      const pathResult = await api.getSetting('autoClaudeBackendPath');
      const currentPath = pathResult.data?.value;

      if (pathResult.error || !currentPath) {
        console.log(chalk.red('Error: No Auto-Claude backend path configured.'));
        console.log();
        console.log('Please either:');
        console.log(`  • ${chalk.cyan('ccm auto-claude config --path /path/to/auto-claude')} to configure backend path`);
        console.log(`  • ${chalk.cyan('ccm auto-claude sync --backend /path/to/auto-claude')} to specify path directly`);
        process.exit(1);
      }

      backendPath = currentPath;
      console.log(`Backend path: ${chalk.cyan(backendPath)} ${chalk.gray('(from configuration)')}`);
    } catch (error) {
      console.log(chalk.red('Error retrieving backend path:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  if (options.dryRun) {
    console.log(chalk.yellow('Dry run mode: no files will be written'));
  }
  console.log();

  // Validate backend path
  console.log(chalk.gray('Validating Auto-Claude backend path...'));
  const validation = validateAutoClaudePath(backendPath);
  if (!validation.valid) {
    console.log(chalk.red('✗ Invalid Auto-Claude backend path:'), validation.error);
    console.log();
    console.log(chalk.gray('Expected structure:'));
    console.log(chalk.gray('  path/to/auto-claude/'));
    console.log(chalk.gray('  ├── apps/'));
    console.log(chalk.gray('  │   └── backend/'));
    console.log(chalk.gray('  │       └── prompts/'));
    console.log(chalk.gray('  └── (other Auto-Claude files)'));
    process.exit(1);
  }

  console.log(chalk.green('✓ Valid Auto-Claude backend path'));
  if (validation.version) {
    console.log(chalk.gray(`  Version: ${validation.version}`));
  }
  console.log();

  // Call sync API
  try {
    console.log(chalk.gray('Syncing configurations to Auto-Claude backend...'));

    const syncResult = await api.autoClaudeSync({
      backendPath: backendPath,
      dryRun: options.dryRun || false,
    });

    if (syncResult.error) {
      console.log(chalk.red('Sync failed:'), syncResult.error);
      process.exit(1);
    }

    const result = syncResult.data!;

    if (options.dryRun || result.dryRun) {
      // Show preview results
      console.log(chalk.bold('Sync Preview'));
      console.log();

      console.log('Files that would be written:');
      if (result.stats.filesWritten.length > 0) {
        for (const file of result.stats.filesWritten) {
          console.log(`  ${chalk.cyan('→')} ${file}`);
        }
      } else {
        console.log(chalk.gray('  No files to write'));
      }
      console.log();

      console.log('Summary:');
      console.log(`  ${chalk.cyan('Prompts:')} ${result.stats.promptsWritten}`);
      console.log(`  ${chalk.cyan('Agent Configs:')} ${result.stats.agentConfigsWritten}`);
      console.log(`  ${chalk.cyan('Total Files:')} ${result.stats.filesWritten.length}`);
      console.log();
      console.log(chalk.yellow('This was a dry run - no changes were made.'));
      console.log(`Run without ${chalk.cyan('--dry-run')} to perform the actual sync.`);

    } else {
      // Show actual sync results
      console.log(chalk.bold('Sync Results'));
      console.log();

      console.log('Files written:');
      if (result.stats.filesWritten.length > 0) {
        for (const file of result.stats.filesWritten) {
          console.log(`  ${chalk.green('✓')} ${file}`);
        }
      } else {
        console.log(chalk.gray('  No files written'));
      }
      console.log();

      console.log('Summary:');
      console.log(`  ${chalk.green('✓')} Prompts: ${result.stats.promptsWritten}`);
      console.log(`  ${chalk.green('✓')} Agent Configs: ${result.stats.agentConfigsWritten}`);
      console.log(`  ${chalk.green('✓')} Total Files: ${result.stats.filesWritten.length}`);

      // Show any errors
      if (result.stats.errors.length > 0) {
        console.log();
        console.log(chalk.yellow('Sync warnings:'));
        for (const error of result.stats.errors) {
          console.log(`  ${chalk.yellow('⚠')} ${error}`);
        }
      }

      console.log();
      console.log(chalk.green.bold('Sync completed successfully!'));
      console.log();
      console.log('Next steps:');
      console.log(`  • Your Auto-Claude installation is now up to date`);
      console.log(`  • Visit ${chalk.cyan('/auto-claude')} to manage your configurations`);
      console.log(`  • Run Auto-Claude with the latest synced configurations`);
    }

  } catch (error) {
    console.log(chalk.red('Sync failed:'), error instanceof Error ? error.message : 'Unknown error');
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

/**
 * Auto-Claude profiles list command implementation
 */
async function autoClaudeProfilesListCommand(options: { verbose?: boolean; format?: string }): Promise<void> {
  try {
    console.log(chalk.bold('Auto-Claude Model Profiles'));
    console.log();

    const result = await api.listAutoClaudeModelProfiles({
      includePhaseDetails: options.verbose || false,
    });

    if (result.error) {
      console.log(chalk.red('Error fetching model profiles:'), result.error);
      process.exit(1);
    }

    const { modelProfiles, stats } = result.data!;

    if (modelProfiles.length === 0) {
      console.log(chalk.yellow('No model profiles found.'));
      console.log();
      console.log('To create model profiles:');
      console.log(`  • Visit ${chalk.cyan('/auto-claude/profiles')} in the web interface`);
      console.log(`  • Import existing Auto-Claude configurations with ${chalk.cyan('ccm auto-claude import')}`);
      return;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(result.data, null, 2));
      return;
    }

    // Table format output
    console.log(`Found ${chalk.cyan(stats.total)} model profile${stats.total !== 1 ? 's' : ''}:`);
    console.log();

    for (const profile of modelProfiles) {
      const statusIcon = profile.enabled ? chalk.green('✓') : chalk.red('✗');
      console.log(`${statusIcon} ${chalk.bold(profile.name)}`);
      console.log(`  ${chalk.gray(profile.description)}`);

      if (options.verbose && profile.phaseAnalysis) {
        const { phaseAnalysis } = profile;
        console.log();
        console.log('  Phase Configuration:');
        console.log(`    Models:   ${Object.entries(profile.config.phaseModels)
          .map(([phase, model]) => `${phase}=${chalk.cyan(model)}`)
          .join(', ')}`);
        console.log(`    Thinking: ${Object.entries(profile.config.phaseThinking)
          .map(([phase, level]) => `${phase}=${chalk.magenta(level)}`)
          .join(', ')}`);
        console.log();
        console.log('  Analysis:');
        console.log(`    Cost:     ${getCostBadge(phaseAnalysis.costEstimate)}`);
        console.log(`    Quality:  ${getQualityBadge(phaseAnalysis.qualityLevel)}`);
        console.log();
      } else if (!options.verbose) {
        // Show a brief summary
        const uniqueModels = [...new Set(Object.values(profile.config.phaseModels))];
        const uniqueThinking = [...new Set(Object.values(profile.config.phaseThinking))];
        console.log(`  Models: ${uniqueModels.map(m => chalk.cyan(m)).join(', ')} | Thinking: ${uniqueThinking.map(t => chalk.magenta(t)).join(', ')}`);
      }

      console.log();
    }

    console.log(chalk.gray('Summary:'));
    console.log(`  Total Profiles: ${stats.total} (${stats.enabled} enabled)`);
    console.log(`  Unique Models: ${stats.uniqueModels}`);
    console.log(`  Unique Thinking Levels: ${stats.uniqueThinkingLevels}`);
    console.log();
    console.log(`Use ${chalk.cyan('ccm auto-claude profiles show <profile>')} for detailed information about a specific profile.`);

  } catch (error) {
    console.log(chalk.red('Command failed:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Auto-Claude profiles show command implementation
 */
async function autoClaudeProfilesShowCommand(profile: string, options: { format?: string }): Promise<void> {
  try {
    console.log(chalk.bold(`Model Profile: ${profile}`));
    console.log();

    // First try to find profile by name
    const listResult = await api.listAutoClaudeModelProfiles({ profileName: profile });
    if (listResult.error) {
      console.log(chalk.red('Error fetching model profiles:'), listResult.error);
      process.exit(1);
    }

    const profiles = listResult.data!.modelProfiles;
    if (profiles.length === 0) {
      console.log(chalk.red(`Model profile '${profile}' not found.`));
      console.log();
      console.log('Available profiles:');
      const allProfilesResult = await api.listAutoClaudeModelProfiles();
      if (!allProfilesResult.error && allProfilesResult.data!.modelProfiles.length > 0) {
        for (const p of allProfilesResult.data!.modelProfiles) {
          console.log(`  • ${p.name}`);
        }
      } else {
        console.log(chalk.gray('  No profiles available'));
      }
      process.exit(1);
    }

    const foundProfile = profiles[0];

    // Get detailed profile information
    const detailResult = await api.getAutoClaudeModelProfile(foundProfile.id);
    if (detailResult.error) {
      console.log(chalk.red('Error fetching profile details:'), detailResult.error);
      process.exit(1);
    }

    const profileDetail = detailResult.data!;

    if (options.format === 'json') {
      console.log(JSON.stringify(profileDetail, null, 2));
      return;
    }

    // Detailed formatted output
    const statusIcon = profileDetail.enabled ? chalk.green('✓ Active') : chalk.red('✗ Disabled');
    console.log(`Status: ${statusIcon}`);
    console.log(`Description: ${profileDetail.description}`);
    console.log();

    // Phase Configuration Table
    console.log(chalk.bold('Phase Configuration:'));
    console.log();
    console.log(`${'Phase'.padEnd(12)} ${'Model'.padEnd(10)} ${'Thinking'.padEnd(12)} ${'Cost'.padEnd(6)} ${'Quality'}`);
    console.log('─'.repeat(60));

    const phases = ['spec', 'planning', 'coding', 'qa'] as const;
    for (const phase of phases) {
      const model = profileDetail.config.phaseModels[phase];
      const thinking = profileDetail.config.phaseThinking[phase];
      const cost = profileDetail.analysis.cost.perPhase[phase];
      const quality = profileDetail.analysis.quality.perPhase[phase];

      const modelColor = model === 'opus' ? chalk.magenta : model === 'sonnet' ? chalk.cyan : chalk.green;
      const thinkingColor = thinking === 'ultrathink' ? chalk.red :
                           thinking === 'high' ? chalk.yellow :
                           thinking === 'medium' ? chalk.blue :
                           thinking === 'low' ? chalk.green : chalk.gray;

      console.log(`${phase.padEnd(12)} ${modelColor(model.padEnd(10))} ${thinkingColor(thinking.padEnd(12))} ${cost.toString().padEnd(6)} ${quality}`);
    }
    console.log();

    // Analysis Summary
    console.log(chalk.bold('Profile Analysis:'));
    console.log(`Overall Cost:     ${getCostBadge(profileDetail.analysis.characteristics.costEstimate)} (Score: ${profileDetail.analysis.cost.total})`);
    console.log(`Overall Quality:  ${getQualityBadge(profileDetail.analysis.characteristics.qualityLevel)}`);
    console.log(`Uniform Models:   ${profileDetail.analysis.characteristics.uniformModels ? chalk.green('Yes') : chalk.yellow('No')}`);
    console.log(`Uniform Thinking: ${profileDetail.analysis.characteristics.uniformThinking ? chalk.green('Yes') : chalk.yellow('No')}`);
    console.log();

    // Model Distribution
    console.log(chalk.bold('Model Distribution:'));
    Object.entries(profileDetail.analysis.models.distribution).forEach(([model, count]) => {
      const percentage = Math.round((count / 4) * 100);
      const modelColor = model === 'opus' ? chalk.magenta : model === 'sonnet' ? chalk.cyan : chalk.green;
      console.log(`  ${modelColor(model)}: ${count}/4 phases (${percentage}%)`);
    });
    console.log();

    // Thinking Distribution
    console.log(chalk.bold('Thinking Level Distribution:'));
    Object.entries(profileDetail.analysis.thinking.distribution).forEach(([level, count]) => {
      const percentage = Math.round((count / 4) * 100);
      const thinkingColor = level === 'ultrathink' ? chalk.red :
                           level === 'high' ? chalk.yellow :
                           level === 'medium' ? chalk.blue :
                           level === 'low' ? chalk.green : chalk.gray;
      console.log(`  ${thinkingColor(level)}: ${count}/4 phases (${percentage}%)`);
    });
    console.log();

    console.log(`Use ${chalk.cyan(`ccm auto-claude profiles apply ${profile}`)} to apply this profile to a project.`);

  } catch (error) {
    console.log(chalk.red('Command failed:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Auto-Claude profiles apply command implementation
 */
async function autoClaudeProfilesApplyCommand(profile: string, options: { projectId?: string; projectName?: string }): Promise<void> {
  try {
    console.log(chalk.bold(`Applying Model Profile: ${profile}`));
    console.log();

    // Validate profile exists
    const profileResult = await api.listAutoClaudeModelProfiles({ profileName: profile });
    if (profileResult.error) {
      console.log(chalk.red('Error fetching model profiles:'), profileResult.error);
      process.exit(1);
    }

    const profiles = profileResult.data!.modelProfiles;
    if (profiles.length === 0) {
      console.log(chalk.red(`Model profile '${profile}' not found.`));
      process.exit(1);
    }

    const targetProfile = profiles[0];

    // Get projects
    const projectsResult = await api.listProjects();
    if (projectsResult.error) {
      console.log(chalk.red('Error fetching projects:'), projectsResult.error);
      process.exit(1);
    }

    const projects = projectsResult.data!.projects;

    // Determine target project
    let targetProject = null;
    if (options.projectId) {
      targetProject = projects.find(p => p.id === options.projectId);
      if (!targetProject) {
        console.log(chalk.red(`Project with ID '${options.projectId}' not found.`));
        process.exit(1);
      }
    } else if (options.projectName) {
      targetProject = projects.find(p => p.name === options.projectName);
      if (!targetProject) {
        console.log(chalk.red(`Project '${options.projectName}' not found.`));
        process.exit(1);
      }
    } else {
      // Show available projects and ask user to specify
      console.log(chalk.yellow('No project specified. Available projects:'));
      console.log();
      if (projects.length === 0) {
        console.log(chalk.gray('No projects found.'));
        console.log(`Use ${chalk.cyan('ccm init')} to create a project first.`);
        process.exit(1);
      }

      for (const project of projects) {
        const profileInfo = project.profile ? ` (Current: ${project.profile.name})` : ' (No profile)';
        console.log(`  • ${chalk.cyan(project.name)} [ID: ${project.id}]${chalk.gray(profileInfo)}`);
        console.log(`    Path: ${project.path}`);
        console.log();
      }

      console.log(`Use ${chalk.cyan(`ccm auto-claude profiles apply ${profile} --project-id <id>`)} or`);
      console.log(`    ${chalk.cyan(`ccm auto-claude profiles apply ${profile} --project-name <name>`)}`);
      return;
    }

    console.log(`Target Project: ${chalk.cyan(targetProject.name)}`);
    console.log(`Profile: ${chalk.cyan(profile)}`);
    console.log();

    // Note: The actual profile application would require an API endpoint to update project.modelProfileId
    // For now, we'll show what would happen
    console.log(chalk.yellow('Note: Model profile application is not yet fully implemented.'));
    console.log();
    console.log('This would:');
    console.log(`  ${chalk.gray('1.')} Update project to use model profile '${profile}'`);
    console.log(`  ${chalk.gray('2.')} Generate task_metadata.json with profile settings when running ${chalk.cyan('ccm generate')}`);
    console.log(`  ${chalk.gray('3.')} Apply the following phase configuration:`);
    console.log();

    const phases = ['spec', 'planning', 'coding', 'qa'] as const;
    for (const phase of phases) {
      const model = targetProfile.config.phaseModels[phase];
      const thinking = targetProfile.config.phaseThinking[phase];
      const modelColor = model === 'opus' ? chalk.magenta : model === 'sonnet' ? chalk.cyan : chalk.green;
      const thinkingColor = thinking === 'ultrathink' ? chalk.red :
                           thinking === 'high' ? chalk.yellow :
                           thinking === 'medium' ? chalk.blue : chalk.green;
      console.log(`      ${phase.padEnd(9)}: ${modelColor(model)} + ${thinkingColor(thinking)} thinking`);
    }

    console.log();
    console.log(chalk.gray('To implement project-profile association, the API needs to be extended.'));
    console.log(`Visit ${chalk.cyan('/auto-claude/profiles')} to manage profiles through the web interface.`);

  } catch (error) {
    console.log(chalk.red('Command failed:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Helper functions for formatting
 */
function getCostBadge(cost: string): string {
  switch (cost) {
    case 'high': return chalk.red.bold('HIGH');
    case 'medium': return chalk.yellow.bold('MEDIUM');
    case 'low': return chalk.green.bold('LOW');
    default: return chalk.gray(cost.toUpperCase());
  }
}

function getQualityBadge(quality: string): string {
  switch (quality) {
    case 'premium': return chalk.magenta.bold('PREMIUM');
    case 'high': return chalk.blue.bold('HIGH');
    case 'balanced': return chalk.cyan.bold('BALANCED');
    case 'basic': return chalk.green.bold('BASIC');
    default: return chalk.gray(quality.toUpperCase());
  }
}