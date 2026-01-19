import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DeleteButton } from './delete-button';

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      machine: true,
    },
  });
}

async function getProjectRecommendations(machineId: string) {
  return prisma.recommendation.findMany({
    where: {
      machineId,
      status: 'active',
    },
    take: 5,
    orderBy: { priority: 'asc' },
  });
}

function formatDate(date: Date | null | undefined) {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
}

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

  const recommendations = await getProjectRecommendations(project.machineId);

  // Parse detected technologies and patterns
  const detectedTechs = project.detectedTechs
    ? JSON.parse(project.detectedTechs) as string[]
    : [];
  const detectedPatterns = project.detectedPatterns
    ? JSON.parse(project.detectedPatterns) as string[]
    : [];

  return (
    <>
      <Header
        title={project.name}
        description={project.path}
        actions={
          <div className="flex gap-2">
            <Link href={`/context?project=${encodeURIComponent(project.path)}`}>
              <Button variant="outline">Analyze Context</Button>
            </Link>
            <DeleteButton projectId={project.id} projectName={project.name} />
          </div>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Detected Technologies */}
            <Card>
              <CardHeader>
                <CardTitle>Detected Technologies</CardTitle>
              </CardHeader>
              <CardContent>
                {detectedTechs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detectedTechs.map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No technologies detected yet. Technologies are discovered from session activity.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Detected Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                {detectedPatterns.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detectedPatterns.map((pattern) => (
                      <Badge key={pattern} variant="outline">
                        {pattern.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No patterns detected yet. Patterns are identified from repeated behaviors across sessions.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recommendations</CardTitle>
                <Link href="/recommendations">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <Link
                        key={rec.id}
                        href={`/recommendations/${rec.id}`}
                        className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{rec.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{rec.category}</p>
                          </div>
                          <Badge
                            variant={rec.priority === 'critical' ? 'destructive' : 'secondary'}
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No active recommendations for this machine.
                  </p>
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
                  <p className="text-sm text-gray-500 mb-2">Analyze CLAUDE.md:</p>
                  <code className="block p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono">
                    ccm context analyze --project &quot;{project.path}&quot;
                  </code>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">View recommendations:</p>
                  <code className="block p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono">
                    ccm recommendations list
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
                    <Link href={`/machines/${project.machine.id}`} className="font-medium hover:text-blue-600">
                      {project.machine.name}
                    </Link>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Path</p>
                  <p className="text-sm font-mono mt-1 break-all">{project.path}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Platform</p>
                  <p className="text-sm mt-1">{project.machine.platform}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500">Last Active</p>
                  <p className="text-sm mt-1">{formatDate(project.lastActiveAt)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Discovered</p>
                  <p className="text-sm mt-1">{formatDate(project.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
