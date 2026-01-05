'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  FileText,
  Settings,
  Database,
  User,
  ChevronDown,
  ChevronRight,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { WizardState } from '../page';

interface PreviewStepProps {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
}

export function PreviewStep({ wizardState, updateWizardState }: PreviewStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!wizardState.detectedConfigs && wizardState.autoClaudeInstallPath) {
      detectConfigurations();
    }
  }, [wizardState.autoClaudeInstallPath]);

  async function detectConfigurations() {
    if (!wizardState.autoClaudeInstallPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auto-claude/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoClaudeInstallPath: wizardState.autoClaudeInstallPath,
          dryRun: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to detect configurations');
      }

      const result = await response.json();

      // Transform the API response into our expected format
      const detectedConfigs = {
        agentConfigs: result.agentConfigs?.map((config: any) => ({
          agentType: config.agentType,
          tools: config.config.tools || [],
          mcpServers: config.config.mcpServers || [],
          thinkingDefault: config.config.thinkingDefault || 'medium',
        })) || [],
        prompts: result.prompts?.map((prompt: any) => ({
          agentType: prompt.agentType,
          fileName: `${prompt.agentType}.md`,
          contentPreview: prompt.content.slice(0, 200) + (prompt.content.length > 200 ? '...' : ''),
          injectionPoints: extractInjectionPoints(prompt.content),
        })) || [],
        projectConfig: result.projectConfig || null,
        modelProfiles: result.modelProfiles || [
          {
            name: 'Balanced',
            description: 'Default balanced configuration',
            phaseModels: { spec: 'sonnet', planning: 'sonnet', coding: 'sonnet', qa: 'sonnet' },
            phaseThinking: { spec: 'medium', planning: 'high', coding: 'medium', qa: 'high' },
          },
          {
            name: 'Cost-Optimized',
            description: 'Lower cost with Haiku and reduced thinking',
            phaseModels: { spec: 'haiku', planning: 'sonnet', coding: 'sonnet', qa: 'sonnet' },
            phaseThinking: { spec: 'low', planning: 'medium', coding: 'low', qa: 'medium' },
          },
          {
            name: 'Quality-Focused',
            description: 'Premium quality with Opus and enhanced thinking',
            phaseModels: { spec: 'opus', planning: 'opus', coding: 'sonnet', qa: 'opus' },
            phaseThinking: { spec: 'high', planning: 'ultrathink', coding: 'high', qa: 'ultrathink' },
          },
        ],
      };

      updateWizardState({ detectedConfigs });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  function extractInjectionPoints(content: string): string[] {
    const matches = content.match(/\{\{[^}]+\}\}/g) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  function toggleExpanded(key: string) {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-600">Detecting Auto-Claude configurations...</p>
        <p className="text-sm text-gray-500">
          Parsing models.py, prompts directory, and project settings
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          <strong>Detection failed:</strong> {error}
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={detectConfigurations}
              className="text-red-700 border-red-200 hover:bg-red-100"
            >
              Retry Detection
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!wizardState.detectedConfigs) {
    return (
      <div className="text-center py-8 text-gray-500">
        No configurations detected. Please go back and validate your installation path.
      </div>
    );
  }

  const { agentConfigs, prompts, projectConfig, modelProfiles } = wizardState.detectedConfigs;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold">{agentConfigs.length}</div>
              <p className="text-xs text-gray-500">Agent Configs</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold">{prompts.length}</div>
              <p className="text-xs text-gray-500">Prompts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Database className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <div className="text-2xl font-bold">{modelProfiles.length}</div>
              <p className="text-xs text-gray-500">Model Profiles</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Settings className="h-8 w-8 mx-auto text-amber-600 mb-2" />
              <div className="text-2xl font-bold">{projectConfig ? 1 : 0}</div>
              <p className="text-xs text-gray-500">Project Config</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed preview */}
      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agents">Agent Configs</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="profiles">Model Profiles</TabsTrigger>
          <TabsTrigger value="project">Project Config</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-3">
            {agentConfigs.map((config, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {config.agentType}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(`agent-${index}`)}
                    >
                      {expandedItems[`agent-${index}`] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                {expandedItems[`agent-${index}`] && (
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Tools</p>
                        <div className="flex flex-wrap gap-1">
                          {config.tools.map((tool, i) => (
                            <Badge key={i} variant="secondary">{tool}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">MCP Servers</p>
                        <div className="flex flex-wrap gap-1">
                          {config.mcpServers.map((server, i) => (
                            <Badge key={i} variant="outline">{server}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Default Thinking Level</p>
                        <Badge variant="outline">{config.thinkingDefault}</Badge>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <div className="grid gap-3">
            {prompts.map((prompt, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {prompt.fileName}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(`prompt-${index}`)}
                    >
                      {expandedItems[`prompt-${index}`] ? <ChevronDown className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                {expandedItems[`prompt-${index}`] && (
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Content Preview</p>
                        <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                          {prompt.contentPreview}
                        </div>
                      </div>
                      {prompt.injectionPoints.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Injection Points</p>
                          <div className="flex flex-wrap gap-1">
                            {prompt.injectionPoints.map((point, i) => (
                              <Badge key={i} variant="outline" className="font-mono text-xs">
                                {point}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <div className="grid gap-3">
            {modelProfiles.map((profile, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    {profile.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{profile.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-2">Phase Models</p>
                      <div className="space-y-1">
                        {Object.entries(profile.phaseModels).map(([phase, model]) => (
                          <div key={phase} className="flex justify-between">
                            <span className="capitalize">{phase}:</span>
                            <Badge variant="outline">{model}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Thinking Levels</p>
                      <div className="space-y-1">
                        {Object.entries(profile.phaseThinking).map(([phase, thinking]) => (
                          <div key={phase} className="flex justify-between">
                            <span className="capitalize">{phase}:</span>
                            <Badge variant="outline">{thinking}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="project" className="space-y-4">
          {projectConfig ? (
            <Card>
              <CardHeader>
                <CardTitle>Project Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="font-medium mb-3">MCP Server Settings</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Context7:</span>
                        <Badge variant={projectConfig.context7Enabled ? 'default' : 'secondary'}>
                          {projectConfig.context7Enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Linear MCP:</span>
                        <Badge variant={projectConfig.linearMcpEnabled ? 'default' : 'secondary'}>
                          {projectConfig.linearMcpEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Electron MCP:</span>
                        <Badge variant={projectConfig.electronMcpEnabled ? 'default' : 'secondary'}>
                          {projectConfig.electronMcpEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-3">API Keys Detected</p>
                    <div className="space-y-1 text-sm">
                      {projectConfig.apiKeys?.length > 0 ? (
                        projectConfig.apiKeys.map((key: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{key}</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500">No API keys detected</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                No project configuration (.auto-claude/.env) detected. Default settings will be created during import.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {/* Import preview */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Import Preview:</strong> These configurations will be imported into CCM as Components.
          After import, CCM will become the authoritative source for these configurations.
        </AlertDescription>
      </Alert>
    </div>
  );
}