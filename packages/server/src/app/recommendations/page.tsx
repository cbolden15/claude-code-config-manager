import Link from 'next/link';

// Mock data - will be replaced with API calls after schema migration
const mockRecommendations = [
  {
    id: '1',
    priority: 'critical',
    category: 'mcp_server',
    icon: '🔌',
    title: 'Enable PostgreSQL MCP Server',
    description: '47 database queries detected via SSH in the last 30 days',
    evidence: {
      patterns: ['database_query', 'ssh_tunnel'],
      occurrences: 47,
      projects: ['n8n-workflows', 'api-gateway'],
    },
    savings: 2100,
    savingsUnit: 'tokens/month',
    confidence: 0.95,
    status: 'active',
  },
  {
    id: '2',
    priority: 'high',
    category: 'context',
    icon: '📄',
    title: 'Archive completed work sessions',
    description: 'CLAUDE.md has 12KB of historical content that can be archived',
    evidence: {
      sections: ['Completed Work', 'Historical Notes'],
      tokens: 4200,
    },
    savings: 4200,
    savingsUnit: 'tokens/session',
    confidence: 0.92,
    status: 'active',
  },
  {
    id: '3',
    priority: 'high',
    category: 'skill',
    icon: '⚡',
    title: 'Create git-status skill',
    description: 'Repetitive pattern: git status && git diff runs 23 times/week',
    evidence: {
      patterns: ['git_workflow'],
      occurrences: 89,
      projects: ['claude-code-config-manager', 'personal-site'],
    },
    savings: 800,
    savingsUnit: 'tokens/week',
    confidence: 0.98,
    status: 'active',
  },
  {
    id: '4',
    priority: 'medium',
    category: 'hook',
    icon: '🪝',
    title: 'Add pre-commit linting hook',
    description: 'Manual ESLint runs detected before commits in TypeScript projects',
    evidence: {
      patterns: ['lint_before_commit'],
      occurrences: 34,
      projects: ['claude-code-config-manager'],
    },
    savings: 450,
    savingsUnit: 'tokens/week',
    confidence: 0.85,
    status: 'active',
  },
  {
    id: '5',
    priority: 'medium',
    category: 'mcp_server',
    icon: '🔌',
    title: 'Enable n8n Workflow MCP',
    description: 'Frequent workflow status checks detected via API calls',
    evidence: {
      patterns: ['api_calls', 'n8n_workflow'],
      occurrences: 23,
      projects: ['n8n-workflows'],
    },
    savings: 650,
    savingsUnit: 'tokens/month',
    confidence: 0.82,
    status: 'active',
  },
];

const priorityColors = {
  critical: { bg: 'bg-gradient-to-b from-[#f43f5e] to-[#fb7185]', text: 'text-[#f43f5e]' },
  high: { bg: 'bg-gradient-to-b from-[#f59e0b] to-[#fbbf24]', text: 'text-[#f59e0b]' },
  medium: { bg: 'bg-gradient-to-b from-[#6366f1] to-[#06b6d4]', text: 'text-[#6366f1]' },
  low: { bg: 'bg-gradient-to-b from-[#64748b] to-[#94a3b8]', text: 'text-[#94a3b8]' },
};

const categoryIcons = {
  mcp_server: 'bg-[rgba(99,102,241,0.15)]',
  context: 'bg-[rgba(245,158,11,0.15)]',
  skill: 'bg-[rgba(16,185,129,0.15)]',
  hook: 'bg-[rgba(139,92,246,0.15)]',
};

export default function RecommendationsPage() {
  const totalSavings = mockRecommendations.reduce((sum, r) => sum + r.savings, 0);
  const criticalCount = mockRecommendations.filter(r => r.priority === 'critical').length;
  const highCount = mockRecommendations.filter(r => r.priority === 'high').length;

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
            <button className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-[10px] text-sm font-semibold shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)]">
              Regenerate
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 bg-[#0f172a]">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Active Recommendations</div>
            <div className="text-3xl font-bold">{mockRecommendations.length}</div>
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
            <div className="text-3xl font-bold text-[#6366f1]">
              {Math.round(mockRecommendations.reduce((sum, r) => sum + r.confidence, 0) / mockRecommendations.length * 100)}%
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button className="px-4 py-2 bg-[rgba(99,102,241,0.15)] text-[#6366f1] rounded-[10px] text-sm font-medium">
            All ({mockRecommendations.length})
          </button>
          <button className="px-4 py-2 bg-[#334155] text-[#94a3b8] rounded-[10px] text-sm font-medium hover:bg-[#475569] transition-colors">
            MCP Servers (2)
          </button>
          <button className="px-4 py-2 bg-[#334155] text-[#94a3b8] rounded-[10px] text-sm font-medium hover:bg-[#475569] transition-colors">
            Skills (1)
          </button>
          <button className="px-4 py-2 bg-[#334155] text-[#94a3b8] rounded-[10px] text-sm font-medium hover:bg-[#475569] transition-colors">
            Context (1)
          </button>
          <button className="px-4 py-2 bg-[#334155] text-[#94a3b8] rounded-[10px] text-sm font-medium hover:bg-[#475569] transition-colors">
            Hooks (1)
          </button>
        </div>

        {/* Recommendation Cards */}
        <div className="space-y-3">
          {mockRecommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5 flex items-center gap-5 transition-all duration-200 hover:border-[#6366f1] hover:shadow-[0_0_0_1px_#6366f1] hover:-translate-y-px"
            >
              {/* Priority Indicator */}
              <div
                className={`w-1 h-12 rounded-sm ${priorityColors[rec.priority as keyof typeof priorityColors].bg}`}
              />

              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] ${categoryIcons[rec.category as keyof typeof categoryIcons]}`}
              >
                {rec.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-[15px]">{rec.title}</div>
                  <span className={`text-[11px] font-medium uppercase ${priorityColors[rec.priority as keyof typeof priorityColors].text}`}>
                    {rec.priority}
                  </span>
                </div>
                <div className="text-[13px] text-[#94a3b8] mt-1">{rec.description}</div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[11px] text-[#64748b]">
                    Confidence: <span className="text-[#10b981] font-medium">{Math.round(rec.confidence * 100)}%</span>
                  </span>
                  {rec.evidence.projects && (
                    <span className="text-[11px] text-[#64748b]">
                      Projects: {rec.evidence.projects.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Savings */}
              <div className="text-right min-w-[110px]">
                <div className="font-bold text-lg text-[#10b981] tracking-tight">~{rec.savings.toLocaleString()}</div>
                <div className="text-[11px] text-[#64748b] uppercase tracking-wider">{rec.savingsUnit}</div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <button className="px-5 py-2.5 bg-[#334155] text-[#94a3b8] rounded-[10px] text-sm font-semibold transition-all hover:bg-[#475569] hover:text-[#f1f5f9]">
                  Dismiss
                </button>
                <button className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-[10px] text-sm font-semibold shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)]">
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>

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
