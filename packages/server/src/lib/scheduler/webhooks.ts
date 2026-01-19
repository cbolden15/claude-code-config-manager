/**
 * Webhook Notifier for CCM v3.2
 *
 * Handles sending notifications to various webhook providers:
 * - Slack (rich message blocks)
 * - Discord (embeds with colors)
 * - n8n (workflow trigger data)
 * - Generic (standard JSON POST)
 *
 * @module scheduler/webhooks
 */

// Webhook event types
export type WebhookEventType =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'threshold_triggered'
  | 'optimization_applied'
  | 'health_alert';

// Webhook provider types
export type WebhookType = 'slack' | 'discord' | 'n8n' | 'generic';

// Status emoji mapping
const STATUS_EMOJI: Record<string, string> = {
  task_started: '🚀',
  task_completed: '✅',
  task_failed: '❌',
  threshold_triggered: '⚠️',
  optimization_applied: '✨',
  health_alert: '🔔',
};

// Discord color mapping (decimal format)
const DISCORD_COLORS: Record<string, number> = {
  task_started: 3447003, // Blue
  task_completed: 5763719, // Green
  task_failed: 15548997, // Red
  threshold_triggered: 16776960, // Yellow
  optimization_applied: 10181046, // Purple
  health_alert: 16744448, // Orange
};

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  task?: {
    id: string;
    name: string;
    taskType: string;
  };
  execution?: {
    id: string;
    status: string;
    duration?: number;
  };
  metrics?: {
    projectsProcessed?: number;
    issuesFound?: number;
    tokensSaved?: number;
    optimizationScore?: number;
  };
  message: string;
  error?: string;
  detailsUrl?: string;
}

/**
 * Webhook configuration from database
 */
export interface WebhookConfig {
  id: string;
  name: string;
  webhookType: string;
  webhookUrl: string;
  config: string; // JSON
  eventTypes: string; // JSON array
  enabled: boolean;
  failureCount?: number;
}

// Slack message types
interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text: string;
  }>;
}

interface SlackMessage {
  blocks: SlackBlock[];
  text?: string; // Fallback text
}

// Discord embed types
interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface DiscordMessage {
  embeds: DiscordEmbed[];
  content?: string;
}

// n8n trigger data
interface N8nPayload {
  event: string;
  timestamp: string;
  task?: {
    id: string;
    name: string;
    type: string;
  };
  execution?: {
    id: string;
    status: string;
    durationMs?: number;
  };
  metrics?: {
    projectsProcessed?: number;
    issuesFound?: number;
    tokensSaved?: number;
  };
}

/**
 * Format a Slack message payload
 */
export function formatSlackPayload(payload: WebhookPayload): SlackMessage {
  const emoji = STATUS_EMOJI[payload.event] || '📋';
  const title = getEventTitle(payload.event);

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${title}`,
        emoji: true,
      },
    },
  ];

  // Add message section
  if (payload.message) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: payload.message,
      },
    });
  }

  // Add fields if we have task/execution info
  const fields: Array<{ type: string; text: string }> = [];

  if (payload.task) {
    fields.push({ type: 'mrkdwn', text: `*Task:*\n${payload.task.name}` });
    fields.push({ type: 'mrkdwn', text: `*Type:*\n${payload.task.taskType}` });
  }

  if (payload.execution) {
    fields.push({ type: 'mrkdwn', text: `*Status:*\n${payload.execution.status}` });
    if (payload.execution.duration !== undefined) {
      fields.push({
        type: 'mrkdwn',
        text: `*Duration:*\n${formatDuration(payload.execution.duration)}`,
      });
    }
  }

  if (payload.metrics) {
    if (payload.metrics.projectsProcessed !== undefined) {
      fields.push({
        type: 'mrkdwn',
        text: `*Projects:*\n${payload.metrics.projectsProcessed} processed`,
      });
    }
    if (payload.metrics.tokensSaved !== undefined) {
      fields.push({
        type: 'mrkdwn',
        text: `*Tokens Saved:*\n${payload.metrics.tokensSaved.toLocaleString()}`,
      });
    }
    if (payload.metrics.issuesFound !== undefined) {
      fields.push({
        type: 'mrkdwn',
        text: `*Issues Found:*\n${payload.metrics.issuesFound}`,
      });
    }
  }

  if (fields.length > 0) {
    blocks.push({
      type: 'section',
      fields,
    });
  }

  // Add error info if failed
  if (payload.error) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Error:*\n\`\`\`${payload.error}\`\`\``,
      },
    });
  }

  // Add context with link
  const contextElements: Array<{ type: string; text: string }> = [];
  if (payload.detailsUrl) {
    contextElements.push({
      type: 'mrkdwn',
      text: `<${payload.detailsUrl}|View Details>`,
    });
  }
  contextElements.push({
    type: 'mrkdwn',
    text: `Sent by CCM at ${new Date(payload.timestamp).toLocaleString()}`,
  });

  blocks.push({
    type: 'context',
    elements: contextElements,
  });

  return {
    blocks,
    text: `${emoji} ${title}: ${payload.message}`, // Fallback
  };
}

/**
 * Format a Discord message payload
 */
export function formatDiscordPayload(payload: WebhookPayload): DiscordMessage {
  const emoji = STATUS_EMOJI[payload.event] || '📋';
  const title = getEventTitle(payload.event);
  const color = DISCORD_COLORS[payload.event] || 3447003;

  const embed: DiscordEmbed = {
    title: `${emoji} ${title}`,
    color,
    timestamp: payload.timestamp,
  };

  if (payload.message) {
    embed.description = payload.message;
  }

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (payload.task) {
    fields.push({ name: 'Task', value: payload.task.name, inline: true });
    fields.push({ name: 'Type', value: payload.task.taskType, inline: true });
  }

  if (payload.execution) {
    fields.push({ name: 'Status', value: payload.execution.status, inline: true });
    if (payload.execution.duration !== undefined) {
      fields.push({
        name: 'Duration',
        value: formatDuration(payload.execution.duration),
        inline: true,
      });
    }
  }

  if (payload.metrics) {
    if (payload.metrics.projectsProcessed !== undefined) {
      fields.push({
        name: 'Projects',
        value: `${payload.metrics.projectsProcessed} processed`,
        inline: true,
      });
    }
    if (payload.metrics.tokensSaved !== undefined) {
      fields.push({
        name: 'Tokens Saved',
        value: payload.metrics.tokensSaved.toLocaleString(),
        inline: true,
      });
    }
    if (payload.metrics.issuesFound !== undefined) {
      fields.push({
        name: 'Issues Found',
        value: payload.metrics.issuesFound.toString(),
        inline: true,
      });
    }
  }

  if (fields.length > 0) {
    embed.fields = fields;
  }

  if (payload.error) {
    embed.fields = embed.fields || [];
    embed.fields.push({
      name: 'Error',
      value: `\`\`\`${payload.error.slice(0, 1000)}\`\`\``,
    });
  }

  const footerParts: string[] = [];
  if (payload.metrics?.issuesFound !== undefined) {
    footerParts.push(`${payload.metrics.issuesFound} issues found`);
  }
  if (payload.detailsUrl) {
    footerParts.push('CCM Scheduler');
  }
  if (footerParts.length > 0) {
    embed.footer = { text: footerParts.join(' | ') };
  }

  return {
    embeds: [embed],
  };
}

/**
 * Format an n8n trigger payload
 */
export function formatN8nPayload(payload: WebhookPayload): N8nPayload {
  return {
    event: payload.event,
    timestamp: payload.timestamp,
    task: payload.task
      ? {
          id: payload.task.id,
          name: payload.task.name,
          type: payload.task.taskType,
        }
      : undefined,
    execution: payload.execution
      ? {
          id: payload.execution.id,
          status: payload.execution.status,
          durationMs: payload.execution.duration,
        }
      : undefined,
    metrics: payload.metrics,
  };
}

/**
 * Format a generic JSON payload
 */
export function formatGenericPayload(payload: WebhookPayload): object {
  return { ...payload };
}

/**
 * Get human-readable event title
 */
function getEventTitle(event: WebhookEventType): string {
  switch (event) {
    case 'task_started':
      return 'Task Started';
    case 'task_completed':
      return 'Task Completed';
    case 'task_failed':
      return 'Task Failed';
    case 'threshold_triggered':
      return 'Threshold Alert';
    case 'optimization_applied':
      return 'Optimization Applied';
    case 'health_alert':
      return 'Health Alert';
    default:
      return 'Notification';
  }
}

/**
 * Format duration in ms to human readable
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Webhook notifier class for sending notifications
 */
export class WebhookNotifier {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = '', defaultTimeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Send a notification to specified webhooks
   *
   * @param webhooks - Webhook configurations to notify
   * @param event - Event type
   * @param payload - Partial payload (event and timestamp auto-filled)
   * @returns Results for each webhook
   */
  async notify(
    webhooks: WebhookConfig[],
    event: WebhookEventType,
    payload: Partial<Omit<WebhookPayload, 'event' | 'timestamp'>>
  ): Promise<Array<{ webhookId: string; success: boolean; error?: string }>> {
    const fullPayload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      message: payload.message || getEventTitle(event),
      ...payload,
    };

    // Add details URL if base URL is configured
    if (this.baseUrl && !fullPayload.detailsUrl) {
      fullPayload.detailsUrl = `${this.baseUrl}/scheduler`;
    }

    const results = await Promise.all(
      webhooks.map(async (webhook) => {
        // Check if webhook should receive this event
        const eventTypes: string[] = JSON.parse(webhook.eventTypes || '[]');
        if (eventTypes.length > 0 && !eventTypes.includes(event)) {
          return { webhookId: webhook.id, success: true }; // Skip but don't error
        }

        try {
          await this.sendWebhook(webhook, fullPayload);
          return { webhookId: webhook.id, success: true };
        } catch (error) {
          return {
            webhookId: webhook.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return results;
  }

  /**
   * Send a single webhook notification
   *
   * @param webhook - Webhook configuration
   * @param payload - Full payload
   */
  private async sendWebhook(webhook: WebhookConfig, payload: WebhookPayload): Promise<void> {
    const body = this.formatPayloadForType(webhook.webhookType as WebhookType, payload);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CCM-Scheduler/1.0',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Format payload based on webhook type
   */
  private formatPayloadForType(type: WebhookType, payload: WebhookPayload): object {
    switch (type) {
      case 'slack':
        return formatSlackPayload(payload);
      case 'discord':
        return formatDiscordPayload(payload);
      case 'n8n':
        return formatN8nPayload(payload);
      case 'generic':
      default:
        return formatGenericPayload(payload);
    }
  }

  /**
   * Send a test notification to verify webhook configuration
   *
   * @param webhook - Webhook to test
   * @returns Test result
   */
  async testWebhook(webhook: WebhookConfig): Promise<{ success: boolean; error?: string }> {
    const testPayload: WebhookPayload = {
      event: 'task_completed',
      timestamp: new Date().toISOString(),
      message: 'This is a test notification from CCM Scheduler',
      task: {
        id: 'test-task',
        name: 'Test Task',
        taskType: 'test',
      },
      metrics: {
        projectsProcessed: 3,
        issuesFound: 5,
        tokensSaved: 1234,
      },
    };

    try {
      await this.sendWebhook(webhook, testPayload);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create a webhook payload for task started event
 */
export function createTaskStartedPayload(task: {
  id: string;
  name: string;
  taskType: string;
}): Partial<WebhookPayload> {
  return {
    task,
    message: `Started executing task: ${task.name}`,
  };
}

/**
 * Create a webhook payload for task completed event
 */
export function createTaskCompletedPayload(
  task: { id: string; name: string; taskType: string },
  execution: { id: string; duration: number },
  metrics: { projectsProcessed?: number; issuesFound?: number; tokensSaved?: number }
): Partial<WebhookPayload> {
  const parts = [`Task "${task.name}" completed successfully`];
  if (metrics.projectsProcessed) {
    parts.push(`${metrics.projectsProcessed} projects processed`);
  }
  if (metrics.tokensSaved) {
    parts.push(`${metrics.tokensSaved.toLocaleString()} tokens saved`);
  }

  return {
    task,
    execution: {
      id: execution.id,
      status: 'completed',
      duration: execution.duration,
    },
    metrics,
    message: parts.join(' • '),
  };
}

/**
 * Create a webhook payload for task failed event
 */
export function createTaskFailedPayload(
  task: { id: string; name: string; taskType: string },
  execution: { id: string; duration?: number },
  error: string
): Partial<WebhookPayload> {
  return {
    task,
    execution: {
      id: execution.id,
      status: 'failed',
      duration: execution.duration,
    },
    error,
    message: `Task "${task.name}" failed: ${error}`,
  };
}

/**
 * Create a webhook payload for threshold triggered event
 */
export function createThresholdTriggeredPayload(
  task: { id: string; name: string; taskType: string },
  metric: string,
  currentValue: number,
  threshold: number,
  operator: string
): Partial<WebhookPayload> {
  const operatorText: Record<string, string> = {
    lt: 'below',
    gt: 'above',
    lte: 'at or below',
    gte: 'at or above',
    eq: 'at',
  };

  return {
    task,
    metrics: {
      [metric === 'optimization_score' ? 'optimizationScore' : metric]: currentValue,
    },
    message: `Threshold triggered: ${metric} is ${operatorText[operator] || operator} ${threshold} (current: ${currentValue})`,
  };
}

/**
 * Create a webhook payload for health alert event
 */
export function createHealthAlertPayload(
  score: number,
  previousScore: number,
  activeIssues: number
): Partial<WebhookPayload> {
  const trend = score > previousScore ? 'improved' : score < previousScore ? 'declined' : 'unchanged';

  return {
    metrics: {
      optimizationScore: score,
      issuesFound: activeIssues,
    },
    message: `Health score ${trend}: ${previousScore} → ${score} (${activeIssues} active issues)`,
  };
}
