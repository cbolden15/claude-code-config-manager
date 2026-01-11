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

async function getPlugins() {
  return prisma.claudeDesktopPlugin.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export default async function DesktopPluginsPage() {
  const plugins = await getPlugins();

  const stats = {
    total: plugins.length,
    enabled: plugins.filter(p => p.enabled).length,
    withConfig: plugins.filter(p => p.config).length,
  };

  return (
    <>
      <Header
        title="Plugins"
        description="Manage Claude Desktop plugins and extensions"
        actions={
          <div className="flex gap-2">
            <Link href="/desktop">
              <Button variant="outline">Back to Desktop</Button>
            </Link>
            <Button disabled>Add Plugin</Button>
          </div>
        }
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.total}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
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
                <p className="text-sm text-gray-500">With Custom Config</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stats.withConfig}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plugins Table */}
        {plugins.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
                <p className="text-lg font-medium">No plugins configured yet.</p>
                <p className="text-sm mt-2">
                  Add plugins to extend Claude Desktop functionality.
                </p>
                <code className="block mt-4 bg-gray-100 px-4 py-2 rounded text-sm">
                  ccm desktop plugin add --id &lt;plugin-id&gt;
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
                    <TableHead>Plugin ID</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plugins.map((plugin) => {
                    // Check if config is valid JSON
                    let hasValidConfig = false;
                    let configKeys = 0;

                    if (plugin.config) {
                      try {
                        const config = JSON.parse(plugin.config);
                        hasValidConfig = true;
                        configKeys = Object.keys(config).length;
                      } catch {
                        hasValidConfig = false;
                      }
                    }

                    return (
                      <TableRow key={plugin.id}>
                        <TableCell className="font-medium font-mono text-sm">
                          {plugin.pluginId}
                        </TableCell>
                        <TableCell>
                          {hasValidConfig ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {configKeys} {configKeys === 1 ? 'key' : 'keys'}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Default</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {plugin.enabled ? (
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
                          {new Date(plugin.createdAt).toLocaleDateString()}
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
                <p className="text-sm font-medium text-gray-900">Managing Plugins</p>
                <p className="text-sm text-gray-600 mt-1">
                  Claude Desktop plugins provide additional functionality and integrations.
                  Configure plugins with custom settings as needed.
                </p>
                <div className="mt-3 space-y-1">
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm desktop plugin list
                  </code>
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm desktop plugin add --id &lt;plugin-id&gt;
                  </code>
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm desktop plugin update &lt;id&gt; --enabled false
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
