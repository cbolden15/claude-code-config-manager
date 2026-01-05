import { prisma } from '@/lib/db';
import { getAllSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SettingsForm } from './settings-form';
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
  const [components, profiles, projects, monitoring] = await Promise.all([
    prisma.component.count(),
    prisma.profile.count(),
    prisma.project.count(),
    prisma.monitoringEntry.count(),
  ]);

  return { components, profiles, projects, monitoring };
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
        <div className="grid grid-cols-2 gap-6">
          {/* Server Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Server Settings</CardTitle>
              <CardDescription>
                Configure how the CCM server operates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm settings={settings} />
            </CardContent>
          </Card>

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
        </div>

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
