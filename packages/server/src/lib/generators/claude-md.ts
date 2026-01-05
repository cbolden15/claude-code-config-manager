interface ClaudeMdTemplateConfig {
  content: string;
  placeholders?: Array<{
    name: string;
    description: string;
    default?: string;
  }>;
}

interface GenerateOptions {
  projectName: string;
  projectDescription?: string;
  template?: string | null;
}

export function generateClaudeMd(options: GenerateOptions): string {
  const { projectName, projectDescription, template } = options;

  // If no template provided, use a minimal default
  if (!template) {
    return `# Project: ${projectName}

${projectDescription || 'A Claude Code managed project.'}

## Commands
- Check CLAUDE.md for project-specific instructions
`;
  }

  // Parse template config
  let config: ClaudeMdTemplateConfig;
  try {
    config = JSON.parse(template);
  } catch {
    // If it's not JSON, treat it as raw content
    return template
      .replace(/\{\{projectName\}\}/g, projectName)
      .replace(/\{\{projectDescription\}\}/g, projectDescription || 'A new project');
  }

  // Replace placeholders
  let content = config.content;
  content = content.replace(/\{\{projectName\}\}/g, projectName);
  content = content.replace(
    /\{\{projectDescription\}\}/g,
    projectDescription ||
      config.placeholders?.find((p) => p.name === 'projectDescription')?.default ||
      'A new project'
  );

  // Replace any remaining placeholders with defaults
  if (config.placeholders) {
    for (const placeholder of config.placeholders) {
      const regex = new RegExp(`\\{\\{${placeholder.name}\\}\\}`, 'g');
      content = content.replace(regex, placeholder.default || '');
    }
  }

  return content;
}
