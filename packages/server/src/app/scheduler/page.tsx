'use client';

import { useState } from 'react';

// Mock data - will be replaced with API calls after schema migration
const mockTasks = [
  {
    id: '1',
    name: 'Daily Context Analysis',
    description: 'Analyze all project CLAUDE.md files for optimization opportunities',
    taskType: 'analyze_context',
    scheduleType: 'cron',
    cronExpression: '0 9 * * *',
    enabled: true,
    lastRunAt: '2026-01-19T09:00:00Z',
    nextRunAt: '2026-01-20T09:00:00Z',
    lastStatus: 'completed',
  },
  {
    id: '2',
    name: 'Weekly Health Check',
    description: 'Generate comprehensive health report across all projects',
    taskType: 'health_check',
    scheduleType: 'cron',
    cronExpression: '0 9 * * 1',
    enabled: true,
    lastRunAt: '2026-01-13T09:00:00Z',
    nextRunAt: '2026-01-20T09:00:00Z',
    lastStatus: 'completed',
  },
  {
    id: '3',
    name: 'Low Score Alert',
    description: 'Notify when health score drops below 60',
    taskType: 'threshold_alert',
    scheduleType: 'threshold',
    thresholdMetric: 'health_score',
    thresholdValue: 60,
    thresholdOp: 'lt',
    enabled: true,
    lastRunAt: null,
    nextRunAt: null,
    lastStatus: null,
  },
];

const mockExecutions = [
  {
    id: '1',
    taskId: '1',
    taskName: 'Daily Context Analysis',
    status: 'completed',
    triggerType: 'scheduled',
    startedAt: '2026-01-19T09:00:00Z',
    completedAt: '2026-01-19T09:00:45Z',
    durationMs: 45000,
    result: { analyzed: 4, issues: 3, tokensSaved: 0 },
  },
  {
    id: '2',
    taskId: '2',
    taskName: 'Weekly Health Check',
    status: 'completed',
    triggerType: 'scheduled',
    startedAt: '2026-01-13T09:00:00Z',
    completedAt: '2026-01-13T09:01:20Z',
    durationMs: 80000,
    result: { score: 73, projects: 4 },
  },
  {
    id: '3',
    taskId: '1',
    taskName: 'Daily Context Analysis',
    status: 'failed',
    triggerType: 'manual',
    startedAt: '2026-01-18T15:30:00Z',
    completedAt: '2026-01-18T15:30:05Z',
    durationMs: 5000,
    error: 'Connection timeout',
  },
];

const taskTypeIcons: Record<string, { icon: string; bg: string }> = {
  analyze_context: { icon: '📄', bg: 'bg-[rgba(99,102,241,0.15)]' },
  health_check: { icon: '❤️', bg: 'bg-[rgba(16,185,129,0.15)]' },
  generate_recommendations: { icon: '💡', bg: 'bg-[rgba(245,158,11,0.15)]' },
  threshold_alert: { icon: '🔔', bg: 'bg-[rgba(244,63,94,0.15)]' },
};

const statusColors = {
  completed: 'text-[#10b981] bg-[rgba(16,185,129,0.15)]',
  running: 'text-[#6366f1] bg-[rgba(99,102,241,0.15)]',
  failed: 'text-[#f43f5e] bg-[rgba(244,63,94,0.15)]',
  pending: 'text-[#64748b] bg-[#334155]',
};

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatSchedule(task: typeof mockTasks[0]) {
  if (task.scheduleType === 'cron') {
    // Simple cron parsing for display
    if (task.cronExpression === '0 9 * * *') return 'Daily at 9:00 AM';
    if (task.cronExpression === '0 9 * * 1') return 'Mondays at 9:00 AM';
    return task.cronExpression;
  }
  if (task.scheduleType === 'threshold') {
    return `When ${task.thresholdMetric} ${task.thresholdOp === 'lt' ? '<' : '>'} ${task.thresholdValue}`;
  }
  return 'Unknown';
}

export default function SchedulerPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  const handleRunTask = async (taskId: string) => {
    setRunningTaskId(taskId);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRunningTaskId(null);
  };

  const enabledTasks = mockTasks.filter(t => t.enabled).length;
  const completedToday = mockExecutions.filter(e =>
    e.status === 'completed' && new Date(e.startedAt).toDateString() === new Date().toDateString()
  ).length;
  const failedRecently = mockExecutions.filter(e => e.status === 'failed').length;

  return (
    <>
      {/* Header */}
      <header className="px-10 py-6 bg-[#1e293b] border-b border-[#334155]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[#f1f5f9] tracking-tight mb-1">Scheduler</h1>
            <p className="text-sm text-[#64748b]">Automate context optimization with scheduled tasks</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-[10px] text-sm font-semibold shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)]"
          >
            Create Task
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 bg-[#0f172a]">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Total Tasks</div>
            <div className="text-3xl font-bold">{mockTasks.length}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Enabled</div>
            <div className="text-3xl font-bold text-[#10b981]">{enabledTasks}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Completed Today</div>
            <div className="text-3xl font-bold text-[#6366f1]">{completedToday}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Failed Recently</div>
            <div className="text-3xl font-bold text-[#f43f5e]">{failedRecently}</div>
          </div>
        </div>

        {/* Scheduled Tasks */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Scheduled Tasks</h2>
            <span className="text-sm text-[#64748b]">{mockTasks.length} tasks</span>
          </div>

          <div className="space-y-3">
            {mockTasks.map((task) => {
              const typeStyle = taskTypeIcons[task.taskType] || { icon: '📋', bg: 'bg-[#334155]' };
              const isRunning = runningTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5 transition-all duration-200 hover:border-[#475569]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${typeStyle.bg} flex items-center justify-center text-2xl`}>
                        {typeStyle.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{task.name}</h3>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${task.enabled ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]' : 'bg-[#334155] text-[#64748b]'}`}>
                            {task.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#94a3b8] mt-1">{task.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[12px] text-[#64748b]">
                          <span>Schedule: {formatSchedule(task)}</span>
                          {task.lastRunAt && (
                            <span>Last run: {new Date(task.lastRunAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {task.nextRunAt && (
                        <div className="text-right">
                          <div className="text-sm text-[#94a3b8]">Next run</div>
                          <div className="text-[13px] text-[#64748b]">{new Date(task.nextRunAt).toLocaleString()}</div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRunTask(task.id)}
                          disabled={isRunning}
                          className="px-4 py-2 bg-[#334155] text-[#94a3b8] rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors disabled:opacity-50"
                        >
                          {isRunning ? 'Running...' : 'Run Now'}
                        </button>
                        <button className="px-4 py-2 bg-[rgba(99,102,241,0.15)] text-[#6366f1] rounded-lg text-sm font-medium hover:bg-[rgba(99,102,241,0.25)] transition-colors">
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Executions */}
        <section>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Recent Executions</h2>
            <span className="text-sm text-[#64748b]">{mockExecutions.length} executions</span>
          </div>

          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155]">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Task</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Trigger</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Duration</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Started</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockExecutions.map((execution) => (
                  <tr key={execution.id} className="border-b border-[#334155] last:border-0">
                    <td className="px-5 py-4 font-medium">{execution.taskName}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${statusColors[execution.status as keyof typeof statusColors]}`}>
                        {execution.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-[#94a3b8] capitalize">{execution.triggerType}</td>
                    <td className="px-5 py-4 text-right text-[13px] text-[#64748b]">
                      {formatDuration(execution.durationMs)}
                    </td>
                    <td className="px-5 py-4 text-right text-[13px] text-[#64748b]">
                      {new Date(execution.startedAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {execution.status === 'failed' && (
                        <button className="text-[#6366f1] text-sm hover:text-[#06b6d4] transition-colors">
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Info Card */}
        <div className="mt-8 bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center text-lg">
              💡
            </div>
            <div>
              <h4 className="font-semibold mb-1">How Scheduling Works</h4>
              <p className="text-[13px] text-[#94a3b8] leading-relaxed">
                Scheduled tasks run automatically based on cron expressions or threshold triggers.
                Tasks can analyze context, generate recommendations, or send alerts when metrics
                drop below defined thresholds. Configure webhooks to receive notifications via
                Slack, Discord, or custom endpoints.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
