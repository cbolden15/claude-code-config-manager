import Link from 'next/link';

// Mock data - will be replaced with API calls after schema migration
const mockProjects = [
  {
    id: '1',
    name: 'claude-code-config-manager',
    path: '/Users/calebbolden/Projects/claude-code-config-manager',
    lastActiveAt: '2026-01-19T15:30:00Z',
    detectedTechs: ['Next.js', 'TypeScript', 'Prisma', 'Tailwind'],
    healthScore: 73,
    status: 'active',
  },
  {
    id: '2',
    name: 'n8n-workflows',
    path: '/Users/calebbolden/Projects/n8n-workflows',
    lastActiveAt: '2026-01-19T10:15:00Z',
    detectedTechs: ['JavaScript', 'Docker', 'PostgreSQL'],
    healthScore: 85,
    status: 'active',
  },
  {
    id: '3',
    name: 'personal-site',
    path: '/Users/calebbolden/Projects/personal-site',
    lastActiveAt: '2026-01-18T22:00:00Z',
    detectedTechs: ['Astro', 'TypeScript', 'Tailwind'],
    healthScore: 92,
    status: 'active',
  },
  {
    id: '4',
    name: 'api-gateway',
    path: '/Users/calebbolden/Projects/api-gateway',
    lastActiveAt: '2026-01-15T14:00:00Z',
    detectedTechs: ['Go', 'Docker', 'Redis'],
    healthScore: 68,
    status: 'stale',
  },
];

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getHealthColor(score: number) {
  if (score >= 80) return 'text-[#10b981]';
  if (score >= 60) return 'text-[#f59e0b]';
  return 'text-[#f43f5e]';
}

function getHealthBg(score: number) {
  if (score >= 80) return 'bg-[rgba(16,185,129,0.15)]';
  if (score >= 60) return 'bg-[rgba(245,158,11,0.15)]';
  return 'bg-[rgba(244,63,94,0.15)]';
}

export default function ProjectsPage() {
  return (
    <>
      {/* Header */}
      <header className="px-10 py-6 bg-[#1e293b] border-b border-[#334155]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[#f1f5f9] tracking-tight mb-1">Projects</h1>
            <p className="text-sm text-[#64748b]">Auto-discovered projects with status and health scores</p>
          </div>
          <button className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-[10px] text-sm font-semibold shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)]">
            Scan for Projects
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 bg-[#0f172a]">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Total Projects</div>
            <div className="text-3xl font-bold">{mockProjects.length}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Active Today</div>
            <div className="text-3xl font-bold text-[#10b981]">2</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Avg Health Score</div>
            <div className="text-3xl font-bold text-[#f59e0b]">80</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
            <div className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Needs Attention</div>
            <div className="text-3xl font-bold text-[#f43f5e]">1</div>
          </div>
        </div>

        {/* Project Cards */}
        <div className="space-y-4">
          {mockProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block bg-[#1e293b] border border-[#334155] rounded-2xl p-6 transition-all duration-200 hover:border-[#6366f1] hover:shadow-[0_0_0_1px_#6366f1] hover:-translate-y-px"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  {/* Folder Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#6366f1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      {project.status === 'stale' && (
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-[rgba(245,158,11,0.15)] text-[#f59e0b] rounded-full">
                          Stale
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#64748b] font-mono mt-1">{project.path}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {project.detectedTechs.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 text-[11px] font-medium bg-[#334155] text-[#94a3b8] rounded"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.detectedTechs.length > 4 && (
                        <span className="text-[11px] text-[#64748b]">
                          +{project.detectedTechs.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  {/* Health Score */}
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getHealthColor(project.healthScore)}`}>
                      {project.healthScore}
                    </div>
                    <div className="text-[11px] text-[#64748b] uppercase tracking-wider">Health</div>
                  </div>

                  {/* Last Active */}
                  <div className="text-right">
                    <div className="text-sm text-[#94a3b8]">{formatRelativeTime(project.lastActiveAt)}</div>
                    <div className="text-[11px] text-[#64748b] uppercase tracking-wider">Last Active</div>
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State (hidden when there are projects) */}
        {mockProjects.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#334155] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
            <p className="text-[#94a3b8] max-w-md mx-auto">
              Projects are auto-discovered from your Claude Code sessions.
              Start using Claude Code in a project directory to see it appear here.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
