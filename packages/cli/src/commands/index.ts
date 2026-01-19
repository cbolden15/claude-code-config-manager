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

// Track command group (v3.0 session tracking)
export { createTrackCommand } from './track.js';

// Recommendations command group (v3.0 smart recommendations)
export { createRecommendationsCommand } from './recommendations.js';

// Context optimizer command group (v3.1 context optimization)
export { createContextCommand } from './context.js';

// Scheduler command group (v3.2 scheduled automation)
export { createScheduleCommand } from './schedule.js';