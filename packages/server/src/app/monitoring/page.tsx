import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AcknowledgeButton } from './acknowledge-button';
import { AcknowledgeAllButton } from './acknowledge-all-button';

async function getMonitoringEntries() {
  const entries = await prisma.monitoringEntry.findMany({
    orderBy: { fetchedAt: 'desc' },
    take: 100,
  });

  const unreadCount = await prisma.monitoringEntry.count({
    where: { isRead: false },
  });

  return { entries, unreadCount };
}

const severityColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  important: 'bg-red-100 text-red-800',
};

const sourceLabels: Record<string, string> = {
  'claude-code-changelog': 'Claude Code',
  'mcp-servers': 'MCP Servers',
  'anthropic-api': 'Anthropic API',
  manual: 'Manual',
};

function formatDate(date: Date) {
  return new Date(date).toLocaleString();
}

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

export default async function MonitoringPage() {
  const { entries, unreadCount } = await getMonitoringEntries();

  const unreadEntries = entries.filter((e) => !e.isRead);
  const readEntries = entries.filter((e) => e.isRead);

  // Group by source
  const entriesBySource = entries.reduce((acc, entry) => {
    if (!acc[entry.source]) {
      acc[entry.source] = [];
    }
    acc[entry.source].push(entry);
    return acc;
  }, {} as Record<string, typeof entries>);

  const sources = Object.keys(entriesBySource).sort();

  return (
    <>
      <Header
        title="Monitoring"
        description="Track ecosystem updates and changes"
        actions={
          unreadCount > 0 ? (
            <AcknowledgeAllButton count={unreadCount} />
          ) : null
        }
      />

      <div className="p-6">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No monitoring entries yet.</p>
            <p className="text-sm mt-2">
              Entries will appear here when n8n sends ecosystem updates.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="unread">
            <TabsList className="mb-6">
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="default" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
              {sources.map((source) => (
                <TabsTrigger key={source} value={source}>
                  {sourceLabels[source] || source}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="unread">
              {unreadEntries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>All caught up!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unreadEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all">
              <div className="space-y-4">
                {entries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </TabsContent>

            {sources.map((source) => (
              <TabsContent key={source} value={source}>
                <div className="space-y-4">
                  {entriesBySource[source].map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </>
  );
}

function EntryCard({ entry }: { entry: {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string | null;
  severity: string;
  isRead: boolean;
  fetchedAt: Date;
}}) {
  return (
    <Card className={entry.isRead ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs ${severityColors[entry.severity]}`}>
                {entry.severity}
              </span>
              <span className="text-xs text-gray-500">
                {sourceLabels[entry.source] || entry.source}
              </span>
              <span className="text-xs text-gray-400">
                {formatRelativeTime(entry.fetchedAt)}
              </span>
              {entry.isRead && (
                <Badge variant="outline" className="text-xs">Read</Badge>
              )}
            </div>

            <h3 className="font-semibold text-gray-900 mb-1">{entry.title}</h3>

            <p className="text-sm text-gray-600 line-clamp-3">{entry.content}</p>

            {entry.url && (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 mt-2"
              >
                View source
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {!entry.isRead && (
            <AcknowledgeButton entryId={entry.id} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
