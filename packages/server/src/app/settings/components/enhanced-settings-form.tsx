'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaskedInput } from './masked-input';

interface SettingsFormProps {
  settings: Record<string, unknown>;
}

export function EnhancedSettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // CCM Settings
  const [defaultMachine, setDefaultMachine] = useState(
    (settings.defaultMachine as string) || ''
  );
  const [monitoringEnabled, setMonitoringEnabled] = useState(
    (settings.monitoringEnabled as boolean) ?? true
  );
  const [monitoringInterval, setMonitoringInterval] = useState(
    (settings.monitoringIntervalHours as number) || 24
  );

  // Auto-Claude Settings
  const [autoClaudeBackendPath, setAutoClaudeBackendPath] = useState(
    (settings.autoClaudeBackendPath as string) || ''
  );
  const [linearApiKey, setLinearApiKey] = useState(
    (settings.linearApiKey as string) || ''
  );
  const [linearTeamId, setLinearTeamId] = useState(
    (settings.linearTeamId as string) || ''
  );
  const [githubToken, setGithubToken] = useState(
    (settings.githubToken as string) || ''
  );
  const [graphitiMcpUrl, setGraphitiMcpUrl] = useState(
    (settings.graphitiMcpUrl as string) || ''
  );

  async function handleSave() {
    setLoading(true);
    setSaved(false);

    try {
      // Prepare settings to save
      const settingsToSave = [
        { key: 'defaultMachine', value: defaultMachine },
        { key: 'monitoringEnabled', value: monitoringEnabled },
        { key: 'monitoringIntervalHours', value: monitoringInterval },
        { key: 'autoClaudeBackendPath', value: autoClaudeBackendPath },
        { key: 'linearApiKey', value: linearApiKey },
        { key: 'linearTeamId', value: linearTeamId },
        { key: 'githubToken', value: githubToken },
        { key: 'graphitiMcpUrl', value: graphitiMcpUrl },
      ];

      // Save each setting individually
      for (const setting of settingsToSave) {
        // Only save if the value is not empty or if it's a boolean
        if (setting.value !== '' || typeof setting.value === 'boolean') {
          await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: setting.key,
              value: typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value),
            }),
          });
        }
      }

      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* CCM Settings */}
      <Card>
        <CardHeader>
          <CardTitle>CCM Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="defaultMachine">Default Machine Name</Label>
            <Input
              id="defaultMachine"
              value={defaultMachine}
              onChange={(e) => setDefaultMachine(e.target.value)}
              placeholder="macbook-pro"
            />
            <p className="text-xs text-gray-500">
              Used when registering projects without specifying a machine.
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Monitoring Enabled</Label>
              <p className="text-xs text-gray-500">
                Receive ecosystem updates from n8n
              </p>
            </div>
            <Switch
              checked={monitoringEnabled}
              onCheckedChange={setMonitoringEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monitoringInterval">Monitoring Interval (hours)</Label>
            <Input
              id="monitoringInterval"
              type="number"
              min={1}
              max={168}
              value={monitoringInterval}
              onChange={(e) => setMonitoringInterval(parseInt(e.target.value, 10))}
            />
            <p className="text-xs text-gray-500">
              How often n8n should check for updates (1-168 hours).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Claude Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Claude Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="autoClaudeBackendPath">Auto-Claude Backend Path</Label>
            <Input
              id="autoClaudeBackendPath"
              value={autoClaudeBackendPath}
              onChange={(e) => setAutoClaudeBackendPath(e.target.value)}
              placeholder="~/Projects/Auto-Claude"
            />
            <p className="text-xs text-gray-500">
              Path to your Auto-Claude installation directory.
            </p>
          </div>

          <Separator />

          <MaskedInput
            id="linearApiKey"
            label="Linear API Key"
            value={linearApiKey}
            onChange={setLinearApiKey}
            placeholder="lin_api_..."
            description="API key for Linear integration (automatically encrypted)"
            isEncrypted={linearApiKey === '[ENCRYPTED]'}
          />

          <div className="space-y-2">
            <Label htmlFor="linearTeamId">Linear Team ID</Label>
            <Input
              id="linearTeamId"
              value={linearTeamId}
              onChange={(e) => setLinearTeamId(e.target.value)}
              placeholder="TEAM-123"
            />
            <p className="text-xs text-gray-500">
              Your Linear team identifier for project sync.
            </p>
          </div>

          <MaskedInput
            id="githubToken"
            label="GitHub Personal Access Token"
            value={githubToken}
            onChange={setGithubToken}
            placeholder="ghp_..."
            description="GitHub token for repository access (automatically encrypted)"
            isEncrypted={githubToken === '[ENCRYPTED]'}
          />

          <div className="space-y-2">
            <Label htmlFor="graphitiMcpUrl">Graphiti MCP Server URL</Label>
            <Input
              id="graphitiMcpUrl"
              value={graphitiMcpUrl}
              onChange={(e) => setGraphitiMcpUrl(e.target.value)}
              placeholder="http://localhost:8080"
            />
            <p className="text-xs text-gray-500">
              URL for Graphiti MCP server integration.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex items-center gap-4 pt-4">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Settings saved!</span>
        )}
      </div>
    </div>
  );
}