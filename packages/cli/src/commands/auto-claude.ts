import chalk from 'chalk';
import { Command } from 'commander';

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

  // Config subcommand - Will be implemented in subtask 6_2
  autoClaudeCommand
    .command('config')
    .description('Configure Auto-Claude backend path and settings')
    .option('-p, --path <path>', 'Set Auto-Claude backend installation path')
    .option('--show', 'Show current Auto-Claude configuration')
    .action(async () => {
      console.log(chalk.yellow('Auto-Claude config command is not yet implemented.'));
      console.log(chalk.gray('This will be available in a future update.'));
      console.log();
      console.log(chalk.cyan('Use the web interface at /settings for now.'));
    });

  // Import subcommand - Will be implemented in subtask 6_3
  autoClaudeCommand
    .command('import')
    .description('Import existing Auto-Claude configurations')
    .option('-s, --source <path>', 'Source directory containing Auto-Claude configs')
    .option('--dry-run', 'Preview import without making changes')
    .action(async () => {
      console.log(chalk.yellow('Auto-Claude import command is not yet implemented.'));
      console.log(chalk.gray('This will be available in a future update.'));
      console.log();
      console.log(chalk.cyan('Use the web interface at /auto-claude/import for now.'));
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