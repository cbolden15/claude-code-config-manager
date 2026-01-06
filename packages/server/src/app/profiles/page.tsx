import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

async function getProfiles() {
  return prisma.profile.findMany({
    include: {
      components: {
        include: { component: { select: { type: true } } },
      },
      _count: { select: { projects: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export default async function ProfilesPage() {
  const profiles = await getProfiles();

  return (
    <>
      <Header
        title="Profiles"
        description="Manage component bundles for different project types"
        actions={
          <Link href="/profiles/new">
            <Button>New Profile</Button>
          </Link>
        }
      />

      <div className="p-6">
        {profiles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No profiles created yet.</p>
            <Link href="/profiles/new">
              <Button variant="outline" className="mt-4">Create your first profile</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {profiles.map((profile) => {
              const componentCounts = profile.components.reduce((acc, pc) => {
                acc[pc.component.type] = (acc[pc.component.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              // Check if profile has Auto-Claude components
              const autoClaudeTypes = ['AUTO_CLAUDE_AGENT_CONFIG', 'AUTO_CLAUDE_PROMPT', 'AUTO_CLAUDE_MODEL_PROFILE', 'AUTO_CLAUDE_PROJECT_CONFIG'];
              const autoClaudeComponentCount = autoClaudeTypes.reduce((total, type) => total + (componentCounts[type] || 0), 0);
              const hasAutoClaudeComponents = autoClaudeComponentCount > 0;

              return (
                <Link key={profile.id} href={`/profiles/${profile.id}`}>
                  <Card className="hover:border-gray-300 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                          {hasAutoClaudeComponents && (
                            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              🤖 Auto-Claude
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline">{profile._count.projects} projects</Badge>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                        {profile.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {componentCounts.MCP_SERVER && (
                          <span className="text-xs bg-violet-100 text-violet-800 px-2 py-0.5 rounded">
                            {componentCounts.MCP_SERVER} MCP
                          </span>
                        )}
                        {componentCounts.SUBAGENT && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {componentCounts.SUBAGENT} Agents
                          </span>
                        )}
                        {componentCounts.SKILL && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            {componentCounts.SKILL} Skills
                          </span>
                        )}
                        {componentCounts.COMMAND && (
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            {componentCounts.COMMAND} Commands
                          </span>
                        )}
                        {componentCounts.HOOK && (
                          <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                            {componentCounts.HOOK} Hooks
                          </span>
                        )}
                        {componentCounts.AUTO_CLAUDE_AGENT_CONFIG && (
                          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                            {componentCounts.AUTO_CLAUDE_AGENT_CONFIG} AC Agents
                          </span>
                        )}
                        {componentCounts.AUTO_CLAUDE_PROMPT && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                            {componentCounts.AUTO_CLAUDE_PROMPT} AC Prompts
                          </span>
                        )}
                        {componentCounts.AUTO_CLAUDE_MODEL_PROFILE && (
                          <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                            {componentCounts.AUTO_CLAUDE_MODEL_PROFILE} AC Profiles
                          </span>
                        )}
                        {componentCounts.AUTO_CLAUDE_PROJECT_CONFIG && (
                          <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                            {componentCounts.AUTO_CLAUDE_PROJECT_CONFIG} AC Config
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
