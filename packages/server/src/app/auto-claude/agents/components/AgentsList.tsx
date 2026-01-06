'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Eye, Edit, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import AgentsMatrix from './AgentsMatrix';
import AgentEditDialog from './AgentEditDialog';
import type { AutoClaudeAgentConfig } from '../../../../../../../packages/shared/src/types/auto-claude';

interface AgentConfigData {
  id: string;
  agentType: string;
  description: string;
  config: AutoClaudeAgentConfig;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AgentsApiResponse {
  agentConfigs: AgentConfigData[];
  matrices: {
    tools: {
      agents: string[];
      tools: string[];
      matrix: Record<string, string[]>;
    };
    mcp: {
      agents: string[];
      servers: string[];
      matrix: Record<string, { required: string[]; optional: string[] }>;
    };
  };
  stats: {
    total: number;
    enabled: number;
    uniqueTools: number;
    uniqueMcpServers: number;
  };
  errors?: string[];
}

function AgentCard({ agent, onEdit, onDelete }: {
  agent: AgentConfigData;
  onEdit: (agent: AgentConfigData) => void;
  onDelete: (agentType: string) => void;
}) {
  const { config } = agent;

  const getThinkingColor = (level: string) => {
    switch (level) {
      case 'ultrathink': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'none': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:border-gray-300 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">{agent.agentType}</h3>
              {!agent.enabled && (
                <Badge variant="outline" className="text-gray-400">Disabled</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">{agent.description}</p>

            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-700 block mb-1">Tools ({config.tools.length})</span>
                <div className="flex flex-wrap gap-1">
                  {config.tools.slice(0, 5).map((tool: string) => (
                    <span key={tool} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {tool}
                    </span>
                  ))}
                  {config.tools.length > 5 && (
                    <span className="text-xs text-gray-500">+{config.tools.length - 5} more</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-gray-700 block mb-1">MCP Servers</span>
                <div className="flex flex-wrap gap-1">
                  {config.mcpServers.slice(0, 3).map((server: string) => (
                    <span key={server} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      {server}
                    </span>
                  ))}
                  {config.mcpServersOptional.slice(0, 2).map((server: string) => (
                    <span key={server} className="text-xs bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded">
                      {server}*
                    </span>
                  ))}
                  {(config.mcpServers.length + config.mcpServersOptional.length) > 5 && (
                    <span className="text-xs text-gray-500">
                      +{(config.mcpServers.length + config.mcpServersOptional.length) - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Thinking:</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${getThinkingColor(config.thinkingDefault)}`}>
              {config.thinkingDefault}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(agent)}
              className="h-7 px-2"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(agent.agentType)}
              className="h-7 px-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentsList() {
  const [data, setData] = useState<AgentsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<AgentConfigData | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auto-claude/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleEdit = (agent: AgentConfigData) => {
    setEditingAgent(agent);
  };

  const handleDelete = async (agentType: string) => {
    if (!confirm(`Are you sure you want to delete the configuration for ${agentType}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/auto-claude/agents/${agentType}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent configuration');
      }

      await fetchAgents(); // Refresh the list
    } catch (err) {
      alert(`Error deleting agent: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSaveAgent = async (updatedConfig: AutoClaudeAgentConfig) => {
    if (!editingAgent) return;

    try {
      const response = await fetch(`/api/auto-claude/agents/${editingAgent.agentType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent configuration');
      }

      setEditingAgent(null);
      await fetchAgents(); // Refresh the list
    } catch (err) {
      alert(`Error updating agent: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading agent configurations...</p>
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

  return (
    <>
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{data.stats.total}</div>
              <div className="text-sm text-gray-500">Total Agents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{data.stats.enabled}</div>
              <div className="text-sm text-gray-500">Enabled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{data.stats.uniqueTools}</div>
              <div className="text-sm text-gray-500">Unique Tools</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{data.stats.uniqueMcpServers}</div>
              <div className="text-sm text-gray-500">MCP Servers</div>
            </CardContent>
          </Card>
        </div>

        {data.errors && data.errors.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="font-medium">Configuration Warnings:</div>
              <ul className="mt-1 space-y-1">
                {data.errors.map((error, index) => (
                  <li key={index} className="text-sm">• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">
            <Settings className="h-4 w-4 mr-1" />
            Agent List ({data.stats.total})
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Eye className="h-4 w-4 mr-1" />
            Tools Matrix
          </TabsTrigger>
          <TabsTrigger value="mcp">
            <Eye className="h-4 w-4 mr-1" />
            MCP Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          {data.agentConfigs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Settings className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium">No agent configurations found.</p>
              <p className="text-sm mt-1">Create your first agent configuration to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.agentConfigs.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tools" className="mt-6">
          <AgentsMatrix
            type="tools"
            agents={data.matrices.tools.agents}
            items={data.matrices.tools.tools}
            matrix={data.matrices.tools.matrix}
          />
        </TabsContent>

        <TabsContent value="mcp" className="mt-6">
          <AgentsMatrix
            type="mcp"
            agents={data.matrices.mcp.agents}
            items={data.matrices.mcp.servers}
            matrix={data.matrices.mcp.matrix}
          />
        </TabsContent>
      </Tabs>

      {editingAgent && (
        <AgentEditDialog
          agent={editingAgent}
          onSave={handleSaveAgent}
          onCancel={() => setEditingAgent(null)}
        />
      )}
    </>
  );
}