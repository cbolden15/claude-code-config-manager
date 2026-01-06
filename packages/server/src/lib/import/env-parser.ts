import * as fs from 'fs/promises';
import { z } from 'zod';
import { AutoClaudeProjectConfigSchema } from '../../../../shared/src/schemas/auto-claude';
import type { AutoClaudeProjectConfig, CustomMcpServer, AgentMcpOverride } from '../../../../shared/src/types/auto-claude';
import { timeOperation } from '../performance-monitor';

/**
 * Validation schema for parsed env config
 */
const ParsedEnvConfigSchema = z.object({
  projectConfig: AutoClaudeProjectConfigSchema,
});

export interface ParsedEnvConfig {
  projectConfig: AutoClaudeProjectConfig;
}

/**
 * Result interface for .env parsing
 */
export interface EnvParseResult {
  config: ParsedEnvConfig | null;
  errors: string[];
}

/**
 * Parse environment variable content into key-value pairs - optimized version
 */
function parseEnvVars(content: string): Record<string, string> {
  const envVars: Record<string, string> = {};

  // Avoid split() allocation by using indexOf to iterate through lines
  let start = 0;
  let lineNumber = 0;

  while (start < content.length) {
    const end = content.indexOf('\n', start);
    const line = end === -1 ? content.substring(start) : content.substring(start, end);
    lineNumber++;

    // Skip empty lines and comments more efficiently
    const firstChar = line.charAt(0);
    if (line.length === 0 || firstChar === '#' || firstChar === ' ') {
      // Quick check for whitespace-only lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        start = end === -1 ? content.length : end + 1;
        continue;
      }
    }

    // Parse key=value pairs with optimized trimming
    const equalsIndex = line.indexOf('=');
    if (equalsIndex > 0) {
      const key = line.substring(0, equalsIndex).trim();
      const value = line.substring(equalsIndex + 1).trim();
      if (key.length > 0) {
        envVars[key] = value;
      }
    }

    start = end === -1 ? content.length : end + 1;
  }

  return envVars;
}

/**
 * Parse boolean value from environment variable
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse custom MCP servers from environment variables
 */
function parseCustomMcpServers(envVars: Record<string, string>): CustomMcpServer[] {
  const servers: CustomMcpServer[] = [];
  const serverIds = new Set<string>();

  // Find all CUSTOM_MCP_*_TYPE variables to identify server IDs
  for (const key in envVars) {
    const match = key.match(/^CUSTOM_MCP_([A-Z_]+)_TYPE$/);
    if (match) {
      serverIds.add(match[1].toLowerCase());
    }
  }

  // Parse each server configuration
  for (const serverId of serverIds) {
    const prefix = `CUSTOM_MCP_${serverId.toUpperCase()}_`;
    const type = envVars[`${prefix}TYPE`] as 'command' | 'http' | undefined;

    if (!type || (type !== 'command' && type !== 'http')) {
      continue;
    }

    const server: CustomMcpServer = {
      id: serverId,
      name: serverId.replace(/_/g, '-'), // Use ID as name with hyphens
      type,
    };

    if (type === 'command') {
      const command = envVars[`${prefix}COMMAND`];
      if (command) {
        server.command = command;
        const args = envVars[`${prefix}ARGS`];
        if (args) {
          server.args = args.split(' ').filter(arg => arg.trim().length > 0);
        }
      }
    } else if (type === 'http') {
      const url = envVars[`${prefix}URL`];
      if (url) {
        server.url = url;
        const headers = envVars[`${prefix}HEADERS`];
        if (headers) {
          const headerPairs = headers.split(',');
          const headerMap: Record<string, string> = {};
          for (const pair of headerPairs) {
            const [key, value] = pair.split(':');
            if (key && value) {
              headerMap[key.trim()] = value.trim();
            }
          }
          if (Object.keys(headerMap).length > 0) {
            server.headers = headerMap;
          }
        }
      }
    }

    // Only add server if it has the required fields for its type
    if ((type === 'command' && server.command) || (type === 'http' && server.url)) {
      servers.push(server);
    }
  }

  return servers;
}

/**
 * Parse agent MCP overrides from environment variables
 */
function parseAgentMcpOverrides(envVars: Record<string, string>): Record<string, AgentMcpOverride> {
  const overrides: Record<string, AgentMcpOverride> = {};

  for (const key in envVars) {
    const addMatch = key.match(/^AGENT_([A-Z_]+)_MCP_ADD$/);
    const removeMatch = key.match(/^AGENT_([A-Z_]+)_MCP_REMOVE$/);

    if (addMatch) {
      const agentType = addMatch[1].toLowerCase();
      if (!overrides[agentType]) {
        overrides[agentType] = {};
      }
      overrides[agentType].add = envVars[key].split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    if (removeMatch) {
      const agentType = removeMatch[1].toLowerCase();
      if (!overrides[agentType]) {
        overrides[agentType] = {};
      }
      overrides[agentType].remove = envVars[key].split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
  }

  return overrides;
}

/**
 * Convert parsed environment variables to AutoClaudeProjectConfig format
 */
function convertToProjectConfig(envVars: Record<string, string>): AutoClaudeProjectConfig | null {
  try {
    const projectConfig: AutoClaudeProjectConfig = {
      // MCP toggles
      context7Enabled: parseBooleanEnv(envVars.CONTEXT7_ENABLED, true),
      linearMcpEnabled: parseBooleanEnv(envVars.LINEAR_MCP_ENABLED, false),
      electronMcpEnabled: parseBooleanEnv(envVars.ELECTRON_MCP_ENABLED, false),
      puppeteerMcpEnabled: parseBooleanEnv(envVars.PUPPETEER_MCP_ENABLED, false),
      graphitiEnabled: parseBooleanEnv(envVars.GRAPHITI_ENABLED, false),
    };

    // Integration settings (only include if present)
    if (envVars.LINEAR_API_KEY) {
      projectConfig.linearApiKey = envVars.LINEAR_API_KEY;
    }
    if (envVars.LINEAR_TEAM_ID) {
      projectConfig.linearTeamId = envVars.LINEAR_TEAM_ID;
    }
    if (envVars.GITHUB_TOKEN) {
      projectConfig.githubToken = envVars.GITHUB_TOKEN;
    }
    if (envVars.GITHUB_REPO) {
      projectConfig.githubRepo = envVars.GITHUB_REPO;
    }

    // Custom MCP servers
    const customServers = parseCustomMcpServers(envVars);
    if (customServers.length > 0) {
      projectConfig.customMcpServers = customServers;
    }

    // Agent MCP overrides
    const mcpOverrides = parseAgentMcpOverrides(envVars);
    if (Object.keys(mcpOverrides).length > 0) {
      projectConfig.agentMcpOverrides = mcpOverrides;
    }

    // Validate the config using Zod schema
    return AutoClaudeProjectConfigSchema.parse(projectConfig);
  } catch (error) {
    // Silently return null on validation errors - errors will be tracked by caller
    return null;
  }
}

/**
 * Parse .auto-claude/.env file to extract project configuration settings
 */
export async function parseEnvFile(envPath: string): Promise<EnvParseResult> {
  const { result } = await timeOperation(
    'env file parsing',
    async () => {
      const result: EnvParseResult = {
        config: null,
        errors: [],
      };

      try {
        // Read the file
        const content = await fs.readFile(envPath, 'utf-8');

        if (content.trim().length === 0) {
          result.errors.push('Environment file is empty');
          return result;
        }

        // Parse environment variables
        const envVars = parseEnvVars(content);

        if (Object.keys(envVars).length === 0) {
          result.errors.push('No environment variables found in file');
          return result;
        }

        // Convert to project config
        const projectConfig = convertToProjectConfig(envVars);

        if (!projectConfig) {
          result.errors.push('Failed to parse environment variables: Invalid configuration structure or validation failed');
          return result;
        }

        result.config = { projectConfig };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to read or parse .env file: ${errorMessage}`);
      }

      return result;
    },
    1, // 1 file processed
    undefined // errors will be set from result
  );

  return result;
}

/**
 * Validation function for the parsed results
 */
export function validateParsedEnvConfig(config: ParsedEnvConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    ParsedEnvConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    } else {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default env configuration for testing or fallback
 */
export function getDefaultEnvConfig(): ParsedEnvConfig {
  return {
    projectConfig: {
      context7Enabled: true,
      linearMcpEnabled: false,
      electronMcpEnabled: false,
      puppeteerMcpEnabled: false,
      graphitiEnabled: false,
    },
  };
}

/**
 * Extract environment variables that are not part of project config but should be preserved
 * Useful for maintaining settings like ANTHROPIC_API_KEY during import/sync operations
 */
export function extractNonConfigEnvVars(envVars: Record<string, string>): Record<string, string> {
  const nonConfigVars: Record<string, string> = {};

  // List of variables that are not part of AutoClaudeProjectConfig but should be preserved
  const preservedVars = [
    'ANTHROPIC_API_KEY',
    'AUTO_CLAUDE_ENABLED',
    'AUTO_CLAUDE_DEBUG',
    'AUTO_CLAUDE_LOG_LEVEL',
  ];

  for (const key of preservedVars) {
    if (envVars[key]) {
      nonConfigVars[key] = envVars[key];
    }
  }

  return nonConfigVars;
}

/**
 * Parse environment file content directly (without file system access)
 * Useful for testing or when content is already available
 */
export function parseEnvContent(content: string): EnvParseResult {
  const result: EnvParseResult = {
    config: null,
    errors: [],
  };

  try {
    if (content.trim().length === 0) {
      result.errors.push('Environment content is empty');
      return result;
    }

    // Parse environment variables
    const envVars = parseEnvVars(content);

    if (Object.keys(envVars).length === 0) {
      result.errors.push('No environment variables found in content');
      return result;
    }

    // Convert to project config
    const projectConfig = convertToProjectConfig(envVars);

    if (!projectConfig) {
      result.errors.push('Failed to parse environment variables: Invalid configuration structure or validation failed');
      return result;
    }

    result.config = { projectConfig };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Failed to parse environment content: ${errorMessage}`);
  }

  return result;
}