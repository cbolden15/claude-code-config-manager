'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Profile {
  id: string;
  name: string;
  description: string;
  components: {
    component: {
      type: string;
    };
  }[];
  _count: {
    projects: number;
  };
}

interface ProfilesClientProps {
  profiles: Profile[];
}

export function ProfilesClient({ profiles }: ProfilesClientProps) {
  const [showAutoClaudeOnly, setShowAutoClaudeOnly] = useState(false);

  // Filter profiles based on toggle state
  const filteredProfiles = profiles.filter((profile) => {
    if (!showAutoClaudeOnly) return true;

    // Check if profile has Auto-Claude components
    const autoClaudeTypes = ['AUTO_CLAUDE_AGENT_CONFIG', 'AUTO_CLAUDE_PROMPT', 'AUTO_CLAUDE_MODEL_PROFILE', 'AUTO_CLAUDE_PROJECT_CONFIG'];
    const hasAutoClaudeComponents = profile.components.some(pc =>
      autoClaudeTypes.includes(pc.component.type)
    );

    return hasAutoClaudeComponents;
  });

  // Calculate Auto-Claude statistics
  const autoClaudeProfiles = profiles.filter((profile) => {
    const autoClaudeTypes = ['AUTO_CLAUDE_AGENT_CONFIG', 'AUTO_CLAUDE_PROMPT', 'AUTO_CLAUDE_MODEL_PROFILE', 'AUTO_CLAUDE_PROJECT_CONFIG'];
    return profile.components.some(pc => autoClaudeTypes.includes(pc.component.type));
  });

  return (
    <>
      {/* Auto-Claude Toggle and Statistics */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-claude-toggle"
              checked={showAutoClaudeOnly}
              onCheckedChange={setShowAutoClaudeOnly}
            />
            <Label htmlFor="auto-claude-toggle" className="text-sm font-medium">
              Show Auto-Claude profiles only
            </Label>
          </div>
          {autoClaudeProfiles.length > 0 && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              🤖 {autoClaudeProfiles.length} of {profiles.length} profiles have Auto-Claude
            </Badge>
          )}
        </div>

        {/* Filter Status */}
        {showAutoClaudeOnly && (
          <div className="text-sm text-gray-500">
            Showing {filteredProfiles.length} of {profiles.length} profiles
          </div>
        )}
      </div>

      {/* Profiles Grid */}
      {filteredProfiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {showAutoClaudeOnly ? (
            <>
              <p>No profiles with Auto-Claude components found.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowAutoClaudeOnly(false)}
              >
                Show all profiles
              </Button>
            </>
          ) : (
            <>
              <p>No profiles created yet.</p>
              <Link href="/profiles/new">
                <Button variant="outline" className="mt-4">Create your first profile</Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredProfiles.map((profile) => {
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
    </>
  );
}