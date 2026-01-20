'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Machine {
  id: string;
  name: string;
  hostname: string;
}

interface Recommendation {
  id: string;
  machineId: string;
  category: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  configType: string;
  configKey?: string | null;
  configValue?: string | null;
  evidence?: string | null;
  confidenceScore: number;
  estimatedTokenSavings: number;
  status: string;
  createdAt: string;
}

const priorityColors = {
  critical: { bg: 'bg-gradient-to-b from-[#f43f5e] to-[#fb7185]', text: 'text-[#f43f5e]' },
  high: { bg: 'bg-gradient-to-b from-[#f59e0b] to-[#fbbf24]', text: 'text-[#f59e0b]' },
  medium: { bg: 'bg-gradient-to-b from-[#6366f1] to-[#06b6d4]', text: 'text-[#6366f1]' },
  low: { bg: 'bg-gradient-to-b from-[#64748b] to-[#94a3b8]', text: 'text-[#94a3b8]' },
};

const categoryIcons: Record<string, { icon: string; bg: string }> = {
  mcp_server: { icon: '🔌', bg: 'bg-[rgba(99,102,241,0.15)]' },
  context: { icon: '📄', bg: 'bg-[rgba(245,158,11,0.15)]' },
  skill: { icon: '⚡', bg: 'bg-[rgba(16,185,129,0.15)]' },
  hook: { icon: '🪝', bg: 'bg-[rgba(139,92,246,0.15)]' },
};

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMachine = async () => {
    try {
      const res = await fetch('/api/machines/current');
      const data = await res.json();
      if (!data.error && data.id) {
        setMachine(data);
        return data.id;
      }
      // Fallback: get first machine
      const machinesRes = await fetch('/api/machines');
      const machinesData = await machinesRes.json();
      if (machinesData.machines && machinesData.machines.length > 0) {
        setMachine(machinesData.machines[0]);
        return machinesData.machines[0].id;
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchRecommendations = async (machineId?: string) => {
    try {
      const query = machineId ? `?status=active&machineId=${machineId}` : '?status=active';
      const res = await fetch(`/api/recommendations${query}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      setError('Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const machineId = await fetchMachine();
      await fetchRecommendations(machineId || undefined);
    };
    init();
  }, []);

  const handleApply = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/recommendations/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        // Remove from list or refresh
        setRecommendations(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      alert('Failed to apply recommendation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        // Remove from list
        setRecommendations(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      alert('Failed to dismiss recommendation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerate = async () => {
    if (!machine) {
      alert('No machine found. Please register a machine first.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId: machine.id }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        // Refresh the list
        await fetchRecommendations(machine.id);
      }
    } catch (err) {
      alert('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const totalSavings = recommendations.reduce((sum, r) => sum + (r.estimatedTokenSavings || 0), 0);
  const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
  const highCount = recommendations.filter(r => r.priority === 'high').length;
  const avgConfidence = recommendations.length > 0
    ? Math.round(recommendations.reduce((sum, r) => sum + (r.confidenceScore || 0), 0) / recommendations.length * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
        <div className="text-[#64748b]">Loading recommendations...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="px-10 py-6 bg-[#1e293b] border-b border-[#334155]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[#f1f5f9] tracking-tight mb-1">Recommendations</h1>
            <p className="text-sm text-[#64748b]">AI-powered suggestions based on your usage patterns</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/recommendations/history"
              className="px-5 py-2.5 bg-[#334155] text-[#94a3b8] rounded-[10px] text-sm font-semibold transition-all hover:bg-[#475569] hover:text-[#f1f5f9]"
            >
              View History
            </Link>
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-[10px] text-sm font-semibold shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)] disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 bg-[#0f172a]">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Active Recommendations</div>
            <div className="text-3xl font-bold">{recommendations.length}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Critical / High</div>
            <div className="text-3xl font-bold text-[#f43f5e]">{criticalCount + highCount}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Potential Savings</div>
            <div className="text-3xl font-bold text-[#10b981]">~{(totalSavings / 1000).toFixed(1)}k</div>
            <div className="text-[11px] text-[#64748b] mt-1">tokens/month</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Avg Confidence</div>
            <div className="text-3xl font-bold text-[#6366f1]">{avgConfidence}%</div>
          </div>
        </div>

        {/* Recommendation Cards */}
        {recommendations.length === 0 ? (
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-10 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">No Active Recommendations</h3>
            <p className="text-[#94a3b8] mb-4">
              {machine
                ? "Your setup is optimized! Click below to analyze your usage patterns for new suggestions."
                : "No machine registered. Please register a machine first using the CLI: ccm machine register"}
            </p>
            {machine && (
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-[10px] text-sm font-semibold disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Recommendations'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const category = categoryIcons[rec.category] || { icon: '📋', bg: 'bg-[rgba(100,116,139,0.15)]' };
              const priority = priorityColors[rec.priority] || priorityColors.medium;
              let evidence: { projects?: string[]; occurrences?: number } = {};
              try {
                evidence = rec.evidence ? JSON.parse(rec.evidence) : {};
              } catch {}

              return (
                <div
                  key={rec.id}
                  className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5 flex items-center gap-5 transition-all duration-200 hover:border-[#6366f1] hover:shadow-[0_0_0_1px_#6366f1] hover:-translate-y-px"
                >
                  {/* Priority Indicator */}
                  <div className={`w-1 h-12 rounded-sm ${priority.bg}`} />

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] ${category.bg}`}>
                    {category.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-[15px]">{rec.title}</div>
                      <span className={`text-[11px] font-medium uppercase ${priority.text}`}>
                        {rec.priority}
                      </span>
                    </div>
                    <div className="text-[13px] text-[#94a3b8] mt-1">{rec.description}</div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[11px] text-[#64748b]">
                        Confidence: <span className="text-[#10b981] font-medium">{Math.round(rec.confidenceScore * 100)}%</span>
                      </span>
                      {evidence.projects && evidence.projects.length > 0 && (
                        <span className="text-[11px] text-[#64748b]">
                          Projects: {evidence.projects.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Savings */}
                  <div className="text-right min-w-[110px]">
                    <div className="font-bold text-lg text-[#10b981] tracking-tight">
                      ~{(rec.estimatedTokenSavings || 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[#64748b] uppercase tracking-wider">tokens/month</div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      disabled={actionLoading === rec.id}
                      className="px-5 py-2.5 bg-[#334155] text-[#94a3b8] rounded-[10px] text-sm font-semibold transition-all hover:bg-[#475569] hover:text-[#f1f5f9] disabled:opacity-50"
                    >
                      {actionLoading === rec.id ? '...' : 'Dismiss'}
                    </button>
                    <button
                      onClick={() => handleApply(rec.id)}
                      disabled={actionLoading === rec.id}
                      className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-[10px] text-sm font-semibold shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)] disabled:opacity-50"
                    >
                      {actionLoading === rec.id ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center text-lg">
              💡
            </div>
            <div>
              <h4 className="font-semibold mb-1">How Recommendations Work</h4>
              <p className="text-[13px] text-[#94a3b8] leading-relaxed">
                CCM analyzes your Claude Code usage patterns across all projects to detect technologies
                and workflows. Based on this analysis, it suggests MCP servers and skills that could
                save you tokens and time. Recommendations are ranked by confidence score and potential impact.
              </p>
              <div className="flex gap-6 mt-3 text-[12px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#f43f5e]" />
                  <span className="text-[#94a3b8]">Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span className="text-[#94a3b8]">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
                  <span className="text-[#94a3b8]">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#64748b]" />
                  <span className="text-[#94a3b8]">Low</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
