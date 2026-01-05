import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

async function getComponents() {
  const components = await prisma.component.findMany({
    include: {
      profiles: {
        include: { profile: { select: { name: true } } },
      },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  return components.map((c) => ({
    ...c,
    config: JSON.parse(c.config),
    profileCount: c.profiles.length,
  }));
}

function ComponentCard({ component }: { component: Awaited<ReturnType<typeof getComponents>>[0] }) {
  return (
    <Link href={`/components/${component.id}`}>
      <Card className="hover:border-gray-300 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColors[component.type]}`}>
                  {typeLabels[component.type]}
                </span>
                {!component.enabled && (
                  <Badge variant="outline" className="text-gray-400">Disabled</Badge>
                )}
              </div>
              <h3 className="font-medium text-gray-900">{component.name}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{component.description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-1">
              {component.tags.split(',').filter(Boolean).slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {tag.trim()}
                </span>
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {component.profileCount} profile{component.profileCount !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function ComponentsPage() {
  const components = await getComponents();

  const componentsByType = {
    all: components,
    MCP_SERVER: components.filter((c) => c.type === 'MCP_SERVER'),
    SUBAGENT: components.filter((c) => c.type === 'SUBAGENT'),
    SKILL: components.filter((c) => c.type === 'SKILL'),
    COMMAND: components.filter((c) => c.type === 'COMMAND'),
    HOOK: components.filter((c) => c.type === 'HOOK'),
    CLAUDE_MD_TEMPLATE: components.filter((c) => c.type === 'CLAUDE_MD_TEMPLATE'),
  };

  return (
    <>
      <Header
        title="Components"
        description="Manage reusable configuration components"
        actions={
          <Link href="/components/new">
            <Button>New Component</Button>
          </Link>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({componentsByType.all.length})</TabsTrigger>
            <TabsTrigger value="MCP_SERVER">MCP ({componentsByType.MCP_SERVER.length})</TabsTrigger>
            <TabsTrigger value="SUBAGENT">Agents ({componentsByType.SUBAGENT.length})</TabsTrigger>
            <TabsTrigger value="SKILL">Skills ({componentsByType.SKILL.length})</TabsTrigger>
            <TabsTrigger value="COMMAND">Commands ({componentsByType.COMMAND.length})</TabsTrigger>
            <TabsTrigger value="HOOK">Hooks ({componentsByType.HOOK.length})</TabsTrigger>
            <TabsTrigger value="CLAUDE_MD_TEMPLATE">Templates ({componentsByType.CLAUDE_MD_TEMPLATE.length})</TabsTrigger>
          </TabsList>

          {Object.entries(componentsByType).map(([type, items]) => (
            <TabsContent key={type} value={type} className="mt-6">
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No components found.</p>
                  <Link href="/components/new">
                    <Button variant="outline" className="mt-4">Create your first component</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {items.map((component) => (
                    <ComponentCard key={component.id} component={component} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
