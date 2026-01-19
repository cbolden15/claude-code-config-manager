# CCM v3.2: Scheduled Optimization & Automation

## Overview

**Feature:** Automated scheduling system for context optimization with threshold-based triggers and webhook notifications.

**Problem Statement:**
- Users forget to run context optimization manually
- CLAUDE.md files degrade over time without intervention
- No way to monitor context health across projects automatically
- Manual optimization requires active user engagement

**Solution:**
An automation layer that schedules periodic analysis, triggers optimization based on thresholds, and notifies users through webhooks when action is needed.

---

## Goals

1. **Automate maintenance** - Run analysis/optimization on schedule without user intervention
2. **Threshold-based triggers** - Auto-optimize when score drops below configured threshold
3. **Multi-project monitoring** - Track health across all registered projects
4. **Notifications** - Alert users via webhooks (Slack, Discord, n8n, generic)
5. **Flexible scheduling** - Support cron-like schedules and event-based triggers

---

## Architecture

### Integration with Existing Systems

```
┌─────────────────────────────────────────────────────────────────┐
│                    CCM v3.x Infrastructure                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   v3.0       │    │    v3.1      │    │    v3.2      │      │
│  │   Smart      │    │   Context    │    │  Scheduled   │ NEW  │
│  │   Recs       │    │  Optimizer   │    │  Automation  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │    Scheduler    │  ◄── NEW                 │
│                    │     Engine      │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              ▼              ▼              ▼                    │
│      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│      │   Cron      │ │  Threshold  │ │  Webhook    │           │
│      │   Jobs      │ │  Triggers   │ │  Notifier   │           │
│      └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### New Components

```
packages/
├── server/
│   ├── prisma/
│   │   └── schema.prisma          # Add: ScheduledTask, TaskExecution, WebhookConfig
│   ├── src/
│   │   ├── app/
│   │   │   └── api/
│   │   │       └── scheduler/     # NEW: Scheduler APIs
│   │   │           ├── tasks/
│   │   │           ├── executions/
│   │   │           └── webhooks/
│   │   ├── lib/
│   │   │   └── scheduler/         # NEW: Scheduler engine
│   │   │       ├── runner.ts
│   │   │       ├── triggers.ts
│   │   │       ├── webhooks.ts
│   │   │       └── index.ts
│   │   └── components/
│   │       └── scheduler/         # NEW: UI components
│   │           ├── ScheduleCard.tsx
│   │           ├── TaskHistory.tsx
│   │           └── WebhookConfig.tsx
│   └── src/app/
│       └── scheduler/             # NEW: Scheduler dashboard
│           └── page.tsx
├── cli/
│   └── src/
│       └── commands/
│           └── schedule.ts        # NEW: CLI commands
```

---

## Database Schema

### New Models

```prisma
// Scheduled tasks for automation
model ScheduledTask {
  id              String   @id @default(cuid())
  machineId       String?  // null = all machines

  // Task definition
  name            String
  description     String?
  taskType        String   // "analyze", "optimize", "health_check", "custom"

  // Schedule configuration
  scheduleType    String   // "cron", "interval", "threshold", "manual"
  cronExpression  String?  // e.g., "0 9 * * *" (9 AM daily)
  intervalMinutes Int?     // e.g., 1440 (daily)

  // Threshold trigger (for scheduleType = "threshold")
  thresholdMetric String?  // "optimization_score", "token_count", "issue_count"
  thresholdValue  Int?     // e.g., 60 (trigger when score < 60)
  thresholdOperator String? // "lt", "gt", "eq", "lte", "gte"

  // Scope
  projectFilter   String?  // JSON array of project paths, null = all

  // Task configuration (JSON)
  taskConfig      String   // { strategy: "moderate", dryRun: false, ... }

  // Notification settings
  notifyOnSuccess Boolean  @default(false)
  notifyOnFailure Boolean  @default(true)
  webhookIds      String?  // JSON array of webhook IDs to notify

  // Status
  enabled         Boolean  @default(true)
  lastRunAt       DateTime?
  nextRunAt       DateTime?

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  machine         Machine? @relation(fields: [machineId], references: [id], onDelete: Cascade)
  executions      TaskExecution[]

  @@index([machineId])
  @@index([enabled])
  @@index([nextRunAt])
  @@index([taskType])
}

// Task execution history
model TaskExecution {
  id              String   @id @default(cuid())
  taskId          String
  machineId       String?

  // Execution details
  status          String   // "pending", "running", "completed", "failed", "skipped"
  triggerType     String   // "scheduled", "threshold", "manual", "api"

  // Timing
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  durationMs      Int?

  // Results (JSON)
  result          String?  // { projectsAnalyzed: 5, issuesFound: 12, ... }
  error           String?  // Error message if failed

  // Metrics captured
  projectsProcessed Int    @default(0)
  issuesFound       Int    @default(0)
  tokensSaved       Int    @default(0)

  // Notifications sent
  notificationsSent String? // JSON array of webhook IDs notified

  task            ScheduledTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  machine         Machine?      @relation(fields: [machineId], references: [id], onDelete: SetNull)

  @@index([taskId])
  @@index([status])
  @@index([startedAt])
}

// Webhook configurations for notifications
model WebhookConfig {
  id              String   @id @default(cuid())
  machineId       String?  // null = global webhook

  // Webhook details
  name            String
  description     String?
  webhookType     String   // "slack", "discord", "generic", "n8n"
  webhookUrl      String   // The webhook URL (encrypted)

  // Configuration (JSON)
  config          String   // { channel: "#alerts", username: "CCM Bot", ... }

  // Event filters
  eventTypes      String   // JSON array: ["task_completed", "task_failed", "threshold_triggered"]

  // Status
  enabled         Boolean  @default(true)
  lastUsedAt      DateTime?
  failureCount    Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  machine         Machine? @relation(fields: [machineId], references: [id], onDelete: Cascade)

  @@index([machineId])
  @@index([webhookType])
  @@index([enabled])
}
```

### Update Machine Model

```prisma
model Machine {
  // ... existing fields ...

  // v3.2 Scheduler relationships
  scheduledTasks    ScheduledTask[]
  taskExecutions    TaskExecution[]
  webhookConfigs    WebhookConfig[]
}
```

---

## API Endpoints

### Task APIs

```
GET /api/scheduler/tasks
  Query: ?machineId=X&enabled=true&taskType=analyze
  Returns: List of scheduled tasks with stats

POST /api/scheduler/tasks
  Body: { name, taskType, scheduleType, cronExpression?, ... }
  Returns: Created task

GET /api/scheduler/tasks/[id]
  Returns: Task details with recent executions

PATCH /api/scheduler/tasks/[id]
  Body: { enabled?, cronExpression?, thresholdValue?, ... }
  Returns: Updated task

DELETE /api/scheduler/tasks/[id]
  Returns: Success

POST /api/scheduler/tasks/[id]/run
  Body: { triggerType: "manual" }
  Returns: Execution ID (starts async execution)
```

### Execution APIs

```
GET /api/scheduler/executions
  Query: ?taskId=X&status=completed&limit=50
  Returns: Execution history with pagination

GET /api/scheduler/executions/[id]
  Returns: Execution details with full result

POST /api/scheduler/executions/[id]/retry
  Returns: New execution ID
```

### Webhook APIs

```
GET /api/scheduler/webhooks
  Query: ?machineId=X&webhookType=slack
  Returns: List of webhook configs

POST /api/scheduler/webhooks
  Body: { name, webhookType, webhookUrl, eventTypes, ... }
  Returns: Created webhook

GET /api/scheduler/webhooks/[id]
  Returns: Webhook details

PATCH /api/scheduler/webhooks/[id]
  Body: { enabled?, webhookUrl?, eventTypes?, ... }
  Returns: Updated webhook

DELETE /api/scheduler/webhooks/[id]
  Returns: Success

POST /api/scheduler/webhooks/[id]/test
  Returns: Test notification result
```

### Scheduler Control APIs

```
GET /api/scheduler/status
  Returns: Scheduler status, next runs, active tasks

POST /api/scheduler/start
  Returns: Scheduler started

POST /api/scheduler/stop
  Returns: Scheduler stopped

GET /api/scheduler/upcoming
  Query: ?hours=24
  Returns: Tasks scheduled to run in next N hours
```

---

## Scheduler Engine

### Runner (`packages/server/src/lib/scheduler/runner.ts`)

```typescript
interface SchedulerConfig {
  checkIntervalMs: number;      // How often to check for due tasks (default: 60000)
  maxConcurrentTasks: number;   // Max parallel task executions (default: 3)
  taskTimeoutMs: number;        // Max time for a single task (default: 300000)
  retryAttempts: number;        // Retries on failure (default: 2)
}

class SchedulerRunner {
  private isRunning: boolean;
  private checkInterval: NodeJS.Timeout | null;

  async start(): Promise<void>;
  async stop(): Promise<void>;

  async checkDueTasks(): Promise<void>;
  async executeTask(task: ScheduledTask): Promise<TaskExecution>;

  calculateNextRun(task: ScheduledTask): Date;

  // Task type handlers
  async executeAnalyzeTask(task: ScheduledTask): Promise<TaskResult>;
  async executeOptimizeTask(task: ScheduledTask): Promise<TaskResult>;
  async executeHealthCheckTask(task: ScheduledTask): Promise<TaskResult>;
}
```

### Triggers (`packages/server/src/lib/scheduler/triggers.ts`)

```typescript
type TriggerType = 'scheduled' | 'threshold' | 'manual' | 'api' | 'webhook';

interface ThresholdConfig {
  metric: 'optimization_score' | 'token_count' | 'issue_count' | 'file_size';
  operator: 'lt' | 'gt' | 'eq' | 'lte' | 'gte';
  value: number;
}

class TriggerEvaluator {
  // Check if threshold conditions are met
  async evaluateThreshold(
    task: ScheduledTask,
    projectPath: string
  ): Promise<boolean>;

  // Get current metric value
  async getMetricValue(
    metric: string,
    projectPath: string,
    machineId: string
  ): Promise<number>;

  // Register threshold watchers
  registerThresholdWatcher(task: ScheduledTask): void;
  unregisterThresholdWatcher(taskId: string): void;
}

// Cron expression parser
function parseCronExpression(expr: string): CronSchedule;
function getNextCronRun(expr: string, from?: Date): Date;
```

### Webhooks (`packages/server/src/lib/scheduler/webhooks.ts`)

```typescript
type WebhookEventType =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'threshold_triggered'
  | 'optimization_applied'
  | 'health_alert';

interface WebhookPayload {
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
  };
  message: string;
}

class WebhookNotifier {
  async notify(
    webhookIds: string[],
    event: WebhookEventType,
    payload: Partial<WebhookPayload>
  ): Promise<void>;

  // Provider-specific formatters
  formatSlackPayload(payload: WebhookPayload): SlackMessage;
  formatDiscordPayload(payload: WebhookPayload): DiscordMessage;
  formatN8nPayload(payload: WebhookPayload): N8nTriggerData;
  formatGenericPayload(payload: WebhookPayload): object;

  async testWebhook(webhookId: string): Promise<boolean>;
}
```

---

## CLI Commands

```bash
# Task management
ccm schedule list                          # List all scheduled tasks
ccm schedule list --enabled                # List only enabled tasks
ccm schedule create                        # Interactive task creation
ccm schedule create --type analyze --cron "0 9 * * *" --name "Daily Analysis"
ccm schedule enable <id>                   # Enable a task
ccm schedule disable <id>                  # Disable a task
ccm schedule delete <id>                   # Delete a task
ccm schedule run <id>                      # Manually trigger a task

# Execution history
ccm schedule history                       # Recent executions
ccm schedule history --task <id>           # History for specific task
ccm schedule history --status failed       # Failed executions only

# Webhook management
ccm schedule webhooks list                 # List webhooks
ccm schedule webhooks add                  # Interactive webhook setup
ccm schedule webhooks add --type slack --url "https://..." --name "Alerts"
ccm schedule webhooks test <id>            # Send test notification
ccm schedule webhooks delete <id>          # Delete webhook

# Scheduler control
ccm schedule status                        # Show scheduler status
ccm schedule upcoming                      # Show tasks due in next 24h

# Quick setup (common patterns)
ccm schedule quick daily-analysis          # Set up daily analysis at 9 AM
ccm schedule quick weekly-optimize         # Set up weekly optimization
ccm schedule quick threshold-alert --score 50  # Alert when score < 50
```

---

## UI Components

### Scheduler Dashboard (`/scheduler`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Scheduled Tasks                              [+ New Task]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scheduler Status: ● Running          Next check: 45 seconds    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 Active Tasks: 3    📈 Executions Today: 12          │   │
│  │  ✅ Successful: 11     ❌ Failed: 1                      │   │
│  │  💾 Tokens Saved Today: 45,230                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Scheduled Tasks                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Daily Context Analysis                    [Edit] [Run] │   │
│  │   Type: analyze | Schedule: 0 9 * * * (9:00 AM daily)   │   │
│  │   Last run: 2 hours ago ✅ | Next: Tomorrow 9:00 AM     │   │
│  │   Projects: All | Notifications: #dev-alerts            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ● Threshold Optimizer                       [Edit] [Run] │   │
│  │   Type: optimize | Trigger: Score < 60                   │   │
│  │   Last run: 3 days ago ✅ | Strategy: moderate          │   │
│  │   Projects: 5 selected | Notifications: Slack, Discord  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ Weekly Health Report               [Enable] [Edit]     │   │
│  │   Type: health_check | Schedule: 0 8 * * 1 (Mon 8 AM)   │   │
│  │   Status: Disabled | Last run: Never                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Recent Executions                               [View All →]   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Daily Context Analysis      Today 9:00 AM    1.2s    │   │
│  │    5 projects | 8 issues | 12,450 tokens saved          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ❌ Threshold Optimizer         Yesterday 3:45 PM  -     │   │
│  │    Error: Connection timeout to project server          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✅ Daily Context Analysis      Yesterday 9:00 AM  0.8s  │   │
│  │    5 projects | 3 issues | 8,200 tokens saved           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Webhooks                                        [+ Add]        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔔 Slack #dev-alerts           ● Active    [Test] [Edit]│   │
│  │ 🔔 Discord Notifications       ● Active    [Test] [Edit]│   │
│  │ 🔔 n8n Automation             ○ Disabled  [Enable]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Task Creation Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Scheduled Task                                    [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Name: [Daily Context Analysis                              ]   │
│                                                                  │
│  Task Type:                                                      │
│  ○ Analyze    - Analyze CLAUDE.md files, detect issues          │
│  ● Optimize   - Apply optimization based on analysis            │
│  ○ Health Check - Generate health report                        │
│                                                                  │
│  Schedule Type:                                                  │
│  ● Cron Schedule    ○ Interval    ○ Threshold Trigger           │
│                                                                  │
│  Cron Expression: [0 9 * * *                                ]   │
│  Preview: Every day at 9:00 AM                                  │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Optimization Settings (for optimize tasks):                    │
│                                                                  │
│  Strategy: [Moderate ▼]                                         │
│  ☑ Dry run first (preview before applying)                      │
│  ☐ Auto-apply if savings > [5000    ] tokens                    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Scope:                                                          │
│                                                                  │
│  ● All projects    ○ Selected projects                          │
│  Machine: [All machines ▼]                                      │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Notifications:                                                  │
│                                                                  │
│  ☑ Notify on failure                                            │
│  ☐ Notify on success                                            │
│  Webhooks: [Slack #dev-alerts ▼] [+ Add]                        │
│                                                                  │
│                              [Cancel]  [Create Task]            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Parallel Implementation Plan

### Terminal 1: Database + Server APIs

**Scope:** Schema, migrations, API routes
**Directories:** `packages/server/prisma/`, `packages/server/src/app/api/scheduler/`

**Tasks:**
1. Add 3 new Prisma models (ScheduledTask, TaskExecution, WebhookConfig)
2. Update Machine model with relationships
3. Run db:push
4. Create `/api/scheduler/tasks` routes (GET, POST)
5. Create `/api/scheduler/tasks/[id]` routes (GET, PATCH, DELETE)
6. Create `/api/scheduler/tasks/[id]/run` route (POST)
7. Create `/api/scheduler/executions` routes (GET)
8. Create `/api/scheduler/executions/[id]` routes (GET, retry)
9. Create `/api/scheduler/webhooks` routes (GET, POST)
10. Create `/api/scheduler/webhooks/[id]` routes (GET, PATCH, DELETE, test)
11. Create `/api/scheduler/status` route (GET)
12. Create `/api/scheduler/upcoming` route (GET)

**DO NOT touch:** `packages/server/src/lib/`, `packages/server/src/components/`, `packages/cli/`

---

### Terminal 2: Scheduler Engine

**Scope:** Background task runner, triggers, webhooks
**Directories:** `packages/server/src/lib/scheduler/`

**Tasks:**
1. Create `runner.ts` - Main scheduler loop, task execution
2. Create `triggers.ts` - Cron parsing, threshold evaluation
3. Create `webhooks.ts` - Webhook notification system
4. Create `task-handlers.ts` - Handlers for each task type (analyze, optimize, health)
5. Create `index.ts` - Export public API
6. Integrate with v3.1 context optimizer (`@/lib/context`)
7. Add scheduler startup to server initialization

**DO NOT touch:** `packages/server/src/app/api/`, `packages/server/src/components/`, `packages/cli/`

---

### Terminal 3: UI + CLI

**Scope:** User interfaces and CLI commands
**Directories:** `packages/server/src/components/scheduler/`, `packages/server/src/app/scheduler/`, `packages/cli/src/commands/`

**Tasks:**
1. Create `ScheduleCard.tsx` - Display scheduled task
2. Create `TaskHistory.tsx` - Execution history list
3. Create `WebhookConfigCard.tsx` - Webhook management
4. Create `CreateTaskDialog.tsx` - Task creation form
5. Create `SchedulerStats.tsx` - Dashboard statistics
6. Create `/scheduler/page.tsx` - Main scheduler dashboard
7. Add Scheduler link to sidebar navigation
8. Create `packages/cli/src/commands/schedule.ts` - CLI commands
9. Add quick setup commands (daily-analysis, weekly-optimize, threshold-alert)

**DO NOT touch:** `packages/server/prisma/`, `packages/server/src/lib/scheduler/`

---

## Default Scheduled Tasks

Pre-configured tasks available via CLI quick setup:

```typescript
const QUICK_SETUP_TASKS = {
  'daily-analysis': {
    name: 'Daily Context Analysis',
    taskType: 'analyze',
    scheduleType: 'cron',
    cronExpression: '0 9 * * *', // 9 AM daily
    taskConfig: { includeHealthScore: true },
    notifyOnFailure: true
  },
  'weekly-optimize': {
    name: 'Weekly Optimization',
    taskType: 'optimize',
    scheduleType: 'cron',
    cronExpression: '0 8 * * 1', // Monday 8 AM
    taskConfig: { strategy: 'moderate', dryRun: false },
    notifyOnSuccess: true,
    notifyOnFailure: true
  },
  'threshold-alert': {
    name: 'Low Score Alert',
    taskType: 'analyze',
    scheduleType: 'threshold',
    thresholdMetric: 'optimization_score',
    thresholdOperator: 'lt',
    thresholdValue: 60,
    taskConfig: { alertOnly: true },
    notifyOnSuccess: true // Alert when threshold triggered
  }
};
```

---

## Webhook Message Formats

### Slack Format

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "✅ Context Optimization Complete"
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Task:*\nDaily Context Analysis" },
        { "type": "mrkdwn", "text": "*Duration:*\n1.2 seconds" },
        { "type": "mrkdwn", "text": "*Projects:*\n5 analyzed" },
        { "type": "mrkdwn", "text": "*Tokens Saved:*\n12,450" }
      ]
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "8 issues found | <http://ccm.local/scheduler|View Details>" }
      ]
    }
  ]
}
```

### Discord Format

```json
{
  "embeds": [{
    "title": "✅ Context Optimization Complete",
    "color": 5763719,
    "fields": [
      { "name": "Task", "value": "Daily Context Analysis", "inline": true },
      { "name": "Duration", "value": "1.2 seconds", "inline": true },
      { "name": "Projects", "value": "5 analyzed", "inline": true },
      { "name": "Tokens Saved", "value": "12,450", "inline": true }
    ],
    "footer": { "text": "8 issues found" },
    "timestamp": "2026-01-19T09:00:00.000Z"
  }]
}
```

### n8n Format

```json
{
  "event": "task_completed",
  "timestamp": "2026-01-19T09:00:00.000Z",
  "task": {
    "id": "clxyz123",
    "name": "Daily Context Analysis",
    "type": "analyze"
  },
  "execution": {
    "id": "exec456",
    "status": "completed",
    "durationMs": 1200
  },
  "metrics": {
    "projectsProcessed": 5,
    "issuesFound": 8,
    "tokensSaved": 12450
  }
}
```

---

## Integration with v3.1

The scheduler uses v3.1 Context Optimizer for task execution:

```typescript
import { analyze, optimize, ContextAnalysis } from '@/lib/context';

async function executeAnalyzeTask(task: ScheduledTask): Promise<TaskResult> {
  const projects = await getProjectsForTask(task);
  const results: ContextAnalysis[] = [];

  for (const project of projects) {
    const claudeMdPath = path.join(project.path, 'CLAUDE.md');
    if (await fileExists(claudeMdPath)) {
      const analysis = await analyze(claudeMdPath);
      results.push(analysis);

      // Store in database
      await prisma.contextAnalysis.upsert({
        where: { machineId_projectPath_filePath: { ... } },
        update: { ...analysis.summary, sections: JSON.stringify(analysis.classified), ... },
        create: { ... }
      });
    }
  }

  return {
    projectsProcessed: results.length,
    issuesFound: results.reduce((sum, r) => sum + r.issues.length, 0),
    tokensSaved: 0 // Analysis doesn't save tokens
  };
}

async function executeOptimizeTask(task: ScheduledTask): Promise<TaskResult> {
  const config = JSON.parse(task.taskConfig);
  const projects = await getProjectsForTask(task);
  let totalTokensSaved = 0;

  for (const project of projects) {
    const claudeMdPath = path.join(project.path, 'CLAUDE.md');
    const analysis = await analyze(claudeMdPath);

    if (analysis.optimizationScore < (config.minScore || 100)) {
      const output = optimize(analysis, config.strategy, project.path);

      if (!config.dryRun) {
        await writeFile(claudeMdPath, output.result.newContent);
        totalTokensSaved += output.result.summary.tokensSaved;

        // Create archives
        for (const archive of output.archives) {
          await prisma.contextArchive.create({ data: archive });
        }
      }
    }
  }

  return { projectsProcessed: projects.length, tokensSaved: totalTokensSaved };
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Scheduler uptime | 99.9% |
| Task execution success rate | 95%+ |
| Webhook delivery rate | 99%+ |
| Average task duration | < 5 seconds |
| User adoption | 50%+ users with active schedules |

---

## Testing Plan

### Unit Tests
- Cron expression parsing
- Threshold evaluation
- Webhook payload formatting
- Task handler logic

### Integration Tests
- Full task execution flow
- Webhook delivery
- Database state management
- Scheduler start/stop

### Manual Testing
- Create and run each task type
- Test all webhook providers
- Verify notifications arrive
- Test threshold triggers

---

## Startup Commands

```bash
# Terminal 1 - Database + APIs
cd /Users/calebbolden/Projects/claude-code-config-manager && claude --dangerously-skip-permissions

# Terminal 2 - Scheduler Engine
cd /Users/calebbolden/Projects/claude-code-config-manager && claude --dangerously-skip-permissions

# Terminal 3 - UI + CLI
cd /Users/calebbolden/Projects/claude-code-config-manager && claude --dangerously-skip-permissions
```

Each terminal receives its specific task list from this document.

---

## Open Questions

1. **Scheduler persistence** - Should scheduler state survive server restarts?
2. **Distributed execution** - Support running tasks across multiple CCM instances?
3. **Rate limiting** - How to prevent runaway task execution?
4. **Audit log** - Keep detailed logs of all scheduler actions?
5. **Task dependencies** - Allow tasks to depend on other tasks completing?
