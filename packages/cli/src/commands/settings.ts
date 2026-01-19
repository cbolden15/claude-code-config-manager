/**
 * Settings Command Group
 *
 * ccm settings permissions list
 * ccm settings permissions add
 * ccm settings permissions delete
 * ccm settings permissions import
 * ccm settings permissions export
 */

import chalk from 'chalk';
import { Command } from 'commander';
import {
  listPermissions,
  addPermission,
  deletePermission,
  importPermissions,
  exportPermissions,
} from './settings-permissions.js';
import { createSettingsHooksCommand } from './settings-hooks.js';

/**
 * Create and configure the settings command group
 */
export function createSettingsCommand(): Command {
  const settingsCmd = new Command('settings');

  settingsCmd
    .description('Manage global settings (permissions, hooks, environment variables)')
    .action(async () => {
      settingsCmd.help();
    })
    .addHelpText('before', chalk.bold('Global Settings Management'))
    .addHelpText(
      'after',
      `

${chalk.gray('Available Subcommands:')}
  ${chalk.cyan('permissions')}  Manage global permissions (allow/deny lists)
  ${chalk.cyan('hooks')}         Manage global hooks
  ${chalk.gray('env')}           (Coming soon) Manage environment variables

${chalk.gray('Examples:')}
  ${chalk.cyan('ccm settings permissions list')}                    List all permissions
  ${chalk.cyan('ccm settings permissions add "Bash(git:*)" allow')} Add git permission
  ${chalk.cyan('ccm settings hooks list')}                          List all hooks
  ${chalk.cyan('ccm settings hooks import')}                        Import hooks from settings.local.json
`
    );

  // Permissions subcommand group
  const permissionsCmd = settingsCmd
    .command('permissions')
    .description('Manage global permissions')
    .addHelpText(
      'after',
      `

${chalk.gray('Examples:')}
  ${chalk.cyan('ccm settings permissions list')}                              List all permissions
  ${chalk.cyan('ccm settings permissions list --action allow')}               Filter by action
  ${chalk.cyan('ccm settings permissions list --category git')}               Filter by category
  ${chalk.cyan('ccm settings permissions list --verbose')}                    Show detailed info
  ${chalk.cyan('ccm settings permissions add "Bash(git:*)" allow')}           Add allow permission
  ${chalk.cyan('ccm settings permissions add "Write(/etc/*)" deny')}          Add deny permission
  ${chalk.cyan('ccm settings permissions delete <id>')}                       Delete by ID
  ${chalk.cyan('ccm settings permissions import ./settings.local.json')}      Import from file
  ${chalk.cyan('ccm settings permissions export ./permissions.json')}         Export to file
  ${chalk.cyan('ccm settings permissions export')}                            Export to stdout

${chalk.gray('Permission Format:')}
  Permissions should be in the format: ${chalk.cyan('ToolType(pattern)')}

  Examples:
    ${chalk.cyan('Bash(git:*)')}              - Allow/deny all git commands
    ${chalk.cyan('Bash(docker:*)')}           - Allow/deny all docker commands
    ${chalk.cyan('WebFetch(domain:*.com)')}   - Allow/deny .com domains
    ${chalk.cyan('Write(path:/etc/*)')}       - Allow/deny writes to /etc
    ${chalk.cyan('Read(path:~/.ssh/*)')}      - Allow/deny reads from ~/.ssh

${chalk.gray('Categories:')}
  ${chalk.blue('git')}, ${chalk.cyan('network')}, ${chalk.yellow('shell')}, ${chalk.green('file')}, ${chalk.magenta('docker')}, ${chalk.blueBright('cloud')}, ${chalk.red('database')}, ${chalk.gray('other')}
`
    );

  // permissions list
  permissionsCmd
    .command('list')
    .description('List all permissions with statistics')
    .option('-a, --action <action>', 'Filter by action (allow/deny)')
    .option('-c, --category <category>', 'Filter by category')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options: { action?: string; category?: string; verbose?: boolean }) => {
      try {
        await listPermissions(options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // permissions add
  permissionsCmd
    .command('add <permission> <action>')
    .description('Add a new permission')
    .option('-d, --description <desc>', 'Permission description')
    .option('-c, --category <category>', 'Category (git, network, shell, file, etc.)')
    .option('-p, --priority <priority>', 'Priority (higher = evaluated first)', '0')
    .option('--disabled', 'Create in disabled state')
    .action(
      async (
        permission: string,
        action: string,
        options: {
          description?: string;
          category?: string;
          priority?: string;
          disabled?: boolean;
        }
      ) => {
        try {
          await addPermission(permission, action, options);
        } catch (error) {
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      }
    );

  // permissions delete
  permissionsCmd
    .command('delete <id>')
    .description('Delete a permission by ID')
    .action(async (id: string) => {
      try {
        await deletePermission(id);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // permissions import
  permissionsCmd
    .command('import <file>')
    .description('Import permissions from a JSON file')
    .action(async (file: string) => {
      try {
        await importPermissions(file);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // permissions export
  permissionsCmd
    .command('export [file]')
    .description('Export permissions to a JSON file (or stdout if no file specified)')
    .option('--enabled', 'Only export enabled permissions')
    .option('--disabled', 'Only export disabled permissions')
    .option('-c, --category <category>', 'Only export specific category')
    .action(
      async (
        file: string | undefined,
        options: { enabled?: boolean; disabled?: boolean; category?: string }
      ) => {
        try {
          // Handle enabled/disabled flags
          let enabledFilter: boolean | undefined;
          if (options.enabled) {
            enabledFilter = true;
          } else if (options.disabled) {
            enabledFilter = false;
          }

          await exportPermissions(file, {
            enabled: enabledFilter,
            category: options.category,
          });
        } catch (error) {
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      }
    );

  // Hooks subcommand group
  settingsCmd.addCommand(createSettingsHooksCommand());

  return settingsCmd;
}
