/**
 * Component types supported by CCM
 */
export const ComponentType = {
  MCP_SERVER: 'MCP_SERVER',
  SUBAGENT: 'SUBAGENT',
  SKILL: 'SKILL',
  COMMAND: 'COMMAND',
  HOOK: 'HOOK',
  CLAUDE_MD_TEMPLATE: 'CLAUDE_MD_TEMPLATE',
} as const;

export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

/**
 * Base component interface
 */
export interface Component {
  id: string;
  type: ComponentType;
  name: string;
  description: string;
  config: Record<string, unknown>;
  sourceUrl?: string;
  version?: string;
  tags: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile - a bundle of components
 */
export interface Profile {
  id: string;
  name: string;
  description: string;
  claudeMdTemplate?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project - a tracked project using CCM
 */
export interface Project {
  id: string;
  name: string;
  path: string;
  machine: string;
  profileId?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API response types
 */
export interface ApiError {
  error: string;
  details?: unknown;
}

export interface GenerateRequest {
  profileId: string;
  projectName: string;
  projectDescription?: string;
}

export interface GenerateResponse {
  files: Array<{
    path: string;
    content: string;
  }>;
}

/**
 * Auto-Claude types
 */
export type {
  AutoClaudeAgentConfig,
  AutoClaudePrompt,
  AutoClaudeModelProfile,
  AutoClaudeProjectConfig,
  ThinkingLevel,
  ClaudeModel,
  McpServerType,
  CustomMcpServer,
  AgentMcpOverride,
} from './auto-claude.js';
