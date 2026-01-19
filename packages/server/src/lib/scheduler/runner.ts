/**
 * Scheduler Runner for CCM v3.2
 *
 * Background scheduler that manages task execution:
 * - Periodically checks for due tasks
 * - Manages concurrent execution limits
 * - Handles retries on failure
 * - Sends webhook notifications
 *
 * @module scheduler/runner
 */

import { prisma } from '@/lib/db';
import { calculateNextRun, isTaskDue, TriggerEvaluator } from './triggers';
import { executeTask, getAverageMetricValue, type TaskResult } from './task-handlers';
import {
  WebhookNotifier,
  createTaskStartedPayload,
  createTaskCompletedPayload,
  createTaskFailedPayload,
  createThresholdTriggeredPayload,
  type WebhookConfig,
  type WebhookEventType,
} from './webhooks';

// Scheduler configuration
export interface SchedulerConfig {
  /** How often to check for due tasks (default: 60000ms = 1 minute) */
  checkIntervalMs: number;
  /** Maximum parallel task executions (default: 3) */
  maxConcurrentTasks: number;
  /** Maximum time for a single task (default: 300000ms = 5 minutes) */
  taskTimeoutMs: number;
  /** Number of retry attempts on failure (default: 2) */
  retryAttempts: number;
  /** Base URL for webhook links (default: '') */
  baseUrl: string;
  /** Enable threshold watchers (default: true) */
  enableThresholdWatchers: boolean;
}

// Default configuration
const DEFAULT_CONFIG: SchedulerConfig = {
  checkIntervalMs: 60000, // 1 minute
  maxConcurrentTasks: 3,
  taskTimeoutMs: 300000, // 5 minutes
  retryAttempts: 2,
  baseUrl: '',
  enableThresholdWatchers: true,
};

// Scheduled task interface (matches Prisma model)
interface ScheduledTask {
  id: string;
  machineId: string | null;
  name: string;
  description: string | null;
  taskType: string;
  scheduleType: string;
  cronExpression: string | null;
  intervalMinutes: number | null;
  thresholdMetric: string | null;
  thresholdOperator: string | null;
  thresholdValue: number | null;
  projectFilter: string | null;
  taskConfig: string;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  webhookIds: string | null;
  enabled: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}

// Execution status
type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Scheduler Runner class
 *
 * Manages the background scheduler loop and task execution.
 */
export class SchedulerRunner {
  private config: SchedulerConfig;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private activeTasks: Set<string> = new Set();
  private webhookNotifier: WebhookNotifier;
  private triggerEvaluator: TriggerEvaluator;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.webhookNotifier = new WebhookNotifier(this.config.baseUrl);
    this.triggerEvaluator = new TriggerEvaluator(this.config.checkIntervalMs);
  }

  /**
   * Get current scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    activeTasks: number;
    config: SchedulerConfig;
  } {
    return {
      isRunning: this.isRunning,
      activeTasks: this.activeTasks.size,
      config: this.config,
    };
  }

  /**
   * Start the scheduler
   *
   * Begins the periodic check loop and sets up threshold watchers.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting scheduler...');
    this.isRunning = true;

    // Set up threshold watchers for threshold-type tasks
    if (this.config.enableThresholdWatchers) {
      await this.setupThresholdWatchers();
    }

    // Start the main check loop
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkDueTasks();
      } catch (error) {
        console.error('Error in scheduler check loop:', error);
      }
    }, this.config.checkIntervalMs);

    // Run initial check
    await this.checkDueTasks();

    console.log(`Scheduler started (check interval: ${this.config.checkIntervalMs}ms)`);
  }

  /**
   * Stop the scheduler
   *
   * Stops the check loop and cleans up threshold watchers.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    console.log('Stopping scheduler...');
    this.isRunning = false;

    // Clear the check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Stop threshold watchers
    this.triggerEvaluator.stopAllWatchers();

    // Wait for active tasks to complete (with timeout)
    const waitStart = Date.now();
    while (this.activeTasks.size > 0 && Date.now() - waitStart < 30000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.activeTasks.size > 0) {
      console.warn(`Scheduler stopped with ${this.activeTasks.size} active tasks`);
    }

    console.log('Scheduler stopped');
  }

  /**
   * Set up threshold watchers for threshold-type tasks
   */
  private async setupThresholdWatchers(): Promise<void> {
    const thresholdTasks = await prisma.scheduledTask.findMany({
      where: {
        enabled: true,
        scheduleType: 'threshold',
      },
    });

    for (const task of thresholdTasks) {
      this.registerThresholdWatcher(task as ScheduledTask);
    }

    console.log(`Registered ${thresholdTasks.length} threshold watchers`);
  }

  /**
   * Register a threshold watcher for a task
   */
  private registerThresholdWatcher(task: ScheduledTask): void {
    if (!task.thresholdMetric || !task.machineId) return;

    const metric = task.thresholdMetric;
    const machineId = task.machineId;

    this.triggerEvaluator.registerThresholdWatcher(
      task,
      () => getAverageMetricValue(metric, machineId),
      async () => {
        console.log(`Threshold triggered for task ${task.id} (${task.name})`);
        await this.executeTask(task, 'threshold');
      }
    );
  }

  /**
   * Check for due tasks and execute them
   */
  async checkDueTasks(): Promise<void> {
    if (!this.isRunning) return;

    // Check if we're at capacity
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      console.log(
        `At capacity (${this.activeTasks.size}/${this.config.maxConcurrentTasks}), skipping check`
      );
      return;
    }

    const now = new Date();

    // Find due tasks
    const dueTasks = await prisma.scheduledTask.findMany({
      where: {
        enabled: true,
        scheduleType: { in: ['cron', 'interval'] },
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: 'asc' },
      take: this.config.maxConcurrentTasks - this.activeTasks.size,
    });

    if (dueTasks.length > 0) {
      console.log(`Found ${dueTasks.length} due tasks`);
    }

    // Execute due tasks
    for (const task of dueTasks) {
      if (!this.activeTasks.has(task.id)) {
        // Don't await - run in background
        this.executeTask(task as ScheduledTask, 'scheduled').catch((error) => {
          console.error(`Error executing task ${task.id}:`, error);
        });
      }
    }
  }

  /**
   * Execute a scheduled task
   *
   * @param task - Task to execute
   * @param triggerType - What triggered the execution
   */
  async executeTask(
    task: ScheduledTask,
    triggerType: 'scheduled' | 'threshold' | 'manual' | 'api' = 'scheduled'
  ): Promise<string> {
    // Check if task is already running
    if (this.activeTasks.has(task.id)) {
      console.log(`Task ${task.id} is already running, skipping`);
      throw new Error('Task is already running');
    }

    // Mark as active
    this.activeTasks.add(task.id);
    const startTime = Date.now();

    // Create execution record
    const execution = await prisma.taskExecution.create({
      data: {
        taskId: task.id,
        machineId: task.machineId,
        status: 'running',
        triggerType,
        startedAt: new Date(),
      },
    });

    console.log(`Starting task ${task.id} (${task.name}), execution ${execution.id}`);

    try {
      // Send start notification if webhooks configured
      const webhooks = await this.getWebhooksForTask(task);
      if (webhooks.length > 0) {
        await this.webhookNotifier.notify(
          webhooks,
          'task_started',
          createTaskStartedPayload({
            id: task.id,
            name: task.name,
            taskType: task.taskType,
          })
        );
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(task);
      const duration = Date.now() - startTime;

      // Update execution record
      await prisma.taskExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          durationMs: duration,
          result: JSON.stringify(result),
          projectsProcessed: result.projectsProcessed,
          issuesFound: result.issuesFound,
          tokensSaved: result.tokensSaved,
        },
      });

      // Update task
      const nextRunAt = calculateNextRun(task);
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      });

      console.log(
        `Task ${task.id} completed in ${duration}ms: ${result.projectsProcessed} projects, ${result.tokensSaved} tokens saved`
      );

      // Send success notification
      if (task.notifyOnSuccess && webhooks.length > 0) {
        await this.webhookNotifier.notify(
          webhooks,
          'task_completed',
          createTaskCompletedPayload(
            { id: task.id, name: task.name, taskType: task.taskType },
            { id: execution.id, duration },
            {
              projectsProcessed: result.projectsProcessed,
              issuesFound: result.issuesFound,
              tokensSaved: result.tokensSaved,
            }
          )
        );
      }

      return execution.id;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`Task ${task.id} failed after ${duration}ms:`, errorMessage);

      // Update execution record
      await prisma.taskExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          durationMs: duration,
          error: errorMessage,
        },
      });

      // Update task next run (even on failure)
      const nextRunAt = calculateNextRun(task);
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      });

      // Send failure notification
      if (task.notifyOnFailure) {
        const webhooks = await this.getWebhooksForTask(task);
        if (webhooks.length > 0) {
          await this.webhookNotifier.notify(
            webhooks,
            'task_failed',
            createTaskFailedPayload(
              { id: task.id, name: task.name, taskType: task.taskType },
              { id: execution.id, duration },
              errorMessage
            )
          );
        }
      }

      throw error;
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Execute task with timeout
   */
  private async executeWithTimeout(task: ScheduledTask): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task execution timed out after ${this.config.taskTimeoutMs}ms`));
      }, this.config.taskTimeoutMs);

      executeTask(task)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Get webhooks configured for a task
   */
  private async getWebhooksForTask(task: ScheduledTask): Promise<WebhookConfig[]> {
    if (!task.webhookIds) {
      // Get global webhooks
      return prisma.webhookConfig.findMany({
        where: {
          enabled: true,
          machineId: null,
        },
      });
    }

    const webhookIds: string[] = JSON.parse(task.webhookIds);
    if (webhookIds.length === 0) return [];

    return prisma.webhookConfig.findMany({
      where: {
        id: { in: webhookIds },
        enabled: true,
      },
    });
  }

  /**
   * Manually trigger a task
   *
   * @param taskId - Task ID to trigger
   * @returns Execution ID
   */
  async triggerTask(taskId: string): Promise<string> {
    const task = await prisma.scheduledTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.enabled) {
      throw new Error(`Task is disabled: ${taskId}`);
    }

    return this.executeTask(task as ScheduledTask, 'manual');
  }

  /**
   * Get upcoming tasks
   *
   * @param hours - Number of hours to look ahead
   * @returns Tasks scheduled to run
   */
  async getUpcomingTasks(hours: number = 24): Promise<ScheduledTask[]> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() + hours);

    const tasks = await prisma.scheduledTask.findMany({
      where: {
        enabled: true,
        scheduleType: { in: ['cron', 'interval'] },
        nextRunAt: {
          gte: new Date(),
          lte: cutoff,
        },
      },
      orderBy: { nextRunAt: 'asc' },
    });

    return tasks as ScheduledTask[];
  }

  /**
   * Refresh next run times for all cron/interval tasks
   *
   * Call this after creating or updating tasks.
   */
  async refreshNextRunTimes(): Promise<void> {
    const tasks = await prisma.scheduledTask.findMany({
      where: {
        enabled: true,
        scheduleType: { in: ['cron', 'interval'] },
      },
    });

    for (const task of tasks) {
      const nextRunAt = calculateNextRun(task as ScheduledTask);
      if (nextRunAt) {
        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: { nextRunAt },
        });
      }
    }

    console.log(`Refreshed next run times for ${tasks.length} tasks`);
  }

  /**
   * Register or update a threshold watcher
   *
   * @param taskId - Task ID
   */
  async updateThresholdWatcher(taskId: string): Promise<void> {
    const task = await prisma.scheduledTask.findUnique({
      where: { id: taskId },
    });

    if (!task || !task.enabled || task.scheduleType !== 'threshold') {
      this.triggerEvaluator.unregisterThresholdWatcher(taskId);
      return;
    }

    this.registerThresholdWatcher(task as ScheduledTask);
  }

  /**
   * Send a test notification
   *
   * @param webhookId - Webhook ID to test
   * @returns Test result
   */
  async testWebhook(webhookId: string): Promise<{ success: boolean; error?: string }> {
    const webhook = await prisma.webhookConfig.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    return this.webhookNotifier.testWebhook(webhook);
  }
}

/**
 * Create a new scheduler runner with default configuration
 */
export function createScheduler(config?: Partial<SchedulerConfig>): SchedulerRunner {
  return new SchedulerRunner(config);
}
