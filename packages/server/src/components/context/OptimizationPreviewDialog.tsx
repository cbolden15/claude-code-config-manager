'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OptimizationPreview {
  id: string;
  section: string;
  type: string;
  before: string;
  after: string;
  linesRemoved: number;
  tokensSaved: number;
  reason: string;
}

interface OptimizationPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: OptimizationPreview | null;
  onApply: () => Promise<void>;
  isApplying?: boolean;
}

export function OptimizationPreviewDialog({
  open,
  onOpenChange,
  preview,
  onApply,
  isApplying = false,
}: OptimizationPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<'before' | 'after' | 'diff'>('diff');

  if (!preview) return null;

  const handleApply = async () => {
    await onApply();
    onOpenChange(false);
  };

  const formatType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Simple diff visualization
  const renderDiff = () => {
    const beforeLines = preview.before.split('\n');
    const afterLines = preview.after.split('\n');

    // Simple diff: show removed lines in red, added in green
    return (
      <div className="font-mono text-xs space-y-0.5 max-h-80 overflow-y-auto">
        {beforeLines.map((line, i) => {
          const isInAfter = afterLines.includes(line);
          if (!isInAfter) {
            return (
              <div key={`removed-${i}`} className="bg-red-100 text-red-800 px-2 py-0.5 rounded-sm">
                <span className="text-red-500 mr-2">-</span>
                {line || ' '}
              </div>
            );
          }
          return null;
        })}
        {afterLines.map((line, i) => {
          const isInBefore = beforeLines.includes(line);
          return (
            <div
              key={`after-${i}`}
              className={
                isInBefore
                  ? 'px-2 py-0.5 text-gray-700'
                  : 'bg-green-100 text-green-800 px-2 py-0.5 rounded-sm'
              }
            >
              {!isInBefore && <span className="text-green-500 mr-2">+</span>}
              {isInBefore && <span className="text-gray-400 mr-2"> </span>}
              {line || ' '}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Preview Optimization
          </DialogTitle>
          <DialogDescription>
            Review the changes before applying them to your CLAUDE.md
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <div className="flex-1">
            <p className="font-medium">{preview.section}</p>
            <p className="text-sm text-muted-foreground">{formatType(preview.type)}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-semibold text-red-600">-{preview.linesRemoved}</p>
              <p className="text-xs text-muted-foreground">lines</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-green-600">-{preview.tokensSaved.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">tokens</p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="p-3 border rounded-lg">
          <p className="text-sm">
            <span className="font-medium">Reason: </span>
            {preview.reason}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'diff'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Diff
          </button>
          <button
            onClick={() => setActiveTab('before')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'before'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Before
          </button>
          <button
            onClick={() => setActiveTab('after')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'after'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            After
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden border rounded-lg">
          {activeTab === 'diff' && (
            <div className="p-3 overflow-auto max-h-64">
              {renderDiff()}
            </div>
          )}
          {activeTab === 'before' && (
            <pre className="p-3 text-xs font-mono overflow-auto max-h-64 bg-red-50">
              {preview.before}
            </pre>
          )}
          {activeTab === 'after' && (
            <pre className="p-3 text-xs font-mono overflow-auto max-h-64 bg-green-50">
              {preview.after}
            </pre>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-50">
              -{preview.linesRemoved} lines
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              -{preview.tokensSaved.toLocaleString()} tokens saved
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={isApplying}>
              {isApplying ? (
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
                  Apply Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
