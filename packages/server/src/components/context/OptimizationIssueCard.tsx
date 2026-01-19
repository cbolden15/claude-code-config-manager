'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

interface OptimizationIssueCardProps {
  issue: OptimizationIssue;
  onPreview: (issue: OptimizationIssue) => void;
  onApply: (issue: OptimizationIssue) => Promise<void>;
}

export function OptimizationIssueCard({ issue, onPreview, onApply }: OptimizationIssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const severityConfig = {
    high: {
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    medium: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: (
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    low: {
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const config = severityConfig[issue.severity];

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(issue);
    } finally {
      setIsApplying(false);
    }
  };

  const formatIssueType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Severity Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {config.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={config.color}>
                {issue.severity.toUpperCase()}
              </Badge>
              <span className="text-sm font-medium text-gray-900">
                {issue.section}
              </span>
              <span className="text-xs text-muted-foreground">
                ({formatIssueType(issue.type)})
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-600">
              {issue.description}
            </p>

            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Save ~{issue.estimatedSavings.toLocaleString()} tokens
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {Math.round(issue.confidence * 100)}% confidence
              </span>
            </div>

            {/* Suggested Action */}
            <div className="mt-2 p-2 bg-muted rounded text-sm">
              <span className="font-medium">Suggested: </span>
              {issue.suggestedAction}
            </div>

            {/* Expanded Preview */}
            {isExpanded && issue.before && issue.after && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Before:</p>
                  <pre className="p-2 bg-red-50 border border-red-200 rounded text-xs overflow-x-auto max-h-32">
                    {issue.before}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">After:</p>
                  <pre className="p-2 bg-green-50 border border-green-200 rounded text-xs overflow-x-auto max-h-32">
                    {issue.after}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (issue.before && issue.after) {
                  setIsExpanded(!isExpanded);
                } else {
                  onPreview(issue);
                }
              }}
            >
              {isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Apply
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
