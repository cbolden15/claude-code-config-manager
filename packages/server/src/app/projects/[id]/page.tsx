import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SyncButton } from './sync-button';
import { DeleteButton } from './delete-button';

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      profile: {
        include: {
          components: {
            include: { component: true },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });
}

function formatDate(date: Date | null) {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
}

const typeLabels: Record<string, string> = {
  MCP_SERVER: 'MCP Server',
  SUBAGENT: 'Subagent',
  SKILL: 'Skill',
  COMMAND: 'Command',
  HOOK: 'Hook',
  CLAUDE_MD_TEMPLATE: 'Template',
};

const typeColors: Record<string, string> = {
  MCP_SERVER: 'bg-violet-100 text-violet-800',
  SUBAGENT: 'bg-blue-100 text-blue-800',
  SKILL: 'bg-green-100 text-green-800',
  COMMAND: 'bg-amber-100 text-amber-800',
  HOOK: 'bg-rose-100 text-rose-800',
  CLAUDE_MD_TEMPLATE: 'bg-gray-100 text-gray-800',
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const components = project.profile?.components.map((pc) => pc.component) ?? [];
  const componentsByType = components.reduce((acc, c) => {
    if (!acc[c.type]) acc[c.type] = [];
    acc[c.type].push(c);
    return acc;
  }, {} as Record<string, typeof components>);

  return (
    <>
      <Header
        title={project.name}
        description={project.path}
        actions={
          <div className="flex gap-2">
            <SyncButton projectId={project.id} />
            <Link href={`/projects/${id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            <DeleteButton projectId={project.id} projectName={project.name} />
          </div>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Profile & Components */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {project.profile ? (
                    <span>
                      Profile:{' '}
                      <Link
                        href={`/profiles/${project.profile.id}`}
                        className="text-violet-600 hover:text-violet-800"
                      >
                        {project.profile.name}
                      </Link>
                    </span>
                  ) : (
                    'No Profile Assigned'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.profile ? (
                  <>
                    <p className="text-sm text-gray-500 mb-4">{project.profile.description}</p>

                    {Object.entries(componentsByType).map(([type, comps]) => (
                      <div key={type} className="mb-4 last:mb-0">
                        <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${typeColors[type]}`}>
                            {typeLabels[type]}
                          </span>
                          <span className="text-gray-400">({comps.length})</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {comps.map((component) => (
                            <Link
                              key={component.id}
                              href={`/components/${component.id}`}
                              className="block p-2 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                              <p className="font-medium text-sm text-gray-900">{component.name}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}

                    {components.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        Profile has no components.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      Assign a profile to this project to manage its configuration.
                    </p>
                    <Link href={`/projects/${id}/edit`}>
                      <Button variant="outline">Assign Profile</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CLI Commands */}
            <Card>
              <CardHeader>
                <CardTitle>CLI Commands</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Sync this project:</p>
                  <code className="block p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono">
                    ccm sync --path &quot;{project.path}&quot;
                  </code>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Apply profile changes:</p>
                  <code className="block p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono">
                    ccm apply --path &quot;{project.path}&quot;
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Machine</p>
                  <div className="flex items-center gap-2 mt-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="font-medium">{project.machine}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Path</p>
                  <p className="text-sm font-mono mt-1 break-all">{project.path}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Sync Status</p>
                  <div className="mt-1">
                    {project.lastSyncedAt ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Synced
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Never synced
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Last Synced</p>
                  <p className="text-sm mt-1">{formatDate(project.lastSyncedAt)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Registered</p>
                  <p className="text-sm mt-1">{formatDate(project.createdAt)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Updated</p>
                  <p className="text-sm mt-1">{formatDate(project.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
