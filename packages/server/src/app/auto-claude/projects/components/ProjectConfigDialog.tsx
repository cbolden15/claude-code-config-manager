'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Server,
  Key,
  Settings,
  Plus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import type { AutoClaudeProjectConfig, CustomMcpServer, AgentMcpOverride } from '../../../../../../../packages/shared/src/types/auto-claude';

interface ProjectData {
  id: string;
  name: string;
  path: string;
  machine: string;
  autoClaudeEnabled: boolean;
  autoClaudeConfigId: string | null;
  modelProfileId: string | null;
  autoClaudeConfig?: {
    id: string;
    name: string;
    config: AutoClaudeProjectConfig;
  } | null;
}

interface ProjectConfigDialogProps {
  project: ProjectData;
  isOpen: boolean;
  onClose: () => void;
}

interface ModelProfileOption {
  id: string;
  name: string;
  description: string;
}

export default function ProjectConfigDialog({ project, isOpen, onClose }: ProjectConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [modelProfiles, setModelProfiles] = useState<ModelProfileOption[]>([]);

  // Form state
  const [selectedModelProfile, setSelectedModelProfile] = useState<string>(project.modelProfileId || '');
  const [config, setConfig] = useState<AutoClaudeProjectConfig>({
    context7Enabled: false,
    linearMcpEnabled: false,
    electronMcpEnabled: false,
    puppeteerMcpEnabled: false,
    graphitiEnabled: false,
    agentMcpOverrides: {},
    customMcpServers: [],
    linearApiKey: '',
    linearTeamId: '',
    githubToken: '',
    githubRepo: '',
  });

  useEffect(() => {
    // Load existing config if available
    if (project.autoClaudeConfig) {
      setConfig(project.autoClaudeConfig.config);
    }

    // Load available model profiles
    fetchModelProfiles();
  }, [project]);

  const fetchModelProfiles = async () => {
    try {
      const response = await fetch('/api/auto-claude/model-profiles');
      if (response.ok) {
        const data = await response.json();
        setModelProfiles(data.modelProfiles || []);
      }
    } catch (err) {
      console.error('Failed to fetch model profiles:', err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save or update the Auto-Claude project config
      const configResponse = project.autoClaudeConfigId
        ? await fetch(`/api/components/${project.autoClaudeConfigId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: config,
            }),
          })
        : await fetch('/api/components', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'AUTO_CLAUDE_PROJECT_CONFIG',
              name: `${project.name} Auto-Claude Config`,
              description: `Auto-Claude configuration for ${project.name} project`,
              config: config,
              enabled: true,
            }),
          });

      if (!configResponse.ok) {
        const errorData = await configResponse.json();
        throw new Error(errorData.error || 'Failed to save project config');
      }

      const savedConfig = await configResponse.json();

      // Update the project with config and model profile links
      const updateData: any = {
        autoClaudeEnabled: true,
      };

      if (!project.autoClaudeConfigId) {
        updateData.autoClaudeConfigId = savedConfig.id;
      }

      if (selectedModelProfile !== project.modelProfileId) {
        updateData.modelProfileId = selectedModelProfile || null;
      }

      const projectResponse = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json();
        throw new Error(errorData.error || 'Failed to update project');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addCustomMcpServer = () => {
    setConfig(prev => ({
      ...prev,
      customMcpServers: [
        ...(prev.customMcpServers || []),
        {
          id: `custom-${Date.now()}`,
          name: '',
          type: 'command' as const,
          command: '',
          args: [],
        },
      ],
    }));
  };

  const updateCustomMcpServer = (index: number, updates: Partial<CustomMcpServer>) => {
    setConfig(prev => ({
      ...prev,
      customMcpServers: prev.customMcpServers?.map((server, i) =>
        i === index ? { ...server, ...updates } : server
      ) || [],
    }));
  };

  const removeCustomMcpServer = (index: number) => {
    setConfig(prev => ({
      ...prev,
      customMcpServers: prev.customMcpServers?.filter((_, i) => i !== index) || [],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Auto-Claude for {project.name}</DialogTitle>
          <DialogDescription>
            Manage MCP toggles, credentials, and model profiles for this project
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="mcp-toggles" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mcp-toggles">MCP Servers</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="model-profile">Model Profile</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="mcp-toggles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Built-in MCP Servers
                </CardTitle>
                <CardDescription>
                  Toggle which MCP servers are enabled for this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div>
                      <Label htmlFor="context7">Context7 (Documentation)</Label>
                      <p className="text-sm text-gray-500">Enhanced documentation search and retrieval</p>
                    </div>
                    <Switch
                      id="context7"
                      checked={config.context7Enabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, context7Enabled: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div>
                      <Label htmlFor="linear">Linear MCP</Label>
                      <p className="text-sm text-gray-500">Linear issues and project management</p>
                    </div>
                    <Switch
                      id="linear"
                      checked={config.linearMcpEnabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, linearMcpEnabled: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div>
                      <Label htmlFor="electron">Electron MCP</Label>
                      <p className="text-sm text-gray-500">Electron app development tools</p>
                    </div>
                    <Switch
                      id="electron"
                      checked={config.electronMcpEnabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, electronMcpEnabled: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div>
                      <Label htmlFor="puppeteer">Puppeteer MCP</Label>
                      <p className="text-sm text-gray-500">Browser automation and testing</p>
                    </div>
                    <Switch
                      id="puppeteer"
                      checked={config.puppeteerMcpEnabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, puppeteerMcpEnabled: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2 md:col-span-2">
                    <div>
                      <Label htmlFor="graphiti">Graphiti (Graph Database)</Label>
                      <p className="text-sm text-gray-500">Graph-based knowledge management</p>
                    </div>
                    <Switch
                      id="graphiti"
                      checked={config.graphitiEnabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, graphitiEnabled: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom MCP Servers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Custom MCP Servers
                  </span>
                  <Button onClick={addCustomMcpServer} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Server
                  </Button>
                </CardTitle>
                <CardDescription>
                  Configure custom MCP servers for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {config.customMcpServers && config.customMcpServers.length > 0 ? (
                  <div className="space-y-4">
                    {config.customMcpServers.map((server, index) => (
                      <Card key={index} className="border-dashed">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="font-medium">Custom Server #{index + 1}</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeCustomMcpServer(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`server-name-${index}`}>Server Name</Label>
                              <Input
                                id={`server-name-${index}`}
                                value={server.name}
                                onChange={(e) => updateCustomMcpServer(index, { name: e.target.value })}
                                placeholder="my-custom-server"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`server-command-${index}`}>Command</Label>
                              <Input
                                id={`server-command-${index}`}
                                value={server.command || ''}
                                onChange={(e) => updateCustomMcpServer(index, { command: e.target.value })}
                                placeholder="node server.js"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-6">
                    No custom MCP servers configured. Click "Add Server" to create one.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Key className="h-5 w-5 mr-2" />
                    API Keys & Credentials
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCredentials(!showCredentials)}
                  >
                    {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showCredentials ? 'Hide' : 'Show'} Values
                  </Button>
                </CardTitle>
                <CardDescription>
                  Configure API keys and credentials for integrated services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linear-api-key">Linear API Key</Label>
                    <Input
                      id="linear-api-key"
                      type={showCredentials ? "text" : "password"}
                      value={config.linearApiKey || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, linearApiKey: e.target.value }))}
                      placeholder="lin_api_..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="linear-team-id">Linear Team ID</Label>
                    <Input
                      id="linear-team-id"
                      value={config.linearTeamId || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, linearTeamId: e.target.value }))}
                      placeholder="your-team"
                    />
                  </div>
                  <div>
                    <Label htmlFor="github-token">GitHub Token</Label>
                    <Input
                      id="github-token"
                      type={showCredentials ? "text" : "password"}
                      value={config.githubToken || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, githubToken: e.target.value }))}
                      placeholder="ghp_..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="github-repo">GitHub Repository</Label>
                    <Input
                      id="github-repo"
                      value={config.githubRepo || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, githubRepo: e.target.value }))}
                      placeholder="owner/repo"
                    />
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Credentials are encrypted and stored securely. They will be included in generated
                    .auto-claude/.env files for this project.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="model-profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Model Profile Selection</CardTitle>
                <CardDescription>
                  Choose the model profile for Auto-Claude phases (spec, planning, coding, QA)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="no-profile"
                      name="model-profile"
                      value=""
                      checked={selectedModelProfile === ''}
                      onChange={(e) => setSelectedModelProfile(e.target.value)}
                    />
                    <label htmlFor="no-profile" className="cursor-pointer">
                      <div className="font-medium">Default (No specific profile)</div>
                      <div className="text-sm text-gray-500">Use Auto-Claude defaults</div>
                    </label>
                  </div>
                  {modelProfiles.map((profile) => (
                    <div key={profile.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`profile-${profile.id}`}
                        name="model-profile"
                        value={profile.id}
                        checked={selectedModelProfile === profile.id}
                        onChange={(e) => setSelectedModelProfile(e.target.value)}
                      />
                      <label htmlFor={`profile-${profile.id}`} className="cursor-pointer flex-1">
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-sm text-gray-500">{profile.description}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>
                  Per-agent MCP overrides and advanced settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Advanced settings coming soon. This will include per-agent MCP server overrides
                    and custom configuration options.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}