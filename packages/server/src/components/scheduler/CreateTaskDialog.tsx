'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: CreateTaskData) => Promise<void>;
  machineId: string;
  webhooks?: Array<{ id: string; name: string }>;
}

export interface CreateTaskData {
  name: string;
  description: string;
  taskType: 'analyze' | 'optimize' | 'health_check' | 'custom';
  scheduleType: 'cron' | 'interval' | 'threshold' | 'manual';
  cronExpression?: string;
  intervalHours?: number;
  thresholdMetric?: string;
  thresholdValue?: number;
  thresholdOperator?: string;
  projectFilter?: string;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  webhookIds: string[];
}

const TASK_TYPES = [
  { value: 'analyze', label: 'Analyze', description: 'Analyze CLAUDE.md files for issues' },
  { value: 'optimize', label: 'Optimize', description: 'Apply optimizations automatically' },
  { value: 'health_check', label: 'Health Check', description: 'Check project health scores' },
  { value: 'custom', label: 'Custom', description: 'Custom task configuration' },
];

const SCHEDULE_TYPES = [
  { value: 'cron', label: 'Cron', description: 'Run on a cron schedule' },
  { value: 'interval', label: 'Interval', description: 'Run every N minutes' },
  { value: 'threshold', label: 'Threshold', description: 'Run when metric crosses threshold' },
  { value: 'manual', label: 'Manual', description: 'Only run when triggered manually' },
];

const COMMON_CRON_PRESETS = [
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekly on Monday 9 AM', value: '0 9 * * 1' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Hourly', value: '0 * * * *' },
];

const THRESHOLD_METRICS = [
  { value: 'context_score', label: 'Context Health Score' },
  { value: 'token_count', label: 'Token Count' },
  { value: 'issue_count', label: 'Number of Issues' },
];

const THRESHOLD_OPERATORS = [
  { value: '<', label: 'Less than' },
  { value: '<=', label: 'Less than or equal' },
  { value: '>', label: 'Greater than' },
  { value: '>=', label: 'Greater than or equal' },
];

export function CreateTaskDialog({
  isOpen,
  onClose,
  onCreate,
  machineId,
  webhooks = [],
}: CreateTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateTaskData>({
    name: '',
    description: '',
    taskType: 'analyze',
    scheduleType: 'cron',
    cronExpression: '0 9 * * *',
    intervalHours: 60,
    thresholdMetric: 'context_score',
    thresholdValue: 60,
    thresholdOperator: '<',
    projectFilter: '',
    notifyOnSuccess: false,
    notifyOnFailure: true,
    webhookIds: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate(formData);
      onClose();
      setFormData({
        name: '',
        description: '',
        taskType: 'analyze',
        scheduleType: 'cron',
        cronExpression: '0 9 * * *',
        intervalHours: 60,
        thresholdMetric: 'context_score',
        thresholdValue: 60,
        thresholdOperator: '<',
        projectFilter: '',
        notifyOnSuccess: false,
        notifyOnFailure: true,
        webhookIds: [],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleWebhook = (webhookId: string) => {
    setFormData((prev) => ({
      ...prev,
      webhookIds: prev.webhookIds.includes(webhookId)
        ? prev.webhookIds.filter((id) => id !== webhookId)
        : [...prev.webhookIds, webhookId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Scheduled Task
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Daily context analysis"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Analyze all projects for context optimization opportunities"
                  rows={2}
                />
              </div>
            </div>

            {/* Task Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TASK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, taskType: type.value as CreateTaskData['taskType'] })}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      formData.taskType === type.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{type.label}</span>
                    <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, scheduleType: type.value as CreateTaskData['scheduleType'] })}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      formData.scheduleType === type.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{type.label}</span>
                    <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Configuration */}
            {formData.scheduleType === 'cron' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={formData.cronExpression}
                  onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 mb-2"
                  placeholder="0 9 * * *"
                />
                <div className="flex flex-wrap gap-2">
                  {COMMON_CRON_PRESETS.map((preset) => (
                    <Badge
                      key={preset.value}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => setFormData({ ...formData, cronExpression: preset.value })}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.scheduleType === 'interval' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interval (minutes)
                </label>
                <input
                  type="number"
                  value={formData.intervalHours}
                  onChange={(e) => setFormData({ ...formData, intervalHours: parseInt(e.target.value) || 60 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  min={1}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Common values: 60 (hourly), 360 (6 hours), 1440 (daily)
                </p>
              </div>
            )}

            {formData.scheduleType === 'threshold' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metric
                  </label>
                  <select
                    value={formData.thresholdMetric}
                    onChange={(e) => setFormData({ ...formData, thresholdMetric: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {THRESHOLD_METRICS.map((metric) => (
                      <option key={metric.value} value={metric.value}>
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operator
                    </label>
                    <select
                      value={formData.thresholdOperator}
                      onChange={(e) => setFormData({ ...formData, thresholdOperator: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {THRESHOLD_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      value={formData.thresholdValue}
                      onChange={(e) => setFormData({ ...formData, thresholdValue: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Filter (optional)
              </label>
              <input
                type="text"
                value={formData.projectFilter}
                onChange={(e) => setFormData({ ...formData, projectFilter: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., blockchain-*, web-apps/*"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for all projects. Supports glob patterns.
              </p>
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notifications
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifyOnSuccess}
                    onChange={(e) => setFormData({ ...formData, notifyOnSuccess: e.target.checked })}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm">Notify on success</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifyOnFailure}
                    onChange={(e) => setFormData({ ...formData, notifyOnFailure: e.target.checked })}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm">Notify on failure</span>
                </label>
              </div>

              {webhooks.length > 0 && (formData.notifyOnSuccess || formData.notifyOnFailure) && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Webhooks
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {webhooks.map((webhook) => (
                      <Badge
                        key={webhook.id}
                        variant={formData.webhookIds.includes(webhook.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleWebhook(webhook.id)}
                      >
                        {webhook.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
