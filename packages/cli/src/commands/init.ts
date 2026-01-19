import chalk from 'chalk';
import { resolve } from 'path';
import { api } from '../lib/api.js';
import { getMachineName } from '../lib/config.js';
import { writeFiles, projectExists, getProjectName } from '../lib/files.js';

interface InitOptions {
  profile?: string;
  description?: string;
  dryRun?: boolean;
  force?: boolean;
  autoClaude?: boolean;
}

export async function initCommand(
  name: string | undefined,
  options: InitOptions
): Promise<void> {
  const projectPath = resolve(name || '.');
  const projectName = name || getProjectName(projectPath);

  console.log(chalk.bold(`Initializing project: ${projectName}`));
  console.log(chalk.gray(`Path: ${projectPath}`));
  if (options.autoClaude) {
    console.log(chalk.cyan(`Auto-Claude integration: enabled`));
  }
  console.log();

  // Check if already initialized
  if (projectExists(projectPath) && !options.force) {
    console.log(chalk.yellow('Project already has Claude Code configuration.'));
    console.log(chalk.gray('Use --force to overwrite existing configuration.'));
    return;
  }

  // Resolve profile
  let profileId: string | undefined;
  let profileName: string | undefined;

  if (options.profile) {
    console.log(chalk.gray(`Looking up profile: ${options.profile}`));

    const profileResult = await api.getProfileByName(options.profile);

    if (profileResult.error) {
      console.log(chalk.red(`Error: ${profileResult.error}`));
      return;
    }

    if (!profileResult.data) {
      console.log(chalk.red(`Profile not found: ${options.profile}`));

      // Show available profiles
      const profiles = await api.listProfiles();
      if (profiles.data?.profiles.length) {
        console.log();
        console.log(chalk.gray('Available profiles:'));
        for (const p of profiles.data.profiles) {
          console.log(`  ${chalk.cyan(p.name)} - ${p.description}`);
        }
      }
      return;
    }

    profileId = profileResult.data.id;
    profileName = profileResult.data.name;
    console.log(chalk.green(`Using profile: ${profileName}`));
  }

  // Generate files from server
  console.log(chalk.gray('Generating configuration files...'));

  const generateResult = await api.generate({
    profileId,
    profileName,
    projectName,
    projectDescription: options.description,
    autoClaudeEnabled: options.autoClaude,
  });

  if (generateResult.error) {
    console.log(chalk.red(`Error: ${generateResult.error}`));
    return;
  }

  const files = generateResult.data?.files || [];
  const summary = generateResult.data?.summary || {};

  if (files.length === 0) {
    console.log(chalk.yellow('No files to generate.'));
    return;
  }

  // Show what will be created
  console.log();
  console.log(chalk.bold('Files to generate:'));
  for (const file of files) {
    console.log(`  ${chalk.cyan(file.path)}`);
  }

  // Show summary
  if (Object.keys(summary).length > 0) {
    console.log();
    console.log(chalk.bold('Summary:'));
    for (const [key, count] of Object.entries(summary)) {
      console.log(`  ${key}: ${count}`);
    }
  }

  // Dry run - don't write files
  if (options.dryRun) {
    console.log();
    console.log(chalk.yellow('Dry run - no files were written.'));
    return;
  }

  // Write files
  console.log();
  console.log(chalk.gray('Writing files...'));

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

  // Register project with server
  console.log();
  console.log(chalk.gray('Registering project with server...'));

  const machine = getMachineName();
  const projectResult = await api.createProject({
    name: projectName,
    path: projectPath,
    machine,
    profileId: profileId || null,
  });

  if (projectResult.error) {
    if (projectResult.error.includes('already exists')) {
      console.log(chalk.gray('Project already registered.'));
    } else {
      console.log(chalk.yellow(`Warning: ${projectResult.error}`));
    }
  } else {
    console.log(chalk.green(`Project registered on ${machine}`));
  }

  // Done
  console.log();
  console.log(chalk.green.bold('Project initialized successfully!'));
  console.log();
  console.log('Next steps:');
  console.log(`  1. Review the generated files in ${chalk.cyan('.claude/')}`);
  console.log(`  2. Customize ${chalk.cyan('.claude/CLAUDE.md')} for your project`);
  if (options.autoClaude) {
    console.log(`  3. Review Auto-Claude configuration in ${chalk.cyan('.auto-claude/.env')}`);
    console.log(`  4. Check model profiles in ${chalk.cyan('task_metadata.json')}`);
    console.log(`  5. Run ${chalk.cyan('ccm auto-claude sync')} to sync with Auto-Claude backend`);
  } else {
    console.log(`  3. Run ${chalk.cyan('ccm sync')} to update from server`);
  }
}
