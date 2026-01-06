import { z } from 'zod';

/**
 * Auto-Claude component validation schemas using Zod
 */

/**
 * Thinking levels for Auto-Claude agents
 */
export const ThinkingLevelSchema = z.enum(['none', 'low', 'medium', 'high', 'ultrathink']);

/**
 * Claude model types for Auto-Claude
 */
export const ClaudeModelSchema = z.enum(['opus', 'sonnet', 'haiku']);

/**
 * MCP server type definitions
 */
export const McpServerTypeSchema = z.enum(['command', 'http']);

/**
 * Custom MCP server definition schema
 */
export const CustomMcpServerSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  type: McpServerTypeSchema,
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url('Must be a valid URL').optional(),
  headers: z.record(z.string()).optional(),
}).refine((data) => {
  // Command type must have command field
  if (data.type === 'command' && !data.command) {
    return false;
  }
  // HTTP type must have url field
  if (data.type === 'http' && !data.url) {
    return false;
  }
  return true;
}, {
  message: 'Command type requires command field, HTTP type requires url field',
});

/**
 * Per-agent MCP override configuration schema
 */
export const AgentMcpOverrideSchema = z.object({
  add: z.array(z.string()).optional(),
  remove: z.array(z.string()).optional(),
}).refine((data) => {
  // At least one of add or remove must be provided
  return data.add !== undefined || data.remove !== undefined;
}, {
  message: 'At least one of add or remove must be specified',
});

/**
 * Auto-Claude agent configuration schema
 * Defines per-agent tool and MCP access configuration
 */
export const AutoClaudeAgentConfigSchema = z.object({
  agentType: z.string()
    .min(1, 'Agent type is required')
    .regex(/^[a-z_]+$/, 'Agent type must be lowercase with underscores only'),
  tools: z.array(z.string())
    .min(1, 'At least one tool must be specified')
    .refine((tools) => {
      // Validate known tools
      const knownTools = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Task', 'WebFetch', 'WebSearch'];
      return tools.every(tool => knownTools.includes(tool));
    }, {
      message: 'All tools must be from the known tools list',
    }),
  mcpServers: z.array(z.string()).default([]),
  mcpServersOptional: z.array(z.string()).default([]),
  autoClaudeTools: z.array(z.string()).default([]),
  thinkingDefault: ThinkingLevelSchema,
});

/**
 * Auto-Claude prompt configuration schema
 * Stores agent persona prompts
 */
export const AutoClaudePromptSchema = z.object({
  agentType: z.string()
    .min(1, 'Agent type is required')
    .regex(/^[a-z_]+$/, 'Agent type must be lowercase with underscores only'),
  promptContent: z.string()
    .min(10, 'Prompt content must be at least 10 characters')
    .max(50000, 'Prompt content cannot exceed 50,000 characters'),
  injectionPoints: z.object({
    specDirectory: z.boolean().default(false),
    projectContext: z.boolean().default(false),
    mcpDocumentation: z.boolean().default(false),
  }).optional(),
});

/**
 * Auto-Claude model profile schema
 * Defines model and thinking configuration per phase
 */
export const AutoClaudeModelProfileSchema = z.object({
  name: z.string()
    .min(1, 'Profile name is required')
    .max(50, 'Profile name cannot exceed 50 characters')
    .regex(/^[a-z0-9_-]+$/, 'Profile name must be lowercase alphanumeric with hyphens/underscores'),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description cannot exceed 500 characters'),
  phaseModels: z.object({
    spec: ClaudeModelSchema,
    planning: ClaudeModelSchema,
    coding: ClaudeModelSchema,
    qa: ClaudeModelSchema,
  }),
  phaseThinking: z.object({
    spec: ThinkingLevelSchema,
    planning: ThinkingLevelSchema,
    coding: ThinkingLevelSchema,
    qa: ThinkingLevelSchema,
  }),
});

/**
 * Auto-Claude project configuration schema
 * Stores project-level Auto-Claude settings
 */
export const AutoClaudeProjectConfigSchema = z.object({
  // MCP toggles
  context7Enabled: z.boolean().default(true),
  linearMcpEnabled: z.boolean().default(false),
  electronMcpEnabled: z.boolean().default(false),
  puppeteerMcpEnabled: z.boolean().default(false),
  graphitiEnabled: z.boolean().default(false),

  // Per-agent MCP overrides
  agentMcpOverrides: z.record(z.string(), AgentMcpOverrideSchema).optional(),

  // Custom MCP servers
  customMcpServers: z.array(CustomMcpServerSchema).default([]),

  // Integration settings (encrypted when stored)
  linearApiKey: z.string().optional(),
  linearTeamId: z.string().optional(),
  githubToken: z.string().optional(),
  githubRepo: z.string()
    .regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'GitHub repo must be in format "owner/repo"')
    .optional(),
}).refine((data) => {
  // If linear is enabled, require API key and team ID
  if (data.linearMcpEnabled && (!data.linearApiKey || !data.linearTeamId)) {
    return false;
  }
  return true;
}, {
  message: 'Linear MCP requires both API key and team ID when enabled',
});

/**
 * Type inference helpers
 */
export type AutoClaudeAgentConfigSchemaType = z.infer<typeof AutoClaudeAgentConfigSchema>;
export type AutoClaudePromptSchemaType = z.infer<typeof AutoClaudePromptSchema>;
export type AutoClaudeModelProfileSchemaType = z.infer<typeof AutoClaudeModelProfileSchema>;
export type AutoClaudeProjectConfigSchemaType = z.infer<typeof AutoClaudeProjectConfigSchema>;
export type CustomMcpServerSchemaType = z.infer<typeof CustomMcpServerSchema>;
export type AgentMcpOverrideSchemaType = z.infer<typeof AgentMcpOverrideSchema>;