import chalk from 'chalk';
import { resolve } from 'path';
import { api } from '../lib/api.js';
import { getMachineName } from '../lib/config.js';
import { writeFiles, getProjectName } from '../lib/files.js';

interface SyncOptions {
  path?: string;
  dryRun?: boolean;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  const projectPath = resolve(options.path || '.');
  const projectName = getProjectName(projectPath);
  const machine = getMachineName();

  console.log(chalk.bold(`Syncing project: ${projectName}`));
  console.log(chalk.gray(`Path: ${projectPath}`));
  console.log(chalk.gray(`Machine: ${machine}`));
  console.log();

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

  // Generate files from current profile
  console.log(chalk.gray('Fetching latest configuration...'));

  const generateResult = await api.generate({
    profileId: project.profileId,
    projectName,
  });

  if (generateResult.error) {
    console.log(chalk.red(`Error: ${generateResult.error}`));
    return;
  }

  const files = generateResult.data?.files || [];

  if (files.length === 0) {
    console.log(chalk.yellow('No files in profile.'));
    return;
  }

  // Dry run
  if (options.dryRun) {
    console.log();
    console.log(chalk.bold('Files that would be synced:'));
    for (const file of files) {
      console.log(`  ${chalk.cyan(file.path)}`);
    }
    console.log();
    console.log(chalk.yellow('Dry run - no files were written.'));
    return;
  }

  // Write files
  console.log(chalk.gray('Syncing files...'));

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

  // Update sync timestamp on server
  const syncResult = await api.syncProject(project.id);

  if (syncResult.error) {
    console.log(chalk.yellow(`Warning: Could not update sync timestamp: ${syncResult.error}`));
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
  console.log(chalk.green.bold('Sync complete!'));

  if (syncResult.data?.lastSyncedAt) {
    console.log(chalk.gray(`Last synced: ${new Date(syncResult.data.lastSyncedAt).toLocaleString()}`));
  }
}
