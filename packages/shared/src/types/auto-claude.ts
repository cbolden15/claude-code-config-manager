/**
 * Auto-Claude component types for CCM integration
 */

/**
 * Thinking levels for Auto-Claude agents
 */
export type ThinkingLevel = 'none' | 'low' | 'medium' | 'high' | 'ultrathink';

/**
 * Claude model types for Auto-Claude
 */
export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

/**
 * MCP server type definitions
 */
export type McpServerType = 'command' | 'http';

/**
 * Auto-Claude agent configuration
 * Defines per-agent tool and MCP access configuration
 */
export interface AutoClaudeAgentConfig {
  agentType: string;              // e.g., "coder", "planner", "qa_reviewer"
  tools: string[];                // ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
  mcpServers: string[];           // Required MCP servers
  mcpServersOptional: string[];   // Conditional MCP servers
  autoClaudeTools: string[];      // Custom auto-claude tools
  thinkingDefault: ThinkingLevel;
}

/**
 * Auto-Claude prompt configuration
 * Stores agent persona prompts
 */
export interface AutoClaudePrompt {
  agentType: string;              // Matches agent config
  promptContent: string;          // Full markdown content
  injectionPoints?: {             // Dynamic content markers
    specDirectory: boolean;
    projectContext: boolean;
    mcpDocumentation: boolean;
  };
}

/**
 * Auto-Claude model profile
 * Defines model and thinking configuration per phase
 */
export interface AutoClaudeModelProfile {
  name: string;  // e.g., "cost-optimized", "quality-focused"
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
 * Custom MCP server definition
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
 * Per-agent MCP override configuration
 */
export interface AgentMcpOverride {
  add?: string[];
  remove?: string[];
}

/**
 * Auto-Claude project configuration
 * Stores project-level Auto-Claude settings
 */
export interface AutoClaudeProjectConfig {
  // MCP toggles
  context7Enabled: boolean;
  linearMcpEnabled: boolean;
  electronMcpEnabled: boolean;
  puppeteerMcpEnabled: boolean;
  graphitiEnabled: boolean;

  // Per-agent MCP overrides
  agentMcpOverrides?: {
    [agentType: string]: AgentMcpOverride;
  };

  // Custom MCP servers
  customMcpServers?: CustomMcpServer[];

  // Integration settings
  linearApiKey?: string;
  linearTeamId?: string;
  githubToken?: string;
  githubRepo?: string;
}