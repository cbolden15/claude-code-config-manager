interface SkillConfig {
  name: string;
  description: string;
  triggers?: string[];
  instructions: string;
}

export function generateSkill(config: SkillConfig): string {
  const frontmatter: string[] = ['---'];
  frontmatter.push(`name: ${config.name}`);
  frontmatter.push(`description: ${config.description}`);

  if (config.triggers && config.triggers.length > 0) {
    frontmatter.push(`triggers:`);
    for (const trigger of config.triggers) {
      frontmatter.push(`  - "${trigger}"`);
    }
  }

  frontmatter.push('---');
  frontmatter.push('');

  return frontmatter.join('\n') + config.instructions;
}

export function getSkillFolderName(name: string): string {
  // Convert to kebab-case for folder name
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
