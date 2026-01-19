/**
 * MCP Server Recommender for CCM v3.0 Smart Recommendations
 *
 * Generates recommendations for MCP servers based on detected patterns
 * and technology usage across projects.
 */

import { analyzeCrossProject, getProjectsByTechnology } from './cross-project-analyzer';

/**
 * Recommendation input structure for creating recommendations
 */
export interface RecommendationInput {
  type: 'mcp_server' | 'skill';
  recommendedItem: string;
  category: string;
  title: string;
  reason: string;
  detectedPatterns: string[];
  occurrenceCount: number;
  projectsAffected: string[];
  exampleUsage?: string;
  timeSavings: number;
  tokenSavings: number;
  dailySavings?: number;
  monthlySavings?: number;
  confidenceScore: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  configTemplate?: Record<string, unknown>;
}

/**
 * MCP Server definition with detection rules
 */
interface McpServerDefinition {
  name: string;
  category: string;
  title: string;
  /** Technologies that trigger this recommendation */
  technologies: string[];
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
  /** Default config template */
  configTemplate: Record<string, unknown>;
}

/**
 * MCP Server definitions
 */
const MCP_SERVER_DEFINITIONS: McpServerDefinition[] = [
  {
    name: 'PostgreSQL MCP',
    category: 'database',
    title: 'Enable Direct PostgreSQL Access',
    technologies: ['postgresql'],
    patterns: ['ssh_database_query', 'direct_database_query'],
    minOccurrences: 10,
    baseTimeSavings: 30,
    baseTokenSavings: 100,
    confidenceMultiplier: 1.0,
    generateReason: (occurrences, projectCount) =>
      `You query PostgreSQL ${occurrences} times in 30 days${projectCount > 1 ? ` across ${projectCount} projects` : ''}. PostgreSQL MCP provides direct database access without SSH overhead, saving ~100 tokens per query.`,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: {
        POSTGRES_CONNECTION_STRING: 'postgresql://user:password@host:5432/database'
      }
    }
  },
  {
    name: 'MySQL MCP',
    category: 'database',
    title: 'Enable Direct MySQL Access',
    technologies: ['mysql'],
    patterns: ['ssh_database_query'],
    minOccurrences: 10,
    baseTimeSavings: 30,
    baseTokenSavings: 100,
    confidenceMultiplier: 1.0,
    generateReason: (occurrences, projectCount) =>
      `You query MySQL ${occurrences} times in 30 days${projectCount > 1 ? ` across ${projectCount} projects` : ''}. MySQL MCP provides direct database access without SSH overhead.`,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-mysql'],
      env: {
        MYSQL_HOST: 'localhost',
        MYSQL_USER: 'root',
        MYSQL_PASSWORD: '',
        MYSQL_DATABASE: 'database'
      }
    }
  },
  {
    name: 'GitHub MCP',
    category: 'cicd',
    title: 'Improve Git Workflow Management',
    technologies: ['git', 'github'],
    patterns: ['git_workflow'],
    minOccurrences: 10,
    baseTimeSavings: 20,
    baseTokenSavings: 50,
    confidenceMultiplier: 0.9,
    generateReason: (occurrences) =>
      `You use git commands ${occurrences} times. GitHub MCP provides better PR management, issue tracking, and reduces token overhead for git operations.`,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: '<YOUR_TOKEN>'
      }
    }
  },
  {
    name: 'n8n MCP',
    category: 'automation',
    title: 'Direct n8n Workflow Management',
    technologies: ['n8n'],
    patterns: ['n8n_workflow_management'],
    minOccurrences: 5,
    baseTimeSavings: 40,
    baseTokenSavings: 120,
    confidenceMultiplier: 1.0,
    generateReason: (occurrences) =>
      `You manage n8n workflows ${occurrences} times. n8n MCP provides direct API access, eliminating curl commands and saving significant tokens.`,
    configTemplate: {
      url: 'https://your-n8n-instance/mcp-server/http',
      type: 'streamable-http'
    }
  },
  {
    name: 'Docker MCP',
    category: 'infrastructure',
    title: 'Streamline Container Management',
    technologies: ['docker'],
    patterns: ['docker_management'],
    minOccurrences: 5,
    baseTimeSavings: 15,
    baseTokenSavings: 40,
    confidenceMultiplier: 0.85,
    generateReason: (occurrences, projectCount) =>
      `You manage Docker containers ${occurrences} times${projectCount > 1 ? ` across ${projectCount} projects` : ''}. Docker MCP simplifies container operations.`,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-docker']
    }
  },
  {
    name: 'Kubernetes MCP',
    category: 'infrastructure',
    title: 'Simplify Kubernetes Operations',
    technologies: ['kubernetes', 'k8s'],
    patterns: ['kubernetes_management'],
    minOccurrences: 5,
    baseTimeSavings: 25,
    baseTokenSavings: 80,
    confidenceMultiplier: 0.9,
    generateReason: (occurrences) =>
      `You run kubectl commands ${occurrences} times. Kubernetes MCP provides structured cluster management with less token overhead.`,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-kubernetes']
    }
  },
  {
    name: 'AWS MCP',
    category: 'cloud',
    title: 'Streamline AWS Operations',
    technologies: ['aws'],
    patterns: ['aws_operations'],
    minOccurrences: 8,
    baseTimeSavings: 20,
    baseTokenSavings: 60,
    confidenceMultiplier: 0.85,
    generateReason: (occurrences) =>
      `You run AWS CLI commands ${occurrences} times. AWS MCP provides structured access to AWS services with better token efficiency.`,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-aws'],
      env: {
        AWS_PROFILE: 'default'
      }
    }
  },
  {
    name: 'Terraform MCP',
    category: 'infrastructure',
    title: 'Enhance Infrastructure Management',
    technologies: ['terraform', 'infrastructure'],
    patterns: ['terraform_infrastructure'],
    minOccurrences: 3,
    baseTimeSavings: 30,
    baseTokenSavings: 70,
    confidenceMultiplier: 0.85,
    generateReason: (occurrences) =>
      `You work with Terraform ${occurrences} times. Terraform MCP provides state awareness and plan previews.`,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-terraform']
    }
  },
  {
    name: 'Filesystem MCP',
    category: 'development',
    title: 'Enhanced File Operations',
    technologies: [],
    patterns: ['frequent_file_search'],
    minOccurrences: 3,
    baseTimeSavings: 10,
    baseTokenSavings: 30,
    confidenceMultiplier: 0.7,
    generateReason: (occurrences) =>
      `You frequently search files (${occurrences} sessions with heavy Glob/Grep usage). Filesystem MCP provides more efficient file operations.`,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
      env: {
        ALLOWED_DIRECTORIES: '/path/to/projects'
      }
    }
  },
  {
    name: 'SQLite MCP',
    category: 'database',
    title: 'Direct SQLite Access',
    technologies: ['sqlite'],
    patterns: [],
    minOccurrences: 5,
    baseTimeSavings: 15,
    baseTokenSavings: 40,
    confidenceMultiplier: 0.8,
    generateReason: (_, projectCount) =>
      `You work with SQLite databases in ${projectCount} project(s). SQLite MCP provides direct query execution without shell commands.`,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite'],
      env: {
        SQLITE_DB_PATH: '/path/to/database.db'
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

  if (occurrenceRatio >= 4 && savingsScore >= 2000) {
    return 'critical';
  } else if (occurrenceRatio >= 2 || savingsScore >= 1000) {
    return 'high';
  } else if (occurrenceRatio >= 1.5 || savingsScore >= 500) {
    return 'medium';
  }
  return 'low';
}

/**
 * Generate MCP server recommendations based on usage patterns
 *
 * @param machineId - Machine ID to generate recommendations for
 * @param daysBack - Number of days to analyze (default: 30)
 * @returns Array of MCP server recommendations
 */
export async function generateMcpRecommendations(
  machineId: string,
  daysBack: number = 30
): Promise<RecommendationInput[]> {
  const analysis = await analyzeCrossProject(machineId, daysBack);
  const recommendations: RecommendationInput[] = [];

  for (const def of MCP_SERVER_DEFINITIONS) {
    // Check if any required technology is present
    const hasTechnology = def.technologies.length === 0 ||
      def.technologies.some(tech => analysis.technologies.includes(tech));

    if (!hasTechnology) continue;

    // Check for matching patterns
    const matchingPatterns = analysis.patterns.filter(p =>
      def.patterns.includes(p.type)
    );

    // Calculate total occurrences from matching patterns
    const totalOccurrences = matchingPatterns.reduce(
      (sum, p) => sum + p.occurrences,
      0
    );

    // If no patterns but technology is detected, use technology-based occurrence
    let occurrenceCount = totalOccurrences;
    if (occurrenceCount === 0 && hasTechnology && def.technologies.length > 0) {
      // Estimate based on technology presence
      for (const tech of def.technologies) {
        if (analysis.technologies.includes(tech)) {
          const projectsWithTech = await getProjectsByTechnology(machineId, tech, daysBack);
          occurrenceCount = projectsWithTech.length * 5; // Estimate 5 uses per project
          break;
        }
      }
    }

    // Skip if below minimum threshold
    if (occurrenceCount < def.minOccurrences) continue;

    // Gather affected projects
    const projectsAffected = new Set<string>();
    for (const pattern of matchingPatterns) {
      pattern.projectPaths.forEach(id => projectsAffected.add(id));
    }

    // If no projects from patterns, get from technology
    if (projectsAffected.size === 0 && def.technologies.length > 0) {
      for (const tech of def.technologies) {
        const techProjects = await getProjectsByTechnology(machineId, tech, daysBack);
        techProjects.forEach(id => projectsAffected.add(id));
      }
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
    const dailyOccurrences = occurrenceCount / daysBack;
    const dailySavings = Math.round(dailyOccurrences * def.baseTokenSavings);
    const monthlySavings = dailySavings * 30;

    // Get example from patterns
    const exampleUsage = matchingPatterns.length > 0 && matchingPatterns[0].examples.length > 0
      ? matchingPatterns[0].examples[0]
      : undefined;

    recommendations.push({
      type: 'mcp_server',
      recommendedItem: def.name,
      category: def.category,
      title: def.title,
      reason: def.generateReason(occurrenceCount, projectsAffected.size),
      detectedPatterns: matchingPatterns.map(p => p.type),
      occurrenceCount,
      projectsAffected: Array.from(projectsAffected),
      exampleUsage,
      timeSavings: def.baseTimeSavings,
      tokenSavings: def.baseTokenSavings,
      dailySavings,
      monthlySavings,
      confidenceScore,
      priority: calculatePriority(occurrenceCount, def.minOccurrences, def.baseTokenSavings),
      configTemplate: def.configTemplate
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
 * Get MCP server definition by name
 */
export function getMcpServerDefinition(name: string): McpServerDefinition | undefined {
  return MCP_SERVER_DEFINITIONS.find(def => def.name === name);
}

/**
 * Get all available MCP server definitions
 */
export function getAllMcpServerDefinitions(): McpServerDefinition[] {
  return [...MCP_SERVER_DEFINITIONS];
}

/**
 * Check if a specific MCP server should be recommended for a machine
 */
export async function shouldRecommendMcpServer(
  machineId: string,
  serverName: string,
  daysBack: number = 30
): Promise<{ recommend: boolean; reason: string; confidence: number }> {
  const def = getMcpServerDefinition(serverName);
  if (!def) {
    return { recommend: false, reason: 'Unknown MCP server', confidence: 0 };
  }

  const analysis = await analyzeCrossProject(machineId, daysBack);

  // Check technology presence
  const hasTechnology = def.technologies.length === 0 ||
    def.technologies.some(tech => analysis.technologies.includes(tech));

  if (!hasTechnology) {
    return {
      recommend: false,
      reason: `Required technology (${def.technologies.join(', ')}) not detected`,
      confidence: 0
    };
  }

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
