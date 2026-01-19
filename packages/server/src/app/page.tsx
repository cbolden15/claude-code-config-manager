import Link from 'next/link';

// Mock data - will be replaced with API calls after schema migration
const mockHealthScore = {
  overall: 73,
  trend: '+8',
  trendLabel: 'this week',
  categories: [
    { name: 'MCP Servers', score: 92, status: 'good' },
    { name: 'Context', score: 68, status: 'warning' },
    { name: 'Patterns', score: 71, status: 'warning' },
    { name: 'Skills', score: 61, status: 'bad' },
  ],
};

const mockRecommendations = [
  {
    id: '1',
    priority: 'critical',
    type: 'mcp',
    icon: '🔌',
    title: 'Enable PostgreSQL MCP Server',
    description: '47 database queries detected via SSH in the last 30 days',
    savings: '~2,100',
    savingsUnit: 'tokens/month',
  },
  {
    id: '2',
    priority: 'high',
    type: 'context',
    icon: '📄',
    title: 'Archive completed work sessions',
    description: 'CLAUDE.md has 12KB of historical content that can be archived',
    savings: '~4,200',
    savingsUnit: 'tokens/session',
  },
  {
    id: '3',
    priority: 'high',
    type: 'skill',
    icon: '⚡',
    title: 'Create git-status skill',
    description: 'Repetitive pattern: git status && git diff runs 23 times/week',
    savings: '~800',
    savingsUnit: 'tokens/week',
  },
];

const mockStats = [
  { label: 'Sessions Today', value: '12', change: '↑ 3 from yesterday', changeType: 'positive' },
  { label: 'Tokens Saved', value: '8,420', change: '↑ 1,200 this week', changeType: 'positive' },
  { label: 'Active Projects', value: '7', change: '2 analyzed today', changeType: 'neutral' },
];

function HealthRing({ score }: { score: number }) {
  // Calculate stroke-dashoffset for the progress ring (295 is circumference, lower offset = more fill)
  const circumference = 295;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-[130px] h-[130px]">
      <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
        <defs>
          <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle
          cx="65"
          cy="65"
          r="47"
          fill="none"
          stroke="#334155"
          strokeWidth="12"
        />
        <circle
          cx="65"
          cy="65"
          r="47"
          fill="none"
          stroke="url(#healthGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-[#f1f5f9] tracking-tight">{score}</div>
        <div className="text-xs text-[#64748b] uppercase tracking-wider">Health</div>
      </div>
    </div>
  );
}

function CategoryBar({ name, score, status }: { name: string; score: number; status: string }) {
  const barColors = {
    good: 'bg-gradient-to-r from-[#10b981] to-[#06b6d4]',
    warning: 'bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]',
    bad: 'bg-gradient-to-r from-[#f43f5e] to-[#fb7185]',
  };

  const textColors = {
    good: 'text-[#10b981]',
    warning: 'text-[#f59e0b]',
    bad: 'text-[#f43f5e]',
  };

  return (
    <div className="bg-[rgba(15,23,42,0.5)] p-5 rounded-xl text-center">
      <div className="h-1.5 bg-[#334155] rounded-full overflow-hidden mb-3.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColors[status as keyof typeof barColors]}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className={`text-2xl font-bold mb-1 tracking-tight ${textColors[status as keyof typeof textColors]}`}>
        {score}
      </div>
      <div className="text-xs text-[#64748b] uppercase tracking-wider">{name}</div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: typeof mockRecommendations[0];
}) {
  const priorityColors = {
    critical: 'bg-gradient-to-b from-[#f43f5e] to-[#fb7185]',
    high: 'bg-gradient-to-b from-[#f59e0b] to-[#fbbf24]',
    medium: 'bg-gradient-to-b from-[#6366f1] to-[#06b6d4]',
  };

  const iconBgColors = {
    mcp: 'bg-[rgba(99,102,241,0.15)]',
    context: 'bg-[rgba(245,158,11,0.15)]',
    skill: 'bg-[rgba(16,185,129,0.15)]',
    hook: 'bg-[rgba(139,92,246,0.15)]',
  };

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5 flex items-center gap-5 transition-all duration-200 hover:border-[#6366f1] hover:shadow-[0_0_0_1px_#6366f1] hover:-translate-y-px">
      <div
        className={`w-1 h-12 rounded-sm ${priorityColors[recommendation.priority as keyof typeof priorityColors]}`}
      />
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] ${iconBgColors[recommendation.type as keyof typeof iconBgColors]}`}
      >
        {recommendation.icon}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-[15px] mb-1">{recommendation.title}</div>
        <div className="text-[13px] text-[#94a3b8]">{recommendation.description}</div>
      </div>
      <div className="text-right min-w-[110px]">
        <div className="font-bold text-lg text-[#10b981] tracking-tight">{recommendation.savings}</div>
        <div className="text-[11px] text-[#64748b] uppercase tracking-wider">{recommendation.savingsUnit}</div>
      </div>
      <div className="flex gap-2.5">
        <button className="px-5 py-2.5 bg-[#334155] text-[#94a3b8] rounded-[10px] text-sm font-semibold transition-all hover:bg-[#475569] hover:text-[#f1f5f9]">
          Dismiss
        </button>
        <button className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-[10px] text-sm font-semibold shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)]">
          Apply
        </button>
      </div>
    </div>
  );
}

function StatCard({
  stat,
}: {
  stat: typeof mockStats[0];
}) {
  const changeColors = {
    positive: 'text-[#10b981]',
    negative: 'text-[#f43f5e]',
    neutral: 'text-[#64748b]',
  };

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 transition-colors hover:border-[#475569]">
      <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">{stat.label}</div>
      <div className="text-[32px] font-bold tracking-tight">{stat.value}</div>
      <div className={`text-[13px] mt-2 font-medium ${changeColors[stat.changeType as keyof typeof changeColors]}`}>
        {stat.change}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      {/* Header */}
      <header className="px-10 py-6 bg-[#1e293b] border-b border-[#334155]">
        <h1 className="text-2xl font-semibold text-[#f1f5f9] tracking-tight mb-1">Dashboard</h1>
        <p className="text-sm text-[#64748b]">Your Claude Code optimization overview</p>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 bg-[#0f172a]">
        {/* Health Card */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[rgba(99,102,241,0.05)] border border-[#334155] rounded-[20px] p-8 mb-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-6">
              <HealthRing score={mockHealthScore.overall} />
              <div>
                <h3 className="text-lg font-semibold mb-2.5 tracking-tight">Good Progress</h3>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[rgba(16,185,129,0.15)] text-[#10b981] rounded-full text-[13px] font-semibold">
                  <span>↑</span> {mockHealthScore.trend} {mockHealthScore.trendLabel}
                </div>
                <p className="text-[#94a3b8] text-sm mt-3.5 max-w-[300px] leading-relaxed">
                  Your setup is {mockHealthScore.overall}% optimized. Apply 2 recommendations to reach 85+.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {mockHealthScore.categories.map((category) => (
              <CategoryBar
                key={category.name}
                name={category.name}
                score={category.score}
                status={category.status}
              />
            ))}
          </div>
        </div>

        {/* Recommendations Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Top Recommendations</h2>
            <Link
              href="/recommendations"
              className="text-[#6366f1] text-sm font-medium transition-colors hover:text-[#06b6d4]"
            >
              View all →
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {mockRecommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </section>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-5">
          {mockStats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </>
  );
}
