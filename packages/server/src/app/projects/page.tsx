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

async function getProjects() {
  return prisma.project.findMany({
    include: {
      profile: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ machine: 'asc' }, { name: 'asc' }],
  });
}

function formatDate(date: Date | null) {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString();
}

function getSyncStatus(lastSyncedAt: Date | null) {
  if (!lastSyncedAt) {
    return { label: 'Never synced', color: 'bg-gray-100 text-gray-800' };
  }

  const now = new Date();
  const synced = new Date(lastSyncedAt);
  const diffDays = Math.floor((now.getTime() - synced.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return { label: 'Synced today', color: 'bg-green-100 text-green-800' };
  } else if (diffDays < 7) {
    return { label: `${diffDays}d ago`, color: 'bg-green-100 text-green-800' };
  } else if (diffDays < 30) {
    return { label: `${Math.floor(diffDays / 7)}w ago`, color: 'bg-yellow-100 text-yellow-800' };
  } else {
    return { label: 'Stale', color: 'bg-red-100 text-red-800' };
  }
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  // Group projects by machine
  const projectsByMachine = projects.reduce((acc, project) => {
    if (!acc[project.machine]) {
      acc[project.machine] = [];
    }
    acc[project.machine].push(project);
    return acc;
  }, {} as Record<string, typeof projects>);

  const machines = Object.keys(projectsByMachine).sort();

  return (
    <>
      <Header
        title="Projects"
        description="Tracked projects across your machines"
        actions={
          <Link href="/projects/new">
            <Button>Register Project</Button>
          </Link>
        }
      />

      <div className="p-6">
        {projects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No projects registered yet.</p>
            <p className="text-sm mt-2">
              Use the CLI to initialize a project: <code className="bg-gray-100 px-2 py-1 rounded">ccm init my-project</code>
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {machines.map((machine) => (
              <Card key={machine}>
                <CardContent className="p-0">
                  <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <h3 className="font-semibold text-gray-900">{machine}</h3>
                      <Badge variant="outline">{projectsByMachine[machine].length} projects</Badge>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Profile</TableHead>
                        <TableHead>Sync Status</TableHead>
                        <TableHead>Last Synced</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectsByMachine[machine].map((project) => {
                        const syncStatus = getSyncStatus(project.lastSyncedAt);
                        return (
                          <TableRow key={project.id}>
                            <TableCell>
                              <Link
                                href={`/projects/${project.id}`}
                                className="font-medium text-violet-600 hover:text-violet-800"
                              >
                                {project.name}
                              </Link>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-gray-500">
                              {project.path}
                            </TableCell>
                            <TableCell>
                              {project.profile ? (
                                <Link
                                  href={`/profiles/${project.profile.id}`}
                                  className="text-violet-600 hover:text-violet-800"
                                >
                                  {project.profile.name}
                                </Link>
                              ) : (
                                <span className="text-gray-400">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded text-xs ${syncStatus.color}`}>
                                {syncStatus.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(project.lastSyncedAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
