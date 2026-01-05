import chalk from 'chalk';
import { api } from '../lib/api.js';
import { getMachineName } from '../lib/config.js';

type ListType = 'profiles' | 'components' | 'projects';

const TYPE_COLORS: Record<string, (text: string) => string> = {
  MCP_SERVER: chalk.magenta,
  SUBAGENT: chalk.blue,
  SKILL: chalk.green,
  COMMAND: chalk.yellow,
  HOOK: chalk.red,
  CLAUDE_MD_TEMPLATE: chalk.gray,
};

const TYPE_LABELS: Record<string, string> = {
  MCP_SERVER: 'MCP',
  SUBAGENT: 'Agent',
  SKILL: 'Skill',
  COMMAND: 'Cmd',
  HOOK: 'Hook',
  CLAUDE_MD_TEMPLATE: 'Template',
};

export async function listCommand(
  type: ListType,
  options: { type?: string; machine?: string }
): Promise<void> {
  switch (type) {
    case 'profiles':
      await listProfiles();
      break;
    case 'components':
      await listComponents(options.type);
      break;
    case 'projects':
      await listProjects(options.machine);
      break;
    default:
      console.log(chalk.red(`Unknown type: ${type}`));
      console.log('Valid types: profiles, components, projects');
  }
}

async function listProfiles(): Promise<void> {
  const result = await api.listProfiles();

  if (result.error) {
    console.log(chalk.red(`Error: ${result.error}`));
    return;
  }

  const profiles = result.data?.profiles || [];

  if (profiles.length === 0) {
    console.log(chalk.gray('No profiles found.'));
    return;
  }

  console.log(chalk.bold(`Profiles (${profiles.length})`));
  console.log();

  for (const profile of profiles) {
    console.log(`  ${chalk.cyan(profile.name)}`);
    console.log(`    ${chalk.gray(profile.description)}`);

    // Component type summary - handle both nested and flat component formats
    if (profile.components && profile.components.length > 0) {
      const typeCounts: Record<string, number> = {};
      for (const pc of profile.components) {
        // Handle both { component: { type } } and { type } formats
        const comp = 'component' in pc ? pc.component : pc;
        const t = (comp as { type: string }).type;
        if (t) {
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        }
      }

      const summary = Object.entries(typeCounts)
        .map(([t, count]) => {
          const colorFn = TYPE_COLORS[t] || chalk.white;
          return colorFn(`${count} ${TYPE_LABELS[t] || t}`);
        })
        .join(', ');

      console.log(`    Components: ${summary}`);
    }

    // Handle both projectCount and _count.projects
    const projectCount = (profile as { projectCount?: number }).projectCount ?? profile._count?.projects ?? 0;
    console.log(`    Projects: ${projectCount}`);
    console.log();
  }
}

async function listComponents(filterType?: string): Promise<void> {
  const result = await api.listComponents(filterType);

  if (result.error) {
    console.log(chalk.red(`Error: ${result.error}`));
    return;
  }

  const components = result.data?.components || [];

  if (components.length === 0) {
    console.log(chalk.gray('No components found.'));
    return;
  }

  // Group by type
  const byType: Record<string, typeof components> = {};
  for (const component of components) {
    if (!byType[component.type]) {
      byType[component.type] = [];
    }
    byType[component.type].push(component);
  }

  console.log(chalk.bold(`Components (${components.length})`));
  console.log();

  for (const [type, items] of Object.entries(byType)) {
    const colorFn = TYPE_COLORS[type] || chalk.white;
    console.log(colorFn(`${TYPE_LABELS[type] || type} (${items.length})`));

    for (const component of items) {
      const status = component.enabled ? chalk.green('●') : chalk.gray('○');
      console.log(`  ${status} ${chalk.cyan(component.name)}`);
      console.log(`    ${chalk.gray(component.description)}`);
    }
    console.log();
  }
}

async function listProjects(filterMachine?: string): Promise<void> {
  const machine = filterMachine || getMachineName();
  const result = await api.listProjects(filterMachine ? machine : undefined);

  if (result.error) {
    console.log(chalk.red(`Error: ${result.error}`));
    return;
  }

  const projects = result.data?.projects || [];

  if (projects.length === 0) {
    if (filterMachine) {
      console.log(chalk.gray(`No projects found on machine: ${filterMachine}`));
    } else {
      console.log(chalk.gray('No projects found.'));
    }
    return;
  }

  // Group by machine
  const byMachine: Record<string, typeof projects> = {};
  for (const project of projects) {
    if (!byMachine[project.machine]) {
      byMachine[project.machine] = [];
    }
    byMachine[project.machine].push(project);
  }

  console.log(chalk.bold(`Projects (${projects.length})`));
  console.log();

  for (const [machineName, items] of Object.entries(byMachine)) {
    const isCurrent = machineName === getMachineName();
    const machineLabel = isCurrent
      ? chalk.green(`${machineName} (this machine)`)
      : chalk.cyan(machineName);

    console.log(`${machineLabel} (${items.length})`);

    for (const project of items) {
      const syncStatus = project.lastSyncedAt
        ? chalk.green('●')
        : chalk.yellow('○');
      const profileLabel = project.profile
        ? chalk.gray(`[${project.profile.name}]`)
        : chalk.gray('[no profile]');

      console.log(`  ${syncStatus} ${chalk.white(project.name)} ${profileLabel}`);
      console.log(`    ${chalk.gray(project.path)}`);
    }
    console.log();
  }
}
