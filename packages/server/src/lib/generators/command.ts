interface CommandConfig {
  name: string;
  description: string;
  prompt: string;
}

export function generateCommand(config: CommandConfig): string {
  const frontmatter: string[] = ['---'];
  frontmatter.push(`name: ${config.name}`);
  frontmatter.push(`description: ${config.description}`);
  frontmatter.push('---');
  frontmatter.push('');

  return frontmatter.join('\n') + config.prompt;
}

export function getCommandFilename(name: string): string {
  // Use the command name directly, ensure it's kebab-case
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.md';
}
