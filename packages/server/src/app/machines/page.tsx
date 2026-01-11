import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

async function getMachines() {
  return prisma.machine.findMany({
    include: {
      _count: {
        select: {
          overrides: true,
          syncLogs: true,
        },
      },
    },
    orderBy: { lastSeen: 'desc' },
  });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleString();
}

function getLastSeenStatus(lastSeen: Date) {
  const now = new Date();
  const seen = new Date(lastSeen);
  const diffMinutes = Math.floor((now.getTime() - seen.getTime()) / (1000 * 60));

  if (diffMinutes < 5) {
    return { label: 'Active now', color: 'bg-green-100 text-green-800' };
  } else if (diffMinutes < 60) {
    return { label: `${diffMinutes}m ago`, color: 'bg-green-100 text-green-800' };
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return { label: `${hours}h ago`, color: 'bg-yellow-100 text-yellow-800' };
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return { label: `${days}d ago`, color: 'bg-gray-100 text-gray-800' };
  }
}

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'darwin':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      );
    case 'linux':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.050 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.835-.41 1.6-.348 2.294.457 3.879 4.962 6.845 8.64 6.845 3.679 0 8.183-2.966 8.64-6.845.062-.694-.07-1.459-.348-2.294-.589-1.771-1.831-3.47-2.715-4.521-.75-1.067-.975-1.928-1.051-3.02-.065-1.491 1.055-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021zm-.005 2.883c.022.001.044.002.065.005.347.044.76.143 1.075.518.168.2.319.492.43.91.203.76.289 1.82.289 2.935v.002c-.001.02-.002.04-.004.06-.046.943-.131 1.748-.286 2.418-.22.951-.551 1.638-1.048 2.087-.498.45-1.17.678-2.101.678-.932 0-1.604-.228-2.102-.678-.497-.449-.828-1.136-1.048-2.087-.155-.67-.24-1.475-.286-2.418-.002-.02-.003-.04-.004-.06v-.002c0-1.115.086-2.175.289-2.935.111-.418.262-.71.43-.91.315-.375.728-.474 1.075-.518.021-.003.043-.004.065-.005.589-.015 1.231.245 1.58.731.174.243.29.54.373.906.056.25.094.525.127.828.066.609.101 1.32.127 2.145.052 1.65.165 3.815.449 5.092h.002c.142.638.318 1.047.497 1.285.09.119.186.198.29.241.052.021.113.036.184.045.035.004.072.007.11.008l.077.001c.038 0 .075-.001.111-.004.072-.006.133-.018.185-.04.104-.045.2-.124.29-.243.179-.238.355-.647.497-1.285h.002c.284-1.277.397-3.442.449-5.092.026-.825.061-1.536.127-2.145.033-.303.071-.578.127-.828.083-.366.199-.663.373-.906.349-.486.991-.746 1.58-.731z"/>
        </svg>
      );
    case 'win32':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
  }
}

export default async function MachinesPage() {
  const machines = await getMachines();

  const stats = {
    total: machines.length,
    active: machines.filter((m) => {
      const diffMinutes = Math.floor(
        (Date.now() - new Date(m.lastSeen).getTime()) / (1000 * 60)
      );
      return diffMinutes < 1440; // Active if seen in last 24 hours
    }).length,
    syncEnabled: machines.filter((m) => m.syncEnabled).length,
    current: machines.filter((m) => m.isCurrentMachine).length,
  };

  return (
    <>
      <Header
        title="Machines"
        description="Manage machines across your network"
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Machines</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.total}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active (24h)</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.active}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Sync Enabled</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.syncEnabled}
                  </p>
                </div>
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Current Machine</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.current}
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Machines Table */}
        {machines.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">No machines registered yet.</p>
                <p className="text-sm mt-2">
                  Machines will auto-register when you run CLI commands.
                </p>
                <code className="block mt-4 bg-gray-100 px-4 py-2 rounded text-sm">
                  ccm machine register
                </code>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Sync</TableHead>
                    <TableHead>Overrides</TableHead>
                    <TableHead>Sync Logs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.map((machine) => {
                    const lastSeenStatus = getLastSeenStatus(machine.lastSeen);
                    return (
                      <TableRow key={machine.id}>
                        <TableCell>
                          <Link
                            href={`/machines/${machine.id}`}
                            className="font-medium text-violet-600 hover:text-violet-800 flex items-center gap-2"
                          >
                            {machine.name}
                            {machine.isCurrentMachine && (
                              <Badge variant="default" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </Link>
                          {machine.hostname && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {machine.hostname}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">
                              {getPlatformIcon(machine.platform)}
                            </span>
                            <span className="text-sm capitalize">{machine.platform}</span>
                            {machine.arch && (
                              <Badge variant="outline" className="text-xs">
                                {machine.arch}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs ${lastSeenStatus.color}`}>
                            {lastSeenStatus.label}
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(machine.lastSeen)}
                          </p>
                        </TableCell>
                        <TableCell>
                          {machine.syncEnabled ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Disabled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {machine._count.overrides}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {machine._count.syncLogs}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/machines/${machine.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Managing Machines</p>
                <p className="text-sm text-gray-600 mt-1">
                  Machines automatically register when you run CLI commands. Use machine overrides to customize
                  which components, hooks, and settings sync to each machine.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
