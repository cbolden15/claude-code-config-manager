'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContextHealthCard } from '@/components/context/ContextHealthCard';
import { OptimizationIssueCard } from '@/components/context/OptimizationIssueCard';
import { ArchiveList } from '@/components/context/ArchiveList';
import { OptimizationPreviewDialog } from '@/components/context/OptimizationPreviewDialog';

interface ContextAnalysis {
  id: string;
  filePath: string;
  totalLines: number;
  totalTokens: number;
  optimizationScore: number;
  estimatedSavings: number;
  lastAnalyzedAt: string;
  sections: string;
  issues: string;
}

interface OptimizationIssue {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  section: string;
  description: string;
  suggestedAction: string;
  estimatedSavings: number;
  confidence: number;
  before?: string;
  after?: string;
}

interface ContextArchive {
  id: string;
  sourceFile: string;
  archiveFile: string;
  sectionName: string;
  originalLines: number;
  originalTokens: number;
  summaryLines: number;
  archiveReason: string;
  archivedAt: Date | string;
  archivedContent?: string;
}

interface PreviewData {
  id: string;
  section: string;
  type: string;
  before: string;
  after: string;
  linesRemoved: number;
  tokensSaved: number;
  reason: string;
}

export default function ContextPage() {
  const [analysis, setAnalysis] = useState<ContextAnalysis | null>(null);
  const [issues, setIssues] = useState<OptimizationIssue[]>([]);
  const [archives, setArchives] = useState<ContextArchive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isApplyingPreview, setIsApplyingPreview] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Fetch analysis, issues, and archives in parallel
      const [analysisRes, archivesRes] = await Promise.all([
        fetch('/api/context/analyze'),
        fetch('/api/context/archives'),
      ]);

      if (analysisRes.ok) {
        const data = await analysisRes.json();
        setAnalysis(data.analysis || null);

        // Parse issues from analysis
        if (data.analysis?.issues) {
          try {
            const parsedIssues = JSON.parse(data.analysis.issues);
            setIssues(parsedIssues);
          } catch {
            setIssues([]);
          }
        }
      }

      if (archivesRes.ok) {
        const data = await archivesRes.json();
        setArchives(data.archives || []);
      }
    } catch (err) {
      setError('Failed to load context data');
      console.error('Error fetching context data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/context/analyze', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to analyze');
      }

      await fetchData();
    } catch (err) {
      setError('Failed to analyze CLAUDE.md');
      console.error('Error analyzing:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePreview = async (issue: OptimizationIssue) => {
    try {
      const response = await fetch('/api/context/optimize/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId: issue.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData({
          id: issue.id,
          section: issue.section,
          type: issue.type,
          before: data.before || issue.before || '',
          after: data.after || issue.after || '',
          linesRemoved: data.linesRemoved || 0,
          tokensSaved: data.tokensSaved || issue.estimatedSavings,
          reason: issue.description,
        });
        setPreviewOpen(true);
      }
    } catch (err) {
      console.error('Error fetching preview:', err);
    }
  };

  const handleApplyIssue = async (issue: OptimizationIssue) => {
    try {
      const response = await fetch('/api/context/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueIds: [issue.id] }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        throw new Error('Failed to apply optimization');
      }
    } catch (err) {
      setError('Failed to apply optimization');
      console.error('Error applying:', err);
    }
  };

  const handleApplyPreview = async () => {
    if (!previewData) return;

    setIsApplyingPreview(true);
    try {
      const response = await fetch('/api/context/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueIds: [previewData.id] }),
      });

      if (response.ok) {
        setPreviewOpen(false);
        await fetchData();
      } else {
        throw new Error('Failed to apply optimization');
      }
    } catch (err) {
      setError('Failed to apply optimization');
      console.error('Error applying:', err);
    } finally {
      setIsApplyingPreview(false);
    }
  };

  const handleApplyAll = async () => {
    setIsApplyingAll(true);
    try {
      const response = await fetch('/api/context/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueIds: issues.map(i => i.id),
          strategy: 'moderate',
        }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        throw new Error('Failed to apply optimizations');
      }
    } catch (err) {
      setError('Failed to apply all optimizations');
      console.error('Error applying all:', err);
    } finally {
      setIsApplyingAll(false);
    }
  };

  const handleViewArchive = (archive: ContextArchive) => {
    // Open archive content in a dialog or redirect
    // For now, just log it
    console.log('View archive:', archive);
    // Could set state to show archive content in a dialog
  };

  const handleRestoreArchive = async (archive: ContextArchive) => {
    try {
      const response = await fetch('/api/context/archives/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archiveId: archive.id }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        throw new Error('Failed to restore archive');
      }
    } catch (err) {
      setError('Failed to restore archive');
      console.error('Error restoring:', err);
    }
  };

  // Group issues by severity
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  const lowIssues = issues.filter(i => i.severity === 'low');
  const sortedIssues = [...highIssues, ...mediumIssues, ...lowIssues];

  const totalPotentialSavings = issues.reduce((sum, i) => sum + i.estimatedSavings, 0);

  return (
    <>
      <Header
        title="Context Optimizer"
        description="Analyze and optimize your CLAUDE.md to reduce token waste"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
                  </svg>
                  Analyze
                </>
              )}
            </Button>
            {issues.length > 0 && (
              <Button
                onClick={handleApplyAll}
                disabled={isApplyingAll}
              >
                {isApplyingAll ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Applying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Apply All ({issues.length})
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Health Card */}
        <ContextHealthCard
          analysis={analysis}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
        />

        {/* Optimization Issues */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Optimization Opportunities
              </CardTitle>
              {issues.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Potential savings: ~{(totalPotentialSavings / 1000).toFixed(1)}k tokens
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : sortedIssues.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-muted-foreground">
                  {analysis ? 'Your CLAUDE.md is well optimized!' : 'Run an analysis to find optimization opportunities.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedIssues.map((issue) => (
                  <OptimizationIssueCard
                    key={issue.id}
                    issue={issue}
                    onPreview={handlePreview}
                    onApply={handleApplyIssue}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Archives */}
        <ArchiveList
          archives={archives}
          onView={handleViewArchive}
          onRestore={handleRestoreArchive}
          isLoading={isLoading}
        />

        {/* Information Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">How Context Optimization Works</p>
                <p className="text-sm text-gray-600 mt-1">
                  The Context Optimizer analyzes your CLAUDE.md file to identify sections that can be
                  archived, condensed, or removed. Historical work sessions and verbose documentation
                  are safely archived while keeping references in your main context file. This reduces
                  token usage per session while preserving all information.
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded-full"></span>
                    <span>High Priority</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full"></span>
                    <span>Medium Priority</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-300 rounded-full"></span>
                    <span>Low Priority</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <OptimizationPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={previewData}
        onApply={handleApplyPreview}
        isApplying={isApplyingPreview}
      />
    </>
  );
}
