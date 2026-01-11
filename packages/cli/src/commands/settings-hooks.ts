import chalk from 'chalk';
import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { listHooks, createHook, deleteHook, importHooks, exportHooks } from '../lib/api-hooks.js';

export function createSettingsHooksCommand(): Command {
  const hooksCmd = new Command('hooks');

  hooksCmd
    .description('Manage global Claude Code hooks')
    .addHelpText('after', `

${chalk.gray('Examples:')}
  ${chalk.cyan('ccm settings hooks list')}              List all hooks
  ${chalk.cyan('ccm settings hooks import')}            Import from ~/.claude/settings.local.json
  ${chalk.cyan('ccm settings hooks export')}            Export to Claude format
`);

  // List hooks
  hooksCmd
    .command('list')
    .description('List all global hooks')
    .option('-t, --type <type>', 'Filter by hook type')
    .option('-c, --category <category>', 'Filter by category')
    .option('--enabled', 'Show only enabled hooks')
    .option('--disabled', 'Show only disabled hooks')
    .option('-f, --format <format>', 'Output format: table, json', 'table')
    .action(async (options) => {
      const result = await listHooks({
        hookType: options.type,
        category: options.category,
        enabled: options.enabled ? true : options.disabled ? false : undefined
      });

      if (result.error) {
        console.log(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(result.data, null, 2));
        return;
      }

      const { hooks, stats } = result.data!;

      console.log(chalk.bold('Global Hooks'));
      console.log();
      console.log(`Total: ${stats.total} | Enabled: ${chalk.green(stats.enabled)} | Disabled: ${chalk.red(stats.total - stats.enabled)}`);
      console.log();

      if (hooks.length === 0) {
        console.log(chalk.gray('No hooks configured.'));
        console.log(`Run ${chalk.cyan('ccm settings hooks import')} to import from settings.local.json`);
        return;
      }

      // Group by type for display
      const byType = hooks.reduce((acc, h) => {
        if (!acc[h.hookType]) acc[h.hookType] = [];
        acc[h.hookType].push(h);
        return acc;
      }, {} as Record<string, typeof hooks>);

      for (const [type, typeHooks] of Object.entries(byType)) {
        console.log(chalk.bold.cyan(type) + ` (${typeHooks.length})`);

        for (const hook of typeHooks) {
          const status = hook.enabled ? chalk.green('✓') : chalk.red('✗');
          const matcher = chalk.yellow(hook.matcher);
          const desc = hook.description ? chalk.gray(` - ${hook.description}`) : '';
          const cat = hook.category ? chalk.magenta(` [${hook.category}]`) : '';

          console.log(`  ${status} ${matcher}${cat}${desc}`);

          // Show truncated command
          const cmdPreview = hook.command.length > 60
            ? hook.command.substring(0, 60) + '...'
            : hook.command;
          console.log(chalk.gray(`     ${cmdPreview}`));
        }
        console.log();
      }
    });

  // Import hooks
  hooksCmd
    .command('import')
    .description('Import hooks from settings.local.json')
    .option('-s, --source <path>', 'Source file path', join(homedir(), '.claude', 'settings.local.json'))
    .option('--replace', 'Replace all existing hooks')
    .option('--dry-run', 'Preview import without making changes')
    .action(async (options) => {
      console.log(chalk.bold('Import Hooks'));
      console.log();

      if (!existsSync(options.source)) {
        console.log(chalk.red(`Source file not found: ${options.source}`));
        process.exit(1);
      }

      console.log(`Source: ${chalk.cyan(options.source)}`);
      if (options.dryRun) {
        console.log(chalk.yellow('Dry run mode - no changes will be made'));
      }
      console.log();

      try {
        const content = readFileSync(options.source, 'utf-8');
        const settings = JSON.parse(content);

        if (!settings.hooks) {
          console.log(chalk.yellow('No hooks found in settings file.'));
          return;
        }

        const result = await importHooks(settings.hooks, {
          replace: options.replace,
          dryRun: options.dryRun
        });

        if (result.error) {
          console.log(chalk.red('Import failed:'), result.error);
          process.exit(1);
        }

        if (options.dryRun) {
          console.log(chalk.bold('Preview:'));
          console.log(`  Total hooks found: ${result.data.preview.total}`);
          console.log('  By type:');
          for (const [type, count] of Object.entries(result.data.preview.byType)) {
            console.log(`    ${type}: ${count}`);
          }
        } else {
          console.log(chalk.green('✓ Import complete!'));
          console.log(`  Imported: ${result.data.imported}`);
          console.log(`  Skipped:  ${result.data.skipped}`);
          if (result.data.errors?.length > 0) {
            console.log(chalk.yellow('  Errors:'));
            for (const err of result.data.errors) {
              console.log(`    - ${err}`);
            }
          }
        }
      } catch (error) {
        console.log(chalk.red('Failed to read/parse source file:'), error);
        process.exit(1);
      }
    });

  // Export hooks
  hooksCmd
    .command('export')
    .description('Export hooks to Claude settings format')
    .option('-f, --format <format>', 'Output format: json, file', 'json')
    .action(async (options) => {
      const result = await exportHooks();

      if (result.error) {
        console.log(chalk.red('Export failed:'), result.error);
        process.exit(1);
      }

      console.log(JSON.stringify(result.data!.hooks, null, 2));
    });

  // Add hook
  hooksCmd
    .command('add')
    .description('Add a new hook')
    .requiredOption('-t, --type <type>', 'Hook type (PreToolUse, PostToolUse, etc.)')
    .requiredOption('-m, --matcher <matcher>', 'Tool matcher pattern')
    .requiredOption('-c, --command <command>', 'Shell command to run')
    .option('--timeout <seconds>', 'Timeout in seconds')
    .option('-d, --description <desc>', 'Description')
    .option('--category <cat>', 'Category (git, security, formatting, etc.)')
    .action(async (options) => {
      const result = await createHook({
        hookType: options.type,
        matcher: options.matcher,
        command: options.command,
        timeout: options.timeout ? parseInt(options.timeout) : undefined,
        description: options.description,
        category: options.category,
      });

      if (result.error) {
        console.log(chalk.red('Failed to add hook:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Hook added successfully!'));
      console.log(`  ID: ${result.data!.hook.id}`);
    });

  // Delete hook
  hooksCmd
    .command('delete <id>')
    .description('Delete a hook by ID')
    .action(async (id) => {
      const result = await deleteHook(id);

      if (result.error) {
        console.log(chalk.red('Failed to delete hook:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Hook deleted'));
    });

  return hooksCmd;
}
