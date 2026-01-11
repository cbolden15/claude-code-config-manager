/**
 * Component types supported by CCM
 */
export const ComponentType = {
  MCP_SERVER: 'MCP_SERVER',
  SUBAGENT: 'SUBAGENT',
  SKILL: 'SKILL',
  COMMAND: 'COMMAND',
  HOOK: 'HOOK',
  CLAUDE_MD_TEMPLATE: 'CLAUDE_MD_TEMPLATE',
} as const;

export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

/**
 * Base component interface
 */
export interface Component {
  id: string;
  type: ComponentType;
  name: string;
  description: string;
  config: Record<string, unknown>;
  sourceUrl?: string;
  version?: string;
  tags: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile - a bundle of components
 */
export interface Profile {
  id: string;
  name: string;
  description: string;
  claudeMdTemplate?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project - a tracked project using CCM
 */
export interface Project {
  id: string;
  name: string;
  path: string;
  machine: string;
  profileId?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API response types
 */
export interface ApiError {
  error: string;
  details?: unknown;
}

export interface GenerateRequest {
  profileId: string;
  projectName: string;
  projectDescription?: string;
}

export interface GenerateResponse {
  files: Array<{
    path: string;
    content: string;
  }>;
}

/**
 * Auto-Claude types
 */
export type {
  AutoClaudeAgentConfig,
  AutoClaudePrompt,
  AutoClaudeModelProfile,
  AutoClaudeProjectConfig,
  ThinkingLevel,
  ClaudeModel,
  McpServerType,
  CustomMcpServer,
  AgentMcpOverride,
} from './auto-claude.js';

/**
 * CCM v2.0 - Machine Registry types
 */
export type {
  ConfigType,
  OverrideAction,
  Machine,
  MachineOverride,
  MachineRegistration,
  MachineWithOverrides,
  MachineWithStats,
  MachineUpdate,
  MachineOverrideCreate,
  MachineListStats,
} from './machines.js';

/**
 * CCM v2.0 - Global Hooks types
 */
export type {
  HookType,
  HookCategory,
  GlobalHook,
  GlobalHookCreate,
  GlobalHookUpdate,
  ClaudeSettingsHook,
  ClaudeSettingsHookGroup,
  HooksImportResult,
  HooksExportFormat,
  HooksListResponse,
  HookFilters,
} from './hooks.js';

/**
 * CCM v2.0 - Global Permissions types
 */
export type {
  PermissionAction,
  PermissionCategory,
  PermissionToolType,
  GlobalPermission,
  GlobalPermissionCreate,
  GlobalPermissionUpdate,
  ParsedPermission,
  ClaudeSettingsPermissions,
  PermissionsImportResult,
  PermissionsListResponse,
  PermissionFilters,
} from './permissions.js';

/**
 * CCM v2.0 - Global Environment Variables types
 */
export type {
  EnvScope,
  EnvCategory,
  GlobalEnvVar,
  GlobalEnvVarCreate,
  GlobalEnvVarUpdate,
  GlobalEnvVarMasked,
  EnvVarListResponse,
  EnvVarFilters,
  EnvVarExportFormat,
} from './env.js';

/**
 * CCM v2.0 - Claude Desktop Integration types
 */
export type {
  ClaudeDesktopMcp,
  ClaudeDesktopPlugin,
  ClaudeDesktopConfigFile,
  ClaudeDesktopMcpWithComponent,
  ClaudeDesktopMcpCreate,
  ClaudeDesktopMcpUpdate,
  ClaudeDesktopPluginCreate,
  ClaudeDesktopPluginUpdate,
  ClaudeDesktopSyncResult,
  ClaudeDesktopListResponse,
} from './claude-desktop.js';

/**
 * CCM v2.0 - Sync System types
 */
export type {
  SyncType,
  SyncStatus,
  SyncItemStatus,
  SyncLog,
  SyncState,
  SyncPreview,
  SyncItem,
  SyncConflict,
  SyncOptions,
  SyncResult,
  SyncPayload,
  SyncHistoryResponse,
  SyncStatusResponse,
  ConflictResolution,
  SyncProgressEvent,
} from './sync.js';
