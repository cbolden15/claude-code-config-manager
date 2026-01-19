'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ScheduleCard,
  TaskHistory,
  WebhookConfigCard,
  SchedulerStats,
  CreateTaskDialog,
  type ScheduledTask,
  type TaskExecution,
  type WebhookConfig,
  type SchedulerStatsData,
  type CreateTaskData,
} from '@/components/scheduler';

export default function SchedulerPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [stats, setStats] = useState<SchedulerStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  // Default machine ID - in production this would come from context/config
  const machineId = 'default';

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [tasksRes, executionsRes, webhooksRes, statusRes] = await Promise.all([
        fetch(`/api/scheduler/tasks?machineId=${machineId}`),
        fetch(`/api/scheduler/executions?machineId=${machineId}&limit=10`),
        fetch(`/api/scheduler/webhooks?machineId=${machineId}`),
        fetch(`/api/scheduler/status?machineId=${machineId}`),
      ]);

      if (!tasksRes.ok || !executionsRes.ok || !webhooksRes.ok || !statusRes.ok) {
        throw new Error('Failed to fetch scheduler data');
      }

      const [tasksData, executionsData, webhooksData, statusData] = await Promise.all([
        tasksRes.json(),
        executionsRes.json(),
        webhooksRes.json(),
        statusRes.json(),
      ]);

      setTasks(tasksData.tasks || []);
      setExecutions(executionsData.executions || []);
      setWebhooks(webhooksData.webhooks || []);
      setStats(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduler data');
      console.error('Error fetching scheduler data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [machineId]);

  useEffect(() => {
    fetchData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCreateTask = async (taskData: CreateTaskData) => {
    try {
      const response = await fetch('/api/scheduler/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          ...taskData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
      }

      await fetchData();
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const handleRunTask = async (task: ScheduledTask) => {
    setRunningTaskId(task.id);
    try {
      const response = await fetch(`/api/scheduler/tasks/${task.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run task');
      }

      await fetchData();
    } catch (err) {
      console.error('Error running task:', err);
    } finally {
      setRunningTaskId(null);
    }
  };

  const handleToggleTask = async (task: ScheduledTask) => {
    try {
      const response = await fetch(`/api/scheduler/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !task.enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle task');
      }

      await fetchData();
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleDeleteTask = async (task: ScheduledTask) => {
    if (!confirm(`Are you sure you want to delete "${task.name}"?`)) return;

    try {
      const response = await fetch(`/api/scheduler/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete task');
      }

      await fetchData();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    try {
      const response = await fetch(`/api/scheduler/webhooks/${webhook.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to test webhook');
      }

      alert('Test notification sent successfully!');
    } catch (err) {
      console.error('Error testing webhook:', err);
      alert('Failed to send test notification');
    }
  };

  const handleToggleWebhook = async (webhook: WebhookConfig) => {
    try {
      const response = await fetch(`/api/scheduler/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !webhook.enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle webhook');
      }

      await fetchData();
    } catch (err) {
      console.error('Error toggling webhook:', err);
    }
  };

  const handleDeleteWebhook = async (webhook: WebhookConfig) => {
    if (!confirm(`Are you sure you want to delete webhook "${webhook.name}"?`)) return;

    try {
      const response = await fetch(`/api/scheduler/webhooks/${webhook.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete webhook');
      }

      await fetchData();
    } catch (err) {
      console.error('Error deleting webhook:', err);
    }
  };

  const handleRetryExecution = async (execution: TaskExecution) => {
    try {
      const response = await fetch(`/api/scheduler/executions/${execution.id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to retry execution');
      }

      await fetchData();
    } catch (err) {
      console.error('Error retrying execution:', err);
    }
  };

  return (
    <>
      <Header
        title="Scheduler"
        description="Automate context optimization with scheduled tasks"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Task
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <SchedulerStats stats={stats} isLoading={isLoading} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Scheduled Tasks</h3>
              <span className="text-sm text-gray-500">{tasks.length} tasks</span>
            </div>

            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 mb-4">No scheduled tasks yet</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    Create Your First Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <ScheduleCard
                    key={task.id}
                    task={task}
                    onRun={handleRunTask}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    isRunning={runningTaskId === task.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Webhooks Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Webhooks</h3>
              <span className="text-sm text-gray-500">{webhooks.length} configured</span>
            </div>

            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : webhooks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <p className="text-sm text-gray-500">No webhooks configured</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <WebhookConfigCard
                    key={webhook.id}
                    webhook={webhook}
                    onTest={handleTestWebhook}
                    onToggle={handleToggleWebhook}
                    onDelete={handleDeleteWebhook}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Executions */}
        <TaskHistory
          executions={executions}
          isLoading={isLoading}
          onRetry={handleRetryExecution}
        />
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateTask}
        machineId={machineId}
        webhooks={webhooks.map((w) => ({ id: w.id, name: w.name }))}
      />
    </>
  );
}
