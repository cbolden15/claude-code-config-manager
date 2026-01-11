import { api } from './api.js';

/**
 * Desktop API Client
 * Handles all Claude Desktop configuration API calls
 */

// ==================== Types ====================

export interface ClaudeDesktopMcp {
  id: string;
  componentId: string;
  enabled: boolean;
  commandOverride?: string | null;
  argsOverride?: string | null;
  envOverrides?: string | null;
  createdAt: string;
  updatedAt: string;
  component?: Component | null;
}

export interface ClaudeDesktopPlugin {
  id: string;
  pluginId: string;
  enabled: boolean;
  config?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Component {
  id: string;
  name: string;
  type: string;
  mcpConfig?: string | null;
}

export interface McpListResponse {
  mcpServers: ClaudeDesktopMcp[];
  total: number;
  stats: {
    total: number;
    enabled: number;
    disabled: number;
  };
}

export interface PluginListResponse {
  plugins: ClaudeDesktopPlugin[];
  total: number;
  stats: {
    total: number;
    enabled: number;
    disabled: number;
  };
}

export interface ConfigResponse {
  config: {
    mcpServers?: Record<string, any>;
    plugins?: Record<string, any>;
  };
  stats: {
    mcpServers: number;
    plugins: number;
  };
}

export interface McpCreateRequest {
  componentId: string;
  enabled?: boolean;
  commandOverride?: string;
  argsOverride?: string; // JSON array as string
  envOverrides?: string; // JSON object as string
}

export interface McpUpdateRequest {
  enabled?: boolean;
  commandOverride?: string | null;
  argsOverride?: string | null;
  envOverrides?: string | null;
}

export interface PluginCreateRequest {
  pluginId: string;
  enabled?: boolean;
  config?: string; // JSON as string
}

export interface PluginUpdateRequest {
  enabled?: boolean;
  config?: string | null;
}

// ==================== MCP API Functions ====================

/**
 * List all MCP servers
 */
export async function listMcpServers(filters?: {
  enabled?: boolean;
}): Promise<{ data?: McpListResponse; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (filters?.enabled !== undefined) params.set('enabled', String(filters.enabled));

    const queryString = params.toString();
    const response = await api.get<McpListResponse>(
      `/api/desktop/mcp${queryString ? `?${queryString}` : ''}`
    );
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Get MCP server details by ID
 */
export async function getMcpServer(id: string): Promise<{ data?: ClaudeDesktopMcp; error?: string }> {
  try {
    const response = await api.get<ClaudeDesktopMcp>(`/api/desktop/mcp/${id}`);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Add MCP server to Claude Desktop
 */
export async function addMcpServer(
  data: McpCreateRequest
): Promise<{ data?: ClaudeDesktopMcp; error?: string }> {
  try {
    const response = await api.post<ClaudeDesktopMcp>('/api/desktop/mcp', data);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Update MCP server settings
 */
export async function updateMcpServer(
  id: string,
  updates: McpUpdateRequest
): Promise<{ data?: ClaudeDesktopMcp; error?: string }> {
  try {
    const response = await api.patch<ClaudeDesktopMcp>(`/api/desktop/mcp/${id}`, updates);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Remove MCP server from Claude Desktop
 */
export async function removeMcpServer(id: string): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const response = await api.delete<{ success: boolean }>(`/api/desktop/mcp/${id}`);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

// ==================== Plugin API Functions ====================

/**
 * List all plugins
 */
export async function listPlugins(filters?: {
  enabled?: boolean;
}): Promise<{ data?: PluginListResponse; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (filters?.enabled !== undefined) params.set('enabled', String(filters.enabled));

    const queryString = params.toString();
    const response = await api.get<PluginListResponse>(
      `/api/desktop/plugins${queryString ? `?${queryString}` : ''}`
    );
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Get plugin details by ID
 */
export async function getPlugin(id: string): Promise<{ data?: ClaudeDesktopPlugin; error?: string }> {
  try {
    const response = await api.get<ClaudeDesktopPlugin>(`/api/desktop/plugins/${id}`);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Add plugin to Claude Desktop
 */
export async function addPlugin(
  data: PluginCreateRequest
): Promise<{ data?: ClaudeDesktopPlugin; error?: string }> {
  try {
    const response = await api.post<ClaudeDesktopPlugin>('/api/desktop/plugins', data);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Update plugin settings
 */
export async function updatePlugin(
  id: string,
  updates: PluginUpdateRequest
): Promise<{ data?: ClaudeDesktopPlugin; error?: string }> {
  try {
    const response = await api.patch<ClaudeDesktopPlugin>(`/api/desktop/plugins/${id}`, updates);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Remove plugin from Claude Desktop
 */
export async function removePlugin(id: string): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const response = await api.delete<{ success: boolean }>(`/api/desktop/plugins/${id}`);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

// ==================== Config API Functions ====================

/**
 * Get generated Claude Desktop config
 */
export async function getConfig(): Promise<{ data?: ConfigResponse; error?: string }> {
  try {
    const response = await api.get<ConfigResponse>('/api/desktop/config');
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}
