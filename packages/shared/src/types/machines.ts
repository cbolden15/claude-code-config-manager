/**
 * Machine Registry Types
 *
 * Types for managing registered machines in CCM v2.0
 */

export type ConfigType = 'mcp_server' | 'hook' | 'permission' | 'env_var' | 'plugin';
export type OverrideAction = 'include' | 'exclude' | 'modify';

/**
 * Machine - Represents a registered machine in the system
 */
export interface Machine {
  id: string;
  name: string;
  hostname: string | null;
  platform: string; // "darwin", "linux", "win32"
  arch: string | null; // "arm64", "x64"
  homeDir: string | null;
  lastSeen: Date;
  lastSyncedAt: Date | null;
  syncEnabled: boolean;
  isCurrentMachine: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MachineOverride - Machine-specific configuration overrides
 */
export interface MachineOverride {
  id: string;
  machineId: string;
  configType: ConfigType;
  configKey: string;
  action: OverrideAction;
  overrideData: string | null; // JSON string
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MachineRegistration - Payload for registering a new machine
 */
export interface MachineRegistration {
  name: string;
  hostname?: string;
  platform: string;
  arch?: string;
  homeDir?: string;
}

/**
 * MachineWithOverrides - Machine with related overrides
 */
export interface MachineWithOverrides extends Machine {
  overrides: MachineOverride[];
}

/**
 * MachineWithStats - Machine with sync statistics
 */
export interface MachineWithStats extends Machine {
  overrides: MachineOverride[];
  syncLogCount: number;
}

/**
 * MachineUpdate - Fields that can be updated on a machine
 */
export interface MachineUpdate {
  name?: string;
  hostname?: string;
  syncEnabled?: boolean;
  isCurrentMachine?: boolean;
}

/**
 * MachineOverrideCreate - Payload for creating a machine override
 */
export interface MachineOverrideCreate {
  configType: ConfigType;
  configKey: string;
  action: OverrideAction;
  overrideData?: string | null;
  reason?: string;
}

/**
 * MachineListStats - Statistics for machine list view
 */
export interface MachineListStats {
  total: number;
  online: number;
  syncEnabled: number;
}
