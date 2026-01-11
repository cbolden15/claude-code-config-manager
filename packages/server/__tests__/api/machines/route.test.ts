/**
 * Machines API Routes Integration Tests
 */

import { PrismaClient } from '@prisma/client'
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetDatabase,
  createTestMachine,
  createMockRequest,
  parseResponse,
} from '../../helpers'

// Create a mock module for the database client
let mockPrismaClient: PrismaClient

jest.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaClient
  },
}))

import { GET, POST } from '@/app/api/machines/route'

describe('GET /api/machines', () => {
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

  it('should return empty list when no machines exist', async () => {
    // Arrange
    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/machines',
    })

    // Act
    const response = await GET(request)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.machines).toEqual([])
    expect(data.total).toBe(0)
    expect(data.stats).toEqual({
      totalMachines: 0,
      activeMachines: 0,
      syncEnabled: 0,
    })
  })

  it('should return list of machines', async () => {
    // Arrange
    await createTestMachine(prisma, { name: 'machine-1', syncEnabled: true })
    await createTestMachine(prisma, { name: 'machine-2', syncEnabled: false })

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/machines',
    })

    // Act
    const response = await GET(request)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.machines).toHaveLength(2)
    expect(data.total).toBe(2)
    expect(data.stats.totalMachines).toBe(2)
    expect(data.stats.syncEnabled).toBe(1)
  })

  it('should filter machines by platform', async () => {
    // Arrange
    await createTestMachine(prisma, { platform: 'darwin' })
    await createTestMachine(prisma, { platform: 'linux' })
    await createTestMachine(prisma, { platform: 'darwin' })

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/machines',
      searchParams: { platform: 'darwin' },
    })

    // Act
    const response = await GET(request)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.machines).toHaveLength(2)
    expect(data.machines.every((m: any) => m.platform === 'darwin')).toBe(true)
  })

  it('should filter machines by sync status', async () => {
    // Arrange
    await createTestMachine(prisma, { syncEnabled: true })
    await createTestMachine(prisma, { syncEnabled: false })
    await createTestMachine(prisma, { syncEnabled: true })

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/machines',
      searchParams: { syncEnabled: 'true' },
    })

    // Act
    const response = await GET(request)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.machines).toHaveLength(2)
    expect(data.machines.every((m: any) => m.syncEnabled === true)).toBe(true)
  })
})

describe('POST /api/machines', () => {
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

  it('should create a new machine', async () => {
    // Arrange
    const machineData = {
      name: 'new-machine',
      hostname: 'new-machine.local',
      platform: 'darwin' as const,
      arch: 'arm64',
      homeDir: '/Users/test',
    }

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/machines',
      body: machineData,
    })

    // Act
    const response = await POST(request)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(201)
    expect(data.name).toBe(machineData.name)
    expect(data.platform).toBe(machineData.platform)
    expect(data.syncEnabled).toBe(true) // Default value
  })

  it('should update existing machine on duplicate name', async () => {
    // Arrange
    const existing = await createTestMachine(prisma, {
      name: 'existing-machine',
      syncEnabled: false,
    })

    const updateData = {
      name: 'existing-machine',
      platform: 'linux' as const,
      arch: 'x64',
    }

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/machines',
      body: updateData,
    })

    // Act
    const response = await POST(request)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expect(data.id).toBe(existing.id)
    expect(data.platform).toBe('linux')
    expect(data.arch).toBe('x64')
  })

  it('should unset other machines when setting as current', async () => {
    // Arrange
    await createTestMachine(prisma, { name: 'machine-1', isCurrentMachine: true })

    const newMachineData = {
      name: 'machine-2',
      platform: 'darwin' as const,
      isCurrentMachine: true,
    }

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/machines',
      body: newMachineData,
    })

    // Act
    const response = await POST(request)
    await parseResponse(response)

    // Assert
    const machines = await prisma.machine.findMany()
    const currentMachines = machines.filter((m) => m.isCurrentMachine)
    expect(currentMachines).toHaveLength(1)
    expect(currentMachines[0].name).toBe('machine-2')
  })

  it('should return 400 for invalid platform', async () => {
    // Arrange
    const invalidData = {
      name: 'test-machine',
      platform: 'invalid-platform',
    }

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/machines',
      body: invalidData,
    })

    // Act
    const response = await POST(request)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('should return 400 for missing required fields', async () => {
    // Arrange
    const incompleteData = {
      // Missing name and platform
      arch: 'arm64',
    }

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/machines',
      body: incompleteData,
    })

    // Act
    const response = await POST(request)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })
})
