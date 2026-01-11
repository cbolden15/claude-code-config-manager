import { PrismaClient } from '@prisma/client'
import { generateProjectFiles, generateSummary } from '../generators'
import { applyMachineOverrides } from './overrides'
import { getAllGlobalHooks } from '../hooks'
import { getAllGlobalPermissions } from '../permissions'
import { getAllGlobalEnvVars } from '../env'

/**
 * Sync Orchestrator
 * Coordinates synchronization of configurations from server to local projects
 */

export interface SyncOptions {
  projectId: string
  machineId: string
  syncType?: 'full' | 'incremental' | 'selective'
  dryRun?: boolean
}

export interface SyncResult {
  success: boolean
  syncLogId?: string
  files: Array<{
    path: string
    content: string
    action: 'created' | 'updated' | 'skipped'
  }>
  stats: {
    filesCreated: number
    filesUpdated: number
    filesDeleted: number
    filesSkipped: number
  }
  errors?: string[]
}

/**
 * Main sync orchestration function
 * Generates configuration files for a project with machine-specific overrides applied
 */
export async function syncProject(
  prisma: PrismaClient,
  options: SyncOptions
): Promise<SyncResult> {
  const { projectId, machineId, syncType = 'full', dryRun = false } = options

  const errors: string[] = []
  const files: SyncResult['files'] = []

  try {
    // 1. Get project with profile and components
    const project = await prisma.project.findUnique({
      where: { id: projectId },
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

    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    if (!project.profile) {
      throw new Error(`Project has no profile assigned: ${projectId}`)
    }

    // 2. Get machine with overrides
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        overrides: true,
      },
    })

    if (!machine) {
      throw new Error(`Machine not found: ${machineId}`)
    }

    if (!machine.syncEnabled) {
      throw new Error(`Sync is disabled for machine: ${machine.name}`)
    }

    // 3. Get global settings (hooks, permissions, env vars)
    const globalHooks = await getAllGlobalHooks(prisma, { enabled: true })
    const globalPermissions = await getAllGlobalPermissions(prisma, { enabled: true })
    const globalEnvVars = await getAllGlobalEnvVars(prisma)

    // 4. Prepare components from profile
    const profileComponents = project.profile.components.map((pc) => ({
      id: pc.component.id,
      type: pc.component.type,
      name: pc.component.name,
      description: pc.component.description,
      config: JSON.parse(pc.component.config),
      enabled: pc.component.enabled,
    }))

    // 5. Apply machine overrides to components
    const componentsWithOverrides = applyMachineOverrides(
      profileComponents,
      machine.overrides,
      {
        globalHooks,
        globalPermissions,
        globalEnvVars,
      }
    )

    // 6. Generate files using generators
    const generatedFiles = generateProjectFiles({
      projectName: project.name,
      projectDescription: undefined,
      claudeMdTemplate: project.profile.claudeMdTemplate,
      components: componentsWithOverrides,
    })

    // 7. Process generated files
    for (const file of generatedFiles) {
      files.push({
        path: file.path,
        content: file.content,
        action: 'created', // For now, always treat as created (can enhance with hash comparison)
      })
    }

    // 8. Calculate stats
    const stats = {
      filesCreated: files.filter((f) => f.action === 'created').length,
      filesUpdated: files.filter((f) => f.action === 'updated').length,
      filesDeleted: 0, // Not implemented yet
      filesSkipped: files.filter((f) => f.action === 'skipped').length,
    }

    // 9. Create sync log (if not dry run)
    let syncLogId: string | undefined

    if (!dryRun) {
      const syncLog = await prisma.syncLog.create({
        data: {
          machineId,
          syncType,
          status: 'completed',
          filesCreated: stats.filesCreated,
          filesUpdated: stats.filesUpdated,
          filesDeleted: stats.filesDeleted,
          filesSkipped: stats.filesSkipped,
          details: JSON.stringify({
            projectId,
            projectName: project.name,
            profileId: project.profileId,
            profileName: project.profile.name,
            componentsCount: componentsWithOverrides.length,
            overridesApplied: machine.overrides.length,
          }),
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })

      syncLogId = syncLog.id

      // Update project lastSyncedAt
      await prisma.project.update({
        where: { id: projectId },
        data: { lastSyncedAt: new Date() },
      })

      // Update machine lastSyncedAt
      await prisma.machine.update({
        where: { id: machineId },
        data: { lastSyncedAt: new Date() },
      })
    }

    return {
      success: true,
      syncLogId,
      files,
      stats,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMessage)

    // Create failed sync log (if not dry run)
    if (!dryRun) {
      try {
        const syncLog = await prisma.syncLog.create({
          data: {
            machineId,
            syncType,
            status: 'failed',
            errorMessage,
            startedAt: new Date(),
            completedAt: new Date(),
          },
        })

        return {
          success: false,
          syncLogId: syncLog.id,
          files,
          stats: {
            filesCreated: 0,
            filesUpdated: 0,
            filesDeleted: 0,
            filesSkipped: 0,
          },
          errors,
        }
      } catch (logError) {
        // If we can't even create the log, just return the error
        console.error('Failed to create sync log:', logError)
      }
    }

    return {
      success: false,
      files,
      stats: {
        filesCreated: 0,
        filesUpdated: 0,
        filesDeleted: 0,
        filesSkipped: 0,
      },
      errors,
    }
  }
}

/**
 * Get sync status for a project
 */
export async function getSyncStatus(
  prisma: PrismaClient,
  projectId: string,
  machineId: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      profile: {
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!project) {
    return null
  }

  // Get latest sync log for this machine
  const latestSync = await prisma.syncLog.findFirst({
    where: { machineId },
    orderBy: { startedAt: 'desc' },
  })

  // Determine if sync is needed
  const profileUpdatedAt = project.profile?.updatedAt
  const lastSyncedAt = project.lastSyncedAt

  let syncNeeded = false
  let reason: string | undefined

  if (!lastSyncedAt) {
    syncNeeded = true
    reason = 'Never synced'
  } else if (profileUpdatedAt && profileUpdatedAt > lastSyncedAt) {
    syncNeeded = true
    reason = 'Profile updated'
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      path: project.path,
      profileId: project.profileId,
      profileName: project.profile?.name,
      lastSyncedAt,
    },
    latestSync: latestSync
      ? {
          id: latestSync.id,
          syncType: latestSync.syncType,
          status: latestSync.status,
          filesCreated: latestSync.filesCreated,
          filesUpdated: latestSync.filesUpdated,
          startedAt: latestSync.startedAt,
          completedAt: latestSync.completedAt,
          errorMessage: latestSync.errorMessage,
        }
      : null,
    syncNeeded,
    reason,
  }
}
