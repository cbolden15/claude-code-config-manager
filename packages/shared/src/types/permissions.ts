/**
 * Global Permissions Types
 *
 * Types for managing Claude Code permissions in CCM v2.0
 */

/**
 * Permission Actions
 */
export type PermissionAction = 'allow' | 'deny';

/**
 * Permission Categories - For UI organization
 */
export type PermissionCategory =
  | 'git'
  | 'network'
  | 'shell'
  | 'file'
  | 'docker'
  | 'cloud'
  | 'database'
  | 'other';

/**
 * Permission Tool Types - Extracted from permission strings
 */
export type PermissionToolType =
  | 'Bash'
  | 'WebFetch'
  | 'WebSearch'
  | 'Read'
  | 'Write'
  | 'Edit'
  | 'Task'
  | 'Other';

/**
 * GlobalPermission - Centralized permission configuration
 */
export interface GlobalPermission {
  id: string;
  permission: string; // e.g., "Bash(git:*)", "WebFetch(domain:github.com)"
  action: PermissionAction;
  description: string | null;
  enabled: boolean;
  category: PermissionCategory | null;
  priority: number; // Higher = evaluated first
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GlobalPermissionCreate - Payload for creating a permission
 */
export interface GlobalPermissionCreate {
  permission: string;
  action: PermissionAction;
  description?: string;
  enabled?: boolean;
  category?: PermissionCategory;
  priority?: number;
}

/**
 * GlobalPermissionUpdate - Payload for updating a permission
 */
export interface GlobalPermissionUpdate extends Partial<GlobalPermissionCreate> {
  id: string;
}

/**
 * ParsedPermission - Permission parsed for UI display
 */
export interface ParsedPermission {
  type: PermissionToolType;
  pattern: string; // The part inside parentheses
  raw: string; // Original permission string
}

/**
 * ClaudeSettingsPermissions - Permissions from settings.local.json
 */
export interface ClaudeSettingsPermissions {
  allow?: string[];
  deny?: string[];
}

/**
 * PermissionsImportResult - Result of importing permissions
 */
export interface PermissionsImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * PermissionsListResponse - Response from GET /api/settings/permissions
 */
export interface PermissionsListResponse {
  permissions: GlobalPermission[];
  grouped: {
    allow: GlobalPermission[];
    deny: GlobalPermission[];
  };
  stats: {
    total: number;
    enabled: number;
    byAction: Record<PermissionAction, number>;
    byCategory: Record<string, number>;
  };
}

/**
 * PermissionFilters - Filters for listing permissions
 */
export interface PermissionFilters {
  action?: PermissionAction;
  category?: PermissionCategory;
  enabled?: boolean;
}
