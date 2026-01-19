import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

async function getProfile(id: string) {
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: {
      components: {
        include: { component: true },
        orderBy: { order: 'asc' },
      },
      projects: {
        select: { id: true, name: true, path: true, machine: true },
      },
    },
  });

  if (!profile) return null;

  return {
    ...profile,
    components: profile.components.map((pc) => ({
      ...pc.component,
      config: JSON.parse(pc.component.config),
      order: pc.order,
    })),
  };
}

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);

  if (!profile) {
    notFound();
  }

  const groupedComponents = profile.components.reduce((acc, c) => {
    if (!acc[c.type]) acc[c.type] = [];
    acc[c.type].push(c);
    return acc;
  }, {} as Record<string, typeof profile.components>);

  return (
    <>
      <Header
        title={profile.name}
        description={profile.description}
        actions={
          <div className="flex gap-2">
            <Link href={`/profiles/${id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            <Button variant="destructive">Delete</Button>
          </div>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Components */}
            <Card>
              <CardHeader>
                <CardTitle>Components ({profile.components.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(groupedComponents).map(([type, components]) => (
                  <div key={type} className="mb-6 last:mb-0">
                    <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${typeColors[type]}`}>
                        {typeLabels[type]}
                      </span>
                      <span className="text-gray-400">({components.length})</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {components.map((component) => (
                        <Link
                          key={component.id}
                          href={`/components/${component.id}`}
                          className="block p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <p className="font-medium text-sm text-gray-900">{component.name}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {component.description}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {profile.components.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No components in this profile.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* CLAUDE.md Template */}
            {profile.claudeMdTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle>CLAUDE.md Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg font-mono">
                    {(() => {
                      try {
                        const parsed = JSON.parse(profile.claudeMdTemplate);
                        return parsed.content || profile.claudeMdTemplate;
                      } catch {
                        return profile.claudeMdTemplate;
                      }
                    })()}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Components</p>
                  <p className="text-2xl font-semibold mt-1">{profile.components.length}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Projects Using</p>
                  <p className="text-2xl font-semibold mt-1">{profile.projects.length}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-sm mt-1">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Updated</p>
                  <p className="text-sm mt-1">
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.projects.length === 0 ? (
                  <p className="text-sm text-gray-500">No projects using this profile.</p>
                ) : (
                  <div className="space-y-2">
                    {profile.projects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="block p-2 rounded-md hover:bg-gray-50"
                      >
                        <p className="text-sm font-medium">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.machine}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CLI Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="block p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono">
                  ccm init my-project --profile {profile.name}
                </code>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
