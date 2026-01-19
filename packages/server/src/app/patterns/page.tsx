import Link from 'next/link';

// Mock data - will be replaced with API calls after schema migration
const mockPatterns = [
  {
    id: '1',
    type: 'database_query',
    name: 'PostgreSQL Queries via SSH',
    description: 'Direct database queries executed through SSH tunnels',
    occurrences: 47,
    avgPerWeek: 15.7,
    firstSeen: '2025-12-15',
    lastSeen: '2026-01-19',
    projects: ['n8n-workflows', 'api-gateway'],
    confidence: 0.95,
    hasRecommendation: true,
    recommendationId: '1',
  },
  {
    id: '2',
    type: 'git_workflow',
    name: 'Git Status + Diff Pattern',
    description: 'Running git status followed by git diff before commits',
    occurrences: 89,
    avgPerWeek: 23.0,
    firstSeen: '2025-11-01',
    lastSeen: '2026-01-19',
    projects: ['claude-code-config-manager', 'personal-site', 'api-gateway'],
    confidence: 0.98,
    hasRecommendation: true,
    recommendationId: '3',
  },
  {
    id: '3',
    type: 'docker_ops',
    name: 'Docker Container Management',
    description: 'Frequent docker ps, logs, and restart commands',
    occurrences: 34,
    avgPerWeek: 8.5,
    firstSeen: '2025-12-01',
    lastSeen: '2026-01-18',
    projects: ['n8n-workflows', 'api-gateway'],
    confidence: 0.87,
    hasRecommendation: false,
  },
  {
    id: '4',
    type: 'test_runner',
    name: 'Test Suite Execution',
    description: 'Running test suites with coverage reports',
    occurrences: 156,
    avgPerWeek: 45.0,
    firstSeen: '2025-10-01',
    lastSeen: '2026-01-19',
    projects: ['claude-code-config-manager'],
    confidence: 0.99,
    hasRecommendation: false,
  },
  {
    id: '5',
    type: 'api_calls',
    name: 'n8n Workflow Status Checks',
    description: 'Checking workflow execution status via API',
    occurrences: 23,
    avgPerWeek: 5.8,
    firstSeen: '2026-01-01',
    lastSeen: '2026-01-19',
    projects: ['n8n-workflows'],
    confidence: 0.82,
    hasRecommendation: true,
    recommendationId: '5',
  },
];

const patternTypeIcons: Record<string, { icon: string; bg: string }> = {
  database_query: { icon: '🗄️', bg: 'bg-[rgba(99,102,241,0.15)]' },
  git_workflow: { icon: '📂', bg: 'bg-[rgba(16,185,129,0.15)]' },
  docker_ops: { icon: '🐳', bg: 'bg-[rgba(6,182,212,0.15)]' },
  test_runner: { icon: '🧪', bg: 'bg-[rgba(245,158,11,0.15)]' },
  api_calls: { icon: '🔌', bg: 'bg-[rgba(139,92,246,0.15)]' },
};

function getConfidenceColor(confidence: number) {
  if (confidence >= 0.9) return 'text-[#10b981]';
  if (confidence >= 0.7) return 'text-[#f59e0b]';
  return 'text-[#64748b]';
}

export default function PatternsPage() {
  const totalOccurrences = mockPatterns.reduce((sum, p) => sum + p.occurrences, 0);
  const avgWeekly = mockPatterns.reduce((sum, p) => sum + p.avgPerWeek, 0);
  const withRecommendations = mockPatterns.filter(p => p.hasRecommendation).length;

  return (
    <>
      {/* Header */}
      <header className="px-10 py-6 bg-[#1e293b] border-b border-[#334155]">
        <h1 className="text-2xl font-semibold text-[#f1f5f9] tracking-tight mb-1">Patterns</h1>
        <p className="text-sm text-[#64748b]">Detected usage patterns across your Claude Code sessions</p>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 bg-[#0f172a]">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Patterns Detected</div>
            <div className="text-3xl font-bold">{mockPatterns.length}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Total Occurrences</div>
            <div className="text-3xl font-bold">{totalOccurrences}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Avg / Week</div>
            <div className="text-3xl font-bold text-[#6366f1]">{avgWeekly.toFixed(1)}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Has Recommendations</div>
            <div className="text-3xl font-bold text-[#10b981]">{withRecommendations}</div>
          </div>
        </div>

        {/* Pattern Cards */}
        <div className="space-y-4">
          {mockPatterns.map((pattern) => {
            const typeStyle = patternTypeIcons[pattern.type] || { icon: '📊', bg: 'bg-[#334155]' };

            return (
              <div
                key={pattern.id}
                className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 transition-all duration-200 hover:border-[#475569]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-5">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl ${typeStyle.bg} flex items-center justify-center text-2xl`}>
                      {typeStyle.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{pattern.name}</h3>
                        {pattern.hasRecommendation && (
                          <Link
                            href={`/recommendations?id=${pattern.recommendationId}`}
                            className="px-2 py-0.5 text-[11px] font-medium bg-[rgba(99,102,241,0.15)] text-[#6366f1] rounded-full hover:bg-[rgba(99,102,241,0.25)] transition-colors"
                          >
                            View Recommendation
                          </Link>
                        )}
                      </div>
                      <p className="text-[13px] text-[#94a3b8] mt-1">{pattern.description}</p>

                      {/* Projects */}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[11px] text-[#64748b] uppercase tracking-wider">Projects:</span>
                        {pattern.projects.map((project) => (
                          <span
                            key={project}
                            className="px-2 py-0.5 text-[11px] font-medium bg-[#334155] text-[#94a3b8] rounded"
                          >
                            {project}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{pattern.occurrences}</div>
                      <div className="text-[11px] text-[#64748b] uppercase tracking-wider">Occurrences</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#6366f1]">{pattern.avgPerWeek}</div>
                      <div className="text-[11px] text-[#64748b] uppercase tracking-wider">Per Week</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getConfidenceColor(pattern.confidence)}`}>
                        {Math.round(pattern.confidence * 100)}%
                      </div>
                      <div className="text-[11px] text-[#64748b] uppercase tracking-wider">Confidence</div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="mt-4 pt-4 border-t border-[#334155] flex items-center gap-6 text-[12px] text-[#64748b]">
                  <span>First seen: {pattern.firstSeen}</span>
                  <span>Last seen: {pattern.lastSeen}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center text-lg">
              💡
            </div>
            <div>
              <h4 className="font-semibold mb-1">How Pattern Detection Works</h4>
              <p className="text-[13px] text-[#94a3b8] leading-relaxed">
                CCM analyzes your Claude Code sessions to detect repetitive workflows and command patterns.
                When a pattern is detected with high confidence, recommendations are generated to help you
                automate these tasks using MCP servers, skills, or hooks. Patterns with higher occurrence
                counts and confidence scores indicate stronger optimization opportunities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
