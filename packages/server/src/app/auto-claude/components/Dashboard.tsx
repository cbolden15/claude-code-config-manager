import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, FileText, Cpu, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

// Server component to fetch Auto-Claude data
async function getAutoClaudeData() {
  const [agents, prompts, modelProfiles, projects] = await Promise.all([
    // Get agent configs count
    prisma.component.count({
      where: { type: 'AUTO_CLAUDE_AGENT_CONFIG' }
    }),

    // Get prompts count
    prisma.component.count({
      where: { type: 'AUTO_CLAUDE_PROMPT' }
    }),

    // Get model profiles count
    prisma.component.count({
      where: { type: 'AUTO_CLAUDE_MODEL_PROFILE' }
    }),

    // Get projects with Auto-Claude enabled and sync status
    prisma.project.findMany({
      where: { autoClaudeEnabled: true },
      select: {
        id: true,
        name: true,
        lastAutoClaudeSync: true,
      },
      orderBy: { lastAutoClaudeSync: 'desc' },
      take: 5,
    })
  ]);

  return { agents, prompts, modelProfiles, projects };
}

interface OverviewCardProps {
  title: string;
  count: number;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  color: string;
}

function OverviewCard({ title, count, description, icon: Icon, href, color }: OverviewCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:border-gray-300 transition-colors cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${color} flex-shrink-0`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-2xl font-bold text-gray-600 mt-1">{count}</p>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface SyncStatusCardProps {
  projects: Array<{
    id: string;
    name: string;
    lastAutoClaudeSync: Date | null;
  }>;
}

function SyncStatusCard({ projects }: SyncStatusCardProps) {
  const hasProjects = projects.length > 0;
  const recentSync = hasProjects ? projects[0]?.lastAutoClaudeSync : null;

  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-emerald-500 flex-shrink-0">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
              <p className="text-sm text-gray-500">Auto-Claude synchronization</p>
            </div>
          </div>
          <Link href="/auto-claude/sync">
            <Button variant="outline" size="sm">
              Sync Now
            </Button>
          </Link>
        </div>

        {hasProjects ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Last Sync:</span>
              <div className="flex items-center">
                {recentSync ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-500 mr-1" />
                    <span className="text-sm text-gray-600">{formatSyncTime(recentSync)}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500 mr-1" />
                    <span className="text-sm text-gray-600">Never</span>
                  </>
                )}
              </div>
            </div>

            <div className="border-t pt-3">
              <span className="text-sm font-medium text-gray-900 block mb-2">
                Active Projects ({projects.length})
              </span>
              <div className="space-y-1">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate">{project.name}</span>
                    <span className="text-gray-400 ml-2">
                      {formatSyncTime(project.lastAutoClaudeSync)}
                    </span>
                  </div>
                ))}
                {projects.length > 3 && (
                  <p className="text-xs text-gray-400 pt-1">
                    +{projects.length - 3} more projects
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">No Auto-Claude projects yet</p>
            <Link href="/profiles">
              <Button variant="outline" size="sm">
                Create Project
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function Dashboard() {
  const { agents, prompts, modelProfiles, projects } = await getAutoClaudeData();

  return (
    <>
      <Header
        title="Auto-Claude Dashboard"
        description="Manage Auto-Claude configurations, prompts, and model profiles"
        actions={
          <Link href="/auto-claude/import">
            <Button>
              Import Configs
            </Button>
          </Link>
        }
      />

      <div className="p-6">

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <Link href="/auto-claude/agents">
              <Button variant="outline">
                Manage Agents
              </Button>
            </Link>
            <Link href="/auto-claude/prompts">
              <Button variant="outline">
                Edit Prompts
              </Button>
            </Link>
            <Link href="/auto-claude/profiles">
              <Button variant="outline">
                Model Profiles
              </Button>
            </Link>
          </div>
        </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <OverviewCard
          title="Agent Configs"
          count={agents}
          description="Tool and MCP configurations per agent type"
          icon={Settings}
          href="/auto-claude/agents"
          color="bg-blue-500"
        />

        <OverviewCard
          title="Prompts"
          count={prompts}
          description="Agent persona prompts and instructions"
          icon={FileText}
          href="/auto-claude/prompts"
          color="bg-violet-500"
        />

        <OverviewCard
          title="Model Profiles"
          count={modelProfiles}
          description="Phase-by-phase model and thinking configurations"
          icon={Cpu}
          href="/auto-claude/profiles"
          color="bg-emerald-500"
        />

        {/* Sync Status Card spans remaining width */}
        <div className="xl:col-span-1">
          <SyncStatusCard projects={projects} />
        </div>
      </div>

      {/* Help Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Getting Started</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">1. Import Existing</h4>
              <p className="text-gray-600 mb-2">
                Import your existing Auto-Claude configurations to get started quickly.
              </p>
              <Link href="/auto-claude/import">
                <Button variant="outline" size="sm">
                  Start Import
                </Button>
              </Link>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">2. Configure Agents</h4>
              <p className="text-gray-600 mb-2">
                Set up agent tools, MCP servers, and thinking levels for each agent type.
              </p>
              <Link href="/auto-claude/agents">
                <Button variant="outline" size="sm">
                  Manage Agents
                </Button>
              </Link>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">3. Sync to Backend</h4>
              <p className="text-gray-600 mb-2">
                Synchronize your configurations to the Auto-Claude backend installation.
              </p>
              <Button variant="outline" size="sm" disabled>
                Sync (Configure backend path first)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}