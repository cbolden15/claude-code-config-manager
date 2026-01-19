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

async function getHooks() {
  return prisma.globalHook.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

function getTypeColor(type: string) {
  switch (type) {
    case 'PreToolUse': return 'bg-blue-100 text-blue-800';
    case 'PostToolUse': return 'bg-green-100 text-green-800';
    case 'PreCommand': return 'bg-purple-100 text-purple-800';
    case 'PostCommand': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'security': return 'bg-red-100 text-red-800';
    case 'validation': return 'bg-yellow-100 text-yellow-800';
    case 'logging': return 'bg-blue-100 text-blue-800';
    case 'notification': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default async function HooksPage() {
  const hooks = await getHooks();

  const stats = {
    total: hooks.length,
    preToolUse: hooks.filter(h => h.type === 'PreToolUse').length,
    postToolUse: hooks.filter(h => h.type === 'PostToolUse').length,
    preCommand: hooks.filter(h => h.type === 'PreCommand').length,
    postCommand: hooks.filter(h => h.type === 'PostCommand').length,
    enabled: hooks.filter(h => h.enabled).length,
  };

  return (
    <>
      <Header
        title="Hooks"
        description="Manage hooks and automation"
        actions={
          <div className="flex gap-2">
            <Link href="/settings">
              <Button variant="outline">Back to Settings</Button>
            </Link>
            <Button disabled>Import</Button>
            <Button disabled>Export</Button>
          </div>
        }
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.total}
                  </p>
                </div>
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">PreToolUse</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.preToolUse}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">PostToolUse</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.postToolUse}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">PreCommand</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.preCommand}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">PostCommand</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.postCommand}
                </p>
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
        </div>

        {/* Hooks Table */}
        {hooks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-lg font-medium">No hooks configured yet.</p>
                <p className="text-sm mt-2">
                  Use the CLI to add hooks.
                </p>
                <code className="block mt-4 bg-gray-100 px-4 py-2 rounded text-sm">
                  ccm hook add
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tool Filter</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hooks.map((hook) => (
                    <TableRow key={hook.id}>
                      <TableCell className="font-medium">
                        {hook.name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(hook.type)}>
                          {hook.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {hook.toolFilter || 'All tools'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(hook.category || 'other')}>
                          {hook.category || 'other'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {hook.scope}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hook.enabled ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {hook.description || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(hook.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
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
                <p className="text-sm font-medium text-gray-900">Managing Hooks</p>
                <p className="text-sm text-gray-600 mt-1">
                  Hooks allow you to run custom commands before or after tool usage or CLI commands.
                  Use tool filters to target specific tools (Read, Write, Bash, etc.).
                </p>
                <div className="mt-3 space-y-1">
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm hook list
                  </code>
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm hook add --name "Security Scanner" --type PostToolUse:Write
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
