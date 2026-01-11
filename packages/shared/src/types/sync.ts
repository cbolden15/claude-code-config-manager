/**
 * Sync System Types
 *
 * Types for managing configuration synchronization in CCM v2.0
 */

/**
 * Sync Types - Different types of sync operations
 */
export type SyncType = 'full' | 'incremental' | 'push' | 'pull';

/**
 * Sync Status - Status of a sync operation
 */
export type SyncStatus = 'started' | 'in_progress' | 'completed' | 'failed';

/**
 * Sync Item Status - Status of an individual config item
 */
export type SyncItemStatus = 'synced' | 'local_newer' | 'server_newer' | 'conflict' | 'unknown';

/**
 * SyncLog - Record of a sync operation
 */
export interface SyncLog {
  id: string;
  machineId: string;
  syncType: SyncType;
  status: SyncStatus;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  filesSkipped: number;
  details: string | null; // JSON with detailed info
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

/**
 * SyncState - Tracks sync state for individual config items
 */
export interface SyncState {
  id: string;
  machineId: string;
  configType: string; // "hook", "permission", "mcp_server", "agent", etc.
  configId: string;
  localHash: string | null;
  serverHash: string | null;
  lastSyncedAt: Date | null;
  syncStatus: SyncItemStatus;
}

/**
 * SyncPreview - Preview of changes before sync
 */
export interface SyncPreview {
  toCreate: SyncItem[];
  toUpdate: SyncItem[];
  toDelete: SyncItem[];
  conflicts: SyncConflict[];
  unchanged: number;
}

/**
 * SyncItem - An item that will be synced
 */
export interface SyncItem {
  type: string; // Config type
  id: string;
  name: string;
  path?: string; // File path if applicable
  reason?: string; // Why this change is needed
}

/**
 * SyncConflict - A conflict that needs resolution
 */
export interface SyncConflict {
  type: string;
  id: string;
  name: string;
  localModified: Date;
  serverModified: Date;
  resolution?: 'use_local' | 'use_server' | 'skip';
}

/**
 * SyncOptions - Options for sync operations
 */
export interface SyncOptions {
  dryRun?: boolean; // Preview without applying changes
  force?: boolean; // Force sync even with conflicts
  types?: string[]; // Only sync specific types
  machineId?: string; // Target machine (defaults to current)
  resolveConflicts?: 'use_local' | 'use_server' | 'skip'; // How to handle conflicts
}

/**
 * SyncResult - Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  syncLogId: string;
  stats: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: number;
  };
  errors: string[];
  details: SyncItem[];
  conflicts?: SyncConflict[]; // Unresolved conflicts
}

/**
 * SyncPayload - Data sent from server to client for sync
 */
export interface SyncPayload {
  hooks: Record<string, any>; // Hooks in Claude format
  permissions: {
    allow: string[];
    deny: string[];
  };
  envVars: Array<{ key: string; value: string }>;
  mcpServers: any[]; // MCP server configs
  agents: any[]; // Agent configs
  skills: any[]; // Skill configs
  commands: any[]; // Command configs
  generatedAt: string; // ISO timestamp
}

/**
 * SyncHistoryResponse - Response from GET /api/sync/history
 */
export interface SyncHistoryResponse {
  logs: SyncLog[];
  stats: {
    total: number;
    completed: number;
    failed: number;
    lastSync?: Date;
  };
}

/**
 * SyncStatusResponse - Response from GET /api/sync/status
 */
export interface SyncStatusResponse {
  machineId: string;
  machineName: string;
  lastSyncedAt: Date | null;
  syncEnabled: boolean;
  currentStatus: SyncItemStatus;
  itemsOutOfSync: number;
  lastSyncLog?: SyncLog;
}

/**
 * ConflictResolution - Payload for resolving conflicts
 */
export interface ConflictResolution {
  conflicts: Array<{
    type: string;
    id: string;
    resolution: 'use_local' | 'use_server' | 'skip';
  }>;
}

/**
 * SyncProgressEvent - Real-time sync progress update
 */
export interface SyncProgressEvent {
  syncLogId: string;
  status: SyncStatus;
  progress: number; // 0-100
  currentItem?: string;
  stats: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
  };
}
