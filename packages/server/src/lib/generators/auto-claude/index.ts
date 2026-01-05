// Auto-Claude Generators Index
// Exports all Auto-Claude generator functions and utilities

// Export from env-file generator
export {
  generateAutoClaudeEnv,
  validateAutoClaudeEnv,
  getDefaultAutoClaudeProjectConfig,
} from './env-file';

// Export from model-profile generator
export {
  generateTaskMetadata,
  validateTaskMetadata,
  getDefaultModelProfile,
  getCostOptimizedModelProfile,
  getQualityFocusedModelProfile,
} from './model-profile';

// Export from prompts generator
export {
  generateAutoClaudePrompts,
  validatePromptContent,
  validatePrompts,
  getDefaultInjectionContext,
  extractInjectionPoints,
} from './prompts';

// Export from agent-configs generator
export {
  generateAgentConfigs,
  validateAgentConfigs,
  validateAgentConfigsExport,
  getDefaultAgentConfigs,
  mergeAgentConfigs,
  getStandardTools,
  getStandardMcpServers,
} from './agent-configs';

// Re-export types for convenience (imported from shared package)
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
} from '../../../../../shared/src/types/auto-claude';