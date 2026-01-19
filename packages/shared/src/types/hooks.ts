/**
 * Global Hooks Types
 *
 * Types for managing Claude Code hooks in CCM v2.0
 */

/**
 * Hook Types - All supported Claude Code hook types
 */
export type HookType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SessionStart'
  | 'Stop'
  | 'Notification'
  | 'SubagentStop'
  | 'TaskComplete'
  | 'PreSendMessage';

/**
 * Hook Categories - For UI organization and filtering
 */
export type HookCategory =
  | 'git'
  | 'security'
  | 'formatting'
  | 'notifications'
  | 'logging'
  | 'validation'
  | 'backup'
  | 'other';

/**
 * GlobalHook - Centralized Claude Code hook configuration
 */
export interface GlobalHook {
  id: string;
  hookType: HookType;
  matcher: string; // Tool matcher pattern, e.g., "Edit|Write", "*"
  command: string; // Shell command to run
  timeout: number | null; // Timeout in seconds
  description: string | null;
  enabled: boolean;
  order: number; // Execution order (lower = first)
  category: HookCategory | null;
  tags: string; // Comma-separated tags
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GlobalHookCreate - Payload for creating a new hook
 */
export interface GlobalHookCreate {
  hookType: HookType;
  matcher: string;
  command: string;
  timeout?: number;
  description?: string;
  enabled?: boolean;
  order?: number;
  category?: HookCategory;
  tags?: string;
}

/**
 * GlobalHookUpdate - Payload for updating a hook
 */
export interface GlobalHookUpdate extends Partial<GlobalHookCreate> {
  id: string;
}

/**
 * ClaudeSettingsHook - Individual hook in settings.local.json format
 */
export interface ClaudeSettingsHook {
  type?: string; // Optional type field
  command: string;
  timeout?: number;
}

/**
 * ClaudeSettingsHookGroup - Hook group from settings.local.json
 * Supports both nested hooks array and legacy direct format
 */
export interface ClaudeSettingsHookGroup {
  matcher?: string;
  hooks?: ClaudeSettingsHook[];
  // Legacy format (direct command)
  type?: string;
  command?: string;
  timeout?: number;
}

/**
 * HooksImportResult - Result of importing hooks
 */
export interface HooksImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * HooksExportFormat - Hooks in Claude settings.local.json format
 */
export type HooksExportFormat = Record<string, ClaudeSettingsHookGroup[]>;

/**
 * HooksListResponse - Response from GET /api/settings/hooks
 */
export interface HooksListResponse {
  hooks: GlobalHook[];
  grouped: Record<HookType, GlobalHook[]>;
  stats: {
    total: number;
    enabled: number;
    byType: Record<string, number>;
  };
}

/**
 * HookFilters - Filters for listing hooks
 */
export interface HookFilters {
  hookType?: HookType;
  category?: HookCategory;
  enabled?: boolean;
}
