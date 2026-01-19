/**
 * CLI Commands - Central export for all command modules
 *
 * Simplified for CCM v4.0 - Smart Recommendations Core
 */

// Config command
export { configCommand } from './config.js';

// Machine command group
export { createMachineCommand } from './machine.js';

// Track command group - Session tracking
export { createTrackCommand } from './track.js';

// Recommendations command group - Smart recommendations
export { createRecommendationsCommand } from './recommendations.js';

// Context optimizer command group - CLAUDE.md optimization
export { createContextCommand } from './context.js';

// Scheduler command group - Scheduled automation
export { createScheduleCommand } from './schedule.js';
