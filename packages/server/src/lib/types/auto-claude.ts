/**
 * Auto-Claude component types for CCM integration
 */

/**
 * Thinking levels for Auto-Claude agents
 */
export type ThinkingLevel = 'none' | 'low' | 'medium' | 'high' | 'ultrathink';

/**
 * Supported Claude models
 */
export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

/**
 * MCP server types
 */
export type McpServerType = 'command' | 'http';

/**
 * Auto-Claude agent configuration
 */
export interface AutoClaudeAgentConfig {
  agentType: string;
  tools: string[];
  mcpServers: string[];
  mcpServersOptional: string[];
  autoClaudeTools: string[];
  thinkingDefault: ThinkingLevel;
}

/**
 * Auto-Claude prompt with injection points
 */
export interface AutoClaudePrompt {
  agentType: string;
  promptContent: string;
  injectionPoints: {
    specDirectory?: boolean;
    projectContext?: boolean;
    mcpDocumentation?: boolean;
    [key: string]: boolean | undefined;
  };
}

/**
 * Auto-Claude model profile for phase-specific configurations
 */
export interface AutoClaudeModelProfile {
  name: string;
  description: string;
  phaseModels: {
    spec: ClaudeModel;
    planning: ClaudeModel;
    coding: ClaudeModel;
    qa: ClaudeModel;
  };
  phaseThinking: {
    spec: ThinkingLevel;
    planning: ThinkingLevel;
    coding: ThinkingLevel;
    qa: ThinkingLevel;
  };
}

/**
 * Custom MCP server configuration
 */
export interface CustomMcpServer {
  id: string;
  name: string;
  type: McpServerType;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
}

/**
 * Agent-specific MCP server overrides
 */
export interface AgentMcpOverride {
  add?: string[];
  remove?: string[];
}

/**
 * Auto-Claude project configuration
 */
export interface AutoClaudeProjectConfig {
  context7Enabled: boolean;
  linearMcpEnabled: boolean;
  electronMcpEnabled: boolean;
  puppeteerMcpEnabled: boolean;
  graphitiEnabled: boolean;
  linearApiKey?: string;
  linearTeamId?: string;
  githubToken?: string;
  githubRepo?: string;
  customMcpServers: CustomMcpServer[];
  agentMcpOverrides: Record<string, AgentMcpOverride>;
}