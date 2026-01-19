'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ScheduledTask {
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
  taskConfig: Record<string, unknown> | null;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  webhookIds: string[];
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ScheduleCardProps {
  task: ScheduledTask;
  onRun?: (task: ScheduledTask) => Promise<void>;
  onToggle?: (task: ScheduledTask) => Promise<void>;
  onEdit?: (task: ScheduledTask) => void;
  onDelete?: (task: ScheduledTask) => Promise<void>;
  isRunning?: boolean;
}

function formatSchedule(task: ScheduledTask): string {
  if (task.scheduleType === 'cron' && task.cronExpression) {
    return `Cron: ${task.cronExpression}`;
  }
  if (task.scheduleType === 'interval' && task.intervalMinutes) {
    if (task.intervalMinutes >= 1440) {
      const days = Math.floor(task.intervalMinutes / 1440);
      return `Every ${days} day${days > 1 ? 's' : ''}`;
    }
    if (task.intervalMinutes >= 60) {
      const hours = Math.floor(task.intervalMinutes / 60);
      return `Every ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `Every ${task.intervalMinutes} min`;
  }
  if (task.scheduleType === 'threshold') {
    return `When ${task.thresholdMetric} ${task.thresholdOperator} ${task.thresholdValue}`;
  }
  return 'Manual trigger only';
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    // Future time
    const futureMins = Math.abs(diffMins);
    const futureHours = Math.floor(futureMins / 60);
    const futureDays = Math.floor(futureHours / 24);
    if (futureDays > 0) return `in ${futureDays}d`;
    if (futureHours > 0) return `in ${futureHours}h`;
    return `in ${futureMins}m`;
  }

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}

function getTaskTypeColor(type: string): string {
  switch (type) {
    case 'analyze': return 'bg-blue-100 text-blue-800';
    case 'optimize': return 'bg-green-100 text-green-800';
    case 'health_check': return 'bg-purple-100 text-purple-800';
    case 'custom': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function ScheduleCard({
  task,
  onRun,
  onToggle,
  onEdit,
  onDelete,
  isRunning = false,
}: ScheduleCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = async () => {
    if (!onToggle) return;
    setIsToggling(true);
    try {
      await onToggle(task);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(task);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={cn(
      'hover:shadow-md transition-shadow',
      !task.enabled && 'opacity-60'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">{task.name}</CardTitle>
            <Badge className={getTaskTypeColor(task.taskType)}>
              {task.taskType.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {task.enabled ? (
              <span className="flex items-center text-green-600 text-sm">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                </svg>
                Active
              </span>
            ) : (
              <span className="flex items-center text-gray-400 text-sm">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                </svg>
                Disabled
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {task.description && (
          <p className="text-sm text-gray-500 mb-3">{task.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <span className="text-gray-500">Schedule:</span>
            <p className="font-medium">{formatSchedule(task)}</p>
          </div>
          <div>
            <span className="text-gray-500">Last Run:</span>
            <p className="font-medium">{formatRelativeTime(task.lastRunAt)}</p>
          </div>
          {task.nextRunAt && task.enabled && (
            <div>
              <span className="text-gray-500">Next Run:</span>
              <p className="font-medium">{formatRelativeTime(task.nextRunAt)}</p>
            </div>
          )}
          {task.projectFilter && (
            <div>
              <span className="text-gray-500">Project Filter:</span>
              <p className="font-medium truncate">{task.projectFilter}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {task.notifyOnSuccess && (
              <Badge variant="outline" className="text-xs">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Notify Success
              </Badge>
            )}
            {task.notifyOnFailure && (
              <Badge variant="outline" className="text-xs">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Notify Failure
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRun?.(task)}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Now
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              disabled={isToggling}
            >
              {task.enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(task)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
