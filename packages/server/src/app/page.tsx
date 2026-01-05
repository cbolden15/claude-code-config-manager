import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

async function getStats() {
  const [componentCount, profileCount, projectCount, unreadMonitoring] = await Promise.all([
    prisma.component.count(),
    prisma.profile.count(),
    prisma.project.count(),
    prisma.monitoringEntry.count({ where: { isRead: false } }),
  ]);

  return { componentCount, profileCount, projectCount, unreadMonitoring };
}

async function getRecentProjects() {
  return prisma.project.findMany({
    include: { profile: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
}

async function getRecentMonitoring() {
  return prisma.monitoringEntry.findMany({
    where: { isRead: false },
    orderBy: { fetchedAt: 'desc' },
    take: 5,
  });
}

export default async function Dashboard() {
  const stats = await getStats();
  const recentProjects = await getRecentProjects();
  const recentMonitoring = await getRecentMonitoring();

  return (
    <>
      <Header
        title="Dashboard"
        description="Overview of your Claude Code configurations"
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Components</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.componentCount}
                  </p>
                </div>
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Profiles</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.profileCount}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Projects</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.projectCount}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Updates</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.unreadMonitoring}
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Recent Projects</CardTitle>
              <Link href="/projects">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No projects registered yet.</p>
                  <p className="text-sm mt-1">Use the CLI to initialize a project.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-sm text-gray-500">{project.path}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {project.profile && (
                          <Badge variant="secondary">{project.profile.name}</Badge>
                        )}
                        <Badge variant="outline">{project.machine}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monitoring Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Recent Updates</CardTitle>
              <Link href="/monitoring">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentMonitoring.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No unread updates.</p>
                  <p className="text-sm mt-1">Ecosystem changes will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMonitoring.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              entry.severity === 'important'
                                ? 'destructive'
                                : entry.severity === 'warning'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {entry.source}
                          </Badge>
                        </div>
                        <p className="font-medium text-gray-900 mt-1">{entry.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Link href="/components/new">
                <Button>New Component</Button>
              </Link>
              <Link href="/profiles/new">
                <Button variant="outline">New Profile</Button>
              </Link>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">CLI Quick Start</p>
              <code className="block mt-2 p-2 bg-gray-900 text-gray-100 rounded text-sm">
                ccm init my-project --profile general
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
