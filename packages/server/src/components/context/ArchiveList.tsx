'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

interface ArchiveListProps {
  archives: ContextArchive[];
  onView: (archive: ContextArchive) => void;
  onRestore: (archive: ContextArchive) => Promise<void>;
  isLoading?: boolean;
}

export function ArchiveList({ archives, onView, onRestore, isLoading = false }: ArchiveListProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatReason = (reason: string) => {
    const reasonMap: Record<string, { label: string; color: string }> = {
      completed_work: { label: 'Completed Work', color: 'bg-green-100 text-green-800' },
      outdated: { label: 'Outdated', color: 'bg-yellow-100 text-yellow-800' },
      verbose: { label: 'Verbose', color: 'bg-blue-100 text-blue-800' },
      duplicate: { label: 'Duplicate', color: 'bg-purple-100 text-purple-800' },
    };
    return reasonMap[reason] || { label: reason, color: 'bg-gray-100 text-gray-800' };
  };

  const handleRestore = async (archive: ContextArchive) => {
    setRestoringId(archive.id);
    try {
      await onRestore(archive);
    } finally {
      setRestoringId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archives
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          Archives ({archives.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {archives.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-muted-foreground">No archives yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Archives will appear here when you optimize your CLAUDE.md
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {archives.map((archive) => {
              const reason = formatReason(archive.archiveReason);
              const isRestoring = restoringId === archive.id;

              return (
                <div
                  key={archive.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{archive.sectionName}</span>
                        <Badge className={reason.color} variant="secondary">
                          {reason.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                        <span>{formatDate(archive.archivedAt)}</span>
                        <span>{archive.originalLines} lines</span>
                        <span>~{Math.round(archive.originalTokens / 1000)}k tokens</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(archive)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(archive)}
                      disabled={isRestoring}
                    >
                      {isRestoring ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Restore
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
