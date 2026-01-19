import chalk from 'chalk';
import { Command } from 'commander';
import { hostname, platform, arch, homedir } from 'os';
import {
  listMachines,
  getCurrentMachine,
  registerMachine,
  getMachine,
  updateMachine,
  deleteMachine,
  listOverrides,
} from '../lib/api-machines.js';

export function createMachineCommand(): Command {
  const machineCmd = new Command('machine');

  machineCmd
    .description('Manage machines in the Machine Registry')
    .addHelpText('after', `

${chalk.gray('Examples:')}
  ${chalk.cyan('ccm machine register')}               Register current machine
  ${chalk.cyan('ccm machine list')}                   List all machines
  ${chalk.cyan('ccm machine status')}                 Show current machine status
  ${chalk.cyan('ccm machine show <id>')}              Show machine details
  ${chalk.cyan('ccm machine enable <id>')}            Enable sync for a machine
  ${chalk.cyan('ccm machine disable <id>')}           Disable sync for a machine
  ${chalk.cyan('ccm machine delete <id>')}            Delete a machine
`);

  // Register current machine
  machineCmd
    .command('register')
    .description('Register or update current machine')
    .option('-n, --name <name>', 'Machine name (defaults to hostname)')
    .option('--set-current', 'Set as current machine')
    .action(async (options) => {
      console.log(chalk.bold('Register Machine'));
      console.log();

      const machineName = options.name || hostname();
      const machineInfo = {
        name: machineName,
        hostname: hostname(),
        platform: platform() as 'darwin' | 'linux' | 'win32',
        arch: arch(),
        homeDir: homedir(),
        isCurrentMachine: options.setCurrent || false,
      };

      console.log(`Registering machine: ${chalk.cyan(machineName)}`);
      console.log(`Platform: ${machineInfo.platform} (${machineInfo.arch})`);
      console.log();

      const result = await registerMachine(machineInfo);

      if (result.error) {
        console.log(chalk.red('Registration failed:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Machine registered successfully!'));
      console.log(`  ID: ${result.data!.id}`);
      console.log(`  Name: ${result.data!.name}`);
      console.log(`  Platform: ${result.data!.platform}`);
      console.log(`  Sync Enabled: ${result.data!.syncEnabled ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`  Current Machine: ${result.data!.isCurrentMachine ? chalk.green('Yes') : chalk.gray('No')}`);
    });

  // List machines
  machineCmd
    .command('list')
    .alias('ls')
    .description('List all registered machines')
    .option('-p, --platform <platform>', 'Filter by platform (darwin, linux, win32)')
    .option('--sync-enabled', 'Show only sync-enabled machines')
    .option('--sync-disabled', 'Show only sync-disabled machines')
    .option('-f, --format <format>', 'Output format: table, json', 'table')
    .action(async (options) => {
      const result = await listMachines({
        platform: options.platform,
        syncEnabled: options.syncEnabled ? true : options.syncDisabled ? false : undefined,
      });

      if (result.error) {
        console.log(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(result.data, null, 2));
        return;
      }

      const { machines, stats } = result.data!;

      console.log(chalk.bold('Registered Machines'));
      console.log();
      console.log(
        `Total: ${stats.totalMachines} | ` +
        `Active: ${chalk.green(stats.activeMachines)} | ` +
        `Sync Enabled: ${chalk.cyan(stats.syncEnabled)}`
      );
      console.log();

      if (machines.length === 0) {
        console.log(chalk.gray('No machines registered.'));
        console.log(`Run ${chalk.cyan('ccm machine register')} to register this machine`);
        return;
      }

      // Table header
      const colWidths = {
        name: 25,
        platform: 10,
        status: 15,
        lastSeen: 20,
      };

      console.log(
        chalk.bold.gray(
          'NAME'.padEnd(colWidths.name) +
          'PLATFORM'.padEnd(colWidths.platform) +
          'STATUS'.padEnd(colWidths.status) +
          'LAST SEEN'
        )
      );
      console.log(chalk.gray('─'.repeat(70)));

      for (const machine of machines) {
        const name = machine.isCurrentMachine
          ? chalk.green.bold(`${machine.name} *`)
          : machine.name;

        const platformStr = `${machine.platform}/${machine.arch}`;

        const status =
          machine.syncEnabled
            ? chalk.green('✓ Sync enabled')
            : chalk.gray('○ Sync disabled');

        const lastSeen = new Date(machine.lastSeen).toLocaleString();

        console.log(
          name.padEnd(colWidths.name + (machine.isCurrentMachine ? 10 : 0)) +
          platformStr.padEnd(colWidths.platform) +
          status +
          '  ' +
          chalk.gray(lastSeen)
        );
      }

      console.log();
      console.log(chalk.gray('* = current machine'));
    });

  // Show current machine status
  machineCmd
    .command('status')
    .description('Show current machine status')
    .action(async () => {
      console.log(chalk.bold('Current Machine Status'));
      console.log();

      const result = await getCurrentMachine();

      if (result.error) {
        console.log(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      const machine = result.data!;

      console.log(`${chalk.bold('Name:')} ${machine.name}`);
      console.log(`${chalk.bold('ID:')} ${machine.id}`);
      console.log(`${chalk.bold('Hostname:')} ${machine.hostname}`);
      console.log(`${chalk.bold('Platform:')} ${machine.platform} (${machine.arch})`);
      if (machine.homeDir) {
        console.log(`${chalk.bold('Home Directory:')} ${machine.homeDir}`);
      }
      console.log();

      console.log(
        `${chalk.bold('Sync Enabled:')} ${machine.syncEnabled ? chalk.green('Yes') : chalk.red('No')}`
      );
      console.log(
        `${chalk.bold('Current Machine:')} ${machine.isCurrentMachine ? chalk.green('Yes') : chalk.gray('No')}`
      );
      console.log();

      console.log(`${chalk.bold('Last Seen:')} ${new Date(machine.lastSeen).toLocaleString()}`);
      if (machine.lastSyncedAt) {
        console.log(
          `${chalk.bold('Last Synced:')} ${new Date(machine.lastSyncedAt).toLocaleString()}`
        );
      } else {
        console.log(`${chalk.bold('Last Synced:')} ${chalk.gray('Never')}`);
      }
      console.log();

      // Show overrides
      if (machine.overrides && machine.overrides.length > 0) {
        console.log(chalk.bold('Overrides:'));
        for (const override of machine.overrides) {
          const action = override.action === 'exclude' ? chalk.red('✗') : chalk.green('✓');
          console.log(`  ${action} ${override.configType}: ${chalk.cyan(override.configKey)}`);
          if (override.reason) {
            console.log(`     ${chalk.gray(override.reason)}`);
          }
        }
      } else {
        console.log(chalk.gray('No overrides configured'));
      }
      console.log();

      // Show recent sync logs
      if (machine.syncLogs && machine.syncLogs.length > 0) {
        console.log(chalk.bold('Recent Sync History:'));
        for (const log of machine.syncLogs.slice(0, 5)) {
          const status =
            log.status === 'completed'
              ? chalk.green('✓')
              : log.status === 'failed'
              ? chalk.red('✗')
              : chalk.yellow('○');

          const dateStr = new Date(log.startedAt).toLocaleString();
          const filesInfo = log.filesCreated
            ? ` (${log.filesCreated} created, ${log.filesUpdated || 0} updated)`
            : '';

          console.log(`  ${status} ${log.syncType} - ${chalk.gray(dateStr)}${filesInfo}`);
          if (log.status === 'failed' && log.errorMessage) {
            console.log(`     ${chalk.red(log.errorMessage)}`);
          }
        }
      } else {
        console.log(chalk.gray('No sync history'));
      }
    });

  // Show specific machine details
  machineCmd
    .command('show <id>')
    .description('Show detailed information about a machine')
    .action(async (id) => {
      const result = await getMachine(id);

      if (result.error) {
        console.log(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      const machine = result.data!;

      console.log(chalk.bold(`Machine: ${machine.name}`));
      console.log();

      console.log(`${chalk.bold('ID:')} ${machine.id}`);
      console.log(`${chalk.bold('Hostname:')} ${machine.hostname}`);
      console.log(`${chalk.bold('Platform:')} ${machine.platform} (${machine.arch})`);
      if (machine.homeDir) {
        console.log(`${chalk.bold('Home Directory:')} ${machine.homeDir}`);
      }
      console.log();

      console.log(
        `${chalk.bold('Sync Enabled:')} ${machine.syncEnabled ? chalk.green('Yes') : chalk.red('No')}`
      );
      console.log(
        `${chalk.bold('Current Machine:')} ${machine.isCurrentMachine ? chalk.green('Yes') : chalk.gray('No')}`
      );
      console.log();

      console.log(`${chalk.bold('Created:')} ${new Date(machine.createdAt).toLocaleString()}`);
      console.log(`${chalk.bold('Last Seen:')} ${new Date(machine.lastSeen).toLocaleString()}`);
      if (machine.lastSyncedAt) {
        console.log(
          `${chalk.bold('Last Synced:')} ${new Date(machine.lastSyncedAt).toLocaleString()}`
        );
      }
      console.log();

      // Show overrides
      if (machine.overrides && machine.overrides.length > 0) {
        console.log(chalk.bold(`Overrides (${machine.overrides.length}):`));
        for (const override of machine.overrides) {
          const actionStr =
            override.action === 'exclude'
              ? chalk.red('EXCLUDE')
              : override.action === 'include'
              ? chalk.green('INCLUDE')
              : chalk.yellow('MODIFY');

          console.log(`  ${actionStr} ${override.configType}: ${chalk.cyan(override.configKey)}`);
          if (override.reason) {
            console.log(`    ${chalk.gray(override.reason)}`);
          }
        }
      } else {
        console.log(chalk.gray('No overrides configured'));
      }
      console.log();

      // Show sync logs
      if (machine.syncLogs && machine.syncLogs.length > 0) {
        console.log(chalk.bold(`Sync History (${machine.syncLogs.length} total):`));
        for (const log of machine.syncLogs) {
          const status =
            log.status === 'completed'
              ? chalk.green('✓ COMPLETED')
              : log.status === 'failed'
              ? chalk.red('✗ FAILED')
              : chalk.yellow('○ PENDING');

          const dateStr = new Date(log.startedAt).toLocaleString();
          console.log(`  ${status} - ${log.syncType} - ${chalk.gray(dateStr)}`);

          if (log.filesCreated || log.filesUpdated) {
            console.log(
              `    Files: ${log.filesCreated || 0} created, ${log.filesUpdated || 0} updated, ${log.filesDeleted || 0} deleted`
            );
          }

          if (log.status === 'failed' && log.errorMessage) {
            console.log(`    ${chalk.red('Error:')} ${log.errorMessage}`);
          }
        }
      } else {
        console.log(chalk.gray('No sync history'));
      }
    });

  // Enable sync
  machineCmd
    .command('enable <id>')
    .description('Enable sync for a machine')
    .action(async (id) => {
      const result = await updateMachine(id, { syncEnabled: true });

      if (result.error) {
        console.log(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Sync enabled for machine:'), result.data!.name);
    });

  // Disable sync
  machineCmd
    .command('disable <id>')
    .description('Disable sync for a machine')
    .action(async (id) => {
      const result = await updateMachine(id, { syncEnabled: false });

      if (result.error) {
        console.log(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      console.log(chalk.yellow('○ Sync disabled for machine:'), result.data!.name);
    });

  // Delete machine
  machineCmd
    .command('delete <id>')
    .description('Delete a machine from the registry')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (id, options) => {
      // Get machine details first
      const machineResult = await getMachine(id);

      if (machineResult.error) {
        console.log(chalk.red('Error:'), machineResult.error);
        process.exit(1);
      }

      const machine = machineResult.data!;

      if (machine.isCurrentMachine) {
        console.log(chalk.red('Cannot delete current machine.'));
        console.log('Set another machine as current first.');
        process.exit(1);
      }

      if (!options.force) {
        console.log(chalk.yellow('Warning: This will permanently delete the machine:'));
        console.log(`  Name: ${machine.name}`);
        console.log(`  Platform: ${machine.platform}`);
        console.log();
        console.log('Use --force to confirm deletion');
        process.exit(0);
      }

      const result = await deleteMachine(id);

      if (result.error) {
        console.log(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Machine deleted:'), machine.name);
    });

  return machineCmd;
}
