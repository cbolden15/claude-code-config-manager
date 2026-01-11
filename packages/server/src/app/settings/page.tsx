import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getAllSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { EnhancedSettingsForm } from './components/enhanced-settings-form';
import { ExportImportSection } from './export-import-section';

async function getSettings() {
  // Use the settings service which handles encryption automatically
  const settings = await getAllSettings(false); // Don't include sensitive values in UI by default

  // Convert string values back to appropriate types (JSON parse where applicable)
  const settingsMap: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settings)) {
    if (value === '[ENCRYPTED]') {
      settingsMap[key] = value;
    } else {
      try {
        settingsMap[key] = JSON.parse(value);
      } catch {
        settingsMap[key] = value;
      }
    }
  }

  return settingsMap;
}

async function getStats() {
  const [components, profiles, projects, monitoring, permissions, hooks, envVars] = await Promise.all([
    prisma.component.count(),
    prisma.profile.count(),
    prisma.project.count(),
    prisma.monitoringEntry.count(),
    prisma.globalPermission.count(),
    prisma.globalHook.count(),
    prisma.globalEnvVar.count(),
  ]);

  return { components, profiles, projects, monitoring, permissions, hooks, envVars };
}

export default async function SettingsPage() {
  const settings = await getSettings();
  const stats = await getStats();

  return (
    <>
      <Header
        title="Settings"
        description="Configure Claude Code Config Manager"
      />

      <div className="p-6 space-y-6">
        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Link href="/settings/permissions" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <Badge variant="secondary">{stats.permissions}</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Permissions</h3>
                <p className="text-sm text-gray-500">
                  Manage global permissions and actions
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings/hooks" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <Badge variant="secondary">{stats.hooks}</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Hooks</h3>
                <p className="text-sm text-gray-500">
                  Configure hooks and automation
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings/env" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <Badge variant="secondary">{stats.envVars}</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Environment Variables</h3>
                <p className="text-sm text-gray-500">
                  Manage environment variables and secrets
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
        {/* Settings Configuration */}
        <EnhancedSettingsForm settings={settings} />

        {/* CLI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>CLI Configuration</CardTitle>
            <CardDescription>
              Settings for CLI clients connecting to this server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Server URL</p>
              <code className="block p-3 bg-gray-100 rounded text-sm font-mono">
                {process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}
              </code>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-gray-500 mb-2">CLI Config Location</p>
              <code className="block p-3 bg-gray-100 rounded text-sm font-mono">
                ~/.ccm/config.json
              </code>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-gray-500 mb-2">Example CLI Config</p>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono overflow-x-auto">
{`{
  "serverUrl": "${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}",
  "machine": "macbook-pro"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Export/Import */}
        <ExportImportSection />

        {/* Database Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Database Statistics</CardTitle>
            <CardDescription>
              Current state of your CCM database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-violet-600">{stats.components}</p>
                <p className="text-sm text-gray-500">Components</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{stats.profiles}</p>
                <p className="text-sm text-gray-500">Profiles</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{stats.projects}</p>
                <p className="text-sm text-gray-500">Projects</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-amber-600">{stats.monitoring}</p>
                <p className="text-sm text-gray-500">Monitoring Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About CCM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Version</p>
                <p className="font-medium">0.1.0</p>
              </div>
              <div>
                <p className="text-gray-500">Database</p>
                <p className="font-medium">SQLite</p>
              </div>
              <div>
                <p className="text-gray-500">Framework</p>
                <p className="font-medium">Next.js 14</p>
              </div>
              <div>
                <p className="text-gray-500">ORM</p>
                <p className="font-medium">Prisma</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
