import chalk from 'chalk';
import { loadConfig, saveConfig, getConfigPath, type CliConfig } from '../lib/config.js';
import { api } from '../lib/api.js';

export async function configCommand(options: {
  serverUrl?: string;
  machine?: string;
  show?: boolean;
}): Promise<void> {
  const config = loadConfig();

  // Show current config
  if (options.show || (!options.serverUrl && !options.machine)) {
    console.log(chalk.bold('CCM Configuration'));
    console.log(chalk.gray(`File: ${getConfigPath()}`));
    console.log();
    console.log(`  Server URL: ${chalk.cyan(config.serverUrl)}`);
    console.log(`  Machine:    ${chalk.cyan(config.machine || chalk.gray('(not set)'))}`);
    console.log();

    // Test connection
    console.log(chalk.gray('Testing connection...'));
    const health = await api.health();

    if (health.error) {
      console.log(chalk.red(`  Status: Disconnected`));
      console.log(chalk.red(`  Error: ${health.error}`));
    } else {
      console.log(chalk.green(`  Status: Connected`));
      if (health.data?.stats) {
        const { components, profiles, projects } = health.data.stats;
        console.log(chalk.gray(`  Stats: ${components} components, ${profiles} profiles, ${projects} projects`));
      }
    }
    return;
  }

  // Update config
  const updates: Partial<CliConfig> = {};

  if (options.serverUrl) {
    updates.serverUrl = options.serverUrl;
    console.log(`Server URL set to: ${chalk.cyan(options.serverUrl)}`);
  }

  if (options.machine) {
    updates.machine = options.machine;
    console.log(`Machine name set to: ${chalk.cyan(options.machine)}`);
  }

  if (Object.keys(updates).length > 0) {
    saveConfig({ ...config, ...updates });
    console.log(chalk.green('\nConfiguration saved.'));
  }
}
