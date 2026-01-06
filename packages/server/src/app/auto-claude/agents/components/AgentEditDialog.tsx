'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Wrench, Server, Zap } from 'lucide-react';
import type { AutoClaudeAgentConfig, ThinkingLevel } from '../../../../../../../packages/shared/src/types/auto-claude';

interface AgentEditDialogProps {
  agent: {
    id: string;
    agentType: string;
    description: string;
    config: AutoClaudeAgentConfig;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  onSave: (config: AutoClaudeAgentConfig) => void;
  onCancel: () => void;
}

const AVAILABLE_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Task', 'WebFetch', 'WebSearch',
  'NotebookEdit', 'TodoWrite', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode'
];

const AVAILABLE_MCP_SERVERS = [
  'context7', 'linear', 'graphiti', 'electron', 'puppeteer', 'firebase',
  'postgres', 'mongodb', 'redis', 'slack', 'github', 'notion'
];

const AUTO_CLAUDE_TOOLS = [
  'parallel_shell', 'file_watcher', 'task_runner', 'project_analyzer'
];

const THINKING_LEVELS: { value: ThinkingLevel; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No thinking tokens' },
  { value: 'low', label: 'Low', description: 'Minimal thinking for simple tasks' },
  { value: 'medium', label: 'Medium', description: 'Balanced thinking for most tasks' },
  { value: 'high', label: 'High', description: 'Deep thinking for complex tasks' },
  { value: 'ultrathink', label: 'Ultra', description: 'Maximum thinking for very complex tasks' },
];

export default function AgentEditDialog({ agent, onSave, onCancel }: AgentEditDialogProps) {
  const [config, setConfig] = useState<AutoClaudeAgentConfig>(agent.config);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const hasChanged = JSON.stringify(config) !== JSON.stringify(agent.config);
    setHasChanges(hasChanged);
  }, [config, agent.config]);

  const handleToolChange = (tool: string, checked: boolean) => {
    setConfig((prev: AutoClaudeAgentConfig) => ({
      ...prev,
      tools: checked
        ? [...prev.tools, tool]
        : prev.tools.filter((t: string) => t !== tool)
    }));
  };

  const handleMcpServerChange = (server: string, type: 'required' | 'optional', checked: boolean) => {
    setConfig((prev: AutoClaudeAgentConfig) => {
      const newConfig = { ...prev };

      if (type === 'required') {
        if (checked) {
          newConfig.mcpServers = [...prev.mcpServers, server];
          // Remove from optional if adding to required
          newConfig.mcpServersOptional = prev.mcpServersOptional.filter((s: string) => s !== server);
        } else {
          newConfig.mcpServers = prev.mcpServers.filter((s: string) => s !== server);
        }
      } else {
        if (checked) {
          newConfig.mcpServersOptional = [...prev.mcpServersOptional, server];
          // Remove from required if adding to optional
          newConfig.mcpServers = prev.mcpServers.filter((s: string) => s !== server);
        } else {
          newConfig.mcpServersOptional = prev.mcpServersOptional.filter((s: string) => s !== server);
        }
      }

      return newConfig;
    });
  };

  const handleAutoClaudeToolChange = (tool: string, checked: boolean) => {
    setConfig((prev: AutoClaudeAgentConfig) => ({
      ...prev,
      autoClaudeTools: checked
        ? [...prev.autoClaudeTools, tool]
        : prev.autoClaudeTools.filter((t: string) => t !== tool)
    }));
  };

  const handleThinkingChange = (value: ThinkingLevel) => {
    setConfig((prev: AutoClaudeAgentConfig) => ({
      ...prev,
      thinkingDefault: value
    }));
  };

  const handleSave = () => {
    onSave(config);
  };

  const getThinkingColor = (level: ThinkingLevel) => {
    switch (level) {
      case 'ultrathink': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'none': return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Agent Configuration: {agent.agentType}
          </DialogTitle>
          <DialogDescription>
            Configure tools, MCP servers, and thinking levels for this agent type.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tools Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Tools ({config.tools.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {AVAILABLE_TOOLS.map((tool) => (
                <div key={tool} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tool-${tool}`}
                    checked={config.tools.includes(tool)}
                    onCheckedChange={(checked) => handleToolChange(tool, !!checked)}
                  />
                  <Label
                    htmlFor={`tool-${tool}`}
                    className="text-sm font-mono cursor-pointer"
                  >
                    {tool}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* MCP Servers Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                MCP Servers ({config.mcpServers.length + config.mcpServersOptional.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Required</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Optional</span>
                </div>
              </div>
              {AVAILABLE_MCP_SERVERS.map((server) => {
                const isRequired = config.mcpServers.includes(server);
                const isOptional = config.mcpServersOptional.includes(server);

                return (
                  <div key={server} className="flex items-center justify-between">
                    <Label className="text-sm font-mono">{server}</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-1">
                        <Checkbox
                          id={`mcp-required-${server}`}
                          checked={isRequired}
                          onCheckedChange={(checked) => handleMcpServerChange(server, 'required', !!checked)}
                        />
                        <Label
                          htmlFor={`mcp-required-${server}`}
                          className="text-xs text-green-700 cursor-pointer"
                        >
                          Req
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Checkbox
                          id={`mcp-optional-${server}`}
                          checked={isOptional}
                          onCheckedChange={(checked) => handleMcpServerChange(server, 'optional', !!checked)}
                        />
                        <Label
                          htmlFor={`mcp-optional-${server}`}
                          className="text-xs text-blue-700 cursor-pointer"
                        >
                          Opt
                        </Label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Auto-Claude Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Auto-Claude Tools ({config.autoClaudeTools.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {AUTO_CLAUDE_TOOLS.map((tool) => (
                <div key={tool} className="flex items-center space-x-2">
                  <Checkbox
                    id={`auto-tool-${tool}`}
                    checked={config.autoClaudeTools.includes(tool)}
                    onCheckedChange={(checked) => handleAutoClaudeToolChange(tool, !!checked)}
                  />
                  <Label
                    htmlFor={`auto-tool-${tool}`}
                    className="text-sm font-mono cursor-pointer"
                  >
                    {tool}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Thinking Level */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Default Thinking Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={config.thinkingDefault} onValueChange={handleThinkingChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THINKING_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getThinkingColor(level.value)}>
                          {level.label}
                        </Badge>
                        <span className="text-sm">{level.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Current:</strong></p>
                <Badge className={getThinkingColor(config.thinkingDefault)}>
                  {THINKING_LEVELS.find(l => l.value === config.thinkingDefault)?.label || config.thinkingDefault}
                </Badge>
                <p className="text-xs mt-1">
                  {THINKING_LEVELS.find(l => l.value === config.thinkingDefault)?.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Tools:</span>
                <span className="ml-2 font-medium">{config.tools.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Required MCP:</span>
                <span className="ml-2 font-medium">{config.mcpServers.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Optional MCP:</span>
                <span className="ml-2 font-medium">{config.mcpServersOptional.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Auto-Claude Tools:</span>
                <span className="ml-2 font-medium">{config.autoClaudeTools.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}