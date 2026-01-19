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
      projects: {
        orderBy: { lastActiveAt: 'desc' },
        take: 10,
      },
      sessions: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
      recommendations: {
        where: { status: 'active' },
        take: 5,
      },
      healthScores: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
  });
}

function formatDate(date: Date | null) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
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
  const latestHealth = machine.healthScores[0];

  return (
    <>
      <Header
        title={machine.name}
        description={`Machine details and activity`}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Summary</CardTitle>
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
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm text-gray-900">
                  {formatDate(machine.createdAt)}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Projects</span>
                <span className="font-medium text-gray-900">{machine.projects.length}</span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Recent Sessions</span>
                <span className="font-medium text-gray-900">{machine.sessions.length}</span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">Active Recommendations</span>
                <span className="font-medium text-gray-900">{machine.recommendations.length}</span>
              </div>

              {latestHealth && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">Health Score</span>
                  <span className="font-medium text-gray-900">{latestHealth.score}/100</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Projects</CardTitle>
            <Badge variant="outline">{machine.projects.length} total</Badge>
          </CardHeader>
          <CardContent>
            {machine.projects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-sm">No projects tracked yet.</p>
                <p className="text-xs mt-1">
                  Projects are auto-detected from Claude Code sessions.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machine.projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {project.path}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {project.lastActiveAt ? formatDate(project.lastActiveAt) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Sessions</CardTitle>
            <Badge variant="outline">Last 10 sessions</Badge>
          </CardHeader>
          <CardContent>
            {machine.sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No sessions recorded yet.</p>
                <p className="text-xs mt-1">
                  Sessions will appear here after using Claude Code.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machine.sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {session.projectName || session.projectPath || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(session.startedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {session.duration ? `${Math.floor(session.duration / 60)}m` : 'In progress'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {session.tokensUsed.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Active Recommendations */}
        {machine.recommendations.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Active Recommendations</CardTitle>
              <Link href="/recommendations">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {machine.recommendations.map((rec) => (
                  <div key={rec.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {rec.category} - {rec.priority} priority
                      </p>
                    </div>
                    <Badge variant="outline">
                      ~{rec.estimatedTokenSavings.toLocaleString()} tokens/mo
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
