import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

async function getStats() {
  const [mcpServers, plugins, mcpEnabled, pluginsEnabled] = await Promise.all([
    prisma.claudeDesktopMcp.count(),
    prisma.claudeDesktopPlugin.count(),
    prisma.claudeDesktopMcp.count({ where: { enabled: true } }),
    prisma.claudeDesktopPlugin.count({ where: { enabled: true } }),
  ]);

  return { mcpServers, plugins, mcpEnabled, pluginsEnabled };
}

export default async function ClaudeDesktopPage() {
  const stats = await getStats();

  return (
    <>
      <Header
        title="Claude Desktop"
        description="Manage Claude Desktop configuration"
        actions={
          <Button disabled>Download Config</Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Navigation Cards */}
        <div className="grid grid-cols-2 gap-6">
          <Link href="/desktop/mcp" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {stats.mcpServers}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {stats.mcpEnabled} enabled
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">MCP Servers</h3>
                <p className="text-sm text-gray-500">
                  Manage Model Context Protocol servers for Claude Desktop
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/desktop/plugins" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {stats.plugins}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {stats.pluginsEnabled} enabled
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Plugins</h3>
                <p className="text-sm text-gray-500">
                  Configure Claude Desktop plugins and extensions
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Config Info */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration File</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">Location (macOS)</p>
                <code className="block p-3 bg-gray-100 rounded text-sm font-mono break-all">
                  ~/Library/Application Support/Claude/claude_desktop_config.json
                </code>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Location (Linux)</p>
                <code className="block p-3 bg-gray-100 rounded text-sm font-mono break-all">
                  ~/.config/Claude/claude_desktop_config.json
                </code>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Location (Windows)</p>
                <code className="block p-3 bg-gray-100 rounded text-sm font-mono break-all">
                  %APPDATA%\Claude\claude_desktop_config.json
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Claude Desktop Integration</p>
                <p className="text-sm text-gray-600 mt-1">
                  CCM can manage your Claude Desktop configuration including MCP servers and plugins.
                  Changes made here can be synced to your claude_desktop_config.json file.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
