/**
 * Scheduler Triggers for CCM v3.2
 *
 * Handles cron expression parsing and threshold evaluation for scheduled tasks.
 * Supports multiple trigger types: cron, interval, threshold, and manual.
 *
 * @module scheduler/triggers
 */

// Types based on the v3.2 design document
export type TriggerType = 'scheduled' | 'threshold' | 'manual' | 'api' | 'webhook';

export type ThresholdMetric = 'optimization_score' | 'token_count' | 'issue_count' | 'file_size';

export type ThresholdOperator = 'lt' | 'gt' | 'eq' | 'lte' | 'gte';

export interface ThresholdConfig {
  metric: ThresholdMetric;
  operator: ThresholdOperator;
  value: number;
}

export interface CronSchedule {
  minute: number | '*' | number[];
  hour: number | '*' | number[];
  dayOfMonth: number | '*' | number[];
  month: number | '*' | number[];
  dayOfWeek: number | '*' | number[];
}

interface ScheduledTask {
  id: string;
  scheduleType: string;
  cronExpression?: string | null;
  intervalMinutes?: number | null;
  thresholdMetric?: string | null;
  thresholdOperator?: string | null;
  thresholdValue?: number | null;
  projectFilter?: string | null;
  machineId?: string | null;
}

/**
 * Parse a cron expression into its component parts
 *
 * Supports standard 5-field cron format:
 * minute hour day-of-month month day-of-week
 *
 * @param expr - Cron expression (e.g., "0 9 * * *" for 9 AM daily)
 * @returns Parsed cron schedule
 *
 * @example
 * ```typescript
 * const schedule = parseCronExpression('0 9 * * *');
 * // { minute: 0, hour: 9, dayOfMonth: '*', month: '*', dayOfWeek: '*' }
 * ```
 */
export function parseCronExpression(expr: string): CronSchedule {
  const parts = expr.trim().split(/\s+/);

  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: expected 5 fields, got ${parts.length}`);
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return {
    minute: parseCronField(minute, 0, 59),
    hour: parseCronField(hour, 0, 23),
    dayOfMonth: parseCronField(dayOfMonth, 1, 31),
    month: parseCronField(month, 1, 12),
    dayOfWeek: parseCronField(dayOfWeek, 0, 6),
  };
}

/**
 * Parse a single cron field into a value, wildcard, or array of values
 */
function parseCronField(field: string, min: number, max: number): number | '*' | number[] {
  // Wildcard
  if (field === '*') {
    return '*';
  }

  // List (e.g., "1,3,5")
  if (field.includes(',')) {
    const values = field.split(',').map((v) => {
      const num = parseInt(v.trim(), 10);
      if (isNaN(num) || num < min || num > max) {
        throw new Error(`Invalid cron field value: ${v} (expected ${min}-${max})`);
      }
      return num;
    });
    return values;
  }

  // Range (e.g., "1-5")
  if (field.includes('-')) {
    const [start, end] = field.split('-').map((v) => parseInt(v.trim(), 10));
    if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
      throw new Error(`Invalid cron range: ${field}`);
    }
    const values: number[] = [];
    for (let i = start; i <= end; i++) {
      values.push(i);
    }
    return values;
  }

  // Step (e.g., "*/5")
  if (field.includes('/')) {
    const [base, step] = field.split('/');
    const stepNum = parseInt(step, 10);
    if (isNaN(stepNum) || stepNum <= 0) {
      throw new Error(`Invalid cron step: ${field}`);
    }
    const startVal = base === '*' ? min : parseInt(base, 10);
    const values: number[] = [];
    for (let i = startVal; i <= max; i += stepNum) {
      values.push(i);
    }
    return values;
  }

  // Single value
  const num = parseInt(field, 10);
  if (isNaN(num) || num < min || num > max) {
    throw new Error(`Invalid cron field value: ${field} (expected ${min}-${max})`);
  }
  return num;
}

/**
 * Check if a cron field matches a given value
 */
function cronFieldMatches(field: number | '*' | number[], value: number): boolean {
  if (field === '*') return true;
  if (Array.isArray(field)) return field.includes(value);
  return field === value;
}

/**
 * Calculate the next run time for a cron expression
 *
 * @param expr - Cron expression
 * @param from - Start time (defaults to now)
 * @returns Next scheduled run time
 *
 * @example
 * ```typescript
 * const next = getNextCronRun('0 9 * * *');
 * console.log(`Next run: ${next.toISOString()}`);
 * ```
 */
export function getNextCronRun(expr: string, from: Date = new Date()): Date {
  const schedule = parseCronExpression(expr);
  const next = new Date(from);

  // Start from the next minute
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(next.getMinutes() + 1);

  // Maximum iterations to prevent infinite loops
  const maxIterations = 366 * 24 * 60; // 1 year of minutes
  let iterations = 0;

  while (iterations < maxIterations) {
    const matches =
      cronFieldMatches(schedule.minute, next.getMinutes()) &&
      cronFieldMatches(schedule.hour, next.getHours()) &&
      cronFieldMatches(schedule.dayOfMonth, next.getDate()) &&
      cronFieldMatches(schedule.month, next.getMonth() + 1) &&
      cronFieldMatches(schedule.dayOfWeek, next.getDay());

    if (matches) {
      return next;
    }

    next.setMinutes(next.getMinutes() + 1);
    iterations++;
  }

  throw new Error(`Could not find next run time for cron expression: ${expr}`);
}

/**
 * Calculate the next run time for an interval-based schedule
 *
 * @param intervalMinutes - Interval in minutes
 * @param lastRunAt - Last run timestamp (if any)
 * @returns Next scheduled run time
 */
export function getNextIntervalRun(intervalMinutes: number, lastRunAt?: Date | null): Date {
  const now = new Date();

  if (!lastRunAt) {
    // First run - schedule immediately
    return now;
  }

  const next = new Date(lastRunAt);
  next.setMinutes(next.getMinutes() + intervalMinutes);

  // If next run is in the past, schedule now
  if (next <= now) {
    return now;
  }

  return next;
}

/**
 * Check if a cron expression matches the current time
 *
 * @param expr - Cron expression
 * @param date - Date to check (defaults to now)
 * @returns Whether the expression matches
 */
export function cronMatches(expr: string, date: Date = new Date()): boolean {
  const schedule = parseCronExpression(expr);

  return (
    cronFieldMatches(schedule.minute, date.getMinutes()) &&
    cronFieldMatches(schedule.hour, date.getHours()) &&
    cronFieldMatches(schedule.dayOfMonth, date.getDate()) &&
    cronFieldMatches(schedule.month, date.getMonth() + 1) &&
    cronFieldMatches(schedule.dayOfWeek, date.getDay())
  );
}

/**
 * Evaluate a threshold condition
 *
 * @param metric - Current metric value
 * @param operator - Comparison operator
 * @param threshold - Threshold value
 * @returns Whether the threshold is triggered
 */
export function evaluateThreshold(
  metric: number,
  operator: ThresholdOperator,
  threshold: number
): boolean {
  switch (operator) {
    case 'lt':
      return metric < threshold;
    case 'gt':
      return metric > threshold;
    case 'eq':
      return metric === threshold;
    case 'lte':
      return metric <= threshold;
    case 'gte':
      return metric >= threshold;
    default:
      return false;
  }
}

/**
 * Get a human-readable description of a cron expression
 *
 * @param expr - Cron expression
 * @returns Human-readable description
 *
 * @example
 * ```typescript
 * describeCronExpression('0 9 * * *')   // "Every day at 9:00 AM"
 * describeCronExpression('0 8 * * 1')   // "Every Monday at 8:00 AM"
 * describeCronExpression('30 0,2,4 * * *') // "Every 2 hours at minute 30"
 * ```
 */
export function describeCronExpression(expr: string): string {
  try {
    const schedule = parseCronExpression(expr);

    const hourStr = formatTimeField(schedule.hour);
    const minuteStr = formatMinuteField(schedule.minute);
    const dayOfWeekStr = formatDayOfWeek(schedule.dayOfWeek);
    const dayOfMonthStr = formatDayOfMonth(schedule.dayOfMonth);

    // Daily at specific time
    if (
      schedule.dayOfMonth === '*' &&
      schedule.month === '*' &&
      schedule.dayOfWeek === '*' &&
      typeof schedule.hour === 'number' &&
      typeof schedule.minute === 'number'
    ) {
      return `Every day at ${formatTime(schedule.hour, schedule.minute)}`;
    }

    // Weekly on specific day
    if (
      schedule.dayOfMonth === '*' &&
      schedule.month === '*' &&
      typeof schedule.dayOfWeek === 'number' &&
      typeof schedule.hour === 'number' &&
      typeof schedule.minute === 'number'
    ) {
      return `Every ${dayOfWeekStr} at ${formatTime(schedule.hour, schedule.minute)}`;
    }

    // Monthly on specific day
    if (
      typeof schedule.dayOfMonth === 'number' &&
      schedule.month === '*' &&
      schedule.dayOfWeek === '*' &&
      typeof schedule.hour === 'number' &&
      typeof schedule.minute === 'number'
    ) {
      return `Day ${schedule.dayOfMonth} of every month at ${formatTime(schedule.hour, schedule.minute)}`;
    }

    // Hourly
    if (
      schedule.hour === '*' &&
      typeof schedule.minute === 'number' &&
      schedule.dayOfMonth === '*' &&
      schedule.month === '*' &&
      schedule.dayOfWeek === '*'
    ) {
      return `Every hour at minute ${schedule.minute}`;
    }

    // Every N hours
    if (
      Array.isArray(schedule.hour) &&
      typeof schedule.minute === 'number' &&
      schedule.dayOfMonth === '*' &&
      schedule.month === '*' &&
      schedule.dayOfWeek === '*'
    ) {
      const step = schedule.hour[1] - schedule.hour[0];
      if (schedule.hour.every((h, i) => h === i * step)) {
        return `Every ${step} hours at minute ${schedule.minute}`;
      }
    }

    // Fallback to generic description
    return `${minuteStr} ${hourStr} ${dayOfMonthStr} ${dayOfWeekStr}`.trim();
  } catch {
    return expr;
  }
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

function formatTimeField(field: number | '*' | number[]): string {
  if (field === '*') return 'every hour';
  if (typeof field === 'number') return `at hour ${field}`;
  return `at hours ${field.join(', ')}`;
}

function formatMinuteField(field: number | '*' | number[]): string {
  if (field === '*') return 'every minute';
  if (typeof field === 'number') return `at minute ${field}`;
  return `at minutes ${field.join(', ')}`;
}

function formatDayOfWeek(field: number | '*' | number[]): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (field === '*') return '';
  if (typeof field === 'number') return days[field];
  return field.map((d) => days[d]).join(', ');
}

function formatDayOfMonth(field: number | '*' | number[]): string {
  if (field === '*') return '';
  if (typeof field === 'number') return `on day ${field}`;
  return `on days ${field.join(', ')}`;
}

/**
 * Validate a cron expression
 *
 * @param expr - Cron expression to validate
 * @returns Validation result with error message if invalid
 */
export function validateCronExpression(expr: string): { valid: boolean; error?: string } {
  try {
    parseCronExpression(expr);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Invalid cron expression' };
  }
}

/**
 * Trigger evaluator class for managing threshold watchers
 */
export class TriggerEvaluator {
  private thresholdWatchers: Map<string, NodeJS.Timeout> = new Map();
  private checkIntervalMs: number;

  constructor(checkIntervalMs: number = 60000) {
    this.checkIntervalMs = checkIntervalMs;
  }

  /**
   * Evaluate if threshold conditions are met for a task
   *
   * @param task - Scheduled task with threshold configuration
   * @param currentMetricValue - Current value of the metric
   * @returns Whether the threshold is triggered
   */
  evaluateThresholdForTask(task: ScheduledTask, currentMetricValue: number): boolean {
    if (task.scheduleType !== 'threshold') {
      return false;
    }

    if (!task.thresholdMetric || !task.thresholdOperator || task.thresholdValue === null || task.thresholdValue === undefined) {
      return false;
    }

    return evaluateThreshold(
      currentMetricValue,
      task.thresholdOperator as ThresholdOperator,
      task.thresholdValue
    );
  }

  /**
   * Register a watcher that periodically checks threshold conditions
   *
   * @param task - Task to watch
   * @param getMetricValue - Function to get current metric value
   * @param onTrigger - Callback when threshold is triggered
   */
  registerThresholdWatcher(
    task: ScheduledTask,
    getMetricValue: () => Promise<number>,
    onTrigger: () => void
  ): void {
    // Clear existing watcher
    this.unregisterThresholdWatcher(task.id);

    const watcher = setInterval(async () => {
      try {
        const value = await getMetricValue();
        if (this.evaluateThresholdForTask(task, value)) {
          onTrigger();
        }
      } catch (error) {
        console.error(`Error checking threshold for task ${task.id}:`, error);
      }
    }, this.checkIntervalMs);

    this.thresholdWatchers.set(task.id, watcher);
  }

  /**
   * Unregister a threshold watcher
   *
   * @param taskId - Task ID to stop watching
   */
  unregisterThresholdWatcher(taskId: string): void {
    const watcher = this.thresholdWatchers.get(taskId);
    if (watcher) {
      clearInterval(watcher);
      this.thresholdWatchers.delete(taskId);
    }
  }

  /**
   * Stop all threshold watchers
   */
  stopAllWatchers(): void {
    this.thresholdWatchers.forEach((watcher) => {
      clearInterval(watcher);
    });
    this.thresholdWatchers.clear();
  }
}

/**
 * Calculate the next run time for a scheduled task
 *
 * @param task - Scheduled task
 * @returns Next scheduled run time, or null for threshold/manual tasks
 */
export function calculateNextRun(task: ScheduledTask): Date | null {
  switch (task.scheduleType) {
    case 'cron':
      if (!task.cronExpression) return null;
      return getNextCronRun(task.cronExpression);

    case 'interval':
      if (!task.intervalMinutes) return null;
      return getNextIntervalRun(task.intervalMinutes);

    case 'threshold':
    case 'manual':
      // These don't have scheduled times
      return null;

    default:
      return null;
  }
}

/**
 * Check if a task is due for execution
 *
 * @param task - Scheduled task
 * @param now - Current time
 * @returns Whether the task should run now
 */
export function isTaskDue(task: { nextRunAt?: Date | null; scheduleType: string }, now: Date = new Date()): boolean {
  // Threshold and manual tasks aren't checked by schedule
  if (task.scheduleType === 'threshold' || task.scheduleType === 'manual') {
    return false;
  }

  if (!task.nextRunAt) {
    return false;
  }

  return new Date(task.nextRunAt) <= now;
}
