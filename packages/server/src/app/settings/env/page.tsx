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

async function getEnvVars() {
  const envVars = await prisma.globalEnvVar.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Mask sensitive values
  return envVars.map(envVar => ({
    ...envVar,
    value: envVar.sensitive ? '********' : envVar.value,
  }));
}

function getScopeColor(scope: string) {
  switch (scope) {
    case 'all': return 'bg-purple-100 text-purple-800';
    case 'claude-desktop': return 'bg-blue-100 text-blue-800';
    case 'claude-code': return 'bg-green-100 text-green-800';
    case 'cli': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'api': return 'bg-blue-100 text-blue-800';
    case 'auth': return 'bg-red-100 text-red-800';
    case 'database': return 'bg-green-100 text-green-800';
    case 'integration': return 'bg-purple-100 text-purple-800';
    case 'build': return 'bg-orange-100 text-orange-800';
    case 'deployment': return 'bg-pink-100 text-pink-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default async function EnvVarsPage() {
  const envVars = await getEnvVars();

  const stats = {
    total: envVars.length,
    all: envVars.filter(e => e.scope === 'all').length,
    claudeDesktop: envVars.filter(e => e.scope === 'claude-desktop').length,
    claudeCode: envVars.filter(e => e.scope === 'claude-code').length,
    cli: envVars.filter(e => e.scope === 'cli').length,
    sensitive: envVars.filter(e => e.sensitive).length,
  };

  return (
    <>
      <Header
        title="Environment Variables"
        description="Manage environment variables and secrets"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">All Scopes</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.all}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">Desktop</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.claudeDesktop}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">Code</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.claudeCode}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-gray-500">CLI</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {stats.cli}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Sensitive</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.sensitive}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Environment Variables Table */}
        {envVars.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-lg font-medium">No environment variables configured yet.</p>
                <p className="text-sm mt-2">
                  Use the CLI to add environment variables.
                </p>
                <code className="block mt-4 bg-gray-100 px-4 py-2 rounded text-sm">
                  ccm env add
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
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sensitive</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {envVars.map((envVar) => (
                    <TableRow key={envVar.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {envVar.key}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {envVar.sensitive ? (
                          <span className="text-gray-400">********</span>
                        ) : (
                          <span className="max-w-xs truncate block">{envVar.value}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getScopeColor(envVar.scope)}>
                          {envVar.scope}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(envVar.category || 'other')}>
                          {envVar.category || 'other'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {envVar.sensitive ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {envVar.description || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(envVar.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="mt-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-900">Security Notice</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Sensitive values are encrypted in the database and masked in this UI.
                  They are only decrypted when needed by CLI or project sync operations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Managing Environment Variables</p>
                <p className="text-sm text-gray-600 mt-1">
                  Environment variables can be scoped to specific tools (Claude Desktop, Claude Code, CLI) or all tools.
                  Mark sensitive values to encrypt them in the database.
                </p>
                <div className="mt-3 space-y-1">
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm env list
                  </code>
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm env add --key "API_KEY" --scope all --sensitive
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
