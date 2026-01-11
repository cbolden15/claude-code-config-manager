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

async function getPermissions() {
  return prisma.globalPermission.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

function getActionColor(action: string) {
  switch (action) {
    case 'allow': return 'bg-green-100 text-green-800';
    case 'deny': return 'bg-red-100 text-red-800';
    case 'ask': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'filesystem': return 'bg-blue-100 text-blue-800';
    case 'network': return 'bg-purple-100 text-purple-800';
    case 'system': return 'bg-orange-100 text-orange-800';
    case 'git': return 'bg-pink-100 text-pink-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default async function PermissionsPage() {
  const permissions = await getPermissions();

  const stats = {
    total: permissions.length,
    allowed: permissions.filter(p => p.action === 'allow').length,
    denied: permissions.filter(p => p.action === 'deny').length,
    ask: permissions.filter(p => p.action === 'ask').length,
    enabled: permissions.filter(p => p.enabled).length,
  };

  return (
    <>
      <Header
        title="Permissions"
        description="Manage global permissions and actions"
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
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Allowed</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.allowed}
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Denied</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.denied}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ask</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.ask}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Table */}
        {permissions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-lg font-medium">No permissions configured yet.</p>
                <p className="text-sm mt-2">
                  Use the CLI to add permissions.
                </p>
                <code className="block mt-4 bg-gray-100 px-4 py-2 rounded text-sm">
                  ccm permission add
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
                    <TableHead>Pattern</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell className="font-mono text-sm">
                        {permission.pattern}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(permission.action)}>
                          {permission.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(permission.category || 'other')}>
                          {permission.category || 'other'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {permission.scope}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {permission.enabled ? (
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
                        {permission.description || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(permission.createdAt).toLocaleDateString()}
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
                <p className="text-sm font-medium text-gray-900">Managing Permissions</p>
                <p className="text-sm text-gray-600 mt-1">
                  Permissions control what actions Claude Code can take. Use glob patterns to match file paths,
                  and set actions to allow, deny, or ask for confirmation.
                </p>
                <div className="mt-3 space-y-1">
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm permission list
                  </code>
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded">
                    ccm permission add --pattern "**/*.ts" --action allow
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
