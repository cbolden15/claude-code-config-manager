/**
 * Skill Recommender for CCM v3.0 Smart Recommendations
 *
 * Generates recommendations for Claude Code skills based on detected patterns
 * and repetitive workflows across projects.
 */

import { analyzeCrossProject, getProjectsByPattern } from './cross-project-analyzer';
import type { RecommendationInput } from './mcp-recommender';

/**
 * Skill definition with detection rules
 */
interface SkillDefinition {
  name: string;
  category: string;
  title: string;
  /** Pattern types that trigger this recommendation */
  patterns: string[];
  /** Minimum occurrences of pattern to recommend */
  minOccurrences: number;
  /** Base time savings per use (seconds) */
  baseTimeSavings: number;
  /** Base token savings per use */
  baseTokenSavings: number;
  /** Confidence multiplier based on strength of signal */
  confidenceMultiplier: number;
  /** Generate reason text */
  generateReason: (occurrences: number, projectCount: number) => string;
  /** Skill template configuration */
  skillTemplate: {
    templateType: string;
    description: string;
    suggestedContent?: string;
    parameters?: Record<string, unknown>;
  };
}

/**
 * Skill definitions
 */
const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    name: 'homelab-database-query',
    category: 'database',
    title: 'One-Command Database Queries',
    patterns: ['ssh_database_query', 'direct_database_query'],
    minOccurrences: 10,
    baseTimeSavings: 60,
    baseTokenSavings: 150,
    confidenceMultiplier: 1.0,
    generateReason: (occurrences, projectCount) =>
      `You query databases ${occurrences} times in 30 days${projectCount > 1 ? ` across ${projectCount} projects` : ''}. Create a skill to query with one command instead of SSH + psql workflow.`,
    skillTemplate: {
      templateType: 'database-query',
      description: 'Query databases with a simple /db-query command',
      suggestedContent: `# Database Query Skill

Query homelab databases with a single command.

## Usage
\`/db-query <database> <query>\`

## Databases
- my_business_operations
- ai_life_agent

## Example
\`/db-query my_business_operations "SELECT * FROM users LIMIT 10"\`
`,
      parameters: {
        databases: ['my_business_operations', 'ai_life_agent'],
        host: '192.168.1.2'
      }
    }
  },
  {
    name: 'n8n-workflow-status',
    category: 'automation',
    title: 'Instant n8n Workflow Overview',
    patterns: ['n8n_workflow_management'],
    minOccurrences: 10,
    baseTimeSavings: 50,
    baseTokenSavings: 130,
    confidenceMultiplier: 1.0,
    generateReason: (occurrences) =>
      `You check n8n workflows ${occurrences} times. A skill provides instant status with one command.`,
    skillTemplate: {
      templateType: 'n8n-status',
      description: 'Get n8n workflow status with a simple command',
      suggestedContent: `# n8n Workflow Status

Check the status of your n8n workflows.

## Usage
\`/n8n-status\` - Show all workflow statuses
\`/n8n-status <workflow>\` - Show specific workflow

## Workflows
- email-classifier
- lead-enrichment
- data-sync
`,
      parameters: {
        workflows: ['email-classifier', 'lead-enrichment', 'data-sync']
      }
    }
  },
  {
    name: 'homelab-service-health',
    category: 'monitoring',
    title: 'Quick Service Health Checks',
    patterns: ['service_health_check', 'homelab_management'],
    minOccurrences: 8,
    baseTimeSavings: 45,
    baseTokenSavings: 120,
    confidenceMultiplier: 0.9,
    generateReason: (occurrences) =>
      `You check service status ${occurrences} times. A health check skill provides instant overview.`,
    skillTemplate: {
      templateType: 'health-check',
      description: 'Check homelab service health with a single command',
      suggestedContent: `# Homelab Health Check

Quick health check for all homelab services.

## Usage
\`/health\` - Check all services
\`/health <service>\` - Check specific service

## Services
- n8n
- postgresql
- docker
- vaultwarden
- traefik
`,
      parameters: {
        services: ['n8n', 'postgresql', 'docker', 'vaultwarden', 'traefik']
      }
    }
  },
  {
    name: 'git-smart-commit',
    category: 'cicd',
    title: 'Automated Git Workflows',
    patterns: ['git_workflow'],
    minOccurrences: 15,
    baseTimeSavings: 35,
    baseTokenSavings: 90,
    confidenceMultiplier: 0.85,
    generateReason: (occurrences) =>
      `You run git workflows ${occurrences} times. A skill can automate commit, push, and PR creation.`,
    skillTemplate: {
      templateType: 'git-workflow',
      description: 'Streamlined git workflow commands',
      suggestedContent: `# Smart Git Commit

Automated git workflow with smart commit messages.

## Usage
\`/commit\` - Stage, commit, and push changes
\`/commit --no-push\` - Commit without pushing
\`/pr\` - Create pull request

## Features
- Auto-generates commit messages
- Runs pre-commit hooks
- Creates PRs with description
`,
      parameters: {
        features: ['auto-commit', 'pr-creation', 'smart-messages']
      }
    }
  },
  {
    name: 'docker-quick-ops',
    category: 'infrastructure',
    title: 'Quick Docker Operations',
    patterns: ['docker_management'],
    minOccurrences: 8,
    baseTimeSavings: 25,
    baseTokenSavings: 70,
    confidenceMultiplier: 0.85,
    generateReason: (occurrences) =>
      `You manage Docker containers ${occurrences} times. A skill provides quick container operations.`,
    skillTemplate: {
      templateType: 'docker-ops',
      description: 'Quick Docker container operations',
      suggestedContent: `# Docker Quick Ops

Fast Docker container management.

## Usage
\`/docker status\` - Show all containers
\`/docker logs <container>\` - View logs
\`/docker restart <container>\` - Restart container

## Containers
Automatically detects running containers.
`,
      parameters: {
        features: ['status', 'logs', 'restart', 'exec']
      }
    }
  },
  {
    name: 'k8s-quick-ops',
    category: 'infrastructure',
    title: 'Kubernetes Quick Commands',
    patterns: ['kubernetes_management'],
    minOccurrences: 8,
    baseTimeSavings: 30,
    baseTokenSavings: 80,
    confidenceMultiplier: 0.9,
    generateReason: (occurrences) =>
      `You run kubectl commands ${occurrences} times. A skill provides quick k8s operations.`,
    skillTemplate: {
      templateType: 'k8s-ops',
      description: 'Quick Kubernetes operations',
      suggestedContent: `# Kubernetes Quick Ops

Fast Kubernetes cluster management.

## Usage
\`/k8s pods\` - List pods
\`/k8s logs <pod>\` - View pod logs
\`/k8s describe <resource>\` - Describe resource

## Contexts
Automatically uses current context.
`,
      parameters: {
        features: ['pods', 'logs', 'describe', 'exec']
      }
    }
  },
  {
    name: 'api-test-runner',
    category: 'development',
    title: 'API Testing Skill',
    patterns: ['api_development'],
    minOccurrences: 8,
    baseTimeSavings: 20,
    baseTokenSavings: 50,
    confidenceMultiplier: 0.8,
    generateReason: (occurrences) =>
      `You develop APIs ${occurrences} times. A skill can streamline API testing.`,
    skillTemplate: {
      templateType: 'api-test',
      description: 'Quick API endpoint testing',
      suggestedContent: `# API Test Runner

Quick API endpoint testing.

## Usage
\`/api GET /users\` - GET request
\`/api POST /users {data}\` - POST request
\`/api test\` - Run saved tests

## Base URL
Configurable per project.
`,
      parameters: {
        features: ['get', 'post', 'put', 'delete', 'saved-tests']
      }
    }
  },
  {
    name: 'test-runner',
    category: 'development',
    title: 'Quick Test Runner',
    patterns: ['testing_workflow'],
    minOccurrences: 10,
    baseTimeSavings: 15,
    baseTokenSavings: 40,
    confidenceMultiplier: 0.8,
    generateReason: (occurrences) =>
      `You run tests ${occurrences} times. A skill provides quick test execution.`,
    skillTemplate: {
      templateType: 'test-runner',
      description: 'Quick test execution',
      suggestedContent: `# Test Runner

Quick test execution with smart filtering.

## Usage
\`/test\` - Run all tests
\`/test <pattern>\` - Run matching tests
\`/test --watch\` - Watch mode

## Auto-detection
Detects jest, vitest, pytest automatically.
`,
      parameters: {
        frameworks: ['jest', 'vitest', 'pytest']
      }
    }
  },
  {
    name: 'log-viewer',
    category: 'monitoring',
    title: 'Smart Log Viewer',
    patterns: ['log_analysis'],
    minOccurrences: 8,
    baseTimeSavings: 25,
    baseTokenSavings: 60,
    confidenceMultiplier: 0.85,
    generateReason: (occurrences) =>
      `You analyze logs ${occurrences} times. A skill provides smart log viewing with filtering.`,
    skillTemplate: {
      templateType: 'log-viewer',
      description: 'Smart log viewing with filters',
      suggestedContent: `# Smart Log Viewer

Intelligent log viewing and analysis.

## Usage
\`/logs <service>\` - View recent logs
\`/logs <service> --error\` - Show errors only
\`/logs <service> --since 1h\` - Time filter

## Features
- Auto-detects log locations
- Syntax highlighting
- Error extraction
`,
      parameters: {
        features: ['filter', 'highlight', 'error-extract']
      }
    }
  },
  {
    name: 'ssh-quick-connect',
    category: 'infrastructure',
    title: 'Quick SSH Connections',
    patterns: ['ssh_remote_operations', 'homelab_management'],
    minOccurrences: 8,
    baseTimeSavings: 20,
    baseTokenSavings: 50,
    confidenceMultiplier: 0.85,
    generateReason: (occurrences) =>
      `You SSH to remote hosts ${occurrences} times. A skill provides quick connection shortcuts.`,
    skillTemplate: {
      templateType: 'ssh-connect',
      description: 'Quick SSH connection shortcuts',
      suggestedContent: `# SSH Quick Connect

Fast SSH connections to known hosts.

## Usage
\`/ssh <host>\` - Connect to host
\`/ssh <host> <command>\` - Run command

## Hosts
Configure known hosts with aliases.
`,
      parameters: {
        features: ['aliases', 'command-exec', 'history']
      }
    }
  },
  {
    name: 'npm-shortcuts',
    category: 'development',
    title: 'NPM Package Shortcuts',
    patterns: ['npm_package_management'],
    minOccurrences: 15,
    baseTimeSavings: 10,
    baseTokenSavings: 30,
    confidenceMultiplier: 0.7,
    generateReason: (occurrences) =>
      `You run npm commands ${occurrences} times. A skill provides package management shortcuts.`,
    skillTemplate: {
      templateType: 'npm-shortcuts',
      description: 'NPM/PNPM package shortcuts',
      suggestedContent: `# NPM Shortcuts

Quick package management commands.

## Usage
\`/npm add <pkg>\` - Add package
\`/npm dev\` - Run dev server
\`/npm build\` - Build project

## Auto-detection
Detects npm, pnpm, yarn automatically.
`,
      parameters: {
        features: ['add', 'dev', 'build', 'test']
      }
    }
  }
];

/**
 * Calculate priority based on occurrence count and savings
 */
function calculatePriority(
  occurrences: number,
  minOccurrences: number,
  tokenSavings: number
): 'critical' | 'high' | 'medium' | 'low' {
  const occurrenceRatio = occurrences / minOccurrences;
  const savingsScore = tokenSavings * occurrences;

  if (occurrenceRatio >= 4 && savingsScore >= 3000) {
    return 'critical';
  } else if (occurrenceRatio >= 2 || savingsScore >= 1500) {
    return 'high';
  } else if (occurrenceRatio >= 1.5 || savingsScore >= 750) {
    return 'medium';
  }
  return 'low';
}

/**
 * Generate skill recommendations based on usage patterns
 *
 * @param machineId - Machine ID to generate recommendations for
 * @param daysBack - Number of days to analyze (default: 30)
 * @returns Array of skill recommendations
 */
export async function generateSkillRecommendations(
  machineId: string,
  daysBack: number = 30
): Promise<RecommendationInput[]> {
  const analysis = await analyzeCrossProject(machineId, daysBack);
  const recommendations: RecommendationInput[] = [];

  for (const def of SKILL_DEFINITIONS) {
    // Check for matching patterns
    const matchingPatterns = analysis.patterns.filter(p =>
      def.patterns.includes(p.type)
    );

    // Calculate total occurrences from matching patterns
    const totalOccurrences = matchingPatterns.reduce(
      (sum, p) => sum + p.occurrences,
      0
    );

    // Skip if below minimum threshold
    if (totalOccurrences < def.minOccurrences) continue;

    // Gather affected projects
    const projectsAffected = new Set<string>();
    for (const pattern of matchingPatterns) {
      pattern.projectIds.forEach(id => projectsAffected.add(id));
    }

    // Also get projects directly from pattern analysis
    for (const patternType of def.patterns) {
      const patternProjects = await getProjectsByPattern(machineId, patternType, daysBack);
      patternProjects.forEach(id => projectsAffected.add(id));
    }

    // Calculate confidence
    const patternConfidence = matchingPatterns.length > 0
      ? Math.max(...matchingPatterns.map(p => p.confidence))
      : 0.5;
    const confidenceScore = Math.min(
      patternConfidence * def.confidenceMultiplier,
      1.0
    );

    // Calculate savings
    const dailyOccurrences = totalOccurrences / daysBack;
    const dailySavings = Math.round(dailyOccurrences * def.baseTokenSavings);
    const monthlySavings = dailySavings * 30;

    // Get example from patterns
    const exampleUsage = matchingPatterns.length > 0 && matchingPatterns[0].examples.length > 0
      ? matchingPatterns[0].examples[0]
      : undefined;

    recommendations.push({
      type: 'skill',
      recommendedItem: def.name,
      category: def.category,
      title: def.title,
      reason: def.generateReason(totalOccurrences, projectsAffected.size),
      detectedPatterns: matchingPatterns.map(p => p.type),
      occurrenceCount: totalOccurrences,
      projectsAffected: Array.from(projectsAffected),
      exampleUsage,
      timeSavings: def.baseTimeSavings,
      tokenSavings: def.baseTokenSavings,
      dailySavings,
      monthlySavings,
      confidenceScore,
      priority: calculatePriority(totalOccurrences, def.minOccurrences, def.baseTokenSavings),
      configTemplate: def.skillTemplate
    });
  }

  // Sort by priority and confidence
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidenceScore - a.confidenceScore;
  });
}

/**
 * Get skill definition by name
 */
export function getSkillDefinition(name: string): SkillDefinition | undefined {
  return SKILL_DEFINITIONS.find(def => def.name === name);
}

/**
 * Get all available skill definitions
 */
export function getAllSkillDefinitions(): SkillDefinition[] {
  return [...SKILL_DEFINITIONS];
}

/**
 * Generate skill content from template
 */
export function generateSkillContent(
  skillName: string,
  customizations?: Record<string, unknown>
): string | null {
  const def = getSkillDefinition(skillName);
  if (!def || !def.skillTemplate.suggestedContent) {
    return null;
  }

  let content = def.skillTemplate.suggestedContent;

  // Apply customizations if provided
  if (customizations) {
    for (const [key, value] of Object.entries(customizations)) {
      const placeholder = `{{${key}}}`;
      if (content.includes(placeholder)) {
        content = content.replace(
          new RegExp(placeholder, 'g'),
          String(value)
        );
      }
    }
  }

  return content;
}

/**
 * Check if a specific skill should be recommended for a machine
 */
export async function shouldRecommendSkill(
  machineId: string,
  skillName: string,
  daysBack: number = 30
): Promise<{ recommend: boolean; reason: string; confidence: number }> {
  const def = getSkillDefinition(skillName);
  if (!def) {
    return { recommend: false, reason: 'Unknown skill', confidence: 0 };
  }

  const analysis = await analyzeCrossProject(machineId, daysBack);

  // Check pattern occurrences
  const matchingPatterns = analysis.patterns.filter(p =>
    def.patterns.includes(p.type)
  );
  const totalOccurrences = matchingPatterns.reduce(
    (sum, p) => sum + p.occurrences,
    0
  );

  if (totalOccurrences < def.minOccurrences) {
    return {
      recommend: false,
      reason: `Insufficient pattern occurrences (${totalOccurrences}/${def.minOccurrences})`,
      confidence: totalOccurrences / def.minOccurrences
    };
  }

  const confidence = Math.min(
    (totalOccurrences / (def.minOccurrences * 4)) * def.confidenceMultiplier,
    1.0
  );

  return {
    recommend: true,
    reason: def.generateReason(totalOccurrences, analysis.projectCount),
    confidence
  };
}
