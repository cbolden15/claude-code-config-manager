import { PrismaClient } from '@prisma/client'
import type {
  Machine,
  MachineOverride,
  GlobalHook,
  GlobalPermission,
  GlobalEnvVar,
  Component,
  Profile,
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
      syncEnabled: overrides.syncEnabled !== undefined ? overrides.syncEnabled : true,
      isCurrentMachine: overrides.isCurrentMachine !== undefined ? overrides.isCurrentMachine : false,
      lastSeen: overrides.lastSeen || new Date(),
      lastSyncedAt: overrides.lastSyncedAt || null,
    },
  })
}

/**
 * Machine Override Factory
 */
export async function createTestMachineOverride(
  prisma: PrismaClient,
  machineId: string,
  overrides: Partial<MachineOverride> = {}
): Promise<MachineOverride> {
  const uniqueId = getUniqueId()
  return prisma.machineOverride.create({
    data: {
      machineId,
      configType: overrides.configType || 'hook',
      configKey: overrides.configKey || `test-config-${uniqueId}`,
      action: overrides.action || 'exclude',
      overrideData: overrides.overrideData || null,
      reason: overrides.reason || 'Test override',
    },
  })
}

/**
 * Global Hook Factory
 */
export async function createTestGlobalHook(
  prisma: PrismaClient,
  overrides: Partial<GlobalHook> = {}
): Promise<GlobalHook> {
  const uniqueId = getUniqueId()
  return prisma.globalHook.create({
    data: {
      hookType: overrides.hookType || 'PreToolUse',
      matcher: overrides.matcher || `Test-${uniqueId}`,
      command: overrides.command || 'echo "test"',
      timeout: overrides.timeout || 30,
      enabled: overrides.enabled !== undefined ? overrides.enabled : true,
      description: overrides.description || 'Test hook',
      category: overrides.category || 'testing',
    },
  })
}

/**
 * Global Permission Factory
 */
export async function createTestGlobalPermission(
  prisma: PrismaClient,
  overrides: Partial<GlobalPermission> = {}
): Promise<GlobalPermission> {
  const uniqueId = getUniqueId()
  return prisma.globalPermission.create({
    data: {
      permission: overrides.permission || `Bash(test-${uniqueId}:*)`,
      action: overrides.action || 'allow',
      description: overrides.description || 'Test permission',
      enabled: overrides.enabled !== undefined ? overrides.enabled : true,
      category: overrides.category || 'testing',
      priority: overrides.priority || 0,
    },
  })
}

/**
 * Global Env Var Factory
 */
export async function createTestGlobalEnvVar(
  prisma: PrismaClient,
  overrides: Partial<GlobalEnvVar> = {}
): Promise<GlobalEnvVar> {
  const uniqueId = getUniqueId()
  return prisma.globalEnvVar.create({
    data: {
      key: overrides.key || `TEST_VAR_${uniqueId.toUpperCase().replace(/-/g, '_')}`,
      value: overrides.value || 'test-value',
      encrypted: overrides.encrypted !== undefined ? overrides.encrypted : false,
      sensitive: overrides.sensitive !== undefined ? overrides.sensitive : false,
      description: overrides.description || 'Test environment variable',
      scope: overrides.scope || 'all',
      category: overrides.category || null,
    },
  })
}

/**
 * Component Factory
 */
export async function createTestComponent(
  prisma: PrismaClient,
  overrides: Partial<Component> = {}
): Promise<Component> {
  const uniqueId = getUniqueId()
  return prisma.component.create({
    data: {
      type: overrides.type || 'MCP_SERVER',
      name: overrides.name || `test-component-${uniqueId}`,
      description: overrides.description || 'Test component',
      config: overrides.config || JSON.stringify({ test: true }),
      enabled: overrides.enabled !== undefined ? overrides.enabled : true,
      tags: overrides.tags || '',
      version: overrides.version || '1.0.0',
      sourceUrl: overrides.sourceUrl || null,
    },
  })
}

/**
 * Profile Factory
 */
export async function createTestProfile(
  prisma: PrismaClient,
  overrides: Partial<Profile> = {}
): Promise<Profile> {
  const uniqueId = getUniqueId()
  return prisma.profile.create({
    data: {
      name: overrides.name || `test-profile-${uniqueId}`,
      description: overrides.description || 'Test profile',
      claudeMdTemplate: overrides.claudeMdTemplate || null,
    },
  })
}

/**
 * Create a complete machine with overrides and sync logs
 */
export async function createTestMachineWithData(
  prisma: PrismaClient,
  options: {
    machine?: Partial<Machine>
    overridesCount?: number
    syncLogsCount?: number
  } = {}
): Promise<Machine> {
  const machine = await createTestMachine(prisma, options.machine)

  // Create overrides
  const overridesCount = options.overridesCount || 0
  for (let i = 0; i < overridesCount; i++) {
    await createTestMachineOverride(prisma, machine.id, {
      configKey: `override-${i}`,
    })
  }

  // Create sync logs
  const syncLogsCount = options.syncLogsCount || 0
  for (let i = 0; i < syncLogsCount; i++) {
    await prisma.syncLog.create({
      data: {
        machineId: machine.id,
        syncType: 'full',
        status: 'completed',
        filesCreated: i + 1,
        filesUpdated: i,
        filesDeleted: 0,
        startedAt: new Date(Date.now() - i * 1000),
        completedAt: new Date(Date.now() - i * 1000 + 100),
      },
    })
  }

  // Reload machine with relations
  return prisma.machine.findUniqueOrThrow({
    where: { id: machine.id },
    include: {
      overrides: true,
      syncLogs: true,
    },
  })
}

/**
 * Project Factory
 */
export async function createTestProject(
  prisma: PrismaClient,
  overrides: Partial<{
    name: string
    path: string
    machine: string
    profileId: string | null
    lastSyncedAt: Date | null
  }> = {}
): Promise<any> {
  const uniqueId = getUniqueId()
  return prisma.project.create({
    data: {
      name: overrides.name || `test-project-${uniqueId}`,
      path: overrides.path || `/test/path/${uniqueId}`,
      machine: overrides.machine || 'test-machine',
      profileId: overrides.profileId !== undefined ? overrides.profileId : null,
      lastSyncedAt: overrides.lastSyncedAt !== undefined ? overrides.lastSyncedAt : null,
    },
  })
}

/**
 * Create a complete project with profile and components
 */
export async function createTestProjectWithProfile(
  prisma: PrismaClient,
  options: {
    project?: Partial<{ name: string; path: string; machine: string }>
    profile?: Partial<Profile>
    componentsCount?: number
  } = {}
): Promise<any> {
  // Create profile
  const profile = await createTestProfile(prisma, options.profile)

  // Create components and link to profile
  const componentsCount = options.componentsCount || 2
  for (let i = 0; i < componentsCount; i++) {
    const component = await createTestComponent(prisma, {
      name: `component-${i}`,
      type: i === 0 ? 'MCP_SERVER' : 'SUBAGENT',
    })

    await prisma.profileComponent.create({
      data: {
        profileId: profile.id,
        componentId: component.id,
        order: i,
      },
    })
  }

  // Create project with profile
  const project = await createTestProject(prisma, {
    ...options.project,
    profileId: profile.id,
  })

  // Reload project with relations
  return prisma.project.findUniqueOrThrow({
    where: { id: project.id },
    include: {
      profile: {
        include: {
          components: {
            include: {
              component: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      },
    },
  })
}
