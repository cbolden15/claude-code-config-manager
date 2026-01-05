import { generateClaudeMd } from './claude-md';
import { generateMcpJson } from './mcp-json';
import { generateSubagent, getSubagentFilename } from './subagent';
import { generateSkill, getSkillFolderName } from './skill';
import { generateCommand, getCommandFilename } from './command';
import { generateSettingsJson } from './settings-json';

interface Component {
  type: string;
  name: string;
  config: Record<string, unknown>;
}

interface GenerateOptions {
  projectName: string;
  projectDescription?: string;
  claudeMdTemplate?: string | null;
  components: Component[];
}

interface GeneratedFile {
  path: string;
  content: string;
}

export function generateProjectFiles(options: GenerateOptions): GeneratedFile[] {
  const { projectName, projectDescription, claudeMdTemplate, components } = options;
  const files: GeneratedFile[] = [];

  // Group components by type
  const mcpServers = components.filter((c) => c.type === 'MCP_SERVER');
  const subagents = components.filter((c) => c.type === 'SUBAGENT');
  const skills = components.filter((c) => c.type === 'SKILL');
  const commands = components.filter((c) => c.type === 'COMMAND');
  const hooks = components.filter((c) => c.type === 'HOOK');

  // Generate CLAUDE.md
  const claudeMdContent = generateClaudeMd({
    projectName,
    projectDescription,
    template: claudeMdTemplate,
  });
  files.push({
    path: '.claude/CLAUDE.md',
    content: claudeMdContent,
  });

  // Generate .mcp.json
  if (mcpServers.length > 0) {
    const mcpContent = generateMcpJson(
      mcpServers.map((s) => ({
        name: s.name,
        config: s.config as unknown as Parameters<typeof generateMcpJson>[0][0]['config'],
      }))
    );
    files.push({
      path: '.mcp.json',
      content: mcpContent,
    });
  }

  // Generate subagent files
  for (const agent of subagents) {
    const config = agent.config as unknown as Parameters<typeof generateSubagent>[0];
    const content = generateSubagent(config);
    const filename = getSubagentFilename(agent.name);
    files.push({
      path: `.claude/agents/${filename}`,
      content,
    });
  }

  // Generate skill files
  for (const skill of skills) {
    const config = skill.config as unknown as Parameters<typeof generateSkill>[0];
    const content = generateSkill(config);
    const folderName = getSkillFolderName(skill.name);
    files.push({
      path: `.claude/skills/${folderName}/SKILL.md`,
      content,
    });
  }

  // Generate command files
  for (const command of commands) {
    const config = command.config as unknown as Parameters<typeof generateCommand>[0];
    const content = generateCommand(config);
    const filename = getCommandFilename(command.name);
    files.push({
      path: `.claude/commands/${filename}`,
      content,
    });
  }

  // Generate settings.json with hooks
  if (hooks.length > 0) {
    interface HookConfig {
      hookType: string;
      matcher?: string;
      command: string;
      description?: string;
    }
    const settingsContent = generateSettingsJson({
      hooks: hooks.map((h) => ({
        name: h.name,
        config: h.config as unknown as HookConfig,
      })),
    });
    if (settingsContent) {
      files.push({
        path: '.claude/settings.json',
        content: settingsContent,
      });
    }
  }

  return files;
}

export function generateSummary(components: Component[]): Record<string, number> {
  const summary: Record<string, number> = {};

  const typeMap: Record<string, string> = {
    MCP_SERVER: 'mcpServers',
    SUBAGENT: 'subagents',
    SKILL: 'skills',
    COMMAND: 'commands',
    HOOK: 'hooks',
  };

  for (const component of components) {
    const key = typeMap[component.type] || component.type.toLowerCase();
    summary[key] = (summary[key] || 0) + 1;
  }

  return summary;
}

export {
  generateClaudeMd,
  generateMcpJson,
  generateSubagent,
  getSubagentFilename,
  generateSkill,
  getSkillFolderName,
  generateCommand,
  getCommandFilename,
  generateSettingsJson,
};
