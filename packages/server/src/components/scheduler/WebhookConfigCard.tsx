'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface WebhookConfig {
  id: string;
  machineId: string;
  name: string;
  description: string | null;
  webhookType: 'slack' | 'discord' | 'n8n' | 'generic';
  webhookUrl: string;
  config: Record<string, unknown> | null;
  eventTypes: string[];
  enabled: boolean;
  lastUsedAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WebhookConfigCardProps {
  webhook: WebhookConfig;
  onTest?: (webhook: WebhookConfig) => Promise<void>;
  onToggle?: (webhook: WebhookConfig) => Promise<void>;
  onEdit?: (webhook: WebhookConfig) => void;
  onDelete?: (webhook: WebhookConfig) => Promise<void>;
}

function getWebhookTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case 'slack':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
        </svg>
      );
    case 'discord':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
        </svg>
      );
    case 'n8n':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.262 0a2.63 2.63 0 0 0-2.63 2.63v5.68a2.63 2.63 0 0 0 2.63 2.63h5.68a2.63 2.63 0 0 0 2.63-2.63V2.63A2.63 2.63 0 0 0 17.942 0h-5.68zm6.058 13.06a2.63 2.63 0 0 0-2.63 2.63v5.68a2.63 2.63 0 0 0 2.63 2.63h.05a2.63 2.63 0 0 0 2.63-2.63v-5.68a2.63 2.63 0 0 0-2.63-2.63h-.05zM5.63 13.06A2.63 2.63 0 0 0 3 15.69v5.68a2.63 2.63 0 0 0 2.63 2.63h.05a2.63 2.63 0 0 0 2.63-2.63v-5.68a2.63 2.63 0 0 0-2.63-2.63h-.05z"/>
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
  }
}

function getWebhookTypeColor(type: string): string {
  switch (type) {
    case 'slack': return 'bg-purple-100 text-purple-800';
    case 'discord': return 'bg-indigo-100 text-indigo-800';
    case 'n8n': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}

export function WebhookConfigCard({
  webhook,
  onTest,
  onToggle,
  onEdit,
  onDelete,
}: WebhookConfigCardProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTest = async () => {
    if (!onTest) return;
    setIsTesting(true);
    try {
      await onTest(webhook);
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggle = async () => {
    if (!onToggle) return;
    setIsToggling(true);
    try {
      await onToggle(webhook);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(webhook);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={cn(
      'hover:shadow-md transition-shadow',
      !webhook.enabled && 'opacity-60'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              webhook.webhookType === 'slack' && 'bg-purple-100 text-purple-600',
              webhook.webhookType === 'discord' && 'bg-indigo-100 text-indigo-600',
              webhook.webhookType === 'n8n' && 'bg-orange-100 text-orange-600',
              webhook.webhookType === 'generic' && 'bg-gray-100 text-gray-600',
            )}>
              {getWebhookTypeIcon(webhook.webhookType)}
            </div>
            <div>
              <CardTitle className="text-base font-medium">{webhook.name}</CardTitle>
              <Badge className={cn('mt-1', getWebhookTypeColor(webhook.webhookType))}>
                {webhook.webhookType}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {webhook.enabled ? (
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
        {webhook.description && (
          <p className="text-sm text-gray-500 mb-3">{webhook.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <span className="text-gray-500">Last Used:</span>
            <p className="font-medium">{formatRelativeTime(webhook.lastUsedAt)}</p>
          </div>
          <div>
            <span className="text-gray-500">Failures:</span>
            <p className={cn(
              'font-medium',
              webhook.failureCount > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {webhook.failureCount}
            </p>
          </div>
        </div>

        {webhook.eventTypes.length > 0 && (
          <div className="mb-4">
            <span className="text-sm text-gray-500">Event Types:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {webhook.eventTypes.map((event) => (
                <Badge key={event} variant="outline" className="text-xs">
                  {event}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-gray-400 truncate max-w-[200px]">
            {webhook.webhookUrl}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={isTesting}
            >
              {isTesting ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Testing...
                </>
              ) : (
                'Test'
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              disabled={isToggling}
            >
              {webhook.enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(webhook)}
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
