import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { join } from 'path'
import { randomBytes } from 'crypto'

/**
 * Test Database Helper
 * Sets up and tears down in-memory SQLite database for testing
 */

let prisma: PrismaClient

/**
 * Generate a unique database URL for this test run
 */
export function getTestDatabaseUrl(): string {
  const dbName = `test-${randomBytes(8).toString('hex')}.db`
  return `file:${join(__dirname, '..', '..', 'prisma', dbName)}`
}

/**
 * Set up test database with schema
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  // Generate unique database URL for this test
  const databaseUrl = getTestDatabaseUrl()
  process.env.DATABASE_URL = databaseUrl

  // Create new Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

  // Push schema to database (faster than migrations for tests)
  execSync('pnpm db:push --skip-generate', {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'ignore',
  })

  // Connect to database
  await prisma.$connect()

  return prisma
}

/**
 * Clean all tables in the database
 */
export async function cleanDatabase(client: PrismaClient = prisma): Promise<void> {
  // Delete in order to respect foreign key constraints
  await client.taskExecution.deleteMany()
  await client.scheduledTask.deleteMany()
  await client.appliedConfig.deleteMany()
  await client.contextArchive.deleteMany()
  await client.contextAnalysis.deleteMany()
  await client.healthScore.deleteMany()
  await client.recommendation.deleteMany()
  await client.pattern.deleteMany()
  await client.session.deleteMany()
  await client.project.deleteMany()
  await client.machine.deleteMany()
}

/**
 * Tear down test database
 */
export async function teardownTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
  }

  // Clean up test database file
  if (process.env.DATABASE_URL) {
    const dbPath = process.env.DATABASE_URL.replace('file:', '')
    try {
      const fs = require('fs')
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath)
      }
      // Also remove journal file if exists
      const journalPath = `${dbPath}-journal`
      if (fs.existsSync(journalPath)) {
        fs.unlinkSync(journalPath)
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
}

/**
 * Get Prisma client instance
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.')
  }
  return prisma
}

/**
 * Reset database between tests
 */
export async function resetDatabase(): Promise<void> {
  await cleanDatabase()
}
