import { api } from './api.js';

/**
 * Machine API Client
 * Handles all machine-related API calls to CCM server
 */

// ==================== Types ====================

export interface Machine {
  id: string;
  name: string;
  hostname: string;
  platform: 'darwin' | 'linux' | 'win32';
  arch: string;
  homeDir?: string | null;
  lastSeen: string;
  lastSyncedAt?: string | null;
  syncEnabled: boolean;
  isCurrentMachine: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MachineDetail extends Machine {
  overrides: MachineOverride[];
  syncLogs: SyncLog[];
}

export interface MachineOverride {
  id: string;
  machineId: string;
  configType: 'mcp_server' | 'hook' | 'permission' | 'env_var' | 'plugin';
  configKey: string;
  action: 'include' | 'exclude' | 'modify';
  overrideData?: string | null;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  machineId: string;
  syncType: 'full' | 'incremental' | 'selective';
  status: 'pending' | 'running' | 'completed' | 'failed';
  filesCreated?: number | null;
  filesUpdated?: number | null;
  filesDeleted?: number | null;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

export interface MachinesListResponse {
  machines: Machine[];
  total: number;
  stats: {
    totalMachines: number;
    activeMachines: number;
    syncEnabled: number;
  };
}

export interface MachineRegisterRequest {
  name: string;
  hostname?: string;
  platform: 'darwin' | 'linux' | 'win32';
  arch?: string;
  homeDir?: string;
  isCurrentMachine?: boolean;
}

export interface MachineUpdateRequest {
  syncEnabled?: boolean;
  isCurrentMachine?: boolean;
}

export interface MachineOverrideCreateRequest {
  configType: 'mcp_server' | 'hook' | 'permission' | 'env_var' | 'plugin';
  configKey: string;
  action: 'include' | 'exclude' | 'modify';
  overrideData?: string;
  reason?: string;
}

export interface OverridesListResponse {
  overrides: MachineOverride[];
  total: number;
}

// ==================== API Functions ====================

/**
 * List all machines with optional filtering
 */
export async function listMachines(filters?: {
  platform?: string;
  syncEnabled?: boolean;
}): Promise<{ data?: MachinesListResponse; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (filters?.platform) params.set('platform', filters.platform);
    if (filters?.syncEnabled !== undefined) params.set('syncEnabled', String(filters.syncEnabled));

    const queryString = params.toString();
    const response = await api.get<MachinesListResponse>(
      `/api/machines${queryString ? `?${queryString}` : ''}`
    );
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Get or auto-register current machine
 */
export async function getCurrentMachine(): Promise<{ data?: MachineDetail; error?: string }> {
  try {
    const response = await api.get<MachineDetail>('/api/machines/current');
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Register a new machine or update existing
 */
export async function registerMachine(
  machine: MachineRegisterRequest
): Promise<{ data?: MachineDetail; error?: string }> {
  try {
    const response = await api.post<MachineDetail>('/api/machines', machine);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Get machine details by ID
 */
export async function getMachine(id: string): Promise<{ data?: MachineDetail; error?: string }> {
  try {
    const response = await api.get<MachineDetail>(`/api/machines/${id}`);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Update machine settings
 */
export async function updateMachine(
  id: string,
  updates: MachineUpdateRequest
): Promise<{ data?: MachineDetail; error?: string }> {
  try {
    const response = await api.put<MachineDetail>(`/api/machines/${id}`, updates);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Delete a machine
 */
export async function deleteMachine(id: string): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const response = await api.delete<{ success: boolean }>(`/api/machines/${id}`);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * List machine overrides
 */
export async function listOverrides(machineId: string): Promise<{ data?: OverridesListResponse; error?: string }> {
  try {
    const response = await api.get<OverridesListResponse>(`/api/machines/${machineId}/overrides`);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Create machine override
 */
export async function createOverride(
  machineId: string,
  override: MachineOverrideCreateRequest
): Promise<{ data?: MachineOverride; error?: string }> {
  try {
    const response = await api.post<MachineOverride>(`/api/machines/${machineId}/overrides`, override);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}
