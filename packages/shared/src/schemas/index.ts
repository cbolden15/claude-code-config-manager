/**
 * Validation schemas for all CCM components
 */

// Auto-Claude schemas
export {
  ThinkingLevelSchema,
  ClaudeModelSchema,
  McpServerTypeSchema,
  CustomMcpServerSchema,
  AgentMcpOverrideSchema,
  AutoClaudeAgentConfigSchema,
  AutoClaudePromptSchema,
  AutoClaudeModelProfileSchema,
  AutoClaudeProjectConfigSchema,
  // Type inference helpers
  type AutoClaudeAgentConfigSchemaType,
  type AutoClaudePromptSchemaType,
  type AutoClaudeModelProfileSchemaType,
  type AutoClaudeProjectConfigSchemaType,
  type CustomMcpServerSchemaType,
  type AgentMcpOverrideSchemaType,
} from './auto-claude.js';