import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecommendationCard } from '@/components/recommendations/RecommendationCard';
import { RecommendationsStats } from '@/components/recommendations/RecommendationsStats';

export const dynamic = 'force-dynamic';

interface Recommendation {
  id: string;
  machineId: string;
  type: string;
  recommendedItem: string;
  category: string;
  title: string;
  reason: string;
  detectedPatterns: string;
  occurrenceCount: number;
  projectsAffected: string;
  exampleUsage: string | null;
  timeSavings: number;
  tokenSavings: number;
  dailySavings: number;
  monthlySavings: number;
  confidenceScore: number;
  priority: string;
  status: string;
  appliedAt: Date | null;
  dismissedAt: Date | null;
  dismissReason: string | null;
  configTemplate: string | null;
  wasUseful: boolean | null;
  actualSavings: number | null;
  createdAt: Date;
  updatedAt: Date;
}

async function getRecommendations(): Promise<Recommendation[]> {
  try {
    // @ts-expect-error - Recommendation model may not exist yet (T1 adding schema)
    const recommendations = await prisma.recommendation.findMany({
      where: {
        status: 'active'
      },
      orderBy: [
        { priority: 'desc' },
        { confidenceScore: 'desc' }
      ]
    });
    return recommendations;
  } catch (error) {
    // Model doesn't exist yet - Terminal 1 is still adding schema
    console.log('Recommendation model not available yet:', error);
    return [];
  }
}

function getStats(recommendations: Recommendation[]) {
  const totalSavings = recommendations.reduce(
    (sum, r) => sum + (r.dailySavings || 0),
    0
  );

  const highPriority = recommendations.filter(
    r => r.priority === 'critical' || r.priority === 'high'
  ).length;

  const projectsSet = new Set<string>();
  for (const rec of recommendations) {
    try {
      const projects = JSON.parse(rec.projectsAffected || '[]') as string[];
      projects.forEach(p => projectsSet.add(p));
    } catch {
      // Invalid JSON, skip
    }
  }

  return {
    total: recommendations.length,
    highPriority,
    dailySavings: totalSavings,
    monthlySavings: totalSavings * 30,
    projectsAffected: projectsSet.size
  };
}

export default async function RecommendationsPage() {
  const recommendations = await getRecommendations();
  const stats = getStats(recommendations);

  return (
    <>
      <Header
        title="Smart Recommendations"
        description="AI-powered suggestions based on your usage patterns"
        actions={
          <div className="flex gap-2">
            <Link href="/recommendations/history">
              <Button variant="outline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="12 8 12 12 14 14"/>
                  <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>
                </svg>
                View History
              </Button>
            </Link>
            <form action="/api/recommendations/generate" method="POST">
              <Button type="submit">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                Regenerate
              </Button>
            </form>
          </div>
        }
      />

      <div className="p-6">
        {/* Stats Cards */}
        <RecommendationsStats stats={stats} />

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>No Recommendations Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-muted-foreground mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275z"/>
                </svg>
                <p className="text-muted-foreground mb-4">
                  We need at least 1-2 weeks of usage data to generate meaningful
                  recommendations. Keep using Claude Code, and we&apos;ll analyze your
                  patterns to suggest optimizations.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>What we track:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Tools used (Bash, Read, Write, etc.)</li>
                    <li>Commands executed (git, docker, psql, etc.)</li>
                    <li>Files accessed across projects</li>
                    <li>Detected technologies and patterns</li>
                  </ul>
                </div>
                <div className="mt-6">
                  <Link href="/health">
                    <Button variant="outline">
                      View Health Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 space-y-4">
            {recommendations.map(rec => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        )}

        {/* Information Card */}
        <Card className="mt-8">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">How Recommendations Work</p>
                <p className="text-sm text-gray-600 mt-1">
                  CCM analyzes your Claude Code usage patterns across all projects to detect
                  technologies and workflows. Based on this analysis, it suggests MCP servers
                  and skills that could save you tokens and time. Recommendations are ranked
                  by confidence score and potential impact.
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded-full"></span>
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-orange-100 border border-orange-300 rounded-full"></span>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full"></span>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-300 rounded-full"></span>
                    <span>Low</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
