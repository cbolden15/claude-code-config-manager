/**
 * CLI Commands for Environment Variables
 *
 * Manages global environment variables in CCM v2.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { envApi } from '../lib/api-env.js';
import type { EnvScope, EnvCategory } from '@ccm/shared';

export function createEnvCommand(): Command {
  const envCmd = new Command('env')
    .description('Manage global environment variables')
    .alias('environment');

  // List environment variables
  envCmd
    .command('list')
    .description('List all environment variables')
    .option('-s, --scope <scope>', 'Filter by scope (all, claude-desktop, claude-code, cli)')
    .option('-c, --category <category>', 'Filter by category')
    .option('-e, --encrypted', 'Show only encrypted variables')
    .option('--sensitive', 'Show only sensitive variables')
    .option('-f, --format <format>', 'Output format: table, json', 'table')
    .action(async (options) => {
      console.log(chalk.bold('Global Environment Variables'));
      console.log();

      const filters: any = {};
      if (options.scope) filters.scope = options.scope;
      if (options.category) filters.category = options.category;
      if (options.encrypted) filters.encrypted = true;
      if (options.sensitive) filters.sensitive = true;

      const result = await envApi.list(filters);

      if (result.error) {
        console.log(chalk.red('Failed to list environment variables:'), result.error);
        process.exit(1);
      }

      const { envVars, stats } = result.data!;

      if (options.format === 'json') {
        console.log(JSON.stringify({ envVars, stats }, null, 2));
        return;
      }

      // Display stats
      console.log(`Total: ${stats.total} | Encrypted: ${chalk.yellow(stats.encrypted)} | Sensitive: ${chalk.red(stats.sensitive)}`);
      console.log();

      // Display by scope
      console.log(chalk.bold('By Scope:'));
      for (const [scope, count] of Object.entries(stats.byScope)) {
        console.log(`  ${scope}: ${count}`);
      }
      console.log();

      // Display by category
      console.log(chalk.bold('By Category:'));
      for (const [category, count] of Object.entries(stats.byCategory)) {
        console.log(`  ${category}: ${count}`);
      }
      console.log();

      if (envVars.length === 0) {
        console.log(chalk.gray('No environment variables configured.'));
        console.log(`Run ${chalk.cyan('ccm env add')} to create one.`);
        return;
      }

      // Group by category
      const byCategory: Record<string, typeof envVars> = {};
      for (const ev of envVars) {
        const cat = ev.category || 'other';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(ev);
      }

      // Display grouped by category
      for (const [category, vars] of Object.entries(byCategory)) {
        console.log(chalk.bold.cyan(category.toUpperCase()) + ` (${vars.length})`);

        for (const ev of vars) {
          const flags: string[] = [];
          if (ev.encrypted) flags.push(chalk.yellow('E'));
          if (ev.sensitive) flags.push(chalk.red('S'));
          const flagStr = flags.length > 0 ? ` [${flags.join(' ')}]` : '';

          const scope = ev.scope !== 'all' ? chalk.magenta(`[${ev.scope}]`) : '';

          console.log(`  ${chalk.bold(ev.key)}${flagStr}${scope ? ' ' + scope : ''}`);
          console.log(chalk.gray(`    ${ev.value}`));
          if (ev.description) {
            console.log(chalk.gray(`    ${ev.description}`));
          }
        }
        console.log();
      }
    });

  // Get a single environment variable
  envCmd
    .command('get <key>')
    .description('Get a single environment variable by key')
    .option('--show-value', 'Show the actual value (including sensitive values)')
    .action(async (key, options) => {
      // First, find the env var by key
      const listResult = await envApi.list();

      if (listResult.error) {
        console.log(chalk.red('Failed to get environment variables:'), listResult.error);
        process.exit(1);
      }

      const envVar = listResult.data!.envVars.find(ev => ev.key === key);

      if (!envVar) {
        console.log(chalk.red(`Environment variable "${key}" not found`));
        process.exit(1);
      }

      // Get full details
      const result = await envApi.get(envVar.id, options.showValue);

      if (result.error) {
        console.log(chalk.red('Failed to get environment variable:'), result.error);
        process.exit(1);
      }

      const ev = result.data!.envVar;

      console.log(chalk.bold('Environment Variable'));
      console.log();
      console.log(`${chalk.bold('Key:')} ${ev.key}`);
      console.log(`${chalk.bold('Value:')} ${ev.value}`);
      console.log(`${chalk.bold('Scope:')} ${ev.scope}`);
      console.log(`${chalk.bold('Category:')} ${ev.category || 'none'}`);
      console.log(`${chalk.bold('Encrypted:')} ${ev.encrypted ? chalk.yellow('Yes') : 'No'}`);
      console.log(`${chalk.bold('Sensitive:')} ${ev.sensitive ? chalk.red('Yes') : 'No'}`);
      if (ev.description) {
        console.log(`${chalk.bold('Description:')} ${ev.description}`);
      }
    });

  // Add environment variable
  envCmd
    .command('add')
    .description('Add a new environment variable')
    .requiredOption('-k, --key <key>', 'Variable key')
    .requiredOption('-v, --value <value>', 'Variable value')
    .option('-s, --scope <scope>', 'Scope (all, claude-desktop, claude-code, cli)', 'all')
    .option('-c, --category <category>', 'Category (api_keys, paths, webhooks, database, credentials, other)')
    .option('-d, --description <desc>', 'Description')
    .option('--encrypt', 'Encrypt the value')
    .option('--sensitive', 'Mark as sensitive (mask in UI)')
    .action(async (options) => {
      const result = await envApi.create({
        key: options.key,
        value: options.value,
        scope: options.scope as EnvScope,
        category: options.category as EnvCategory,
        description: options.description,
        encrypted: options.encrypt || false,
        sensitive: options.sensitive || false,
      });

      if (result.error) {
        console.log(chalk.red('Failed to add environment variable:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Environment variable added successfully!'));
      console.log(`  Key: ${result.data!.envVar.key}`);
      console.log(`  ID: ${result.data!.envVar.id}`);
    });

  // Update environment variable
  envCmd
    .command('update <key>')
    .description('Update an existing environment variable')
    .option('-v, --value <value>', 'New value')
    .option('-s, --scope <scope>', 'New scope')
    .option('-c, --category <category>', 'New category')
    .option('-d, --description <desc>', 'New description')
    .option('--encrypt', 'Encrypt the value')
    .option('--no-encrypt', 'Remove encryption')
    .option('--sensitive', 'Mark as sensitive')
    .option('--no-sensitive', 'Remove sensitive flag')
    .action(async (key, options) => {
      // First, find the env var by key
      const listResult = await envApi.list();

      if (listResult.error) {
        console.log(chalk.red('Failed to get environment variables:'), listResult.error);
        process.exit(1);
      }

      const envVar = listResult.data!.envVars.find(ev => ev.key === key);

      if (!envVar) {
        console.log(chalk.red(`Environment variable "${key}" not found`));
        process.exit(1);
      }

      const updateData: any = { id: envVar.id };
      if (options.value !== undefined) updateData.value = options.value;
      if (options.scope !== undefined) updateData.scope = options.scope;
      if (options.category !== undefined) updateData.category = options.category;
      if (options.description !== undefined) updateData.description = options.description;
      if (options.encrypt !== undefined) updateData.encrypted = options.encrypt;
      if (options.sensitive !== undefined) updateData.sensitive = options.sensitive;

      const result = await envApi.update(updateData);

      if (result.error) {
        console.log(chalk.red('Failed to update environment variable:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Environment variable updated successfully!'));
    });

  // Delete environment variable
  envCmd
    .command('delete <key>')
    .description('Delete an environment variable')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (key, options) => {
      // First, find the env var by key
      const listResult = await envApi.list();

      if (listResult.error) {
        console.log(chalk.red('Failed to get environment variables:'), listResult.error);
        process.exit(1);
      }

      const envVar = listResult.data!.envVars.find(ev => ev.key === key);

      if (!envVar) {
        console.log(chalk.red(`Environment variable "${key}" not found`));
        process.exit(1);
      }

      if (!options.yes) {
        console.log(chalk.yellow(`Are you sure you want to delete "${key}"?`));
        console.log('Use --yes to skip this confirmation.');
        process.exit(0);
      }

      const result = await envApi.delete(envVar.id);

      if (result.error) {
        console.log(chalk.red('Failed to delete environment variable:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Environment variable deleted'));
    });

  // Export environment variables
  envCmd
    .command('export')
    .description('Export environment variables')
    .option('-s, --scope <scope>', 'Export for specific scope')
    .option('-c, --category <category>', 'Export specific category')
    .option('-f, --format <format>', 'Output format: json, dotenv', 'json')
    .option('--decrypt', 'Decrypt encrypted values')
    .option('-o, --output <file>', 'Output file (default: stdout)')
    .action(async (options) => {
      const result = await envApi.export({
        scope: options.scope,
        filters: options.category ? { category: options.category } : undefined,
        format: options.format,
        decrypt: options.decrypt || false,
      });

      if (result.error) {
        console.log(chalk.red('Failed to export environment variables:'), result.error);
        process.exit(1);
      }

      const { envVars } = result.data!;

      if (options.format === 'dotenv') {
        const output = Object.entries(envVars)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');

        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(options.output, output);
          console.log(chalk.green(`✓ Exported to ${options.output}`));
        } else {
          console.log(output);
        }
      } else {
        const output = JSON.stringify(envVars, null, 2);

        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(options.output, output);
          console.log(chalk.green(`✓ Exported to ${options.output}`));
        } else {
          console.log(output);
        }
      }
    });

  return envCmd;
}
