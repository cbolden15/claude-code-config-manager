'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mock data - will be replaced with API calls after schema migration
const mockAnalysis = {
  filePath: 'CLAUDE.md',
  totalLines: 847,
  totalTokens: 12450,
  optimizationScore: 68,
  potentialScore: 92,
  estimatedSavings: 4200,
  lastAnalyzedAt: '2026-01-19T14:30:00Z',
};

const mockIssues = [
  {
    id: '1',
    type: 'completed_work',
    severity: 'high',
    section: 'Completed Work Sessions',
    description: '12 completed work sessions taking up 4.2KB of context',
    suggestedAction: 'Archive to .claude/archives/completed-work.md',
    estimatedSavings: 2100,
    confidence: 0.95,
  },
  {
    id: '2',
    type: 'verbose_docs',
    severity: 'high',
    section: 'API Documentation',
    description: 'Detailed API docs that could be condensed to references',
    suggestedAction: 'Replace with summary + link to docs/',
    estimatedSavings: 1500,
    confidence: 0.88,
  },
  {
    id: '3',
    type: 'outdated',
    severity: 'medium',
    section: 'v2.0 Migration Notes',
    description: 'Migration notes for completed v2.0 release',
    suggestedAction: 'Archive historical migration content',
    estimatedSavings: 600,
    confidence: 0.92,
  },
];

const mockArchives = [
  {
    id: '1',
    sectionName: 'Phase 1 Implementation',
    archiveFile: '.claude/archives/2025-12-phase1.md',
    originalTokens: 3200,
    summaryTokens: 150,
    archivedAt: '2025-12-15T10:00:00Z',
    reason: 'completed_work',
  },
  {
    id: '2',
    sectionName: 'Initial Setup Notes',
    archiveFile: '.claude/archives/2025-11-setup.md',
    originalTokens: 1800,
    summaryTokens: 80,
    archivedAt: '2025-11-20T15:30:00Z',
    reason: 'outdated',
  },
];

const severityColors = {
  high: { bg: 'bg-[rgba(244,63,94,0.15)]', text: 'text-[#f43f5e]', border: 'border-[#f43f5e]' },
  medium: { bg: 'bg-[rgba(245,158,11,0.15)]', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]' },
  low: { bg: 'bg-[rgba(99,102,241,0.15)]', text: 'text-[#6366f1]', border: 'border-[#6366f1]' },
};

function HealthRing({ score, potentialScore }: { score: number; potentialScore: number }) {
  const circumference = 295;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-[130px] h-[130px]">
      <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
        <defs>
          <linearGradient id="contextGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx="65" cy="65" r="47" fill="none" stroke="#334155" strokeWidth="12" />
        <circle
          cx="65"
          cy="65"
          r="47"
          fill="none"
          stroke="url(#contextGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-[#f1f5f9] tracking-tight">{score}</div>
        <div className="text-xs text-[#64748b] uppercase tracking-wider">Score</div>
      </div>
    </div>
  );
}

export default function ContextPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplyingAll, setIsApplyingAll] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsAnalyzing(false);
  };

  const handleApplyAll = async () => {
    setIsApplyingAll(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsApplyingAll(false);
  };

  const totalSavings = mockIssues.reduce((sum, i) => sum + i.estimatedSavings, 0);

  return (
    <>
      {/* Header */}
      <header className="px-10 py-6 bg-[#1e293b] border-b border-[#334155]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[#f1f5f9] tracking-tight mb-1">Context Optimizer</h1>
            <p className="text-sm text-[#64748b]">Analyze and optimize your CLAUDE.md to reduce token waste</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-5 py-2.5 bg-[#334155] text-[#94a3b8] rounded-[10px] text-sm font-semibold transition-all hover:bg-[#475569] hover:text-[#f1f5f9] disabled:opacity-50"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            {mockIssues.length > 0 && (
              <button
                onClick={handleApplyAll}
                disabled={isApplyingAll}
                className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-[10px] text-sm font-semibold shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)] disabled:opacity-50"
              >
                {isApplyingAll ? 'Applying...' : `Apply All (${mockIssues.length})`}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 bg-[#0f172a]">
        {/* Health Card */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[rgba(245,158,11,0.05)] border border-[#334155] rounded-[20px] p-8 mb-8">
          <div className="flex items-center gap-8">
            <HealthRing score={mockAnalysis.optimizationScore} potentialScore={mockAnalysis.potentialScore} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Context Health</h3>
              <div className="flex items-center gap-4 text-sm text-[#94a3b8]">
                <span>{mockAnalysis.filePath}</span>
                <span className="text-[#64748b]">|</span>
                <span>{mockAnalysis.totalLines} lines</span>
                <span className="text-[#64748b]">|</span>
                <span>{(mockAnalysis.totalTokens / 1000).toFixed(1)}k tokens</span>
              </div>
              <div className="mt-4 flex items-center gap-6">
                <div>
                  <span className="text-[#64748b] text-sm">Current Score</span>
                  <div className="text-2xl font-bold text-[#f59e0b]">{mockAnalysis.optimizationScore}</div>
                </div>
                <div className="text-2xl text-[#64748b]">→</div>
                <div>
                  <span className="text-[#64748b] text-sm">Potential Score</span>
                  <div className="text-2xl font-bold text-[#10b981]">{mockAnalysis.potentialScore}</div>
                </div>
                <div className="ml-auto">
                  <span className="text-[#64748b] text-sm">Estimated Savings</span>
                  <div className="text-2xl font-bold text-[#10b981]">~{(totalSavings / 1000).toFixed(1)}k tokens</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optimization Issues */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Optimization Opportunities</h2>
            <span className="text-sm text-[#64748b]">{mockIssues.length} issues found</span>
          </div>

          <div className="space-y-3">
            {mockIssues.map((issue) => {
              const colors = severityColors[issue.severity as keyof typeof severityColors];
              return (
                <div
                  key={issue.id}
                  className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5 transition-all duration-200 hover:border-[#475569]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                        <svg className={`w-5 h-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{issue.section}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-medium uppercase rounded-full ${colors.bg} ${colors.text}`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#94a3b8] mt-1">{issue.description}</p>
                        <p className="text-[12px] text-[#64748b] mt-2">
                          <span className="text-[#6366f1]">Suggestion:</span> {issue.suggestedAction}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-[#10b981]">~{issue.estimatedSavings}</div>
                        <div className="text-[10px] text-[#64748b] uppercase">tokens saved</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-[#334155] text-[#94a3b8] rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors">
                          Preview
                        </button>
                        <button className="px-4 py-2 bg-[rgba(99,102,241,0.15)] text-[#6366f1] rounded-lg text-sm font-medium hover:bg-[rgba(99,102,241,0.25)] transition-colors">
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Archives */}
        <section>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Archives</h2>
            <span className="text-sm text-[#64748b]">{mockArchives.length} archived sections</span>
          </div>

          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155]">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Section</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Archive File</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Tokens Saved</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Archived</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-[#64748b] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockArchives.map((archive) => (
                  <tr key={archive.id} className="border-b border-[#334155] last:border-0">
                    <td className="px-5 py-4 font-medium">{archive.sectionName}</td>
                    <td className="px-5 py-4 text-[13px] text-[#64748b] font-mono">{archive.archiveFile}</td>
                    <td className="px-5 py-4 text-right text-[#10b981] font-medium">
                      {(archive.originalTokens - archive.summaryTokens).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-[13px] text-[#64748b]">
                      {new Date(archive.archivedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-[#6366f1] text-sm hover:text-[#06b6d4] transition-colors">
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Info Card */}
        <div className="mt-8 bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center text-lg">
              💡
            </div>
            <div>
              <h4 className="font-semibold mb-1">How Context Optimization Works</h4>
              <p className="text-[13px] text-[#94a3b8] leading-relaxed">
                The Context Optimizer analyzes your CLAUDE.md file to identify sections that can be
                archived, condensed, or removed. Historical work sessions and verbose documentation
                are safely archived while keeping references in your main context file. This reduces
                token usage per session while preserving all information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
