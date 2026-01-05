interface SubagentConfig {
  name: string;
  description: string;
  tools?: string[];
  model?: string;
  maxTokens?: number;
  instructions: string;
}

export function generateSubagent(config: SubagentConfig): string {
  const frontmatter: string[] = ['---'];
  frontmatter.push(`name: ${config.name}`);
  frontmatter.push(`description: ${config.description}`);

  if (config.tools && config.tools.length > 0) {
    frontmatter.push(`tools:`);
    for (const tool of config.tools) {
      frontmatter.push(`  - ${tool}`);
    }
  }

  if (config.model) {
    frontmatter.push(`model: ${config.model}`);
  }

  if (config.maxTokens) {
    frontmatter.push(`maxTokens: ${config.maxTokens}`);
  }

  frontmatter.push('---');
  frontmatter.push('');

  return frontmatter.join('\n') + config.instructions;
}

export function getSubagentFilename(name: string): string {
  // Convert to kebab-case for filename
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.md';
}
