/**
 * Claude Desktop Integration Types
 *
 * Types for managing Claude Desktop configuration in CCM v2.0
 */

/**
 * ClaudeDesktopMcp - MCP server configuration for Claude Desktop
 */
export interface ClaudeDesktopMcp {
  id: string;
  componentId: string; // Reference to Component with type MCP_SERVER
  enabled: boolean;
  commandOverride: string | null; // Override command for desktop
  argsOverride: string | null; // Override args (JSON array)
  envOverrides: string | null; // Additional env vars (JSON object)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ClaudeDesktopPlugin - Plugin configuration for Claude Desktop
 */
export interface ClaudeDesktopPlugin {
  id: string;
  pluginId: string; // e.g., "frontend-design@claude-plugins-official"
  enabled: boolean;
  config: string | null; // Plugin-specific config (JSON)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ClaudeDesktopConfigFile - The actual claude_desktop_config.json format
 */
export interface ClaudeDesktopConfigFile {
  mcpServers: {
    [name: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

/**
 * ClaudeDesktopMcpWithComponent - MCP config with component details
 */
export interface ClaudeDesktopMcpWithComponent extends ClaudeDesktopMcp {
  component: {
    id: string;
    name: string;
    description: string;
    config: string; // JSON string of MCP config
  };
}

/**
 * ClaudeDesktopMcpCreate - Payload for adding MCP to desktop
 */
export interface ClaudeDesktopMcpCreate {
  componentId: string;
  enabled?: boolean;
  commandOverride?: string;
  argsOverride?: string[]; // Will be stringified
  envOverrides?: Record<string, string>; // Will be stringified
}

/**
 * ClaudeDesktopMcpUpdate - Payload for updating desktop MCP
 */
export interface ClaudeDesktopMcpUpdate {
  id: string;
  enabled?: boolean;
  commandOverride?: string | null;
  argsOverride?: string[] | null;
  envOverrides?: Record<string, string> | null;
}

/**
 * ClaudeDesktopPluginCreate - Payload for adding plugin
 */
export interface ClaudeDesktopPluginCreate {
  pluginId: string;
  enabled?: boolean;
  config?: Record<string, unknown>; // Will be stringified
}

/**
 * ClaudeDesktopPluginUpdate - Payload for updating plugin
 */
export interface ClaudeDesktopPluginUpdate {
  id: string;
  enabled?: boolean;
  config?: Record<string, unknown> | null;
}

/**
 * ClaudeDesktopSyncResult - Result of syncing to desktop config
 */
export interface ClaudeDesktopSyncResult {
  success: boolean;
  configPath: string;
  mcpServersCount: number;
  pluginsCount: number;
  backupPath?: string;
  errors?: string[];
}

/**
 * ClaudeDesktopListResponse - Response from GET /api/claude-desktop
 */
export interface ClaudeDesktopListResponse {
  mcpServers: ClaudeDesktopMcpWithComponent[];
  plugins: ClaudeDesktopPlugin[];
  stats: {
    totalMcpServers: number;
    enabledMcpServers: number;
    totalPlugins: number;
    enabledPlugins: number;
  };
}
