import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DeleteComponentButton } from './delete-button';

const typeLabels: Record<string, string> = {
  MCP_SERVER: 'MCP Server',
  SUBAGENT: 'Subagent',
  SKILL: 'Skill',
  COMMAND: 'Command',
  HOOK: 'Hook',
  CLAUDE_MD_TEMPLATE: 'Template',
};

async function getComponent(id: string) {
  const component = await prisma.component.findUnique({
    where: { id },
    include: {
      profiles: {
        include: { profile: { select: { id: true, name: true } } },
      },
    },
  });

  if (!component) return null;

  return {
    ...component,
    config: JSON.parse(component.config),
  };
}

export default async function ComponentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const component = await getComponent(id);

  if (!component) {
    notFound();
  }

  return (
    <>
      <Header
        title={component.name}
        description={component.description}
        actions={
          <div className="flex gap-2">
            <Link href={`/components/${id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            <DeleteComponentButton id={id} name={component.name} />
          </div>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(component.config, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Preview based on type */}
            {component.type === 'SUBAGENT' && component.config.instructions && (
              <Card>
                <CardHeader>
                  <CardTitle>Agent Instructions Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {component.config.instructions}
                  </pre>
                </CardContent>
              </Card>
            )}

            {component.type === 'COMMAND' && component.config.prompt && (
              <Card>
                <CardHeader>
                  <CardTitle>Command Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {component.config.prompt}
                  </pre>
                </CardContent>
              </Card>
            )}

            {component.type === 'CLAUDE_MD_TEMPLATE' && component.config.content && (
              <Card>
                <CardHeader>
                  <CardTitle>Template Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg font-mono">
                    {component.config.content}
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
                  <p className="text-sm text-gray-500">Type</p>
                  <Badge variant="secondary" className="mt-1">
                    {typeLabels[component.type]}
                  </Badge>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={component.enabled ? 'default' : 'outline'} className="mt-1">
                    {component.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                {component.version && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-gray-500">Version</p>
                      <p className="font-mono text-sm mt-1">{component.version}</p>
                    </div>
                  </>
                )}

                {component.sourceUrl && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-gray-500">Source</p>
                      <a
                        href={component.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 block truncate"
                      >
                        {component.sourceUrl}
                      </a>
                    </div>
                  </>
                )}

                {component.tags && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {component.tags.split(',').filter(Boolean).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-sm mt-1">
                    {new Date(component.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Updated</p>
                  <p className="text-sm mt-1">
                    {new Date(component.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Used in Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                {component.profiles.length === 0 ? (
                  <p className="text-sm text-gray-500">Not used in any profiles yet.</p>
                ) : (
                  <div className="space-y-2">
                    {component.profiles.map(({ profile }) => (
                      <Link
                        key={profile.id}
                        href={`/profiles/${profile.id}`}
                        className="block p-2 rounded-md hover:bg-gray-50 text-sm font-medium"
                      >
                        {profile.name}
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
