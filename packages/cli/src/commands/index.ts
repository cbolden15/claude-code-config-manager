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
  autoClaudeMainCommand
} from './auto-claude.js';

// Settings command groups
export { createSettingsCommand } from './settings.js';
export { createEnvCommand } from './settings-env.js';
export { createSettingsHooksCommand } from './settings-hooks.js';

// Machine command group
export { createMachineCommand } from './machine.js';

// Desktop command group
export { createDesktopCommand } from './desktop.js';