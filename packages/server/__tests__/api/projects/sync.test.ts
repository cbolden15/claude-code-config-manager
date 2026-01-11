/**
 * Sync API Endpoint Integration Tests
 */

import { PrismaClient } from '@prisma/client'
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetDatabase,
  createTestMachine,
  createTestProjectWithProfile,
  createTestMachineOverride,
  createMockRequest,
  createMockParams,
  parseResponse,
} from '../../helpers'

// Create a mock module for the database client
let mockPrismaClient: PrismaClient

jest.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaClient
  },
}))

import { POST, GET } from '@/app/api/projects/[id]/sync/route'

describe('POST /api/projects/[id]/sync', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await setupTestDatabase()
    mockPrismaClient = prisma
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  it('should successfully sync a project', async () => {
    // Arrange
    const machine = await createTestMachine(prisma, { syncEnabled: true })
    const project = await createTestProjectWithProfile(prisma, {
      componentsCount: 2,
    })

    const request = createMockRequest({
      method: 'POST',
      body: {
        machineId: machine.id,
        syncType: 'full',
        dryRun: false,
      },
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await POST(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.syncLogId).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.stats.filesCreated).toBeGreaterThanOrEqual(0)
    expect(data.filesGenerated).toBeGreaterThan(0)
    expect(data.files).toBeInstanceOf(Array)
  })

  it('should return 404 for non-existent project', async () => {
    // Arrange
    const machine = await createTestMachine(prisma)

    const request = createMockRequest({
      method: 'POST',
      body: {
        machineId: machine.id,
        syncType: 'full',
      },
    })
    const params = createMockParams({ id: 'non-existent' })

    // Act
    const response = await POST(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should return 404 for non-existent machine', async () => {
    // Arrange
    const project = await createTestProjectWithProfile(prisma)

    const request = createMockRequest({
      method: 'POST',
      body: {
        machineId: 'non-existent',
        syncType: 'full',
      },
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await POST(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(404)
    expect(data.error).toBe('Machine not found')
  })

  it('should return 400 when project has no profile', async () => {
    // Arrange
    const machine = await createTestMachine(prisma)
    const project = await createTestProjectWithProfile(prisma)

    // Remove profile
    await prisma.project.update({
      where: { id: project.id },
      data: { profileId: null },
    })

    const request = createMockRequest({
      method: 'POST',
      body: {
        machineId: machine.id,
        syncType: 'full',
      },
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await POST(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(400)
    expect(data.error).toBe('Project has no profile assigned')
  })

  it('should return 400 when sync is disabled for machine', async () => {
    // Arrange
    const machine = await createTestMachine(prisma, { syncEnabled: false })
    const project = await createTestProjectWithProfile(prisma)

    const request = createMockRequest({
      method: 'POST',
      body: {
        machineId: machine.id,
        syncType: 'full',
      },
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await POST(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(400)
    expect(data.error).toContain('Sync is disabled')
  })

  it('should support dry-run mode', async () => {
    // Arrange
    const machine = await createTestMachine(prisma, { syncEnabled: true })
    const project = await createTestProjectWithProfile(prisma)

    const request = createMockRequest({
      method: 'POST',
      body: {
        machineId: machine.id,
        syncType: 'full',
        dryRun: true,
      },
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await POST(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.dryRun).toBe(true)
    expect(data.syncLogId).toBeUndefined()
    expect(data.files).toBeInstanceOf(Array)

    // Verify no sync log was created
    const syncLogs = await prisma.syncLog.findMany({
      where: { machineId: machine.id },
    })
    expect(syncLogs).toHaveLength(0)
  })

  it('should validate request body', async () => {
    // Arrange
    const project = await createTestProjectWithProfile(prisma)

    const request = createMockRequest({
      method: 'POST',
      body: {
        // Missing machineId
        syncType: 'full',
      },
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await POST(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('should support different sync types', async () => {
    // Arrange
    const machine = await createTestMachine(prisma, { syncEnabled: true })
    const project = await createTestProjectWithProfile(prisma)

    const syncTypes = ['full', 'incremental', 'selective'] as const

    for (const syncType of syncTypes) {
      const request = createMockRequest({
        method: 'POST',
        body: {
          machineId: machine.id,
          syncType,
          dryRun: true,
        },
      })
      const params = createMockParams({ id: project.id })

      // Act
      const response = await POST(request, params)
      const { status, data } = await parseResponse(response)

      // Assert
      expect(status).toBe(200)
      expect(data.success).toBe(true)
    }
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

    // Create exclude override
    await createTestMachineOverride(prisma, machine.id, {
      configType: 'mcp_server',
      configKey: firstComponent.name,
      action: 'exclude',
    })

    const request = createMockRequest({
      method: 'POST',
      body: {
        machineId: machine.id,
        syncType: 'full',
        dryRun: false,
      },
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await POST(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.files.length).toBeGreaterThan(0)
  })

  it('should create sync log with details', async () => {
    // Arrange
    const machine = await createTestMachine(prisma, { syncEnabled: true })
    const project = await createTestProjectWithProfile(prisma)

    const request = createMockRequest({
      method: 'POST',
      body: {
        machineId: machine.id,
        syncType: 'full',
        dryRun: false,
      },
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await POST(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.syncLogId).toBeDefined()

    // Verify sync log in database
    const syncLog = await prisma.syncLog.findUnique({
      where: { id: data.syncLogId },
    })

    expect(syncLog).toBeDefined()
    expect(syncLog?.status).toBe('completed')
    expect(syncLog?.machineId).toBe(machine.id)
    expect(syncLog?.syncType).toBe('full')
  })
})

describe('GET /api/projects/[id]/sync', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await setupTestDatabase()
    mockPrismaClient = prisma
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  it('should return sync status', async () => {
    // Arrange
    const machine = await createTestMachine(prisma)
    const project = await createTestProjectWithProfile(prisma)

    const request = createMockRequest({
      method: 'GET',
      url: `http://localhost:3000/api/projects/${project.id}/sync?machineId=${machine.id}`,
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await GET(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.project).toBeDefined()
    expect(data.project.id).toBe(project.id)
    expect(data.syncNeeded).toBeDefined()
  })

  it('should return 400 when machineId is missing', async () => {
    // Arrange
    const project = await createTestProjectWithProfile(prisma)

    const request = createMockRequest({
      method: 'GET',
      url: `http://localhost:3000/api/projects/${project.id}/sync`,
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await GET(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(400)
    expect(data.error).toContain('machineId')
  })

  it('should return 404 for non-existent project', async () => {
    // Arrange
    const machine = await createTestMachine(prisma)

    const request = createMockRequest({
      method: 'GET',
      url: `http://localhost:3000/api/projects/non-existent/sync?machineId=${machine.id}`,
    })
    const params = createMockParams({ id: 'non-existent' })

    // Act
    const response = await GET(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should return 404 for non-existent machine', async () => {
    // Arrange
    const project = await createTestProjectWithProfile(prisma)

    const request = createMockRequest({
      method: 'GET',
      url: `http://localhost:3000/api/projects/${project.id}/sync?machineId=non-existent`,
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await GET(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(404)
    expect(data.error).toBe('Machine not found')
  })

  it('should indicate sync needed when never synced', async () => {
    // Arrange
    const machine = await createTestMachine(prisma)
    const project = await createTestProjectWithProfile(prisma)

    const request = createMockRequest({
      method: 'GET',
      url: `http://localhost:3000/api/projects/${project.id}/sync?machineId=${machine.id}`,
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await GET(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.syncNeeded).toBe(true)
    expect(data.reason).toBe('Never synced')
    expect(data.latestSync).toBeNull()
  })

  it('should include latest sync log when available', async () => {
    // Arrange
    const machine = await createTestMachine(prisma)
    const project = await createTestProjectWithProfile(prisma)

    // Create a sync log
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

    const request = createMockRequest({
      method: 'GET',
      url: `http://localhost:3000/api/projects/${project.id}/sync?machineId=${machine.id}`,
    })
    const params = createMockParams({ id: project.id })

    // Act
    const response = await GET(request, params)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.latestSync).toBeDefined()
    expect(data.latestSync.syncType).toBe('full')
    expect(data.latestSync.status).toBe('completed')
    expect(data.latestSync.filesCreated).toBe(5)
    expect(data.latestSync.filesUpdated).toBe(2)
  })
})
