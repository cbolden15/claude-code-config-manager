/**
 * Scheduler Command
 * CLI commands for managing scheduled automation tasks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../lib/config.js';

interface ScheduledTask {
  id: string;
  machineId: string;
  name: string;
  description: string | null;
  taskType: 'analyze' | 'optimize' | 'health_check' | 'custom';
  scheduleType: 'cron' | 'interval' | 'threshold' | 'manual';
  cronExpression: string | null;
  intervalMinutes: number | null;
  thresholdMetric: string | null;
  thresholdValue: number | null;
  thresholdOperator: string | null;
  projectFilter: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface TaskExecution {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggerType: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  projectsProcessed: number;
  tokensSaved: number;
  error: string | null;
  task?: { name: string };
}

interface WebhookConfig {
  id: string;
  machineId: string;
  name: string;
  description: string | null;
  webhookType: 'slack' | 'discord' | 'n8n' | 'generic';
  webhookUrl: string;
  eventTypes: string[];
  enabled: boolean;
  lastUsedAt: string | null;
  failureCount: number;
}

interface SchedulerStatus {
  isRunning: boolean;
  totalTasks: number;
  activeTasks: number;
  executionsToday: number;
  successRate: number;
  tokensSavedToday: number;
  nextScheduledRun: string | null;
}

interface TasksResponse {
  tasks: ScheduledTask[];
}

interface ExecutionsResponse {
  executions: TaskExecution[];
}

interface WebhooksResponse {
  webhooks: WebhookConfig[];
}

/**
 * Format a table for CLI output
 */
function formatTable(data: Record<string, string | number>[]): string {
  if (data.length === 0) return '';

  const keys = Object.keys(data[0]);
  const widths = keys.map((key) => {
    const maxValueLength = Math.max(
      ...data.map((row) => String(row[key]).length),
      key.length
    );
    return Math.min(maxValueLength, 40);
  });

  const separator = widths.map((w) => '-'.repeat(w + 2)).join('+');
  const header = keys.map((key, i) => key.padEnd(widths[i])).join(' | ');

  const rows = data.map((row) =>
    keys.map((key, i) => {
      const val = String(row[key]);
      return val.length > widths[i] ? val.slice(0, widths[i] - 3) + '...' : val.padEnd(widths[i]);
    }).join(' | ')
  );

  return [header, separator, ...rows].join('\n');
}

/**
 * Get status color
 */
function getStatusColor(status: string): (str: string) => string {
  switch (status.toLowerCase()) {
    case 'running':
    case 'completed':
      return chalk.green;
    case 'pending':
      return chalk.yellow;
    case 'failed':
      return chalk.red;
    case 'cancelled':
      return chalk.gray;
    default:
      return chalk.white;
  }
}

/**
 * Format schedule display
 */
function formatSchedule(task: ScheduledTask): string {
  if (task.scheduleType === 'cron' && task.cronExpression) {
    return `cron: ${task.cronExpression}`;
  }
  if (task.scheduleType === 'interval' && task.intervalMinutes) {
    if (task.intervalMinutes >= 1440) {
      return `every ${Math.floor(task.intervalMinutes / 1440)}d`;
    }
    if (task.intervalMinutes >= 60) {
      return `every ${Math.floor(task.intervalMinutes / 60)}h`;
    }
    return `every ${task.intervalMinutes}m`;
  }
  if (task.scheduleType === 'threshold') {
    return `${task.thresholdMetric} ${task.thresholdOperator} ${task.thresholdValue}`;
  }
  return 'manual';
}

/**
 * Format relative time
 */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(Math.abs(diffMs) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    if (diffDays > 0) return `in ${diffDays}d`;
    if (diffHours > 0) return `in ${diffHours}h`;
    return `in ${diffMins}m`;
  }

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
}

/**
 * Create the schedule command group
 */
export function createScheduleCommand(): Command {
  const schedCmd = new Command('schedule')
    .alias('sched')
    .description('Manage scheduled automation tasks');

  // List tasks
  schedCmd
    .command('list')
    .description('List all scheduled tasks')
    .option('-e, --enabled', 'Show only enabled tasks')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();
        const params = new URLSearchParams();
        params.set('machineId', config.machine);
        if (options.enabled) params.set('enabled', 'true');

        console.log(chalk.blue('Fetching scheduled tasks...\n'));

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/tasks?${params}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json() as TasksResponse;

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (data.tasks.length === 0) {
          console.log(chalk.yellow('No scheduled tasks found.'));
          console.log('Run ' + chalk.cyan('ccm schedule create') + ' to create one.\n');
          return;
        }

        console.log(chalk.bold('Scheduled Tasks\n'));

        const table = data.tasks.map((task) => ({
          ID: task.id.slice(0, 8),
          Name: task.name.length > 20 ? task.name.slice(0, 17) + '...' : task.name,
          Type: task.taskType.replace(/_/g, ' '),
          Schedule: formatSchedule(task),
          Enabled: task.enabled ? chalk.green('Yes') : chalk.gray('No'),
          'Last Run': formatRelativeTime(task.lastRunAt),
          'Next Run': task.enabled ? formatRelativeTime(task.nextRunAt) : '-',
        }));

        console.log(formatTable(table));
        console.log(`\nTotal: ${data.tasks.length} task(s)`);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Create task
  schedCmd
    .command('create')
    .description('Create a new scheduled task')
    .option('--name <name>', 'Task name')
    .option('--type <type>', 'Task type (analyze, optimize, health_check, custom)')
    .option('--schedule <type>', 'Schedule type (cron, interval, threshold, manual)')
    .option('--cron <expr>', 'Cron expression (e.g., "0 9 * * *")')
    .option('--interval <minutes>', 'Interval in minutes', parseInt)
    .option('--threshold-metric <metric>', 'Threshold metric')
    .option('--threshold-value <value>', 'Threshold value', parseInt)
    .option('--threshold-operator <op>', 'Threshold operator (<, <=, >, >=)')
    .option('--project-filter <filter>', 'Project filter pattern')
    .option('--notify-success', 'Notify on success')
    .option('--notify-failure', 'Notify on failure')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        if (!options.name) {
          console.error(chalk.red('Error: --name is required'));
          process.exit(1);
        }

        const taskData: Record<string, unknown> = {
          machineId: config.machine,
          name: options.name,
          taskType: options.type || 'analyze',
          scheduleType: options.schedule || 'manual',
          notifyOnSuccess: options.notifySuccess || false,
          notifyOnFailure: options.notifyFailure || true,
        };

        if (options.cron) taskData.cronExpression = options.cron;
        if (options.interval) taskData.intervalMinutes = options.interval;
        if (options.thresholdMetric) taskData.thresholdMetric = options.thresholdMetric;
        if (options.thresholdValue) taskData.thresholdValue = options.thresholdValue;
        if (options.thresholdOperator) taskData.thresholdOperator = options.thresholdOperator;
        if (options.projectFilter) taskData.projectFilter = options.projectFilter;

        console.log(chalk.blue('Creating scheduled task...\n'));

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/tasks`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const task = await response.json() as ScheduledTask;

        if (options.json) {
          console.log(JSON.stringify(task, null, 2));
          return;
        }

        console.log(chalk.green('Task created successfully!'));
        console.log(`ID: ${chalk.cyan(task.id)}`);
        console.log(`Name: ${task.name}`);
        console.log(`Type: ${task.taskType}`);
        console.log(`Schedule: ${formatSchedule(task)}`);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Run task
  schedCmd
    .command('run <id>')
    .description('Manually trigger a task')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const config = loadConfig();

        console.log(chalk.blue('Running task...\n'));

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/tasks/${id}/run`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ machineId: config.machine }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const execution = await response.json() as TaskExecution;

        if (options.json) {
          console.log(JSON.stringify(execution, null, 2));
          return;
        }

        console.log(chalk.green('Task started!'));
        console.log(`Execution ID: ${chalk.cyan(execution.id)}`);
        console.log(`Status: ${getStatusColor(execution.status)(execution.status)}`);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Enable task
  schedCmd
    .command('enable <id>')
    .description('Enable a scheduled task')
    .action(async (id) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/tasks/${id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log(chalk.green('Task enabled successfully.'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Disable task
  schedCmd
    .command('disable <id>')
    .description('Disable a scheduled task')
    .action(async (id) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/tasks/${id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: false }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log(chalk.green('Task disabled successfully.'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Delete task
  schedCmd
    .command('delete <id>')
    .description('Delete a scheduled task')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        const config = loadConfig();

        if (!options.force) {
          console.log(chalk.yellow(`Are you sure you want to delete task ${id}?`));
          console.log('Use --force to skip this confirmation.\n');
          process.exit(0);
        }

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/tasks/${id}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log(chalk.green('Task deleted successfully.'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // History command
  schedCmd
    .command('history')
    .description('Show task execution history')
    .option('--task <id>', 'Filter by task ID')
    .option('--status <status>', 'Filter by status')
    .option('--limit <n>', 'Limit results', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();
        const params = new URLSearchParams();
        params.set('machineId', config.machine);
        if (options.task) params.set('taskId', options.task);
        if (options.status) params.set('status', options.status);
        if (options.limit) params.set('limit', options.limit.toString());

        console.log(chalk.blue('Fetching execution history...\n'));

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/executions?${params}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json() as ExecutionsResponse;

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (data.executions.length === 0) {
          console.log(chalk.yellow('No executions found.'));
          return;
        }

        console.log(chalk.bold('Execution History\n'));

        const table = data.executions.map((exec) => ({
          ID: exec.id.slice(0, 8),
          Task: exec.task?.name?.slice(0, 15) || exec.taskId.slice(0, 8),
          Status: getStatusColor(exec.status)(exec.status),
          Trigger: exec.triggerType,
          Duration: exec.durationMs ? `${(exec.durationMs / 1000).toFixed(1)}s` : '-',
          Projects: exec.projectsProcessed,
          'Tokens Saved': exec.tokensSaved > 0 ? `+${exec.tokensSaved.toLocaleString()}` : '-',
          Started: formatRelativeTime(exec.startedAt),
        }));

        console.log(formatTable(table));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Status command
  schedCmd
    .command('status')
    .description('Show scheduler status')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/status?machineId=${config.machine}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const status = await response.json() as SchedulerStatus;

        if (options.json) {
          console.log(JSON.stringify(status, null, 2));
          return;
        }

        console.log(chalk.bold('\nScheduler Status\n'));
        console.log(`Status: ${status.isRunning ? chalk.green('Running') : chalk.yellow('Stopped')}`);
        console.log(`Active Tasks: ${chalk.cyan(status.activeTasks)}/${status.totalTasks}`);
        console.log(`Executions Today: ${status.executionsToday}`);
        console.log(`Success Rate: ${status.successRate >= 80 ? chalk.green(status.successRate + '%') : chalk.yellow(status.successRate + '%')}`);
        console.log(`Tokens Saved Today: ${chalk.green('+' + status.tokensSavedToday.toLocaleString())}`);
        if (status.nextScheduledRun) {
          console.log(`Next Run: ${chalk.cyan(formatRelativeTime(status.nextScheduledRun))}`);
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Webhooks command group
  const webhooksCmd = schedCmd
    .command('webhooks')
    .description('Manage notification webhooks');

  // List webhooks
  webhooksCmd
    .command('list')
    .description('List configured webhooks')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/webhooks?machineId=${config.machine}`
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json() as WebhooksResponse;

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (data.webhooks.length === 0) {
          console.log(chalk.yellow('\nNo webhooks configured.'));
          console.log('Run ' + chalk.cyan('ccm schedule webhooks add') + ' to add one.\n');
          return;
        }

        console.log(chalk.bold('\nConfigured Webhooks\n'));

        const table = data.webhooks.map((wh) => ({
          ID: wh.id.slice(0, 8),
          Name: wh.name.length > 20 ? wh.name.slice(0, 17) + '...' : wh.name,
          Type: wh.webhookType,
          Enabled: wh.enabled ? chalk.green('Yes') : chalk.gray('No'),
          'Last Used': formatRelativeTime(wh.lastUsedAt),
          Failures: wh.failureCount > 0 ? chalk.red(wh.failureCount.toString()) : '0',
        }));

        console.log(formatTable(table));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Add webhook
  webhooksCmd
    .command('add')
    .description('Add a new webhook')
    .option('--name <name>', 'Webhook name')
    .option('--type <type>', 'Webhook type (slack, discord, n8n, generic)')
    .option('--url <url>', 'Webhook URL')
    .option('--events <events>', 'Event types (comma-separated)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = loadConfig();

        if (!options.name || !options.type || !options.url) {
          console.error(chalk.red('Error: --name, --type, and --url are required'));
          process.exit(1);
        }

        const webhookData = {
          machineId: config.machine,
          name: options.name,
          webhookType: options.type,
          webhookUrl: options.url,
          eventTypes: options.events ? options.events.split(',').map((e: string) => e.trim()) : ['task_completed', 'task_failed'],
          enabled: true,
        };

        console.log(chalk.blue('Adding webhook...\n'));

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/webhooks`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const webhook = await response.json() as WebhookConfig;

        if (options.json) {
          console.log(JSON.stringify(webhook, null, 2));
          return;
        }

        console.log(chalk.green('Webhook added successfully!'));
        console.log(`ID: ${chalk.cyan(webhook.id)}`);
        console.log(`Name: ${webhook.name}`);
        console.log(`Type: ${webhook.webhookType}`);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Test webhook
  webhooksCmd
    .command('test <id>')
    .description('Send a test notification')
    .action(async (id) => {
      try {
        const config = loadConfig();

        console.log(chalk.blue('Sending test notification...\n'));

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/webhooks/${id}/test`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ machineId: config.machine }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log(chalk.green('Test notification sent successfully!'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Delete webhook
  webhooksCmd
    .command('delete <id>')
    .description('Delete a webhook')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        const config = loadConfig();

        if (!options.force) {
          console.log(chalk.yellow(`Are you sure you want to delete webhook ${id}?`));
          console.log('Use --force to skip this confirmation.\n');
          process.exit(0);
        }

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/webhooks/${id}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        console.log(chalk.green('Webhook deleted successfully.'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Quick setup command
  schedCmd
    .command('quick <preset>')
    .description('Quick setup presets (daily-analysis, weekly-optimize, threshold-alert)')
    .option('--score <value>', 'Threshold score value', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (preset, options) => {
      try {
        const config = loadConfig();

        let taskData: Record<string, unknown>;

        switch (preset) {
          case 'daily-analysis':
            taskData = {
              machineId: config.machine,
              name: 'Daily Context Analysis',
              description: 'Analyze all projects daily at 9 AM',
              taskType: 'analyze',
              scheduleType: 'cron',
              cronExpression: '0 9 * * *',
              notifyOnSuccess: false,
              notifyOnFailure: true,
              enabled: true,
            };
            break;

          case 'weekly-optimize':
            taskData = {
              machineId: config.machine,
              name: 'Weekly Optimization',
              description: 'Run optimization on all projects every Monday at 9 AM',
              taskType: 'optimize',
              scheduleType: 'cron',
              cronExpression: '0 9 * * 1',
              notifyOnSuccess: true,
              notifyOnFailure: true,
              enabled: true,
            };
            break;

          case 'threshold-alert':
            taskData = {
              machineId: config.machine,
              name: 'Low Score Alert',
              description: `Alert when context score falls below ${options.score || 60}`,
              taskType: 'health_check',
              scheduleType: 'threshold',
              thresholdMetric: 'context_score',
              thresholdOperator: '<',
              thresholdValue: options.score || 60,
              notifyOnSuccess: false,
              notifyOnFailure: true,
              enabled: true,
            };
            break;

          default:
            console.error(chalk.red(`Unknown preset: ${preset}`));
            console.log('\nAvailable presets:');
            console.log('  daily-analysis   - Daily context analysis at 9 AM');
            console.log('  weekly-optimize  - Weekly optimization on Mondays');
            console.log('  threshold-alert  - Alert when score drops (use --score)');
            process.exit(1);
        }

        console.log(chalk.blue(`Setting up "${preset}" preset...\n`));

        const response = await fetch(
          `${config.serverUrl}/api/scheduler/tasks`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const task = await response.json() as ScheduledTask;

        if (options.json) {
          console.log(JSON.stringify(task, null, 2));
          return;
        }

        console.log(chalk.green('Preset task created successfully!'));
        console.log(`ID: ${chalk.cyan(task.id)}`);
        console.log(`Name: ${task.name}`);
        console.log(`Type: ${task.taskType}`);
        console.log(`Schedule: ${formatSchedule(task)}`);
        console.log(`Enabled: ${task.enabled ? chalk.green('Yes') : chalk.gray('No')}`);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return schedCmd;
}
