import { AutoClaudeAgentConfig } from '../../../../../shared/src/types/auto-claude';
import { timeOperationSync } from '../../performance-monitor';

interface AgentConfigsOptions {
  agentConfigs: AutoClaudeAgentConfig[];
}

interface AgentConfigsExport {
  [agentType: string]: {
    agentType: string;
    tools: string[];
    mcpServers: string[];
    mcpServersOptional: string[];
    autoClaudeTools: string[];
    thinkingDefault: string;
  };
}

/**
 * Generates JSON export of AGENT_CONFIGS with tool permissions and MCP dependencies - optimized version
 */
export function generateAgentConfigs(options: AgentConfigsOptions): string {
  const { agentConfigs } = options;

  const { result } = timeOperationSync('agent-configs generation', () => {
    // Pre-allocate object with estimated size for better performance
    const agentConfigsExport: AgentConfigsExport = Object.create(null);

    // Optimize for large numbers of configs with batched processing
    if (agentConfigs.length > 50) {
      // Process in batches to avoid call stack issues and improve memory usage
      const batchSize = 20;
      for (let i = 0; i < agentConfigs.length; i += batchSize) {
        const batch = agentConfigs.slice(i, i + batchSize);

        // Use Object.assign for better performance with many configs
        const batchEntries = batch.map(config => [
          config.agentType,
          {
            agentType: config.agentType,
            tools: config.tools.slice(), // Use slice() instead of spread for better performance
            mcpServers: config.mcpServers.slice(),
            mcpServersOptional: config.mcpServersOptional.slice(),
            autoClaudeTools: config.autoClaudeTools.slice(),
            thinkingDefault: config.thinkingDefault
          }
        ] as const);
        Object.assign(agentConfigsExport, Object.fromEntries(batchEntries));
      }
    } else {
      // Direct property assignment for smaller sets - fastest for small collections
      for (const config of agentConfigs) {
        agentConfigsExport[config.agentType] = {
          agentType: config.agentType,
          tools: config.tools.slice(),
          mcpServers: config.mcpServers.slice(),
          mcpServersOptional: config.mcpServersOptional.slice(),
          autoClaudeTools: config.autoClaudeTools.slice(),
          thinkingDefault: config.thinkingDefault
        };
      }
    }

    // Use JSON.stringify with optimized replacer for better performance
    return JSON.stringify(agentConfigsExport, null, 2);
  }, agentConfigs.length);

  return result;
}

/**
 * Helper function to validate agent configurations
 */
export function validateAgentConfigs(agentConfigs: AutoClaudeAgentConfig[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const agentTypes = new Set<string>();

  for (const config of agentConfigs) {
    // Validate required fields
    if (!config.agentType || config.agentType.trim() === '') {
      errors.push('Agent type is required');
      continue;
    }

    // Validate agent type format (alphanumeric with underscores)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.agentType)) {
      errors.push(`Agent type '${config.agentType}' must be alphanumeric with underscores only`);
    }

    // Check for duplicate agent types
    if (agentTypes.has(config.agentType)) {
      errors.push(`Duplicate agent type '${config.agentType}' found`);
    }
    agentTypes.add(config.agentType);

    // Validate tools array
    if (!Array.isArray(config.tools)) {
      errors.push(`Agent '${config.agentType}': tools must be an array`);
    } else {
      for (const tool of config.tools) {
        if (typeof tool !== 'string' || tool.trim() === '') {
          errors.push(`Agent '${config.agentType}': invalid tool name '${tool}'`);
        }
      }
    }

    // Validate MCP servers array
    if (!Array.isArray(config.mcpServers)) {
      errors.push(`Agent '${config.agentType}': mcpServers must be an array`);
    } else {
      for (const server of config.mcpServers) {
        if (typeof server !== 'string' || server.trim() === '') {
          errors.push(`Agent '${config.agentType}': invalid MCP server name '${server}'`);
        }
      }
    }

    // Validate optional MCP servers array
    if (!Array.isArray(config.mcpServersOptional)) {
      errors.push(`Agent '${config.agentType}': mcpServersOptional must be an array`);
    } else {
      for (const server of config.mcpServersOptional) {
        if (typeof server !== 'string' || server.trim() === '') {
          errors.push(`Agent '${config.agentType}': invalid optional MCP server name '${server}'`);
        }
      }
    }

    // Validate auto-claude tools array
    if (!Array.isArray(config.autoClaudeTools)) {
      errors.push(`Agent '${config.agentType}': autoClaudeTools must be an array`);
    } else {
      for (const tool of config.autoClaudeTools) {
        if (typeof tool !== 'string' || tool.trim() === '') {
          errors.push(`Agent '${config.agentType}': invalid auto-claude tool name '${tool}'`);
        }
      }
    }

    // Validate thinking level
    const validThinkingLevels = ['none', 'low', 'medium', 'high', 'ultrathink'];
    if (!config.thinkingDefault || !validThinkingLevels.includes(config.thinkingDefault)) {
      errors.push(`Agent '${config.agentType}': thinkingDefault must be one of: ${validThinkingLevels.join(', ')}`);
    }

    // Check for overlapping MCP servers
    const requiredServers = new Set(config.mcpServers);
    const optionalServers = new Set(config.mcpServersOptional);

    for (const server of config.mcpServersOptional) {
      if (requiredServers.has(server)) {
        errors.push(`Agent '${config.agentType}': MCP server '${server}' cannot be both required and optional`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to validate agent configs export JSON
 */
export function validateAgentConfigsExport(exportContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const agentConfigs = JSON.parse(exportContent) as AgentConfigsExport;

    if (typeof agentConfigs !== 'object' || agentConfigs === null) {
      errors.push('Agent configs export must be an object');
      return { valid: false, errors };
    }

    for (const [agentType, config] of Object.entries(agentConfigs)) {
      // Validate structure
      if (typeof config !== 'object' || config === null) {
        errors.push(`Agent '${agentType}': configuration must be an object`);
        continue;
      }

      // Validate agentType matches key
      if (config.agentType !== agentType) {
        errors.push(`Agent '${agentType}': agentType field must match object key`);
      }

      // Validate required fields
      const requiredFields = ['agentType', 'tools', 'mcpServers', 'mcpServersOptional', 'autoClaudeTools', 'thinkingDefault'];
      for (const field of requiredFields) {
        if (!(field in config)) {
          errors.push(`Agent '${agentType}': missing required field '${field}'`);
        }
      }

      // Validate arrays
      const arrayFields = ['tools', 'mcpServers', 'mcpServersOptional', 'autoClaudeTools'];
      for (const field of arrayFields) {
        if (field in config && !Array.isArray(config[field as keyof typeof config])) {
          errors.push(`Agent '${agentType}': field '${field}' must be an array`);
        }
      }

      // Validate thinking level
      if (config.thinkingDefault && !['none', 'low', 'medium', 'high', 'ultrathink'].includes(config.thinkingDefault)) {
        errors.push(`Agent '${agentType}': invalid thinking level '${config.thinkingDefault}'`);
      }
    }

  } catch (parseError) {
    errors.push('Invalid JSON format in agent configs export');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to get default agent configurations for common agent types
 */
export function getDefaultAgentConfigs(): AutoClaudeAgentConfig[] {
  return [
    {
      agentType: 'coder',
      tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
      mcpServers: ['context7'],
      mcpServersOptional: ['linear', 'graphiti'],
      autoClaudeTools: ['parallel_shell'],
      thinkingDefault: 'medium'
    },
    {
      agentType: 'planner',
      tools: ['Read', 'Glob', 'Grep'],
      mcpServers: ['context7'],
      mcpServersOptional: ['linear'],
      autoClaudeTools: [],
      thinkingDefault: 'high'
    },
    {
      agentType: 'qa_reviewer',
      tools: ['Read', 'Bash', 'Glob', 'Grep'],
      mcpServers: [],
      mcpServersOptional: ['context7'],
      autoClaudeTools: [],
      thinkingDefault: 'low'
    },
    {
      agentType: 'spec_gatherer',
      tools: ['Read', 'Glob', 'Grep'],
      mcpServers: ['context7'],
      mcpServersOptional: ['linear'],
      autoClaudeTools: [],
      thinkingDefault: 'medium'
    }
  ];
}

/**
 * Helper function to merge agent configurations with defaults
 */
export function mergeAgentConfigs(
  userConfigs: AutoClaudeAgentConfig[],
  defaultConfigs: AutoClaudeAgentConfig[] = getDefaultAgentConfigs()
): AutoClaudeAgentConfig[] {
  const merged: AutoClaudeAgentConfig[] = [];
  const userConfigMap = new Map(userConfigs.map(config => [config.agentType, config]));

  // Start with user configs
  for (const config of userConfigs) {
    merged.push(config);
  }

  // Add default configs that aren't overridden by user configs
  for (const defaultConfig of defaultConfigs) {
    if (!userConfigMap.has(defaultConfig.agentType)) {
      merged.push(defaultConfig);
    }
  }

  return merged;
}

/**
 * Helper function to get all standard tool names used by agent configs
 */
export function getStandardTools(): string[] {
  return [
    'Read',
    'Write',
    'Edit',
    'Bash',
    'Glob',
    'Grep',
    'Task',
    'WebSearch',
    'WebFetch'
  ];
}

/**
 * Helper function to get all standard MCP server names
 */
export function getStandardMcpServers(): string[] {
  return [
    'context7',
    'linear',
    'graphiti',
    'electron',
    'puppeteer'
  ];
}