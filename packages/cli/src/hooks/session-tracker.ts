/**
 * Session Tracker Hook
 * Tracks Claude Code session activity and sends data to CCM server
 */

import { readFile, access, constants } from 'fs/promises';
import { homedir, hostname } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { loadConfig } from '../lib/config.js';

export interface SessionData {
  sessionId: string;
  startTime: number;
  endTime: number;
  toolsUsed: string[];
  commandsRun: string[];
  filesAccessed: string[];
  errors: string[];
  startupTokens: number;
  totalTokens: number;
  toolTokens: number;
  contextTokens: number;
}

interface TrackedSession {
  machineId: string;
  projectId?: string;
  projectPath?: string;
  sessionId: string;
  duration: number;
  toolsUsed: string[];
  commandsRun: string[];
  filesAccessed: string[];
  errors: string[];
  startupTokens: number;
  totalTokens: number;
  toolTokens: number;
  contextTokens: number;
  detectedTechs: string[];
  detectedPatterns: string[];
  timestamp: string;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

/**
 * Get the machine ID from config or generate one
 */
async function getMachineId(): Promise<string> {
  const config = loadConfig();
  if (config.machine) {
    return config.machine;
  }

  // Use hostname as fallback
  return hostname() || 'unknown-machine';
}

/**
 * Get project ID based on current working directory
 */
async function getProjectId(projectPath: string): Promise<string | undefined> {
  // Simple hash of the project path for now
  // In production, this would look up the project in CCM
  const hash = projectPath
    .split('')
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
  return `proj_${Math.abs(hash).toString(36)}`;
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse Claude Code session log to extract activity data
 */
async function parseSessionLog(logPath: string): Promise<Partial<SessionData>> {
  try {
    const content = await readFile(logPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    const toolsUsed = new Set<string>();
    const commandsRun: string[] = [];
    const filesAccessed = new Set<string>();
    const errors: string[] = [];

    // Parse log lines for activity
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Track tool usage
        if (entry.tool) {
          toolsUsed.add(entry.tool);
        }

        // Track bash commands
        if (entry.tool === 'Bash' && entry.command) {
          commandsRun.push(entry.command);
        }

        // Track file access
        if (entry.tool === 'Read' && entry.path) {
          filesAccessed.add(entry.path);
        }
        if (entry.tool === 'Write' && entry.path) {
          filesAccessed.add(entry.path);
        }
        if (entry.tool === 'Edit' && entry.path) {
          filesAccessed.add(entry.path);
        }

        // Track errors
        if (entry.error) {
          errors.push(entry.error);
        }
      } catch {
        // Skip non-JSON lines
      }
    }

    return {
      toolsUsed: Array.from(toolsUsed),
      commandsRun,
      filesAccessed: Array.from(filesAccessed),
      errors,
    };
  } catch {
    return {
      toolsUsed: [],
      commandsRun: [],
      filesAccessed: [],
      errors: [],
    };
  }
}

/**
 * Detect technologies based on session data
 */
export function detectTechnologies(session: Partial<SessionData>): string[] {
  const techs = new Set<string>();

  // Check commands for technology indicators
  for (const cmd of session.commandsRun || []) {
    const cmdLower = cmd.toLowerCase();

    // Database technologies
    if (cmdLower.includes('psql') || cmdLower.includes('pg_')) {
      techs.add('postgresql');
    }
    if (cmdLower.includes('mysql')) {
      techs.add('mysql');
    }
    if (cmdLower.includes('mongo')) {
      techs.add('mongodb');
    }
    if (cmdLower.includes('redis-cli') || cmdLower.includes('redis-server')) {
      techs.add('redis');
    }
    if (cmdLower.includes('sqlite')) {
      techs.add('sqlite');
    }

    // Container/orchestration
    if (cmdLower.includes('docker')) {
      techs.add('docker');
    }
    if (cmdLower.includes('kubectl') || cmdLower.includes('k8s')) {
      techs.add('kubernetes');
    }
    if (cmdLower.includes('podman')) {
      techs.add('podman');
    }

    // Version control
    if (cmdLower.startsWith('git ') || cmdLower.includes(' git ')) {
      techs.add('git');
    }
    if (cmdLower.includes('gh ')) {
      techs.add('github');
    }

    // Package managers
    if (cmdLower.includes('npm ') || cmdLower.includes('npx ')) {
      techs.add('npm');
      techs.add('nodejs');
    }
    if (cmdLower.includes('pnpm ')) {
      techs.add('pnpm');
      techs.add('nodejs');
    }
    if (cmdLower.includes('yarn ')) {
      techs.add('yarn');
      techs.add('nodejs');
    }
    if (cmdLower.includes('pip ') || cmdLower.includes('python')) {
      techs.add('python');
    }
    if (cmdLower.includes('cargo ') || cmdLower.includes('rustc')) {
      techs.add('rust');
    }
    if (cmdLower.includes('go ')) {
      techs.add('golang');
    }

    // Automation/workflow
    if (cmdLower.includes('n8n') || cmdLower.includes('workflow')) {
      techs.add('n8n');
    }
    if (cmdLower.includes('ansible')) {
      techs.add('ansible');
    }
    if (cmdLower.includes('terraform')) {
      techs.add('terraform');
    }

    // Remote access
    if (cmdLower.includes('ssh ')) {
      techs.add('ssh');
    }
    if (cmdLower.includes('curl ') || cmdLower.includes('wget ')) {
      techs.add('http-client');
    }

    // Services
    if (cmdLower.includes('systemctl') || cmdLower.includes('service ')) {
      techs.add('systemd');
    }
    if (cmdLower.includes('nginx')) {
      techs.add('nginx');
    }
  }

  // Check files for technology indicators
  for (const file of session.filesAccessed || []) {
    const fileLower = file.toLowerCase();

    if (fileLower.endsWith('.sql')) {
      techs.add('sql');
    }
    if (fileLower.includes('package.json')) {
      techs.add('nodejs');
    }
    if (fileLower.includes('docker-compose') || fileLower.includes('dockerfile')) {
      techs.add('docker');
    }
    if (fileLower.includes('prisma')) {
      techs.add('prisma');
    }
    if (fileLower.endsWith('.py')) {
      techs.add('python');
    }
    if (fileLower.endsWith('.rs')) {
      techs.add('rust');
    }
    if (fileLower.endsWith('.go')) {
      techs.add('golang');
    }
    if (fileLower.endsWith('.tsx') || fileLower.endsWith('.jsx')) {
      techs.add('react');
    }
    if (fileLower.includes('next.config')) {
      techs.add('nextjs');
    }
    if (fileLower.endsWith('.tf')) {
      techs.add('terraform');
    }
    if (fileLower.includes('ansible') || fileLower.endsWith('.yml') && fileLower.includes('playbook')) {
      techs.add('ansible');
    }
  }

  return Array.from(techs);
}

/**
 * Detect patterns based on session data
 */
export function detectPatterns(session: Partial<SessionData>): string[] {
  const patterns: string[] = [];
  const commands = session.commandsRun || [];
  const tools = session.toolsUsed || [];

  // SSH + Database Query Pattern
  const hasSsh = commands.some(c => c.includes('ssh'));
  const hasDbQuery = commands.some(c =>
    c.includes('psql') || c.includes('mysql') || c.includes('mongo')
  );
  if (hasSsh && hasDbQuery) {
    patterns.push('ssh_database_query');
  }

  // Git Workflow Pattern (multiple git commands in session)
  const gitCommands = commands.filter(c => c.startsWith('git ') || c.includes(' git '));
  if (gitCommands.length >= 3) {
    patterns.push('git_workflow');
  }

  // Docker Management Pattern
  const dockerCommands = commands.filter(c => c.includes('docker'));
  if (dockerCommands.length >= 2) {
    patterns.push('docker_management');
  }

  // Service Health Check Pattern
  const healthChecks = commands.filter(c =>
    c.includes('systemctl status') ||
    (c.includes('curl') && c.includes('health')) ||
    c.includes('ping ')
  );
  if (healthChecks.length >= 2) {
    patterns.push('service_health_check');
  }

  // n8n Workflow Management Pattern
  const n8nCommands = commands.filter(c =>
    c.includes('n8n') ||
    (c.includes('curl') && c.includes('workflow'))
  );
  if (n8nCommands.length >= 2) {
    patterns.push('n8n_workflow_management');
  }

  // Frequent File Search Pattern
  const searchTools = tools.filter(t => t === 'Glob' || t === 'Grep');
  if (searchTools.length >= 5) {
    patterns.push('frequent_file_search');
  }

  // Heavy Read Pattern (lots of file reads)
  const readCount = tools.filter(t => t === 'Read').length;
  if (readCount >= 10) {
    patterns.push('heavy_file_reading');
  }

  // Code Generation Pattern (lots of writes/edits)
  const writeCount = tools.filter(t => t === 'Write' || t === 'Edit').length;
  if (writeCount >= 5) {
    patterns.push('code_generation');
  }

  // API Development Pattern
  const apiIndicators = commands.filter(c =>
    c.includes('curl') || c.includes('httpie') || c.includes('postman')
  );
  const hasApiFiles = (session.filesAccessed || []).some(f =>
    f.includes('/api/') || f.includes('route.ts') || f.includes('endpoint')
  );
  if (apiIndicators.length >= 2 || hasApiFiles) {
    patterns.push('api_development');
  }

  // Testing Pattern
  const testCommands = commands.filter(c =>
    c.includes('jest') || c.includes('vitest') || c.includes('pytest') ||
    c.includes('npm test') || c.includes('pnpm test') || c.includes('yarn test')
  );
  if (testCommands.length >= 1) {
    patterns.push('testing_workflow');
  }

  // Build/Deploy Pattern
  const buildCommands = commands.filter(c =>
    c.includes('build') || c.includes('deploy') || c.includes('publish')
  );
  if (buildCommands.length >= 2) {
    patterns.push('build_deploy');
  }

  return patterns;
}

/**
 * Send tracked session data to CCM server
 */
async function sendToServer(data: TrackedSession): Promise<boolean> {
  const config = loadConfig();

  try {
    const response = await fetch(`${config.serverUrl}/api/sessions/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return response.ok;
  } catch (error) {
    // Silent fail - don't break user workflow
    return false;
  }
}

/**
 * Track the current session
 * Called at session end or manually via CLI
 */
export async function trackSession(options: {
  projectPath?: string;
  sessionLog?: string;
  verbose?: boolean;
} = {}): Promise<void> {
  const { projectPath = process.cwd(), verbose = false } = options;

  try {
    // Get machine ID
    const machineId = await getMachineId();

    // Get project ID
    const projectId = await getProjectId(projectPath);

    // Try to find and parse session log
    const sessionLogPath = options.sessionLog || join(homedir(), '.claude', 'session.log');
    const hasLog = await fileExists(sessionLogPath);

    let sessionData: Partial<SessionData> = {
      sessionId: generateSessionId(),
      startTime: Date.now() - 3600000, // Default: 1 hour ago
      endTime: Date.now(),
      toolsUsed: [],
      commandsRun: [],
      filesAccessed: [],
      errors: [],
      startupTokens: 0,
      totalTokens: 0,
      toolTokens: 0,
      contextTokens: 0,
    };

    if (hasLog) {
      const parsed = await parseSessionLog(sessionLogPath);
      sessionData = { ...sessionData, ...parsed };
    }

    // Detect technologies and patterns
    const detectedTechs = detectTechnologies(sessionData);
    const detectedPatterns = detectPatterns(sessionData);

    // Calculate duration
    const duration = Math.round(((sessionData.endTime || Date.now()) - (sessionData.startTime || Date.now())) / 1000);

    // Build tracked session data
    const trackedSession: TrackedSession = {
      machineId,
      projectId,
      projectPath,
      sessionId: sessionData.sessionId || generateSessionId(),
      duration,
      toolsUsed: sessionData.toolsUsed || [],
      commandsRun: sessionData.commandsRun || [],
      filesAccessed: sessionData.filesAccessed || [],
      errors: sessionData.errors || [],
      startupTokens: sessionData.startupTokens || 0,
      totalTokens: sessionData.totalTokens || 0,
      toolTokens: sessionData.toolTokens || 0,
      contextTokens: sessionData.contextTokens || 0,
      detectedTechs,
      detectedPatterns,
      timestamp: new Date().toISOString(),
    };

    // Send to server
    const success = await sendToServer(trackedSession);

    if (verbose) {
      if (success) {
        console.log('Session tracked successfully');
        console.log(`  Technologies: ${detectedTechs.join(', ') || 'none detected'}`);
        console.log(`  Patterns: ${detectedPatterns.join(', ') || 'none detected'}`);
      } else {
        console.log('Failed to track session (server may be unavailable)');
      }
    }
  } catch (error) {
    if (verbose) {
      console.error('Session tracking failed:', error instanceof Error ? error.message : error);
    }
    // Silent fail in non-verbose mode
  }
}

/**
 * Track session with manual data (for testing or external integrations)
 */
export async function trackManualSession(data: {
  toolsUsed?: string[];
  commandsRun?: string[];
  filesAccessed?: string[];
  errors?: string[];
  tokens?: {
    startup?: number;
    total?: number;
    tools?: number;
    context?: number;
  };
  duration?: number;
  projectPath?: string;
}): Promise<boolean> {
  const machineId = await getMachineId();
  const projectPath = data.projectPath || process.cwd();
  const projectId = await getProjectId(projectPath);

  const sessionData: Partial<SessionData> = {
    toolsUsed: data.toolsUsed || [],
    commandsRun: data.commandsRun || [],
    filesAccessed: data.filesAccessed || [],
    errors: data.errors || [],
    startupTokens: data.tokens?.startup || 0,
    totalTokens: data.tokens?.total || 0,
    toolTokens: data.tokens?.tools || 0,
    contextTokens: data.tokens?.context || 0,
  };

  const detectedTechs = detectTechnologies(sessionData);
  const detectedPatterns = detectPatterns(sessionData);

  const trackedSession: TrackedSession = {
    machineId,
    projectId,
    projectPath,
    sessionId: generateSessionId(),
    duration: data.duration || 0,
    toolsUsed: sessionData.toolsUsed || [],
    commandsRun: sessionData.commandsRun || [],
    filesAccessed: sessionData.filesAccessed || [],
    errors: sessionData.errors || [],
    startupTokens: sessionData.startupTokens || 0,
    totalTokens: sessionData.totalTokens || 0,
    toolTokens: sessionData.toolTokens || 0,
    contextTokens: sessionData.contextTokens || 0,
    detectedTechs,
    detectedPatterns,
    timestamp: new Date().toISOString(),
  };

  return await sendToServer(trackedSession);
}
