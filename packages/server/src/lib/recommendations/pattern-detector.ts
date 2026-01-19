/**
 * Pattern Detection Engine for CCM v3.0 Smart Recommendations
 *
 * Analyzes session activity data to detect recurring patterns that indicate
 * opportunities for optimization through MCP servers or skills.
 */

import type { SessionActivity } from '@prisma/client';

/**
 * Detected pattern with supporting evidence
 */
export interface DetectedPattern {
  /** Pattern type identifier */
  type: string;
  /** Number of occurrences detected */
  occurrences: number;
  /** Example commands or actions that triggered detection */
  examples: string[];
  /** Related technologies */
  technologies: string[];
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  /** Session IDs where pattern was detected */
  sessionIds: string[];
  /** Project IDs where pattern was detected */
  projectIds: string[];
}

/**
 * Pattern definition for detection
 */
interface PatternDefinition {
  type: string;
  /** Minimum occurrences to consider pattern valid */
  minOccurrences: number;
  /** Technologies associated with this pattern */
  technologies: string[];
  /** Matcher function to detect pattern in session */
  matcher: (session: SessionActivity, commands: string[], files: string[], tools: string[]) => boolean;
  /** Extract example from session */
  extractExample: (session: SessionActivity, commands: string[]) => string | null;
}

/**
 * All pattern definitions
 */
const PATTERN_DEFINITIONS: PatternDefinition[] = [
  {
    type: 'ssh_database_query',
    minOccurrences: 5,
    technologies: ['postgresql', 'ssh'],
    matcher: (_, commands) => {
      return commands.some(c =>
        c.includes('ssh') && (c.includes('psql') || c.includes('mysql') || c.includes('pg_'))
      );
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.includes('ssh') && (c.includes('psql') || c.includes('mysql'))) || null;
    }
  },
  {
    type: 'direct_database_query',
    minOccurrences: 8,
    technologies: ['postgresql'],
    matcher: (_, commands) => {
      const dbCommands = commands.filter(c =>
        c.includes('psql') || c.includes('pg_dump') || c.includes('pg_restore')
      );
      return dbCommands.length >= 2;
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.includes('psql')) || null;
    }
  },
  {
    type: 'git_workflow',
    minOccurrences: 5,
    technologies: ['git'],
    matcher: (_, commands) => {
      const gitCommands = commands.filter(c => c.startsWith('git '));
      return gitCommands.length >= 3;
    },
    extractExample: () => 'git add . && git commit && git push'
  },
  {
    type: 'n8n_workflow_management',
    minOccurrences: 5,
    technologies: ['n8n'],
    matcher: (session, commands) => {
      const techs = safeParseArray(session.detectedTechs);
      const hasN8nTech = techs.includes('n8n');
      const hasN8nCommands = commands.some(c =>
        (c.includes('curl') && c.includes('workflow')) ||
        c.includes('n8n') ||
        c.includes('/api/v1/workflows')
      );
      return hasN8nTech || hasN8nCommands;
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.includes('workflow')) || 'curl n8n/api/workflows';
    }
  },
  {
    type: 'docker_management',
    minOccurrences: 5,
    technologies: ['docker'],
    matcher: (_, commands) => {
      return commands.some(c =>
        c.includes('docker ps') ||
        c.includes('docker logs') ||
        c.includes('docker restart') ||
        c.includes('docker exec') ||
        c.includes('docker-compose')
      );
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.startsWith('docker ')) || null;
    }
  },
  {
    type: 'service_health_check',
    minOccurrences: 5,
    technologies: [],
    matcher: (_, commands) => {
      return commands.some(c =>
        c.includes('systemctl status') ||
        (c.includes('curl') && c.includes('health')) ||
        c.includes('service ') && c.includes('status')
      );
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.includes('status') || c.includes('health')) || null;
    }
  },
  {
    type: 'frequent_file_search',
    minOccurrences: 3,
    technologies: [],
    matcher: (_, __, ___, tools) => {
      const globCount = tools.filter(t => t === 'Glob').length;
      const grepCount = tools.filter(t => t === 'Grep').length;
      return (globCount + grepCount) >= 5;
    },
    extractExample: () => 'Frequent Glob and Grep usage'
  },
  {
    type: 'api_development',
    minOccurrences: 5,
    technologies: ['rest', 'api'],
    matcher: (_, commands, files) => {
      const hasCurl = commands.some(c => c.includes('curl'));
      const hasApiFiles = files.some(f =>
        f.includes('/api/') || f.includes('route.ts') || f.includes('controller')
      );
      return hasCurl && hasApiFiles;
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.includes('curl')) || null;
    }
  },
  {
    type: 'kubernetes_management',
    minOccurrences: 5,
    technologies: ['kubernetes', 'k8s'],
    matcher: (_, commands) => {
      return commands.some(c =>
        c.startsWith('kubectl ') ||
        c.startsWith('k9s') ||
        c.includes('helm ')
      );
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.startsWith('kubectl ') || c.startsWith('helm ')) || null;
    }
  },
  {
    type: 'terraform_infrastructure',
    minOccurrences: 3,
    technologies: ['terraform', 'infrastructure'],
    matcher: (_, commands, files) => {
      const hasTerraformCommands = commands.some(c =>
        c.startsWith('terraform ') || c.startsWith('tf ')
      );
      const hasTerraformFiles = files.some(f =>
        f.endsWith('.tf') || f.endsWith('.tfvars')
      );
      return hasTerraformCommands || hasTerraformFiles;
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.startsWith('terraform ')) || null;
    }
  },
  {
    type: 'aws_operations',
    minOccurrences: 5,
    technologies: ['aws'],
    matcher: (_, commands) => {
      return commands.some(c => c.startsWith('aws '));
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.startsWith('aws ')) || null;
    }
  },
  {
    type: 'npm_package_management',
    minOccurrences: 10,
    technologies: ['nodejs', 'npm'],
    matcher: (_, commands) => {
      const npmCommands = commands.filter(c =>
        c.startsWith('npm ') || c.startsWith('pnpm ') || c.startsWith('yarn ')
      );
      return npmCommands.length >= 3;
    },
    extractExample: (_, commands) => {
      return commands.find(c =>
        c.startsWith('npm ') || c.startsWith('pnpm ') || c.startsWith('yarn ')
      ) || null;
    }
  },
  {
    type: 'testing_workflow',
    minOccurrences: 8,
    technologies: ['testing'],
    matcher: (_, commands) => {
      return commands.some(c =>
        c.includes('jest') ||
        c.includes('vitest') ||
        c.includes('pytest') ||
        c.includes('npm test') ||
        c.includes('pnpm test')
      );
    },
    extractExample: (_, commands) => {
      return commands.find(c =>
        c.includes('test') || c.includes('jest') || c.includes('vitest')
      ) || null;
    }
  },
  {
    type: 'log_analysis',
    minOccurrences: 5,
    technologies: [],
    matcher: (_, commands, files) => {
      const hasLogCommands = commands.some(c =>
        c.includes('tail ') || c.includes('less ') || c.includes('journalctl')
      );
      const hasLogFiles = files.some(f =>
        f.includes('.log') || f.includes('/logs/')
      );
      return hasLogCommands || hasLogFiles;
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.includes('tail ') || c.includes('journalctl')) || null;
    }
  },
  {
    type: 'ssh_remote_operations',
    minOccurrences: 5,
    technologies: ['ssh'],
    matcher: (_, commands) => {
      const sshCommands = commands.filter(c => c.startsWith('ssh '));
      return sshCommands.length >= 2;
    },
    extractExample: (_, commands) => {
      return commands.find(c => c.startsWith('ssh ')) || null;
    }
  },
  {
    type: 'homelab_management',
    minOccurrences: 5,
    technologies: ['homelab'],
    matcher: (_, commands) => {
      return commands.some(c =>
        c.includes('192.168.') ||
        c.includes('homelab') ||
        c.includes('.local') ||
        c.includes('proxmox') ||
        c.includes('truenas')
      );
    },
    extractExample: (_, commands) => {
      return commands.find(c =>
        c.includes('192.168.') || c.includes('homelab')
      ) || null;
    }
  }
];

/**
 * Safely parse JSON array, returning empty array on error
 */
function safeParseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Detect patterns from a collection of session activities
 *
 * @param sessions - Array of session activity records
 * @returns Array of detected patterns with confidence scores
 */
export function detectPatterns(sessions: SessionActivity[]): DetectedPattern[] {
  if (sessions.length === 0) {
    return [];
  }

  const patternResults = new Map<string, {
    occurrences: number;
    examples: Set<string>;
    technologies: Set<string>;
    sessionIds: Set<string>;
    projectIds: Set<string>;
  }>();

  // Initialize pattern tracking
  for (const def of PATTERN_DEFINITIONS) {
    patternResults.set(def.type, {
      occurrences: 0,
      examples: new Set(),
      technologies: new Set(def.technologies),
      sessionIds: new Set(),
      projectIds: new Set()
    });
  }

  // Analyze each session
  for (const session of sessions) {
    const commands = safeParseArray(session.commandsRun);
    const files = safeParseArray(session.filesAccessed);
    const tools = safeParseArray(session.toolsUsed);

    for (const def of PATTERN_DEFINITIONS) {
      if (def.matcher(session, commands, files, tools)) {
        const result = patternResults.get(def.type)!;
        result.occurrences++;
        result.sessionIds.add(session.sessionId);

        if (session.projectId) {
          result.projectIds.add(session.projectId);
        }

        const example = def.extractExample(session, commands);
        if (example) {
          result.examples.add(example);
        }

        // Add detected technologies from session
        const sessionTechs = safeParseArray(session.detectedTechs);
        for (const tech of sessionTechs) {
          if (def.technologies.includes(tech) || def.technologies.length === 0) {
            result.technologies.add(tech);
          }
        }
      }
    }
  }

  // Build detected patterns that meet minimum thresholds
  const detectedPatterns: DetectedPattern[] = [];

  for (const def of PATTERN_DEFINITIONS) {
    const result = patternResults.get(def.type)!;

    if (result.occurrences >= def.minOccurrences) {
      // Calculate confidence based on occurrence count and consistency
      const baseConfidence = Math.min(result.occurrences / (def.minOccurrences * 4), 1.0);
      const projectDiversity = result.projectIds.size > 1 ? 0.1 : 0;
      const confidence = Math.min(baseConfidence + projectDiversity, 1.0);

      detectedPatterns.push({
        type: def.type,
        occurrences: result.occurrences,
        examples: Array.from(result.examples).slice(0, 3),
        technologies: Array.from(result.technologies),
        confidence,
        sessionIds: Array.from(result.sessionIds),
        projectIds: Array.from(result.projectIds)
      });
    }
  }

  // Sort by occurrences descending
  return detectedPatterns.sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Detect patterns for a single session (for real-time detection)
 */
export function detectSessionPatterns(session: SessionActivity): string[] {
  const commands = safeParseArray(session.commandsRun);
  const files = safeParseArray(session.filesAccessed);
  const tools = safeParseArray(session.toolsUsed);
  const detected: string[] = [];

  for (const def of PATTERN_DEFINITIONS) {
    if (def.matcher(session, commands, files, tools)) {
      detected.push(def.type);
    }
  }

  return detected;
}

/**
 * Get pattern definition by type
 */
export function getPatternDefinition(type: string): PatternDefinition | undefined {
  return PATTERN_DEFINITIONS.find(def => def.type === type);
}

/**
 * Get all pattern types
 */
export function getAllPatternTypes(): string[] {
  return PATTERN_DEFINITIONS.map(def => def.type);
}

/**
 * Calculate pattern confidence for a given occurrence count
 */
export function calculatePatternConfidence(
  patternType: string,
  occurrences: number
): number {
  const def = getPatternDefinition(patternType);
  if (!def) return 0;

  const baseConfidence = Math.min(occurrences / (def.minOccurrences * 4), 1.0);
  return Math.round(baseConfidence * 100) / 100;
}
