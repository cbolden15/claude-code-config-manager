'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RecommendationCardProps {
  recommendation: {
    id: string;
    type: string;
    recommendedItem: string;
    category: string;
    title: string;
    reason: string;
    detectedPatterns: string;
    occurrenceCount: number;
    projectsAffected: string;
    exampleUsage?: string | null;
    timeSavings: number;
    tokenSavings: number;
    dailySavings: number;
    monthlySavings: number;
    confidenceScore: number;
    priority: string;
    status: string;
    configTemplate?: string | null;
  };
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  const typeLabels: Record<string, string> = {
    mcp_server: 'MCP Server',
    skill: 'Skill',
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const response = await fetch(
        `/api/recommendations/${recommendation.id}/apply`,
        { method: 'POST' }
      );

      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to apply recommendation');
      }
    } catch (error) {
      alert('Error applying recommendation');
    } finally {
      setIsApplying(false);
    }
  };

  const handleDismiss = async () => {
    if (!confirm('Are you sure you want to dismiss this recommendation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/recommendations/${recommendation.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to dismiss recommendation');
      }
    } catch (error) {
      alert('Error dismissing recommendation');
    }
  };

  // Parse JSON fields safely
  const detectedPatterns = (() => {
    try {
      return JSON.parse(recommendation.detectedPatterns) as string[];
    } catch {
      return [];
    }
  })();

  const projectsAffected = (() => {
    try {
      return JSON.parse(recommendation.projectsAffected) as string[];
    } catch {
      return [];
    }
  })();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {recommendation.type === 'mcp_server' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
                  <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
                  <line x1="6" x2="6.01" y1="6" y2="6"/>
                  <line x1="6" x2="6.01" y1="18" y2="18"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              )}
            </div>
            <div>
              <CardTitle className="text-xl">
                {recommendation.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground capitalize">
                {typeLabels[recommendation.type] || recommendation.type} - {recommendation.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={priorityColors[recommendation.priority] || priorityColors.medium}>
              {recommendation.priority}
            </Badge>
            <Badge variant="outline">
              {Math.round(recommendation.confidenceScore * 100)}% confident
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Reason */}
        <p className="text-base mb-4">{recommendation.reason}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <div>
              <p className="text-sm font-medium">{recommendation.timeSavings}s</p>
              <p className="text-xs text-muted-foreground">per use</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275z"/>
            </svg>
            <div>
              <p className="text-sm font-medium">{recommendation.tokenSavings}</p>
              <p className="text-xs text-muted-foreground">tokens/use</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <div>
              <p className="text-sm font-medium">{recommendation.occurrenceCount}x</p>
              <p className="text-xs text-muted-foreground">in 30 days</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275z"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-green-600">{recommendation.dailySavings}</p>
              <p className="text-xs text-muted-foreground">daily savings</p>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Detected Patterns</h4>
            <ul className="list-disc list-inside space-y-1 mb-3">
              {detectedPatterns.map((pattern: string) => (
                <li key={pattern} className="text-sm">
                  {pattern.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>

            {recommendation.exampleUsage && (
              <>
                <h4 className="font-semibold mb-2">Example Usage</h4>
                <code className="block text-sm bg-background p-2 rounded mb-3 overflow-x-auto">
                  {recommendation.exampleUsage}
                </code>
              </>
            )}

            {projectsAffected.length > 0 && (
              <>
                <h4 className="font-semibold mb-2">Affected Projects</h4>
                <div className="flex flex-wrap gap-2">
                  {projectsAffected.map((projectId: string) => (
                    <Badge key={projectId} variant="secondary">
                      {projectId}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {recommendation.configTemplate && (
              <>
                <h4 className="font-semibold mb-2 mt-3">Configuration</h4>
                <pre className="text-sm bg-background p-2 rounded overflow-x-auto">
                  {JSON.stringify(JSON.parse(recommendation.configTemplate), null, 2)}
                </pre>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {isApplying ? 'Applying...' : 'Apply Recommendation'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            )}
          </Button>

          <Button variant="ghost" onClick={handleDismiss}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18"/>
              <line x1="6" x2="18" y1="6" y2="18"/>
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
