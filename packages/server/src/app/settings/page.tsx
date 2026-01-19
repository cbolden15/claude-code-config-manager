'use client';

import { useState } from 'react';

// Mock data - will be replaced with API calls after schema migration
const mockMachineConfig = {
  id: 'machine-1',
  name: 'macbook-pro',
  hostname: 'Calebs-MacBook-Pro.local',
  platform: 'darwin',
  arch: 'arm64',
  homeDir: '/Users/calebbolden',
  lastSeen: '2026-01-19T16:30:00Z',
  isCurrentMachine: true,
};

const mockAppliedConfigs = [
  {
    id: '1',
    configType: 'mcp_server',
    configName: 'context7',
    enabled: true,
    source: 'manual',
    usageCount: 234,
  },
  {
    id: '2',
    configType: 'mcp_server',
    configName: 'memory',
    enabled: true,
    source: 'manual',
    usageCount: 156,
  },
  {
    id: '3',
    configType: 'mcp_server',
    configName: 'sqlite',
    enabled: true,
    source: 'recommendation',
    usageCount: 89,
  },
];

const configTypeIcons: Record<string, { icon: string; bg: string }> = {
  mcp_server: { icon: '🔌', bg: 'bg-[rgba(99,102,241,0.15)]' },
  hook: { icon: '🪝', bg: 'bg-[rgba(139,92,246,0.15)]' },
  permission: { icon: '🔐', bg: 'bg-[rgba(245,158,11,0.15)]' },
  skill: { icon: '⚡', bg: 'bg-[rgba(16,185,129,0.15)]' },
};

export default function SettingsPage() {
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <>
      {/* Header */}
      <header className="px-10 py-6 bg-[#1e293b] border-b border-[#334155]">
        <h1 className="text-2xl font-semibold text-[#f1f5f9] tracking-tight mb-1">Settings</h1>
        <p className="text-sm text-[#64748b]">Machine configuration and preferences</p>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 bg-[#0f172a]">
        {/* Machine Info */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold tracking-tight mb-5">Machine Information</h2>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#06b6d4] flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold">{mockMachineConfig.name}</h3>
                  {mockMachineConfig.isCurrentMachine && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-[rgba(16,185,129,0.15)] text-[#10b981] rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[#64748b] mt-1">{mockMachineConfig.hostname}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[rgba(15,23,42,0.5)] rounded-xl p-4">
                <div className="text-[11px] text-[#64748b] uppercase tracking-wider mb-1">Platform</div>
                <div className="font-medium">{mockMachineConfig.platform}</div>
              </div>
              <div className="bg-[rgba(15,23,42,0.5)] rounded-xl p-4">
                <div className="text-[11px] text-[#64748b] uppercase tracking-wider mb-1">Architecture</div>
                <div className="font-medium">{mockMachineConfig.arch}</div>
              </div>
              <div className="bg-[rgba(15,23,42,0.5)] rounded-xl p-4">
                <div className="text-[11px] text-[#64748b] uppercase tracking-wider mb-1">Home Directory</div>
                <div className="font-medium text-[13px] font-mono truncate">{mockMachineConfig.homeDir}</div>
              </div>
              <div className="bg-[rgba(15,23,42,0.5)] rounded-xl p-4">
                <div className="text-[11px] text-[#64748b] uppercase tracking-wider mb-1">Last Seen</div>
                <div className="font-medium">{new Date(mockMachineConfig.lastSeen).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Server Configuration */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold tracking-tight mb-5">Server Configuration</h2>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Server URL</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-[#f1f5f9] focus:outline-none focus:border-[#6366f1] transition-colors"
                  placeholder="http://localhost:3000"
                />
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-lg text-sm font-semibold shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="text-[12px] text-[#64748b] mt-2">
                The URL where the CCM server is running. The CLI uses this to communicate with the server.
              </p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-[#334155]">
              <div>
                <h4 className="font-medium">Connection Status</h4>
                <p className="text-[13px] text-[#64748b]">Test the connection to the server</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                  <span className="text-[#10b981] text-sm font-medium">Connected</span>
                </div>
                <button className="px-4 py-2 bg-[#334155] text-[#94a3b8] rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors">
                  Test Connection
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Applied Configurations */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Applied Configurations</h2>
            <span className="text-sm text-[#64748b]">{mockAppliedConfigs.length} active configs</span>
          </div>

          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155]">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Config</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Source</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Usage</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockAppliedConfigs.map((config) => {
                  const typeStyle = configTypeIcons[config.configType] || { icon: '📋', bg: 'bg-[#334155]' };
                  return (
                    <tr key={config.id} className="border-b border-[#334155] last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${typeStyle.bg} flex items-center justify-center text-base`}>
                            {typeStyle.icon}
                          </div>
                          <span className="font-medium">{config.configName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[#94a3b8] capitalize">
                        {config.configType.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${config.source === 'recommendation' ? 'bg-[rgba(99,102,241,0.15)] text-[#6366f1]' : 'bg-[#334155] text-[#94a3b8]'}`}>
                          {config.source}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-[13px] text-[#94a3b8]">
                        {config.usageCount} uses
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${config.enabled ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]' : 'bg-[#334155] text-[#64748b]'}`}>
                          {config.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-lg font-semibold tracking-tight mb-5 text-[#f43f5e]">Danger Zone</h2>
          <div className="bg-[#1e293b] border border-[#f43f5e]/30 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Reset All Settings</h4>
                <p className="text-[13px] text-[#64748b]">
                  Remove all applied configurations and reset to defaults. This cannot be undone.
                </p>
              </div>
              <button className="px-5 py-2.5 bg-[rgba(244,63,94,0.15)] text-[#f43f5e] rounded-lg text-sm font-semibold hover:bg-[rgba(244,63,94,0.25)] transition-colors">
                Reset Settings
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
