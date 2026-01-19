import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================================================
  // Default Machine (for development)
  // ============================================================================

  const defaultMachine = await prisma.machine.upsert({
    where: { name: 'development' },
    update: {
      lastSeen: new Date(),
    },
    create: {
      name: 'development',
      hostname: 'localhost',
      platform: process.platform,
      arch: process.arch,
      homeDir: process.env.HOME || '/home/user',
      isCurrentMachine: true,
    },
  });

  console.log('Created default machine:', defaultMachine.name);

  // ============================================================================
  // Sample Scheduled Tasks
  // ============================================================================

  const dailyAnalysisTask = await prisma.scheduledTask.upsert({
    where: { id: 'daily-context-analysis' },
    update: {},
    create: {
      id: 'daily-context-analysis',
      machineId: defaultMachine.id,
      name: 'Daily Context Analysis',
      description: 'Analyze CLAUDE.md files across all projects daily',
      taskType: 'analyze_context',
      scheduleType: 'cron',
      cronExpression: '0 9 * * *', // 9 AM daily
      taskConfig: JSON.stringify({
        strategy: 'moderate',
        dryRun: false,
      }),
      enabled: false, // Disabled by default
    },
  });

  const weeklyHealthCheck = await prisma.scheduledTask.upsert({
    where: { id: 'weekly-health-check' },
    update: {},
    create: {
      id: 'weekly-health-check',
      machineId: defaultMachine.id,
      name: 'Weekly Health Check',
      description: 'Generate health score and recommendations weekly',
      taskType: 'health_check',
      scheduleType: 'cron',
      cronExpression: '0 10 * * 1', // 10 AM Mondays
      taskConfig: JSON.stringify({}),
      enabled: false, // Disabled by default
    },
  });

  const recommendationGenerator = await prisma.scheduledTask.upsert({
    where: { id: 'generate-recommendations' },
    update: {},
    create: {
      id: 'generate-recommendations',
      machineId: defaultMachine.id,
      name: 'Generate Recommendations',
      description: 'Analyze patterns and generate smart recommendations',
      taskType: 'generate_recommendations',
      scheduleType: 'interval',
      intervalHours: 168, // Weekly
      taskConfig: JSON.stringify({
        minConfidence: 0.7,
        maxRecommendations: 10,
      }),
      enabled: false, // Disabled by default
    },
  });

  console.log('Created scheduled tasks:', [
    dailyAnalysisTask.name,
    weeklyHealthCheck.name,
    recommendationGenerator.name,
  ].join(', '));

  // ============================================================================
  // Sample Patterns (for demonstration)
  // ============================================================================

  const samplePatterns = [
    {
      type: 'database_query',
      technologies: ['postgresql', 'sql'],
      exampleCommand: 'psql -h localhost -U postgres',
      confidence: 0.85,
    },
    {
      type: 'git_workflow',
      technologies: ['git'],
      exampleCommand: 'git status && git add . && git commit',
      confidence: 0.95,
    },
    {
      type: 'docker_ops',
      technologies: ['docker', 'docker-compose'],
      exampleCommand: 'docker-compose up -d',
      confidence: 0.75,
    },
  ];

  for (const patternData of samplePatterns) {
    await prisma.pattern.upsert({
      where: {
        machineId_type: {
          machineId: defaultMachine.id,
          type: patternData.type,
        },
      },
      update: {},
      create: {
        machineId: defaultMachine.id,
        type: patternData.type,
        occurrences: 0,
        projectPaths: JSON.stringify([]),
        technologies: JSON.stringify(patternData.technologies),
        exampleCommand: patternData.exampleCommand,
        confidence: patternData.confidence,
        hasRecommendation: false,
      },
    });
  }

  console.log('Created sample patterns');

  // ============================================================================
  // Initial Health Score
  // ============================================================================

  await prisma.healthScore.create({
    data: {
      machineId: defaultMachine.id,
      score: 50,
      mcpScore: 50,
      contextScore: 50,
      patternScore: 50,
      skillScore: 50,
      activeRecommendations: 0,
      appliedRecommendations: 0,
      dismissedRecommendations: 0,
      trend: 'stable',
      estimatedMonthlyWaste: 0,
      estimatedMonthlySavings: 0,
    },
  });

  console.log('Created initial health score');

  // ============================================================================
  // Summary
  // ============================================================================

  console.log('\nSeeding complete!');
  console.log({
    machines: await prisma.machine.count(),
    scheduledTasks: await prisma.scheduledTask.count(),
    patterns: await prisma.pattern.count(),
    healthScores: await prisma.healthScore.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
