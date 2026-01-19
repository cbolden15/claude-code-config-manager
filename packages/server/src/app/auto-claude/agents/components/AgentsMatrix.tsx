'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, CircleDot } from 'lucide-react';

interface AgentsMatrixProps {
  type: 'tools' | 'mcp';
  agents: string[];
  items: string[];
  matrix: Record<string, string[] | { required: string[]; optional: string[] }>;
}

export default function AgentsMatrix({ type, agents, items, matrix }: AgentsMatrixProps) {
  const hasAccess = (agentType: string, item: string): 'none' | 'required' | 'optional' => {
    const agentMatrix = matrix[agentType];

    if (!agentMatrix) return 'none';

    if (type === 'tools') {
      // Tools matrix - simple array
      const tools = agentMatrix as string[];
      return tools.includes(item) ? 'required' : 'none';
    } else {
      // MCP matrix - required/optional split
      const mcpMatrix = agentMatrix as { required: string[]; optional: string[] };
      if (mcpMatrix.required.includes(item)) return 'required';
      if (mcpMatrix.optional.includes(item)) return 'optional';
      return 'none';
    }
  };

  const getAccessIcon = (access: 'none' | 'required' | 'optional') => {
    switch (access) {
      case 'required':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'optional':
        return <CircleDot className="h-4 w-4 text-blue-500" />;
      case 'none':
        return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const getAccessBadge = (access: 'none' | 'required' | 'optional') => {
    switch (access) {
      case 'required':
        return type === 'tools' ? 'Yes' : 'Required';
      case 'optional':
        return 'Optional';
      case 'none':
        return 'No';
    }
  };

  if (agents.length === 0 || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">
            No {type === 'tools' ? 'tools' : 'MCP servers'} matrix data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {type === 'tools' ? 'Tools' : 'MCP Servers'} Access Matrix
        </CardTitle>
        <p className="text-sm text-gray-500">
          {type === 'tools'
            ? 'Shows which tools each agent type has access to'
            : 'Shows which MCP servers each agent type can use (required vs optional)'
          }
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>{type === 'tools' ? 'Available' : 'Required'}</span>
            </div>
            {type === 'mcp' && (
              <div className="flex items-center gap-1">
                <CircleDot className="h-4 w-4 text-blue-500" />
                <span>Optional</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Circle className="h-4 w-4 text-gray-300" />
              <span>Not available</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-sm text-gray-700 sticky left-0 bg-white min-w-[120px]">
                  {type === 'tools' ? 'Tool' : 'MCP Server'}
                </th>
                {agents.map((agent) => (
                  <th key={agent} className="text-center p-2 font-medium text-sm text-gray-700 min-w-[100px]">
                    <div className="transform -rotate-45 origin-center whitespace-nowrap">
                      {agent}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item} className="border-b hover:bg-gray-50">
                  <td className="p-2 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {item}
                    </code>
                  </td>
                  {agents.map((agent) => {
                    const access = hasAccess(agent, item);
                    return (
                      <td key={agent} className="p-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getAccessIcon(access)}
                          <span className="text-xs text-gray-500">
                            {getAccessBadge(access)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            <strong>Summary:</strong> {agents.length} agents, {items.length} {type === 'tools' ? 'tools' : 'MCP servers'} configured
          </p>
          {type === 'mcp' && (
            <p className="mt-1">
              <strong>Note:</strong> Required servers must be available for the agent to function.
              Optional servers are loaded if available but won't prevent operation if missing.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}