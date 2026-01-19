'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface SettingsFormProps {
  settings: Record<string, unknown>;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [defaultMachine, setDefaultMachine] = useState(
    (settings.defaultMachine as string) || ''
  );
  const [monitoringEnabled, setMonitoringEnabled] = useState(
    (settings.monitoringEnabled as boolean) ?? true
  );
  const [monitoringInterval, setMonitoringInterval] = useState(
    (settings.monitoringIntervalHours as number) || 24
  );

  async function handleSave() {
    setLoading(true);
    setSaved(false);

    try {
      // Save each setting individually
      const settingsToSave = [
        { key: 'defaultMachine', value: defaultMachine },
        { key: 'monitoringEnabled', value: monitoringEnabled },
        { key: 'monitoringIntervalHours', value: monitoringInterval },
      ];

      for (const setting of settingsToSave) {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: setting.key,
            value: JSON.stringify(setting.value),
          }),
        });
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
