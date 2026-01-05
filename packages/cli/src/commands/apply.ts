import chalk from 'chalk';
import { resolve } from 'path';
import { api } from '../lib/api.js';
import { getMachineName } from '../lib/config.js';
import { writeFiles, getProjectName } from '../lib/files.js';

interface ApplyOptions {
  path?: string;
  profile?: string;
  dryRun?: boolean;
}

export async function applyCommand(options: ApplyOptions): Promise<void> {
  const projectPath = resolve(options.path || '.');
  const projectName = getProjectName(projectPath);
  const machine = getMachineName();

  console.log(chalk.bold(`Applying configuration to: ${projectName}`));
  console.log(chalk.gray(`Path: ${projectPath}`));
  console.log();

  // Find existing project
  const projectsResult = await api.listProjects(machine);

  if (projectsResult.error) {
    console.log(chalk.red(`Error: ${projectsResult.error}`));
    return;
  }

  const existingProject = projectsResult.data?.projects.find(
    (p) => p.path === projectPath
  );

  // Determine which profile to use
  let profileId: string | undefined;
  let profileName: string | undefined;

  if (options.profile) {
    // Use specified profile
    const profileResult = await api.getProfileByName(options.profile);

    if (profileResult.error) {
      console.log(chalk.red(`Error: ${profileResult.error}`));
      return;
    }

    if (!profileResult.data) {
      console.log(chalk.red(`Profile not found: ${options.profile}`));
      return;
    }

    profileId = profileResult.data.id;
    profileName = profileResult.data.name;
  } else if (existingProject?.profileId) {
    // Use project's existing profile
    profileId = existingProject.profileId;
    profileName = existingProject.profile?.name;
  }

  if (!profileId) {
    console.log(chalk.yellow('No profile specified and project has no assigned profile.'));
    console.log(chalk.gray('Use --profile <name> to specify a profile.'));
    return;
  }

  console.log(chalk.gray(`Using profile: ${profileName || profileId}`));

  // Generate files
  console.log(chalk.gray('Generating configuration files...'));

  const generateResult = await api.generate({
    profileId,
    projectName,
  });

  if (generateResult.error) {
    console.log(chalk.red(`Error: ${generateResult.error}`));
    return;
  }

  const files = generateResult.data?.files || [];

  if (files.length === 0) {
    console.log(chalk.yellow('No files to generate.'));
    return;
  }

  // Show what will be written
  console.log();
  console.log(chalk.bold('Files to apply:'));
  for (const file of files) {
    console.log(`  ${chalk.cyan(file.path)}`);
  }

  // Dry run
  if (options.dryRun) {
    console.log();
    console.log(chalk.yellow('Dry run - no files were written.'));
    return;
  }

  // Write files
  console.log();
  console.log(chalk.gray('Applying files...'));

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
  console.log(chalk.green.bold('Configuration applied successfully!'));
}
