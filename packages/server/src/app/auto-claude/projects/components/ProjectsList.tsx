'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Settings, Monitor, Clock, Edit, Power } from 'lucide-react';
import ProjectConfigDialog from './ProjectConfigDialog';
import type { AutoClaudeProjectConfig } from '../../../../../../../packages/shared/src/types/auto-claude';

interface ProjectData {
  id: string;
  name: string;
  path: string;
  machine: string;
  profileId: string | null;
  autoClaudeEnabled: boolean;
  autoClaudeConfigId: string | null;
  modelProfileId: string | null;
  lastAutoClaudeSync: string | null;
  profile?: {
    id: string;
    name: string;
  } | null;
  autoClaudeConfig?: {
    id: string;
    name: string;
    config: AutoClaudeProjectConfig;
  } | null;
  modelProfile?: {
    id: string;
    name: string;
    description: string;
  } | null;
}

interface ProjectsApiResponse {
  projects: ProjectData[];
  total: number;
  stats: {
    totalProjects: number;
    autoClaudeEnabled: number;
    withConfigs: number;
    withModelProfiles: number;
    recentSyncs: number;
  };
}

export default function ProjectsList() {
  const [data, setData] = useState<ProjectsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects?includeAutoClaudeData=true');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const result = await response.json();

      // Calculate stats
      const stats = {
        totalProjects: result.projects.length,
        autoClaudeEnabled: result.projects.filter((p: ProjectData) => p.autoClaudeEnabled).length,
        withConfigs: result.projects.filter((p: ProjectData) => p.autoClaudeConfigId).length,
        withModelProfiles: result.projects.filter((p: ProjectData) => p.modelProfileId).length,
        recentSyncs: result.projects.filter((p: ProjectData) => {
          if (!p.lastAutoClaudeSync) return false;
          const syncDate = new Date(p.lastAutoClaudeSync);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return syncDate > weekAgo;
        }).length,
      };

      setData({ ...result, stats });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleConfigure = (project: ProjectData) => {
    setEditingProject(project);
  };

  const handleToggleAutoClaudeEnabled = async (project: ProjectData) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoClaudeEnabled: !project.autoClaudeEnabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }

      await fetchProjects(); // Refresh the list
    } catch (err) {
      alert(`Error updating project: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCloseDialog = () => {
    setEditingProject(null);
    fetchProjects(); // Refresh after potential changes
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  const formatLastSync = (syncDate: string | null) => {
    if (!syncDate) return 'Never';
    const date = new Date(syncDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{data.stats.totalProjects}</div>
            <div className="text-sm text-gray-500">Total Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{data.stats.autoClaudeEnabled}</div>
            <div className="text-sm text-gray-500">Auto-Claude Enabled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{data.stats.withConfigs}</div>
            <div className="text-sm text-gray-500">With Configs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{data.stats.withModelProfiles}</div>
            <div className="text-sm text-gray-500">With Model Profiles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-cyan-600">{data.stats.recentSyncs}</div>
            <div className="text-sm text-gray-500">Recent Syncs</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {data.projects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Settings className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium">No projects found.</p>
            <p className="text-sm mt-1">Create your first project to get started with Auto-Claude configuration.</p>
          </div>
        ) : (
          data.projects.map((project) => (
            <Card key={project.id} className={project.autoClaudeEnabled ? 'border-green-200 bg-green-50/30' : ''}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="font-semibold text-lg">{project.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Monitor className="h-4 w-4" />
                        <span>{project.machine}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-mono text-xs">{project.path}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={project.autoClaudeEnabled ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleAutoClaudeEnabled(project)}
                    >
                      <Power className="h-4 w-4 mr-1" />
                      {project.autoClaudeEnabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigure(project)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={project.autoClaudeEnabled ? "default" : "secondary"}>
                      {project.autoClaudeEnabled ? 'Auto-Claude Enabled' : 'Auto-Claude Disabled'}
                    </Badge>
                    {project.autoClaudeConfigId && (
                      <Badge variant="outline" className="text-purple-600 border-purple-200">
                        Project Config: {project.autoClaudeConfig?.name || 'Unknown'}
                      </Badge>
                    )}
                    {project.modelProfileId && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Model Profile: {project.modelProfile?.name || 'Unknown'}
                      </Badge>
                    )}
                  </div>

                  {/* Configuration status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Profile:</div>
                      <div className="font-medium">
                        {project.profile ? project.profile.name : 'No profile assigned'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Last Sync:
                      </div>
                      <div className="font-medium">
                        {formatLastSync(project.lastAutoClaudeSync)}
                      </div>
                    </div>
                  </div>

                  {/* MCP Overview (if config exists) */}
                  {project.autoClaudeConfig && (
                    <div>
                      <div className="text-sm text-gray-500 mb-2">MCP Servers Enabled:</div>
                      <div className="flex flex-wrap gap-1">
                        {project.autoClaudeConfig.config.context7Enabled && (
                          <Badge variant="secondary" className="text-xs">Context7</Badge>
                        )}
                        {project.autoClaudeConfig.config.linearMcpEnabled && (
                          <Badge variant="secondary" className="text-xs">Linear</Badge>
                        )}
                        {project.autoClaudeConfig.config.electronMcpEnabled && (
                          <Badge variant="secondary" className="text-xs">Electron</Badge>
                        )}
                        {project.autoClaudeConfig.config.puppeteerMcpEnabled && (
                          <Badge variant="secondary" className="text-xs">Puppeteer</Badge>
                        )}
                        {project.autoClaudeConfig.config.graphitiEnabled && (
                          <Badge variant="secondary" className="text-xs">Graphiti</Badge>
                        )}
                        {project.autoClaudeConfig.config.customMcpServers &&
                         project.autoClaudeConfig.config.customMcpServers.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{project.autoClaudeConfig.config.customMcpServers.length} Custom
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      {editingProject && (
        <ProjectConfigDialog
          project={editingProject}
          isOpen={true}
          onClose={handleCloseDialog}
        />
      )}
    </>
  );
}