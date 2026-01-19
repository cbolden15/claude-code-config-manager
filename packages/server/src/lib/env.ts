/**
 * Environment Variables Utilities
 *
 * Functions for managing global environment variables in CCM v2.0
 */

import { prisma } from './db';
import { encrypt, decrypt } from './encryption';
import type {
  GlobalEnvVar,
  GlobalEnvVarCreate,
  GlobalEnvVarUpdate,
  GlobalEnvVarMasked,
  EnvVarListResponse,
  EnvVarFilters,
  EnvVarExportFormat,
  EnvScope,
} from '@ccm/shared';

/**
 * Masks a sensitive value for display
 */
export function maskValue(value: string): string {
  return '********';
}

/**
 * Converts a GlobalEnvVar to a masked version for API responses
 */
export function maskEnvVar(envVar: GlobalEnvVar): GlobalEnvVarMasked {
  return {
    ...envVar,
    value: envVar.sensitive ? maskValue(envVar.value) : envVar.value,
    hasValue: envVar.value.length > 0,
  };
}

/**
 * Lists all environment variables with optional filtering
 */
export async function listEnvVars(filters?: EnvVarFilters): Promise<EnvVarListResponse> {
  const where: any = {};

  if (filters?.scope) {
    where.scope = filters.scope;
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.encrypted !== undefined) {
    where.encrypted = filters.encrypted;
  }
  if (filters?.sensitive !== undefined) {
    where.sensitive = filters.sensitive;
  }

  const envVars = await prisma.globalEnvVar.findMany({
    where,
    orderBy: [
      { category: 'asc' },
      { key: 'asc' },
    ],
  });

  // Convert dates from strings to Date objects
  const typedEnvVars: GlobalEnvVar[] = envVars.map(ev => ({
    ...ev,
    createdAt: new Date(ev.createdAt),
    updatedAt: new Date(ev.updatedAt),
  }));

  // Calculate stats
  const stats = {
    total: typedEnvVars.length,
    encrypted: typedEnvVars.filter(ev => ev.encrypted).length,
    sensitive: typedEnvVars.filter(ev => ev.sensitive).length,
    byScope: {} as Record<EnvScope, number>,
    byCategory: {} as Record<string, number>,
  };

  // Count by scope
  for (const envVar of typedEnvVars) {
    stats.byScope[envVar.scope] = (stats.byScope[envVar.scope] || 0) + 1;
    const category = envVar.category || 'other';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
  }

  return {
    envVars: typedEnvVars.map(maskEnvVar),
    stats,
  };
}

/**
 * Gets a single environment variable by ID
 */
export async function getEnvVar(id: string, includeSensitive: boolean = false): Promise<GlobalEnvVar | null> {
  const envVar = await prisma.globalEnvVar.findUnique({
    where: { id },
  });

  if (!envVar) {
    return null;
  }

  const typed: GlobalEnvVar = {
    ...envVar,
    createdAt: new Date(envVar.createdAt),
    updatedAt: new Date(envVar.updatedAt),
  };

  // Decrypt if needed and requested
  if (includeSensitive && typed.encrypted) {
    try {
      typed.value = await decrypt(typed.value);
    } catch (error) {
      console.error('Failed to decrypt env var:', error);
      // Return encrypted value if decryption fails
    }
  }

  return typed;
}

/**
 * Creates a new environment variable
 */
export async function createEnvVar(data: GlobalEnvVarCreate): Promise<GlobalEnvVar> {
  // Check if key already exists
  const existing = await prisma.globalEnvVar.findUnique({
    where: { key: data.key },
  });

  if (existing) {
    throw new Error(`Environment variable with key "${data.key}" already exists`);
  }

  // Encrypt value if requested
  let valueToStore = data.value;
  const shouldEncrypt = data.encrypted || data.sensitive;

  if (shouldEncrypt) {
    try {
      valueToStore = await encrypt(data.value);
    } catch (error) {
      throw new Error(`Failed to encrypt value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const envVar = await prisma.globalEnvVar.create({
    data: {
      key: data.key,
      value: valueToStore,
      encrypted: shouldEncrypt,
      sensitive: data.sensitive ?? false,
      description: data.description ?? null,
      scope: data.scope ?? 'all',
      category: data.category ?? null,
    },
  });

  return {
    ...envVar,
    createdAt: new Date(envVar.createdAt),
    updatedAt: new Date(envVar.updatedAt),
  };
}

/**
 * Updates an existing environment variable
 */
export async function updateEnvVar(data: GlobalEnvVarUpdate): Promise<GlobalEnvVar> {
  const existing = await prisma.globalEnvVar.findUnique({
    where: { id: data.id },
  });

  if (!existing) {
    throw new Error(`Environment variable with id "${data.id}" not found`);
  }

  // If key is being changed, check for conflicts
  if (data.key && data.key !== existing.key) {
    const keyConflict = await prisma.globalEnvVar.findUnique({
      where: { key: data.key },
    });

    if (keyConflict) {
      throw new Error(`Environment variable with key "${data.key}" already exists`);
    }
  }

  // Handle value encryption if value is being updated
  let valueToStore = data.value;
  const shouldEncrypt = data.encrypted ?? existing.encrypted;

  if (data.value !== undefined) {
    if (shouldEncrypt) {
      try {
        valueToStore = await encrypt(data.value);
      } catch (error) {
        throw new Error(`Failed to encrypt value: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } else {
    // If value is not being updated but encryption status changed
    if (data.encrypted !== undefined && data.encrypted !== existing.encrypted) {
      if (data.encrypted && !existing.encrypted) {
        // Need to encrypt existing value
        try {
          valueToStore = await encrypt(existing.value);
        } catch (error) {
          throw new Error(`Failed to encrypt existing value: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (!data.encrypted && existing.encrypted) {
        // Need to decrypt existing value
        try {
          valueToStore = await decrypt(existing.value);
        } catch (error) {
          throw new Error(`Failed to decrypt existing value: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  const updateData: any = {};
  if (data.key !== undefined) updateData.key = data.key;
  if (valueToStore !== undefined) updateData.value = valueToStore;
  if (data.encrypted !== undefined) updateData.encrypted = data.encrypted;
  if (data.sensitive !== undefined) updateData.sensitive = data.sensitive;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.scope !== undefined) updateData.scope = data.scope;
  if (data.category !== undefined) updateData.category = data.category;

  const envVar = await prisma.globalEnvVar.update({
    where: { id: data.id },
    data: updateData,
  });

  return {
    ...envVar,
    createdAt: new Date(envVar.createdAt),
    updatedAt: new Date(envVar.updatedAt),
  };
}

/**
 * Deletes an environment variable
 */
export async function deleteEnvVar(id: string): Promise<void> {
  await prisma.globalEnvVar.delete({
    where: { id },
  });
}

/**
 * Exports environment variables in key=value format
 */
export async function exportEnvVars(
  filters?: EnvVarFilters,
  decrypt: boolean = false
): Promise<EnvVarExportFormat> {
  const where: any = {};

  if (filters?.scope) {
    where.scope = filters.scope;
  }
  if (filters?.category) {
    where.category = filters.category;
  }

  const envVars = await prisma.globalEnvVar.findMany({
    where,
    orderBy: { key: 'asc' },
  });

  const result: EnvVarExportFormat = {};

  for (const envVar of envVars) {
    let value = envVar.value;

    // Decrypt if requested and encrypted
    if (decrypt && envVar.encrypted) {
      try {
        value = await decrypt(value);
      } catch (error) {
        console.error(`Failed to decrypt ${envVar.key}:`, error);
        // Skip this var if decryption fails
        continue;
      }
    }

    result[envVar.key] = value;
  }

  return result;
}

/**
 * Gets environment variables for a specific scope
 * Useful for generating config files for different Claude tools
 */
export async function getEnvVarsForScope(
  scope: EnvScope,
  decryptValues: boolean = false
): Promise<Record<string, string>> {
  const envVars = await prisma.globalEnvVar.findMany({
    where: {
      OR: [
        { scope: 'all' },
        { scope },
      ],
    },
    orderBy: { key: 'asc' },
  });

  const result: Record<string, string> = {};

  for (const envVar of envVars) {
    let value = envVar.value;

    // Decrypt if requested and encrypted
    if (decryptValues && envVar.encrypted) {
      try {
        value = await decrypt(value);
      } catch (error) {
        console.error(`Failed to decrypt ${envVar.key}:`, error);
        continue;
      }
    }

    result[envVar.key] = value;
  }

  return result;
}

/**
 * Get all global environment variables with optional filtering
 */
export async function getAllGlobalEnvVars(
  prismaClient: typeof prisma,
  filters?: { scope?: EnvScope; category?: string }
): Promise<GlobalEnvVar[]> {
  const where: any = {};

  if (filters?.scope) {
    where.scope = filters.scope;
  }
  if (filters?.category) {
    where.category = filters.category;
  }

  const envVars = await prismaClient.globalEnvVar.findMany({
    where,
    orderBy: [
      { category: 'asc' },
      { key: 'asc' },
    ],
  });

  return envVars.map(ev => ({
    ...ev,
    createdAt: new Date(ev.createdAt),
    updatedAt: new Date(ev.updatedAt),
  }));
}
