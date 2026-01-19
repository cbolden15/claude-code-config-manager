import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export const dynamic = 'force-dynamic';

interface HealthScore {
  id: string;
  machineId: string;
  totalScore: number;
  mcpScore: number;
  skillScore: number;
  contextScore: number;
  patternScore: number;
  activeRecommendations: number;
  appliedRecommendations: number;
  estimatedDailyWaste: number;
  estimatedDailySavings: number;
  previousScore: number | null;
  trend: string;
  timestamp: Date;
}

async function getHealthScore(): Promise<HealthScore | null> {
  try {
    // @ts-expect-error - HealthScore model may not exist yet (T1 adding schema)
    return await prisma.healthScore.findFirst({
      orderBy: { timestamp: 'desc' }
    });
  } catch (error) {
    console.log('HealthScore model not available yet:', error);
    return null;
  }
}

async function getHealthHistory(): Promise<HealthScore[]> {
  try {
    // @ts-expect-error - HealthScore model may not exist yet (T1 adding schema)
    return await prisma.healthScore.findMany({
      orderBy: { timestamp: 'desc' },
      take: 30
    });
  } catch (error) {
    console.log('HealthScore model not available yet:', error);
    return [];
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-600';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    );
  }
  if (trend === 'declining') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
        <polyline points="17 18 23 18 23 12"/>
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" x2="19" y1="12" y2="12"/>
    </svg>
  );
}

export default async function HealthPage() {
  const currentHealth = await getHealthScore();
  const history = await getHealthHistory();

  // Calculate mock health score if model doesn't exist yet
  const mockHealth: HealthScore = {
    id: 'mock',
    machineId: 'mock',
    totalScore: 0,
    mcpScore: 0,
    skillScore: 0,
    contextScore: 0,
    patternScore: 0,
    activeRecommendations: 0,
    appliedRecommendations: 0,
    estimatedDailyWaste: 0,
    estimatedDailySavings: 0,
    previousScore: null,
    trend: 'stable',
    timestamp: new Date()
  };

  const health = currentHealth || mockHealth;
  const hasData = currentHealth !== null;

  return (
    <>
      <Header
        title="Optimization Health Score"
        description="Track your Claude Code configuration optimization over time"
        actions={
          <div className="flex gap-2">
            <Link href="/recommendations">
              <Button variant="outline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275z"/>
                </svg>
                View Recommendations
              </Button>
            </Link>
            <form action="/api/health/recalculate" method="POST">
              <Button type="submit">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                Recalculate
              </Button>
            </form>
          </div>
        }
      />

      <div className="p-6">
        {!hasData ? (
          <Card>
            <CardHeader>
              <CardTitle>No Health Data Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-muted-foreground mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <p className="text-muted-foreground mb-4">
                  Start using Claude Code to generate health data. The health score
                  measures how well your configuration is optimized based on your
                  actual usage patterns.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  The score is calculated from:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="font-medium">MCP</p>
                    <p className="text-xs text-muted-foreground">Server optimization</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="font-medium">Skills</p>
                    <p className="text-xs text-muted-foreground">Skill utilization</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="font-medium">Context</p>
                    <p className="text-xs text-muted-foreground">Efficiency</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="font-medium">Patterns</p>
                    <p className="text-xs text-muted-foreground">Optimization</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overall Score Card */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Overall Health</span>
                  <TrendIcon trend={health.trend} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-6xl font-bold ${getScoreColor(health.totalScore)} mb-4`}>
                  {health.totalScore}/100
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200 mb-4">
                  <div
                    className={`h-full ${getProgressColor(health.totalScore)} transition-all duration-300 ease-in-out`}
                    style={{ width: `${health.totalScore}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Active Issues</p>
                    <p className="text-xl font-semibold">
                      {health.activeRecommendations}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Daily Token Waste</p>
                    <p className="text-xl font-semibold text-red-600">
                      ~{health.estimatedDailyWaste.toLocaleString()}
                    </p>
                  </div>
                </div>
                {health.previousScore !== null && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Previous score: {health.previousScore} ({' '}
                      {health.totalScore > health.previousScore ? (
                        <span className="text-green-600">+{health.totalScore - health.previousScore}</span>
                      ) : health.totalScore < health.previousScore ? (
                        <span className="text-red-600">{health.totalScore - health.previousScore}</span>
                      ) : (
                        <span>no change</span>
                      )}
                      )
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Scores */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">MCP Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(health.mcpScore)}`}>
                    {health.mcpScore}
                  </div>
                  <Progress value={health.mcpScore} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    How well MCP servers are configured
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Skill Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(health.skillScore)}`}>
                    {health.skillScore}
                  </div>
                  <Progress value={health.skillScore} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Skills matching your workflow
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Context Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(health.contextScore)}`}>
                    {health.contextScore}
                  </div>
                  <Progress value={health.contextScore} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Token usage optimization
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pattern Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(health.patternScore)}`}>
                    {health.patternScore}
                  </div>
                  <Progress value={health.patternScore} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Repetitive patterns addressed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Savings Summary */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                      <polyline points="17 18 23 18 23 12"/>
                    </svg>
                    Estimated Daily Waste
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-600">
                    {health.estimatedDailyWaste.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    tokens wasted per day without optimizations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                      <polyline points="17 6 23 6 23 12"/>
                    </svg>
                    Estimated Daily Savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">
                    {health.estimatedDailySavings.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    tokens saved per day from applied optimizations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Optimization Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div>
                    <div className="text-3xl font-bold">{health.appliedRecommendations}</div>
                    <p className="text-sm text-muted-foreground">Applied</p>
                  </div>
                  <div className="flex-1">
                    <Progress
                      value={
                        health.appliedRecommendations + health.activeRecommendations > 0
                          ? (health.appliedRecommendations /
                              (health.appliedRecommendations + health.activeRecommendations)) *
                            100
                          : 0
                      }
                      className="h-6"
                    />
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{health.activeRecommendations}</div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <Link href="/recommendations">
                    <Button>
                      View {health.activeRecommendations} Pending Recommendations
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* History Section */}
            {history.length > 1 && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="text-sm">Score History (Last 30 Calculations)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-32">
                    {history.reverse().map((score, index) => (
                      <div
                        key={score.id}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${score.totalScore}%`,
                          backgroundColor:
                            score.totalScore >= 80
                              ? '#16a34a'
                              : score.totalScore >= 60
                              ? '#eab308'
                              : '#dc2626'
                        }}
                        title={`${score.totalScore} - ${new Date(score.timestamp).toLocaleDateString()}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Oldest</span>
                    <span>Most Recent</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
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
                <p className="text-sm font-medium text-gray-900">Understanding Health Score</p>
                <p className="text-sm text-gray-600 mt-1">
                  The health score measures how well your Claude Code configuration matches
                  your actual usage patterns. A higher score means less wasted tokens and
                  more efficient workflows. Apply recommendations to improve your score.
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-green-600 rounded-full"></span>
                    <span>80-100: Excellent</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
                    <span>60-79: Good</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-red-600 rounded-full"></span>
                    <span>0-59: Needs Improvement</span>
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
