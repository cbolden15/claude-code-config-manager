/**
 * CLI Commands for Claude Desktop Configuration
 *
 * Manages Claude Desktop MCP servers and plugins
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as desktopApi from '../lib/api-desktop.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function createDesktopCommand(): Command {
  const desktopCmd = new Command('desktop')
    .description('Manage Claude Desktop configuration')
    .alias('dt');

  // ==================== MCP Commands ====================

  const mcpCmd = new Command('mcp')
    .description('Manage MCP servers for Claude Desktop');

  // List MCP servers
  mcpCmd
    .command('list')
    .description('List all MCP servers')
    .option('-e, --enabled', 'Show only enabled servers')
    .option('-d, --disabled', 'Show only disabled servers')
    .option('-f, --format <format>', 'Output format: table, json', 'table')
    .action(async (options) => {
      console.log(chalk.bold('Claude Desktop MCP Servers'));
      console.log();

      const filters: any = {};
      if (options.enabled) filters.enabled = true;
      if (options.disabled) filters.enabled = false;

      const result = await desktopApi.listMcpServers(filters);

      if (result.error) {
        console.log(chalk.red('Failed to list MCP servers:'), result.error);
        process.exit(1);
      }

      const { mcpServers, stats } = result.data!;

      if (options.format === 'json') {
        console.log(JSON.stringify({ mcpServers, stats }, null, 2));
        return;
      }

      // Display stats
      console.log(chalk.gray('Stats:'));
      console.log(chalk.gray(`  Total: ${stats.total}`));
      console.log(chalk.gray(`  Enabled: ${stats.enabled}`));
      console.log(chalk.gray(`  Disabled: ${stats.disabled}`));
      console.log();

      if (mcpServers.length === 0) {
        console.log(chalk.gray('No MCP servers configured.'));
        console.log();
        console.log(chalk.gray('Add a server:'));
        console.log(chalk.cyan('  ccm desktop mcp add --component <component-id>'));
        return;
      }

      // Display servers
      mcpServers.forEach((server) => {
        const statusIcon = server.enabled ? chalk.green('✓') : chalk.gray('○');
        const componentName = server.component?.name || 'Unknown';

        console.log(`${statusIcon} ${chalk.bold(componentName)} ${chalk.gray(`(${server.id.slice(0, 8)}...)`)}`);

        if (server.commandOverride) {
          console.log(chalk.gray(`  Command: ${server.commandOverride}`));
        }

        if (server.argsOverride) {
          try {
            const args = JSON.parse(server.argsOverride);
            console.log(chalk.gray(`  Args: ${JSON.stringify(args)}`));
          } catch {
            console.log(chalk.gray(`  Args: ${server.argsOverride}`));
          }
        }

        if (server.envOverrides) {
          try {
            const env = JSON.parse(server.envOverrides);
            const envKeys = Object.keys(env);
            console.log(chalk.gray(`  Env Overrides: ${envKeys.join(', ')}`));
          } catch {
            console.log(chalk.gray(`  Env Overrides: ${server.envOverrides}`));
          }
        }

        console.log();
      });
    });

  // Add MCP server
  mcpCmd
    .command('add')
    .description('Add MCP server to Claude Desktop')
    .requiredOption('-c, --component <id>', 'Component ID')
    .option('--disabled', 'Add as disabled', false)
    .option('--command <command>', 'Override command')
    .option('--args <args>', 'Override args (JSON array)')
    .option('--env <env>', 'Environment overrides (JSON object)')
    .action(async (options) => {
      console.log(chalk.bold('Adding MCP Server'));
      console.log();

      const data: desktopApi.McpCreateRequest = {
        componentId: options.component,
        enabled: !options.disabled,
      };

      if (options.command) {
        data.commandOverride = options.command;
      }

      if (options.args) {
        try {
          JSON.parse(options.args);
          data.argsOverride = options.args;
        } catch {
          console.log(chalk.red('Invalid args JSON'));
          process.exit(1);
        }
      }

      if (options.env) {
        try {
          JSON.parse(options.env);
          data.envOverrides = options.env;
        } catch {
          console.log(chalk.red('Invalid env JSON'));
          process.exit(1);
        }
      }

      const result = await desktopApi.addMcpServer(data);

      if (result.error) {
        console.log(chalk.red('Failed to add MCP server:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ MCP server added successfully'));
      console.log();
      console.log(chalk.gray(`ID: ${result.data!.id}`));
      console.log(chalk.gray(`Component: ${result.data!.componentId}`));
      console.log(chalk.gray(`Enabled: ${result.data!.enabled}`));
    });

  // Update MCP server
  mcpCmd
    .command('update <id>')
    .description('Update MCP server settings')
    .option('--enable', 'Enable the server')
    .option('--disable', 'Disable the server')
    .option('--command <command>', 'Override command (or empty string to clear)')
    .option('--args <args>', 'Override args as JSON (or empty string to clear)')
    .option('--env <env>', 'Environment overrides as JSON (or empty string to clear)')
    .action(async (id, options) => {
      console.log(chalk.bold('Updating MCP Server'));
      console.log();

      const updates: desktopApi.McpUpdateRequest = {};

      if (options.enable) updates.enabled = true;
      if (options.disable) updates.enabled = false;

      if (options.command !== undefined) {
        updates.commandOverride = options.command === '' ? null : options.command;
      }

      if (options.args !== undefined) {
        if (options.args === '') {
          updates.argsOverride = null;
        } else {
          try {
            JSON.parse(options.args);
            updates.argsOverride = options.args;
          } catch {
            console.log(chalk.red('Invalid args JSON'));
            process.exit(1);
          }
        }
      }

      if (options.env !== undefined) {
        if (options.env === '') {
          updates.envOverrides = null;
        } else {
          try {
            JSON.parse(options.env);
            updates.envOverrides = options.env;
          } catch {
            console.log(chalk.red('Invalid env JSON'));
            process.exit(1);
          }
        }
      }

      const result = await desktopApi.updateMcpServer(id, updates);

      if (result.error) {
        console.log(chalk.red('Failed to update MCP server:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ MCP server updated successfully'));
    });

  // Remove MCP server
  mcpCmd
    .command('remove <id>')
    .description('Remove MCP server from Claude Desktop')
    .alias('delete')
    .action(async (id) => {
      console.log(chalk.bold('Removing MCP Server'));
      console.log();

      const result = await desktopApi.removeMcpServer(id);

      if (result.error) {
        console.log(chalk.red('Failed to remove MCP server:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ MCP server removed successfully'));
    });

  desktopCmd.addCommand(mcpCmd);

  // ==================== Plugin Commands ====================

  const pluginCmd = new Command('plugin')
    .description('Manage plugins for Claude Desktop');

  // List plugins
  pluginCmd
    .command('list')
    .description('List all plugins')
    .option('-e, --enabled', 'Show only enabled plugins')
    .option('-d, --disabled', 'Show only disabled plugins')
    .option('-f, --format <format>', 'Output format: table, json', 'table')
    .action(async (options) => {
      console.log(chalk.bold('Claude Desktop Plugins'));
      console.log();

      const filters: any = {};
      if (options.enabled) filters.enabled = true;
      if (options.disabled) filters.enabled = false;

      const result = await desktopApi.listPlugins(filters);

      if (result.error) {
        console.log(chalk.red('Failed to list plugins:'), result.error);
        process.exit(1);
      }

      const { plugins, stats } = result.data!;

      if (options.format === 'json') {
        console.log(JSON.stringify({ plugins, stats }, null, 2));
        return;
      }

      // Display stats
      console.log(chalk.gray('Stats:'));
      console.log(chalk.gray(`  Total: ${stats.total}`));
      console.log(chalk.gray(`  Enabled: ${stats.enabled}`));
      console.log(chalk.gray(`  Disabled: ${stats.disabled}`));
      console.log();

      if (plugins.length === 0) {
        console.log(chalk.gray('No plugins configured.'));
        console.log();
        console.log(chalk.gray('Add a plugin:'));
        console.log(chalk.cyan('  ccm desktop plugin add --id <plugin-id>'));
        return;
      }

      // Display plugins
      plugins.forEach((plugin) => {
        const statusIcon = plugin.enabled ? chalk.green('✓') : chalk.gray('○');

        console.log(`${statusIcon} ${chalk.bold(plugin.pluginId)} ${chalk.gray(`(${plugin.id.slice(0, 8)}...)`)}`);

        if (plugin.config) {
          try {
            const config = JSON.parse(plugin.config);
            const configKeys = Object.keys(config);
            console.log(chalk.gray(`  Config: ${configKeys.length} keys`));
          } catch {
            console.log(chalk.gray(`  Config: ${plugin.config.substring(0, 50)}...`));
          }
        }

        console.log();
      });
    });

  // Add plugin
  pluginCmd
    .command('add')
    .description('Add plugin to Claude Desktop')
    .requiredOption('-i, --id <id>', 'Plugin ID')
    .option('--disabled', 'Add as disabled', false)
    .option('--config <config>', 'Plugin configuration (JSON object)')
    .action(async (options) => {
      console.log(chalk.bold('Adding Plugin'));
      console.log();

      const data: desktopApi.PluginCreateRequest = {
        pluginId: options.id,
        enabled: !options.disabled,
      };

      if (options.config) {
        try {
          JSON.parse(options.config);
          data.config = options.config;
        } catch {
          console.log(chalk.red('Invalid config JSON'));
          process.exit(1);
        }
      }

      const result = await desktopApi.addPlugin(data);

      if (result.error) {
        console.log(chalk.red('Failed to add plugin:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Plugin added successfully'));
      console.log();
      console.log(chalk.gray(`ID: ${result.data!.id}`));
      console.log(chalk.gray(`Plugin ID: ${result.data!.pluginId}`));
      console.log(chalk.gray(`Enabled: ${result.data!.enabled}`));
    });

  // Update plugin
  pluginCmd
    .command('update <id>')
    .description('Update plugin settings')
    .option('--enable', 'Enable the plugin')
    .option('--disable', 'Disable the plugin')
    .option('--config <config>', 'Plugin configuration as JSON (or empty string to clear)')
    .action(async (id, options) => {
      console.log(chalk.bold('Updating Plugin'));
      console.log();

      const updates: desktopApi.PluginUpdateRequest = {};

      if (options.enable) updates.enabled = true;
      if (options.disable) updates.enabled = false;

      if (options.config !== undefined) {
        if (options.config === '') {
          updates.config = null;
        } else {
          try {
            JSON.parse(options.config);
            updates.config = options.config;
          } catch {
            console.log(chalk.red('Invalid config JSON'));
            process.exit(1);
          }
        }
      }

      const result = await desktopApi.updatePlugin(id, updates);

      if (result.error) {
        console.log(chalk.red('Failed to update plugin:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Plugin updated successfully'));
    });

  // Remove plugin
  pluginCmd
    .command('remove <id>')
    .description('Remove plugin from Claude Desktop')
    .alias('delete')
    .action(async (id) => {
      console.log(chalk.bold('Removing Plugin'));
      console.log();

      const result = await desktopApi.removePlugin(id);

      if (result.error) {
        console.log(chalk.red('Failed to remove plugin:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Plugin removed successfully'));
    });

  desktopCmd.addCommand(pluginCmd);

  // ==================== Config Commands ====================

  // Download config
  desktopCmd
    .command('config')
    .description('Download Claude Desktop configuration')
    .option('-o, --output <path>', 'Output file path')
    .option('--show', 'Display config without saving')
    .action(async (options) => {
      console.log(chalk.bold('Claude Desktop Configuration'));
      console.log();

      const result = await desktopApi.getConfig();

      if (result.error) {
        console.log(chalk.red('Failed to get config:'), result.error);
        process.exit(1);
      }

      const { config, stats } = result.data!;

      // Show stats
      console.log(chalk.gray(`MCP Servers: ${stats.mcpServers}`));
      console.log(chalk.gray(`Plugins: ${stats.plugins}`));
      console.log();

      const configJson = JSON.stringify(config, null, 2);

      if (options.show) {
        console.log(configJson);
        return;
      }

      // Determine output path
      let outputPath = options.output;
      if (!outputPath) {
        const platform = os.platform();
        if (platform === 'darwin') {
          outputPath = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
        } else if (platform === 'linux') {
          outputPath = path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
        } else if (platform === 'win32') {
          outputPath = path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
        } else {
          console.log(chalk.red('Unsupported platform. Please specify output path with --output'));
          process.exit(1);
        }
      }

      // Create directory if it doesn't exist
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write config file
      fs.writeFileSync(outputPath, configJson);

      console.log(chalk.green('✓ Configuration saved'));
      console.log(chalk.gray(`Path: ${outputPath}`));
      console.log();
      console.log(chalk.yellow('Note: Restart Claude Desktop to apply changes'));
    });

  return desktopCmd;
}
