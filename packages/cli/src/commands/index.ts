/**
 * CLI Commands - Central export for all command modules
 */

// Core command functions
export { configCommand } from './config.js';
export { listCommand } from './list.js';
export { initCommand } from './init.js';
export { applyCommand } from './apply.js';
export { syncCommand } from './sync.js';

// Auto-Claude command group and main command handler
export {
  createAutoClaudeCommand,
  autoClaudeCommand
} from './auto-claude.js';