import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    const machineCount = await prisma.machine.count();
    const projectCount = await prisma.project.count();
    const sessionCount = await prisma.session.count();
    const patternCount = await prisma.pattern.count();
    const recommendationCount = await prisma.recommendation.count();
    const appliedConfigCount = await prisma.appliedConfig.count();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '4.0.0',
      database: 'connected',
      stats: {
        machines: machineCount,
        projects: projectCount,
        sessions: sessionCount,
        patterns: patternCount,
        recommendations: recommendationCount,
        appliedConfigs: appliedConfigCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
