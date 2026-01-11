import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Props {
  params: Promise<{ id: string }>;
}

async function getMachine(id: string) {
  return prisma.machine.findUnique({
    where: { id },
    include: {
      overrides: {
        orderBy: { createdAt: 'desc' },
      },
      syncLogs: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
  });
}

function formatDate(date: Date | null) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
}

function formatDuration(startedAt: Date, completedAt: Date | null) {
  if (!completedAt) return 'In progress';
  const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.floor(duration / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function getPlatformName(platform: string) {
  switch (platform) {
    case 'darwin': return 'macOS';
    case 'linux': return 'Linux';
    case 'win32': return 'Windows';
    default: return platform;
  }
}

export default async function MachineDetailPage({ params }: Props) {
  const { id } = await params;
  const machine = await getMachine(id);

  if (!machine) {
    notFound();
  }

  const lastSeenMinutes = Math.floor(
    (Date.now() - new Date(machine.lastSeen).getTime()) / (1000 * 60)
  );
  const isActive = lastSeenMinutes < 1440; // 24 hours

  return (
    <>
      <Header
        title={machine.name}
        description={`Machine details and configuration`}
        actions={
          <div className="flex gap-2">
            <Link href="/machines">
              <Button variant="outline">Back to Machines</Button>
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Machine Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Machine Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Name</span>
                <span className="font-medium text-gray-900">{machine.name}</span>
              </div>

              {machine.hostname && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">Hostname</span>
                  <span className="font-mono text-sm text-gray-900">{machine.hostname}</span>
                </div>
              )}

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Platform</span>
                <span className="font-medium text-gray-900">{getPlatformName(machine.platform)}</span>
              </div>

              {machine.arch && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">Architecture</span>
                  <span className="font-medium text-gray-900">{machine.arch}</span>
                </div>
              )}

              {machine.homeDir && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">Home Directory</span>
                  <span className="font-mono text-sm text-gray-900">{machine.homeDir}</span>
                </div>
              )}

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Status</span>
                <Badge variant={isActive ? "default" : "outline"} className={isActive ? "bg-green-100 text-green-800" : ""}>
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {machine.isCurrentMachine && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">Current Machine</span>
                  <Badge variant="default">Yes</Badge>
                </div>
              )}

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Sync Enabled</span>
                <Badge variant={machine.syncEnabled ? "default" : "outline"} className={machine.syncEnabled ? "bg-green-100 text-green-800" : ""}>
                  {machine.syncEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Last Seen</span>
                <div className="text-right">
                  <span className="font-medium text-gray-900 block">
                    {formatDate(machine.lastSeen)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {lastSeenMinutes < 60 ? `${lastSeenMinutes}m ago` : `${Math.floor(lastSeenMinutes / 60)}h ago`}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Last Synced</span>
                <span className="font-medium text-gray-900">
                  {formatDate(machine.lastSyncedAt)}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm text-gray-900">
                  {formatDate(machine.createdAt)}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Updated</span>
                <span className="text-sm text-gray-900">
                  {formatDate(machine.updatedAt)}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Total Overrides</span>
                <span className="font-medium text-gray-900">{machine.overrides.length}</span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Sync Logs</span>
                <span className="font-medium text-gray-900">{machine.syncLogs.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Machine Overrides */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Machine Overrides</CardTitle>
            <Badge variant="outline">{machine.overrides.length} total</Badge>
          </CardHeader>
          <CardContent>
            {machine.overrides.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <p className="text-sm">No overrides configured for this machine.</p>
                <p className="text-xs mt-1">
                  Overrides allow you to customize which components sync to this machine.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machine.overrides.map((override) => (
                    <TableRow key={override.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {override.configType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {override.configKey}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={override.action === 'exclude' ? 'destructive' : override.action === 'include' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {override.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {override.reason || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(override.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Sync Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Sync History</CardTitle>
            <Badge variant="outline">Last 10 syncs</Badge>
          </CardHeader>
          <CardContent>
            {machine.syncLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-sm">No sync history yet.</p>
                <p className="text-xs mt-1">
                  Sync logs will appear here after running sync operations.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Files Created</TableHead>
                    <TableHead>Files Updated</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machine.syncLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.syncType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.status === 'completed' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}
                          className={log.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.filesCreated || 0}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.filesUpdated || 0}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDuration(log.startedAt, log.completedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(log.startedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Machine Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button variant="outline" disabled>
                Toggle Sync
              </Button>
              <Button variant="outline" disabled>
                Add Override
              </Button>
              <Button variant="outline" disabled>
                Set as Current
              </Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700" disabled>
                Delete Machine
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Machine management actions are coming soon. Use the CLI to manage machines for now.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
