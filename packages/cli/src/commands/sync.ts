import chalk from 'chalk';
import { resolve } from 'path';
import { api } from '../lib/api.js';
import { getMachineName } from '../lib/config.js';
import { writeFiles, getProjectName } from '../lib/files.js';
import { getCurrentMachine } from '../lib/api-machines.js';

interface SyncOptions {
  path?: string;
  dryRun?: boolean;
  type?: 'full' | 'incremental' | 'selective';
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  const projectPath = resolve(options.path || '.');
  const projectName = getProjectName(projectPath);
  const machine = getMachineName();

  console.log(chalk.bold(`Syncing project: ${projectName}`));
  console.log(chalk.gray(`Path: ${projectPath}`));
  console.log(chalk.gray(`Machine: ${machine}`));
  console.log();

  // Get current machine ID
  console.log(chalk.gray('Getting machine information...'));
  const machineResult = await getCurrentMachine();

  if (machineResult.error) {
    console.log(chalk.red(`Error: ${machineResult.error}`));
    return;
  }

  const currentMachine = machineResult.data;
  if (!currentMachine) {
    console.log(chalk.red('Could not determine current machine'));
    return;
  }

  console.log(chalk.gray(`Machine ID: ${currentMachine.id}`));

  if (!currentMachine.syncEnabled) {
    console.log(chalk.yellow(`Warning: Sync is disabled for this machine`));
    console.log(chalk.gray('Enable sync in the web UI or use ccm machine enable'));
    return;
  }

  // Find project in server
  const projectsResult = await api.listProjects(machine);

  if (projectsResult.error) {
    console.log(chalk.red(`Error: ${projectsResult.error}`));
    return;
  }

  const project = projectsResult.data?.projects.find(
    (p) => p.path === projectPath
  );

  if (!project) {
    console.log(chalk.yellow('Project not registered with server.'));
    console.log(chalk.gray(`Use ${chalk.cyan('ccm init')} to initialize and register the project.`));
    return;
  }

  if (!project.profileId) {
    console.log(chalk.yellow('Project has no profile assigned.'));
    console.log(chalk.gray('Assign a profile in the web UI or use --profile with init/apply.'));
    return;
  }

  console.log(chalk.gray(`Profile: ${project.profile?.name || project.profileId}`));

  // Check sync status
  console.log(chalk.gray('Checking sync status...'));
  const statusResult = await api.getSyncStatus(project.id, currentMachine.id);

  if (statusResult.data) {
    if (statusResult.data.syncNeeded) {
      console.log(chalk.yellow(`⚠ Sync needed: ${statusResult.data.reason}`));
    } else {
      console.log(chalk.green('✓ Project is up to date'));
      if (!options.dryRun) {
        const lastSync = statusResult.data.project.lastSyncedAt;
        if (lastSync) {
          console.log(chalk.gray(`Last synced: ${new Date(lastSync).toLocaleString()}`));
        }
      }
    }
  }

  // Perform sync using new orchestrator API
  console.log(chalk.gray('Syncing configuration...'));

  const syncResult = await api.syncProject(project.id, currentMachine.id, {
    syncType: options.type || 'full',
    dryRun: options.dryRun || false,
  });

  if (syncResult.error) {
    console.log(chalk.red(`Error: ${syncResult.error}`));
    return;
  }

  const syncData = syncResult.data;
  if (!syncData) {
    console.log(chalk.red('No sync data returned'));
    return;
  }

  // Dry run
  if (options.dryRun || syncData.dryRun) {
    console.log();
    console.log(chalk.bold('Files that would be synced:'));
    for (const file of syncData.files) {
      const actionSymbol = file.action === 'created' ? '+' : file.action === 'updated' ? '~' : '=';
      const actionColor = file.action === 'created' ? chalk.green : file.action === 'updated' ? chalk.yellow : chalk.gray;
      console.log(actionColor(`  ${actionSymbol} ${file.path} (${file.contentLength} bytes)`));
    }
    console.log();
    console.log(chalk.yellow('Dry run - no files were written.'));
    console.log();
    console.log(chalk.bold('Summary:'));
    console.log(`  Files to create: ${syncData.stats.filesCreated}`);
    console.log(`  Files to update: ${syncData.stats.filesUpdated}`);
    console.log(`  Files unchanged: ${syncData.stats.filesSkipped}`);
    return;
  }

  // Write files locally
  console.log(chalk.gray('Writing files...'));

  // Convert sync result files to the format expected by writeFiles
  const filesToWrite = syncData.files.map(file => {
    // We need to fetch the actual content from the sync result
    // For now, we'll use the generate API as fallback
    return { path: file.path, content: '' };
  });

  // Actually, we should use the full file content from the server
  // Let me use the generate API to get the actual file contents
  const generateResult = await api.generate({
    profileId: project.profileId,
    projectName,
  });

  if (generateResult.error) {
    console.log(chalk.red(`Error generating files: ${generateResult.error}`));
    return;
  }

  const files = generateResult.data?.files || [];
  const results = writeFiles(projectPath, files);

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const result of results) {
    if (result.created) {
      console.log(chalk.green(`  + ${result.path}`));
      created++;
    } else if (result.updated) {
      console.log(chalk.yellow(`  ~ ${result.path}`));
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log();
  console.log(
    chalk.green(`Created: ${created}`) +
      chalk.gray(', ') +
      chalk.yellow(`Updated: ${updated}`) +
      chalk.gray(', ') +
      chalk.gray(`Unchanged: ${unchanged}`)
  );

  console.log();
  console.log(chalk.green.bold('✓ Sync complete!'));

  if (syncData.syncLogId) {
    console.log(chalk.gray(`Sync log ID: ${syncData.syncLogId}`));
  }

  console.log(chalk.gray(`Last synced: ${new Date().toLocaleString()}`));
}
