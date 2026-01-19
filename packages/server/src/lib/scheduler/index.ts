/**
 * Scheduler Module for CCM v3.2
 *
 * Automated scheduling system for context optimization with threshold-based
 * triggers and webhook notifications.
 *
 * @module scheduler
 *
 * @example
 * ```typescript
 * import { scheduler, startScheduler, stopScheduler } from '@/lib/scheduler';
 *
 * // Start the scheduler
 * await startScheduler();
 *
 * // Manually trigger a task
 * await scheduler.triggerTask('task-id');
 *
 * // Get scheduler status
 * const status = scheduler.getStatus();
 *
 * // Stop the scheduler
 * await stopScheduler();
 * ```
 */

// Re-export types and functions from submodules
export * from './triggers';
export * from './webhooks';
export * from './task-handlers';
export * from './runner';

// Import for singleton
import { SchedulerRunner, createScheduler, type SchedulerConfig } from './runner';

// Singleton scheduler instance
let schedulerInstance: SchedulerRunner | null = null;

/**
 * Get or create the singleton scheduler instance
 *
 * @param config - Optional configuration (only used on first call)
 * @returns Scheduler instance
 */
export function getScheduler(config?: Partial<SchedulerConfig>): SchedulerRunner {
  if (!schedulerInstance) {
    schedulerInstance = createScheduler(config);
  }
  return schedulerInstance;
}

/**
 * Convenience alias for getScheduler
 */
export const scheduler = {
  /**
   * Get the scheduler instance
   */
  get instance(): SchedulerRunner {
    return getScheduler();
  },

  /**
   * Get scheduler status
   */
  getStatus() {
    return getScheduler().getStatus();
  },

  /**
   * Start the scheduler
   */
  async start() {
    return getScheduler().start();
  },

  /**
   * Stop the scheduler
   */
  async stop() {
    return getScheduler().stop();
  },

  /**
   * Manually trigger a task
   */
  async triggerTask(taskId: string) {
    return getScheduler().triggerTask(taskId);
  },

  /**
   * Get upcoming tasks
   */
  async getUpcomingTasks(hours?: number) {
    return getScheduler().getUpcomingTasks(hours);
  },

  /**
   * Refresh next run times
   */
  async refreshNextRunTimes() {
    return getScheduler().refreshNextRunTimes();
  },

  /**
   * Update a threshold watcher
   */
  async updateThresholdWatcher(taskId: string) {
    return getScheduler().updateThresholdWatcher(taskId);
  },

  /**
   * Test a webhook
   */
  async testWebhook(webhookId: string) {
    return getScheduler().testWebhook(webhookId);
  },
};

/**
 * Start the scheduler
 *
 * Convenience function to start the singleton scheduler.
 *
 * @param config - Optional configuration
 */
export async function startScheduler(config?: Partial<SchedulerConfig>): Promise<void> {
  const instance = getScheduler(config);
  await instance.start();
}

/**
 * Stop the scheduler
 *
 * Convenience function to stop the singleton scheduler.
 */
export async function stopScheduler(): Promise<void> {
  if (schedulerInstance) {
    await schedulerInstance.stop();
  }
}

/**
 * Reset the scheduler instance (mainly for testing)
 */
export function resetScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop().catch(console.error);
    schedulerInstance = null;
  }
}

/**
 * Quick setup presets for common scheduling patterns
 */
export const QUICK_SETUP_TASKS = {
  'daily-analysis': {
    name: 'Daily Context Analysis',
    taskType: 'analyze',
    scheduleType: 'cron',
    cronExpression: '0 9 * * *', // 9 AM daily
    taskConfig: JSON.stringify({ includeHealthScore: true }),
    notifyOnFailure: true,
    notifyOnSuccess: false,
  },
  'weekly-optimize': {
    name: 'Weekly Optimization',
    taskType: 'optimize',
    scheduleType: 'cron',
    cronExpression: '0 8 * * 1', // Monday 8 AM
    taskConfig: JSON.stringify({ strategy: 'moderate', dryRun: false }),
    notifyOnSuccess: true,
    notifyOnFailure: true,
  },
  'threshold-alert': {
    name: 'Low Score Alert',
    taskType: 'analyze',
    scheduleType: 'threshold',
    thresholdMetric: 'optimization_score',
    thresholdOperator: 'lt',
    thresholdValue: 60,
    taskConfig: JSON.stringify({ alertOnly: true }),
    notifyOnSuccess: true, // Alert when threshold triggered
    notifyOnFailure: true,
  },
  'monthly-health': {
    name: 'Monthly Health Report',
    taskType: 'health_check',
    scheduleType: 'cron',
    cronExpression: '0 8 1 * *', // 1st of month at 8 AM
    taskConfig: JSON.stringify({ includeRecommendations: true, alertThreshold: 50 }),
    notifyOnSuccess: true,
    notifyOnFailure: true,
  },
} as const;

/**
 * Task type descriptions for UI display
 */
export const TASK_TYPE_INFO = {
  analyze: {
    name: 'Analyze',
    description: 'Analyze CLAUDE.md files and detect optimization opportunities',
    icon: '🔍',
  },
  optimize: {
    name: 'Optimize',
    description: 'Apply optimization strategies to reduce context size',
    icon: '✨',
  },
  health_check: {
    name: 'Health Check',
    description: 'Generate health reports and track trends over time',
    icon: '📊',
  },
  custom: {
    name: 'Custom',
    description: 'Custom task with user-defined behavior',
    icon: '⚙️',
  },
} as const;

/**
 * Schedule type descriptions for UI display
 */
export const SCHEDULE_TYPE_INFO = {
  cron: {
    name: 'Cron Schedule',
    description: 'Run at specific times using cron syntax',
    example: '0 9 * * * (9 AM daily)',
  },
  interval: {
    name: 'Interval',
    description: 'Run every N minutes',
    example: '1440 (every 24 hours)',
  },
  threshold: {
    name: 'Threshold Trigger',
    description: 'Run when a metric crosses a threshold',
    example: 'Score < 60',
  },
  manual: {
    name: 'Manual Only',
    description: 'Only run when manually triggered',
    example: 'Triggered via API or CLI',
  },
} as const;

/**
 * Webhook type descriptions for UI display
 */
export const WEBHOOK_TYPE_INFO = {
  slack: {
    name: 'Slack',
    description: 'Rich message blocks with formatting',
    icon: '💬',
  },
  discord: {
    name: 'Discord',
    description: 'Embed messages with colors',
    icon: '🎮',
  },
  n8n: {
    name: 'n8n',
    description: 'Workflow automation trigger',
    icon: '⚡',
  },
  generic: {
    name: 'Generic',
    description: 'Standard JSON POST to any URL',
    icon: '🌐',
  },
} as const;

/**
 * Initialize the scheduler with server configuration
 *
 * Call this during server startup to configure and start the scheduler.
 *
 * @param baseUrl - Base URL for webhook links (e.g., "http://localhost:3000")
 * @param autoStart - Whether to automatically start the scheduler (default: true)
 */
export async function initializeScheduler(
  baseUrl: string = '',
  autoStart: boolean = true
): Promise<SchedulerRunner> {
  const instance = getScheduler({ baseUrl });

  if (autoStart) {
    await instance.start();
  }

  // Refresh next run times for existing tasks
  await instance.refreshNextRunTimes();

  return instance;
}
