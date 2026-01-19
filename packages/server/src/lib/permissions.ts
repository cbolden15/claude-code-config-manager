/**
 * Global Permissions Parser & Business Logic
 *
 * Handles parsing, categorization, and transformation of Claude Code permissions.
 */

import type {
  GlobalPermission,
  GlobalPermissionCreate,
  PermissionAction,
  PermissionCategory,
  PermissionToolType,
  ParsedPermission,
  ClaudeSettingsPermissions,
  PermissionsImportResult,
} from '@ccm/shared';
import { prisma } from './db';

/**
 * Parse a permission string into its components
 *
 * Examples:
 * - "Bash(git:*)" -> { type: "Bash", pattern: "git:*", raw: "Bash(git:*)" }
 * - "WebFetch(domain:github.com)" -> { type: "WebFetch", pattern: "domain:github.com", raw: "..." }
 * - "invalid" -> { type: "Other", pattern: "invalid", raw: "invalid" }
 */
export function parsePermission(perm: string): ParsedPermission {
  const match = perm.match(/^(\w+)\((.+)\)$/);

  if (match) {
    const type = match[1] as PermissionToolType;
    const pattern = match[2];

    // Validate if type is a known tool type
    const knownTypes: PermissionToolType[] = [
      'Bash', 'WebFetch', 'WebSearch', 'Read', 'Write', 'Edit', 'Task'
    ];

    if (knownTypes.includes(type)) {
      return { type, pattern, raw: perm };
    }
  }

  // Fallback for unparseable or unknown permissions
  return { type: 'Other', pattern: perm, raw: perm };
}

/**
 * Guess the category of a permission based on its pattern
 */
export function guessCategory(parsed: ParsedPermission): PermissionCategory {
  const { type, pattern } = parsed;
  const lowerPattern = pattern.toLowerCase();

  // Network-related patterns (check before general Bash checks)
  if (type === 'WebFetch' || type === 'WebSearch') {
    return 'network';
  }

  // File operations
  if (type === 'Read' || type === 'Write' || type === 'Edit') {
    return 'file';
  }

  // Task type
  if (type === 'Task') {
    return 'shell';
  }

  // Bash-specific pattern matching
  if (type === 'Bash') {
    // Git-related patterns
    if (
      lowerPattern.includes('git') ||
      lowerPattern.includes('gh') ||
      lowerPattern.includes('github')
    ) {
      return 'git';
    }

    // Network patterns
    if (
      lowerPattern.includes('curl') ||
      lowerPattern.includes('wget') ||
      lowerPattern.includes('http') ||
      lowerPattern.includes('api')
    ) {
      return 'network';
    }

    // Docker patterns
    if (
      lowerPattern.includes('docker') ||
      lowerPattern.includes('container') ||
      lowerPattern.includes('kubectl') ||
      lowerPattern.includes('k8s')
    ) {
      return 'docker';
    }

    // Cloud patterns
    if (
      lowerPattern.includes('aws') ||
      lowerPattern.includes('gcp') ||
      lowerPattern.includes('azure') ||
      lowerPattern.includes('cloud')
    ) {
      return 'cloud';
    }

    // Database patterns
    if (
      lowerPattern.includes('sql') ||
      lowerPattern.includes('psql') ||
      lowerPattern.includes('mysql') ||
      lowerPattern.includes('mongo') ||
      lowerPattern.includes('redis') ||
      lowerPattern.includes('postgres')
    ) {
      return 'database';
    }

    // Default for Bash
    return 'shell';
  }

  // Default for everything else (including 'Other')
  return 'other';
}

/**
 * Import permissions from Claude Code settings.local.json format
 *
 * Parses the permissions object and creates GlobalPermission records.
 * Skips duplicates (same permission + action combo).
 */
export async function parseClaudePermissions(
  settings: ClaudeSettingsPermissions
): Promise<PermissionsImportResult> {
  const result: PermissionsImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  const toImport: GlobalPermissionCreate[] = [];

  // Parse allow list
  for (const perm of settings.allow || []) {
    try {
      const parsed = parsePermission(perm);
      toImport.push({
        permission: perm,
        action: 'allow',
        category: guessCategory(parsed),
        enabled: true,
      });
    } catch (err) {
      result.errors.push(`Failed to parse allow permission "${perm}": ${err}`);
    }
  }

  // Parse deny list
  for (const perm of settings.deny || []) {
    try {
      const parsed = parsePermission(perm);
      toImport.push({
        permission: perm,
        action: 'deny',
        category: guessCategory(parsed),
        enabled: true,
      });
    } catch (err) {
      result.errors.push(`Failed to parse deny permission "${perm}": ${err}`);
    }
  }

  // Import to database
  for (const item of toImport) {
    try {
      // Check if already exists
      const existing = await prisma.globalPermission.findFirst({
        where: {
          permission: item.permission,
          action: item.action,
        },
      });

      if (existing) {
        result.skipped++;
      } else {
        await prisma.globalPermission.create({
          data: item,
        });
        result.imported++;
      }
    } catch (err) {
      result.errors.push(
        `Failed to import permission "${item.permission}" (${item.action}): ${err}`
      );
    }
  }

  return result;
}

/**
 * Export permissions to Claude Code settings.local.json format
 *
 * Returns permissions grouped by action for easy insertion into settings file.
 */
export async function exportPermissions(
  filters?: {
    enabled?: boolean;
    category?: PermissionCategory;
  }
): Promise<ClaudeSettingsPermissions> {
  const where: any = {};

  if (filters?.enabled !== undefined) {
    where.enabled = filters.enabled;
  }

  if (filters?.category) {
    where.category = filters.category;
  }

  const permissions = await prisma.globalPermission.findMany({
    where,
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  const result: ClaudeSettingsPermissions = {
    allow: [],
    deny: [],
  };

  for (const perm of permissions) {
    if (perm.action === 'allow') {
      result.allow!.push(perm.permission);
    } else if (perm.action === 'deny') {
      result.deny!.push(perm.permission);
    }
  }

  return result;
}

/**
 * Get all permissions with statistics
 */
export async function getPermissionsWithStats(filters?: {
  action?: PermissionAction;
  category?: string;
  enabled?: boolean;
}) {
  const where: any = {};

  if (filters?.action) {
    where.action = filters.action;
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.enabled !== undefined) {
    where.enabled = filters.enabled;
  }

  const permissions = await prisma.globalPermission.findMany({
    where,
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  const grouped = {
    allow: permissions.filter((p) => p.action === 'allow'),
    deny: permissions.filter((p) => p.action === 'deny'),
  };

  const stats = {
    total: permissions.length,
    enabled: permissions.filter((p) => p.enabled).length,
    byAction: {
      allow: grouped.allow.length,
      deny: grouped.deny.length,
    } as Record<PermissionAction, number>,
    byCategory: permissions.reduce((acc, p) => {
      const cat = p.category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return { permissions, grouped, stats };
}

/**
 * Create a new permission
 */
export async function createPermission(data: GlobalPermissionCreate): Promise<GlobalPermission> {
  // Auto-categorize if not provided
  if (!data.category) {
    const parsed = parsePermission(data.permission);
    data.category = guessCategory(parsed);
  }

  const permission = await prisma.globalPermission.create({
    data: {
      permission: data.permission,
      action: data.action,
      description: data.description || null,
      enabled: data.enabled ?? true,
      category: data.category || null,
      priority: data.priority || 0,
    },
  });

  return permission as GlobalPermission;
}

/**
 * Update an existing permission
 */
export async function updatePermission(
  id: string,
  data: Partial<GlobalPermissionCreate>
): Promise<GlobalPermission> {
  const permission = await prisma.globalPermission.update({
    where: { id },
    data: {
      permission: data.permission,
      action: data.action,
      description: data.description,
      enabled: data.enabled,
      category: data.category,
      priority: data.priority,
    },
  });

  return permission as GlobalPermission;
}

/**
 * Delete a permission
 */
export async function deletePermission(id: string): Promise<void> {
  await prisma.globalPermission.delete({
    where: { id },
  });
}

/**
 * Get a single permission by ID
 */
export async function getPermissionById(id: string): Promise<GlobalPermission | null> {
  const permission = await prisma.globalPermission.findUnique({
    where: { id },
  });

  return permission as GlobalPermission | null;
}

/**
 * Get all global permissions with optional filtering
 */
export async function getAllGlobalPermissions(
  prismaClient: typeof prisma,
  filters?: { enabled?: boolean; action?: PermissionAction }
): Promise<GlobalPermission[]> {
  const where: any = {};

  if (filters?.enabled !== undefined) {
    where.enabled = filters.enabled;
  }
  if (filters?.action) {
    where.action = filters.action;
  }

  const permissions = await prismaClient.globalPermission.findMany({
    where,
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  return permissions as GlobalPermission[];
}
