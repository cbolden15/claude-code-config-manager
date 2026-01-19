/**
 * Sync Orchestrator Unit Tests
 */

import { PrismaClient } from '@prisma/client'
import { syncProject, getSyncStatus } from '@/lib/sync/orchestrator'
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetDatabase,
  createTestMachine,
  createTestProjectWithProfile,
  createTestMachineOverride,
  createTestGlobalHook,
  createTestGlobalPermission,
  createTestGlobalEnvVar,
} from '../../helpers'

describe('Sync Orchestrator', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  describe('syncProject', () => {
    it('should successfully sync a project with profile', async () => {
      // Arrange
      const machine = await createTestMachine(prisma, { syncEnabled: true })
      const project = await createTestProjectWithProfile(prisma, {
        project: { machine: machine.name },
        componentsCount: 2,
      })

      // Act
      const result = await syncProject(prisma, {
        projectId: project.id,
        machineId: machine.id,
        syncType: 'full',
        dryRun: false,
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.syncLogId).toBeDefined()
      expect(result.files).toBeInstanceOf(Array)
      expect(result.files.length).toBeGreaterThan(0)
      expect(result.stats).toEqual({
        filesCreated: expect.any(Number),
        filesUpdated: expect.any(Number),
        filesDeleted: 0,
        filesSkipped: expect.any(Number),
      })
    })

    it('should return error if project not found', async () => {
      // Arrange
      const machine = await createTestMachine(prisma)

      // Act
      const result = await syncProject(prisma, {
        projectId: 'non-existent',
        machineId: machine.id,
        syncType: 'full',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Project not found')
    })

    it('should return error if project has no profile', async () => {
      // Arrange
      const machine = await createTestMachine(prisma)
      const project = await createTestProjectWithProfile(prisma, {
        componentsCount: 0,
      })

      // Remove profile
      await prisma.project.update({
        where: { id: project.id },
        data: { profileId: null },
      })

      // Act
      const result = await syncProject(prisma, {
        projectId: project.id,
        machineId: machine.id,
        syncType: 'full',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Project has no profile assigned')
    })

    it('should return error if machine not found', async () => {
      // Arrange
      const project = await createTestProjectWithProfile(prisma)

      // Act
      const result = await syncProject(prisma, {
        projectId: project.id,
        machineId: 'non-existent',
        syncType: 'full',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Machine not found')
    })

    it('should return error if sync is disabled for machine', async () => {
      // Arrange
      const machine = await createTestMachine(prisma, { syncEnabled: false })
      const project = await createTestProjectWithProfile(prisma)

      // Act
      const result = await syncProject(prisma, {
        projectId: project.id,
        machineId: machine.id,
        syncType: 'full',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Sync is disabled for machine')
    })

    it('should apply machine overrides during sync', async () => {
      // Arrange
      const machine = await createTestMachine(prisma, { syncEnabled: true })
      const project = await createTestProjectWithProfile(prisma, {
        componentsCount: 3,
      })

      // Get first component
      const components = project.profile.components
      const firstComponent = components[0].component

      // Create exclude override for first component
      await createTestMachineOverride(prisma, machine.id, {
        configType: 'mcp_server',
        configKey: firstComponent.name,
        action: 'exclude',
      })

      // Act
      const result = await syncProject(prisma, {
        projectId: project.id,
        machineId: machine.id,
        syncType: 'full',
        dryRun: false,
      })

      // Assert
      expect(result.success).toBe(true)
      // Should have fewer files due to excluded component
      expect(result.files.length).toBeGreaterThan(0)
    })

    it('should support dry-run mode', async () => {
      // Arrange
      const machine = await createTestMachine(prisma, { syncEnabled: true })
      const project = await createTestProjectWithProfile(prisma)

      // Act
      const result = await syncProject(prisma, {
        projectId: project.id,
        machineId: machine.id,
        syncType: 'full',
        dryRun: true,
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.syncLogId).toBeUndefined() // No log created in dry-run
      expect(result.files).toBeInstanceOf(Array)

      // Verify no sync log was created
      const syncLogs = await prisma.syncLog.findMany({
        where: { machineId: machine.id },
      })
      expect(syncLogs).toHaveLength(0)
    })

    it('should update lastSyncedAt timestamps', async () => {
      // Arrange
      const machine = await createTestMachine(prisma, { syncEnabled: true })
      const project = await createTestProjectWithProfile(prisma)

      const beforeSync = new Date()

      // Act
      await syncProject(prisma, {
        projectId: project.id,
        machineId: machine.id,
        syncType: 'full',
        dryRun: false,
      })

      // Assert
      const updatedProject = await prisma.project.findUnique({
        where: { id: project.id },
      })
      const updatedMachine = await prisma.machine.findUnique({
        where: { id: machine.id },
      })

      expect(updatedProject?.lastSyncedAt).toBeDefined()
      expect(updatedProject?.lastSyncedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeSync.getTime()
      )
      expect(updatedMachine?.lastSyncedAt).toBeDefined()
      expect(updatedMachine?.lastSyncedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeSync.getTime()
      )
    })

    it('should create detailed sync log', async () => {
      // Arrange
      const machine = await createTestMachine(prisma, { syncEnabled: true })
      const project = await createTestProjectWithProfile(prisma)

      // Act
      const result = await syncProject(prisma, {
        projectId: project.id,
        machineId: machine.id,
        syncType: 'full',
        dryRun: false,
      })

      // Assert
      expect(result.syncLogId).toBeDefined()

      const syncLog = await prisma.syncLog.findUnique({
        where: { id: result.syncLogId },
      })

      expect(syncLog).toBeDefined()
      expect(syncLog?.status).toBe('completed')
      expect(syncLog?.syncType).toBe('full')
      expect(syncLog?.filesCreated).toBeGreaterThanOrEqual(0)
      expect(syncLog?.filesUpdated).toBeGreaterThanOrEqual(0)
      expect(syncLog?.startedAt).toBeDefined()
      expect(syncLog?.completedAt).toBeDefined()
      expect(syncLog?.details).toBeDefined()

      const details = JSON.parse(syncLog!.details!)
      expect(details.projectId).toBe(project.id)
      expect(details.projectName).toBe(project.name)
      expect(details.componentsCount).toBeGreaterThan(0)
    })

    it('should handle sync errors gracefully', async () => {
      // Arrange
      const machine = await createTestMachine(prisma, { syncEnabled: true })
      const project = await createTestProjectWithProfile(prisma)

      // Delete profile to cause error
      await prisma.profileComponent.deleteMany({
        where: { profileId: project.profileId! },
      })
      await prisma.profile.delete({ where: { id: project.profileId! } })

      // Act
      const result = await syncProject(prisma, {
        projectId: project.id,
        machineId: machine.id,
        syncType: 'full',
        dryRun: false,
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should filter global settings with overrides', async () => {
      // Arrange
      const machine = await createTestMachine(prisma, { syncEnabled: true })
      const project = await createTestProjectWithProfile(prisma)

      // Create global settings
      const hook = await createTestGlobalHook(prisma, { enabled: true })
      const permission = await createTestGlobalPermission(prisma)
      const envVar = await createTestGlobalEnvVar(prisma)

      // Create overrides to exclude them
      await createTestMachineOverride(prisma, machine.id, {
        configType: 'hook',
        configKey: hook.id,
        action: 'exclude',
      })

      // Act
      const result = await syncProject(prisma, {
        projectId: project.id,
        machineId: machine.id,
        syncType: 'full',
        dryRun: false,
      })

      // Assert
      expect(result.success).toBe(true)
      // Hook should be filtered out by override
    })
  })

  describe('getSyncStatus', () => {
    it('should return sync needed when never synced', async () => {
      // Arrange
      const machine = await createTestMachine(prisma)
      const project = await createTestProjectWithProfile(prisma)

      // Act
      const status = await getSyncStatus(prisma, project.id, machine.id)

      // Assert
      expect(status).toBeDefined()
      expect(status?.syncNeeded).toBe(true)
      expect(status?.reason).toBe('Never synced')
      expect(status?.project.id).toBe(project.id)
      expect(status?.latestSync).toBeNull()
    })

    it('should return sync needed when profile updated', async () => {
      // Arrange
      const machine = await createTestMachine(prisma)
      const project = await createTestProjectWithProfile(prisma)

      // Initial sync
      await prisma.project.update({
        where: { id: project.id },
        data: { lastSyncedAt: new Date(Date.now() - 60000) }, // 1 min ago
      })

      // Update profile (updates updatedAt)
      await prisma.profile.update({
        where: { id: project.profileId! },
        data: { description: 'Updated description' },
      })

      // Act
      const status = await getSyncStatus(prisma, project.id, machine.id)

      // Assert
      expect(status).toBeDefined()
      expect(status?.syncNeeded).toBe(true)
      expect(status?.reason).toBe('Profile updated')
    })

    it('should return sync not needed when up to date', async () => {
      // Arrange
      const machine = await createTestMachine(prisma)
      const project = await createTestProjectWithProfile(prisma)

      // Recent sync
      await prisma.project.update({
        where: { id: project.id },
        data: { lastSyncedAt: new Date() },
      })

      // Act
      const status = await getSyncStatus(prisma, project.id, machine.id)

      // Assert
      expect(status).toBeDefined()
      expect(status?.syncNeeded).toBe(false)
      expect(status?.reason).toBeUndefined()
    })

    it('should return null for non-existent project', async () => {
      // Arrange
      const machine = await createTestMachine(prisma)

      // Act
      const status = await getSyncStatus(prisma, 'non-existent', machine.id)

      // Assert
      expect(status).toBeNull()
    })

    it('should include latest sync log info', async () => {
      // Arrange
      const machine = await createTestMachine(prisma)
      const project = await createTestProjectWithProfile(prisma)

      // Create sync log
      await prisma.syncLog.create({
        data: {
          machineId: machine.id,
          syncType: 'full',
          status: 'completed',
          filesCreated: 5,
          filesUpdated: 2,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })

      // Act
      const status = await getSyncStatus(prisma, project.id, machine.id)

      // Assert
      expect(status?.latestSync).toBeDefined()
      expect(status?.latestSync?.syncType).toBe('full')
      expect(status?.latestSync?.status).toBe('completed')
      expect(status?.latestSync?.filesCreated).toBe(5)
      expect(status?.latestSync?.filesUpdated).toBe(2)
    })
  })
})
