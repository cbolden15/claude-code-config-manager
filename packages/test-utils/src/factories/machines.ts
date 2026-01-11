/**
 * Machine Factory
 *
 * Factory functions for creating test machine data
 */

import type { Machine, MachineOverride } from '@ccm/shared';

let machineCounter = 0;
let overrideCounter = 0;

/**
 * Creates a machine with default or custom properties
 */
export function createMachine(overrides?: Partial<Machine>): Machine {
  machineCounter++;

  const now = new Date();

  return {
    id: overrides?.id ?? `machine_${machineCounter}`,
    name: overrides?.name ?? `test-machine-${machineCounter}`,
    hostname: overrides?.hostname ?? `test-host-${machineCounter}.local`,
    platform: overrides?.platform ?? 'darwin',
    arch: overrides?.arch ?? 'arm64',
    homeDir: overrides?.homeDir ?? `/Users/testuser${machineCounter}`,
    lastSeen: overrides?.lastSeen ?? now,
    lastSyncedAt: overrides?.lastSyncedAt ?? null,
    syncEnabled: overrides?.syncEnabled ?? true,
    isCurrentMachine: overrides?.isCurrentMachine ?? false,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    ...overrides,
  };
}

/**
 * Creates a machine override with default or custom properties
 */
export function createMachineOverride(overrides?: Partial<MachineOverride>): MachineOverride {
  overrideCounter++;

  const now = new Date();

  return {
    id: overrides?.id ?? `override_${overrideCounter}`,
    machineId: overrides?.machineId ?? `machine_${machineCounter}`,
    configType: overrides?.configType ?? 'mcp_server',
    configKey: overrides?.configKey ?? `config_${overrideCounter}`,
    action: overrides?.action ?? 'include',
    overrideData: overrides?.overrideData ?? null,
    reason: overrides?.reason ?? null,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    ...overrides,
  };
}

/**
 * Creates multiple machines
 */
export function createMachines(count: number, overrides?: Partial<Machine>): Machine[] {
  return Array.from({ length: count }, (_, i) =>
    createMachine({ ...overrides, name: overrides?.name ?? `machine-${i + 1}` })
  );
}

/**
 * Creates a machine with typical development setup
 */
export function createDevMachine(): Machine {
  return createMachine({
    name: 'dev-laptop',
    hostname: 'macbook-pro.local',
    platform: 'darwin',
    arch: 'arm64',
    homeDir: '/Users/developer',
    isCurrentMachine: true,
  });
}

/**
 * Creates a machine with typical CI/CD setup
 */
export function createCIMachine(): Machine {
  return createMachine({
    name: 'ci-runner',
    hostname: 'github-runner-1',
    platform: 'linux',
    arch: 'x64',
    homeDir: '/home/runner',
    syncEnabled: false,
  });
}

/**
 * Creates a machine with typical server setup
 */
export function createServerMachine(): Machine {
  return createMachine({
    name: 'homelab',
    hostname: 'homelab.local',
    platform: 'linux',
    arch: 'x64',
    homeDir: '/home/admin',
  });
}

/**
 * Reset counters (useful for test isolation)
 */
export function resetMachineCounters(): void {
  machineCounter = 0;
  overrideCounter = 0;
}
