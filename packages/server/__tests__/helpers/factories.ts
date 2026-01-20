import { PrismaClient } from '@prisma/client'
import type {
  Machine,
  Project,
  Session,
  Pattern,
  Recommendation,
  HealthScore,
} from '@prisma/client'

/**
 * Test Data Factories
 * Helper functions to create test data with sensible defaults
 */

// Counter for unique names
let counter = 0
function getUniqueId(): string {
  return `test-${Date.now()}-${++counter}`
}

/**
 * Machine Factory
 */
export async function createTestMachine(
  prisma: PrismaClient,
  overrides: Partial<Machine> = {}
): Promise<Machine> {
  const uniqueId = getUniqueId()
  return prisma.machine.create({
    data: {
      name: overrides.name || `test-machine-${uniqueId}`,
      hostname: overrides.hostname || `test-host-${uniqueId}.local`,
      platform: overrides.platform || 'darwin',
      arch: overrides.arch || 'arm64',
      homeDir: overrides.homeDir || '/Users/test',
      isCurrentMachine: overrides.isCurrentMachine !== undefined ? overrides.isCurrentMachine : false,
      lastSeen: overrides.lastSeen || new Date(),
    },
  })
}

/**
 * Project Factory
 */
export async function createTestProject(
  prisma: PrismaClient,
  machineId: string,
  overrides: Partial<Project> = {}
): Promise<Project> {
  const uniqueId = getUniqueId()
  return prisma.project.create({
    data: {
      machineId,
      name: overrides.name || `test-project-${uniqueId}`,
      path: overrides.path || `/test/path/${uniqueId}`,
      lastActiveAt: overrides.lastActiveAt || new Date(),
    },
  })
}

/**
 * Session Factory
 */
export async function createTestSession(
  prisma: PrismaClient,
  machineId: string,
  projectPath: string,
  overrides: Partial<Session> = {}
): Promise<Session> {
  return prisma.session.create({
    data: {
      machineId,
      projectPath,
      toolsUsed: overrides.toolsUsed || JSON.stringify(['Read', 'Write', 'Bash']),
      commandsRun: overrides.commandsRun || JSON.stringify(['npm test', 'git status']),
      tokensUsed: overrides.tokensUsed || 1500,
      contextTokens: overrides.contextTokens || 500,
      filesModified: overrides.filesModified || 3,
      duration: overrides.duration || 300,
      startedAt: overrides.startedAt || new Date(),
      endedAt: overrides.endedAt || new Date(),
    },
  })
}

/**
 * Pattern Factory
 */
export async function createTestPattern(
  prisma: PrismaClient,
  machineId: string,
  overrides: Partial<Pattern> = {}
): Promise<Pattern> {
  const uniqueId = getUniqueId()
  return prisma.pattern.create({
    data: {
      machineId,
      type: overrides.type || 'git_workflow',
      occurrences: overrides.occurrences || 10,
      confidence: overrides.confidence || 0.8,
      examples: overrides.examples || JSON.stringify(['git status', 'git commit']),
      projectPaths: overrides.projectPaths || JSON.stringify(['/test/project']),
      lastSeenAt: overrides.lastSeenAt || new Date(),
    },
  })
}

/**
 * Recommendation Factory
 */
export async function createTestRecommendation(
  prisma: PrismaClient,
  machineId: string,
  overrides: Partial<Recommendation> = {}
): Promise<Recommendation> {
  const uniqueId = getUniqueId()
  return prisma.recommendation.create({
    data: {
      machineId,
      type: overrides.type || 'mcp_server',
      recommendedItem: overrides.recommendedItem || `test-server-${uniqueId}`,
      category: overrides.category || 'database',
      title: overrides.title || 'Test Recommendation',
      reason: overrides.reason || 'Detected frequent database queries',
      detectedPatterns: overrides.detectedPatterns || JSON.stringify(['direct_database_query']),
      occurrenceCount: overrides.occurrenceCount || 25,
      confidenceScore: overrides.confidenceScore || 0.85,
      estimatedTokenSavings: overrides.estimatedTokenSavings || 500,
      priority: overrides.priority || 'medium',
      status: overrides.status || 'active',
    },
  })
}

/**
 * HealthScore Factory
 */
export async function createTestHealthScore(
  prisma: PrismaClient,
  machineId: string,
  overrides: Partial<HealthScore> = {}
): Promise<HealthScore> {
  return prisma.healthScore.create({
    data: {
      machineId,
      score: overrides.score || 75,
      mcpScore: overrides.mcpScore || 80,
      skillScore: overrides.skillScore || 70,
      contextScore: overrides.contextScore || 75,
      patternScore: overrides.patternScore || 75,
      activeRecommendations: overrides.activeRecommendations || 3,
      appliedRecommendations: overrides.appliedRecommendations || 5,
      dismissedRecommendations: overrides.dismissedRecommendations || 1,
      estimatedMonthlyWaste: overrides.estimatedMonthlyWaste || 10000,
      estimatedMonthlySavings: overrides.estimatedMonthlySavings || 5000,
      previousScore: overrides.previousScore || 70,
      trend: overrides.trend || 'improving',
    },
  })
}

/**
 * Create a complete machine with related data
 */
export async function createTestMachineWithData(
  prisma: PrismaClient,
  options: {
    machine?: Partial<Machine>
    projectsCount?: number
    sessionsCount?: number
    patternsCount?: number
  } = {}
): Promise<Machine> {
  const machine = await createTestMachine(prisma, options.machine)

  // Create projects
  const projectsCount = options.projectsCount || 0
  for (let i = 0; i < projectsCount; i++) {
    await createTestProject(prisma, machine.id, {
      name: `project-${i}`,
      path: `/test/project-${i}`,
    })
  }

  // Create sessions
  const sessionsCount = options.sessionsCount || 0
  for (let i = 0; i < sessionsCount; i++) {
    await createTestSession(prisma, machine.id, `/test/project-0`, {
      tokensUsed: 1000 + i * 100,
    })
  }

  // Create patterns
  const patternsCount = options.patternsCount || 0
  for (let i = 0; i < patternsCount; i++) {
    await createTestPattern(prisma, machine.id, {
      type: i % 2 === 0 ? 'git_workflow' : 'database_query',
      occurrences: 10 + i * 5,
    })
  }

  // Reload machine with relations
  return prisma.machine.findUniqueOrThrow({
    where: { id: machine.id },
    include: {
      projects: true,
      sessions: true,
      patterns: true,
    },
  })
}
