import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

async function getMcpServers() {
  const servers = await prisma.claudeDesktopMcp.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Fetch components separately
  const componentIds = servers.map(s => s.componentId);
  const components = await prisma.component.findMany({
    where: { id: { in: componentIds } },
  });

  // Create a map for easy lookup
  const componentMap = new Map(components.map(c => [c.id, c]));

  // Attach components to servers
  return servers.map(server => ({
    ...server,
    component: componentMap.get(server.componentId) || null,
  }));
}

export default async function DesktopMcpPage() {
  const servers = await getMcpServers();

  const stats = {
    total: servers.length,
    enabled: servers.filter(s => s.enabled).length,
    withCommandOverride: servers.filter(s => s.commandOverride).length,
    withArgsOverride: servers.filter(s => s.argsOverride).length,
    withEnvOverrides: servers.filter(s => s.envOverrides).length,
  };

  return (
    <>
      <Header
        title="MCP Servers"
        description="Manage Model Context Protocol servers for Claude Desktop"
        actions={
          <div className="flex gap-2">
            <Link href="/desktop">
              <Button variant="outline">Back to Desktop</Button>
            </Link>
            <Button disabled>Add MCP Server</Button>
          </div>
        }
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.total}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Enabled</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.enabled}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">Command Overrides</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.withCommandOverride}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">Args Overrides</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.withArgsOverride}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">Env Overrides</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.withEnvOverrides}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MCP Servers Table */}
        {servers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <p className="text-lg font-medium">No MCP servers configured yet.</p>
                <p className="text-sm mt-2">
                  Add MCP servers from your component library to use in Claude Desktop.
                </p>
                <code className="block mt-4 bg-gray-100 px-4 py-2 rounded text-sm">
                  ccm desktop mcp add --component &lt;component-id&gt;
                </code>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server Name</TableHead>
                    <TableHead>Command</TableHead>
                    <TableHead>Overrides</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servers.map((server) => {
                    const overrides = [];
                    if (server.commandOverride) overrides.push('Command');
                    if (server.argsOverride) overrides.push('Args');
                    if (server.envOverrides) overrides.push('Env');

                    // Parse component config to get command
                    let componentCommand = 'Unknown';
                    if (server.component?.mcpConfig) {
                      try {
                        const config = JSON.parse(server.component.mcpConfig);
                        componentCommand = config.command || 'Unknown';
                      } catch {
                        componentCommand = 'Invalid config';
                      }
                    }

                    const displayCommand = server.commandOverride || componentCommand;

                    return (
                      <TableRow key={server.id}>
                        <TableCell className="font-medium">
                          {server.component?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {displayCommand}
                          </code>
                        </TableCell>
                        <TableCell>
                          {overrides.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {overrides.map((override) => (
                                <Badge
                                  key={override}
                                  variant="outline"
                                  className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  {override}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {server.enabled ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Disabled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(server.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Managing MCP Servers</p>
                <p className="text-sm text-gray-600 mt-1">
                  MCP (Model Context Protocol) servers extend Claude Desktop with additional capabilities.
                  Add servers from your component library and optionally override their configuration.
                </p>
                <div className="mt-3 space-y-1">
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm desktop mcp list
                  </code>
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm desktop mcp add --component &lt;id&gt;
                  </code>
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm desktop mcp update &lt;id&gt; --enabled false
                  </code>
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm desktop config download
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
