import type { MachineOverride } from '@prisma/client'

/**
 * Machine Override Application
 * Applies machine-specific overrides to components before file generation
 */

export interface ComponentWithOverrides {
  id: string
  type: string
  name: string
  description: string | null
  config: any
  enabled: boolean
}

export interface GlobalSettings {
  globalHooks: any[]
  globalPermissions: any[]
  globalEnvVars: any[]
}

/**
 * Apply machine overrides to components
 *
 * Override Logic:
 * - exclude: Remove the component entirely
 * - include: Ensure component is included (overrides previous exclude)
 * - modify: Change component config using overrideData JSON
 *
 * Processing Order:
 * 1. Apply excludes (remove components)
 * 2. Apply includes (add back components)
 * 3. Apply modifications (alter component configs)
 * 4. Apply global settings filters
 */
export function applyMachineOverrides(
  components: ComponentWithOverrides[],
  overrides: MachineOverride[],
  globalSettings: GlobalSettings
): ComponentWithOverrides[] {
  let result = [...components]

  // Group overrides by action for easier processing
  const excludeOverrides = overrides.filter((o) => o.action === 'exclude')
  const includeOverrides = overrides.filter((o) => o.action === 'include')
  const modifyOverrides = overrides.filter((o) => o.action === 'modify')

  // Step 1: Apply excludes
  for (const override of excludeOverrides) {
    result = result.filter((comp) => {
      // Match by config type and key
      const matches = matchesOverride(comp, override)
      return !matches // Remove if matches exclude
    })
  }

  // Step 2: Apply includes
  // Note: Includes are mainly for documentation/explicitness since components are included by default
  // They can be used to override machine-level excludes in specific scenarios

  // Step 3: Apply modifications
  for (const override of modifyOverrides) {
    result = result.map((comp) => {
      if (matchesOverride(comp, override)) {
        return applyModification(comp, override)
      }
      return comp
    })
  }

  // Step 4: Apply global settings filters
  // Filter components based on global settings
  result = applyGlobalSettingsFilters(result, globalSettings, overrides)

  return result
}

/**
 * Check if a component matches an override rule
 */
function matchesOverride(
  component: ComponentWithOverrides,
  override: MachineOverride
): boolean {
  // Convert component type to configType format
  const configType = componentTypeToConfigType(component.type)

  // Check if configType matches
  if (override.configType !== configType) {
    return false
  }

  // Check if configKey matches
  // configKey can be:
  // - Exact match: "mcp-server-name"
  // - Component ID: component.id
  // - Component name: component.name
  // - Wildcard: "*" (matches all)

  if (override.configKey === '*') {
    return true
  }

  if (
    override.configKey === component.id ||
    override.configKey === component.name
  ) {
    return true
  }

  // For MCP servers, also match against server name in config
  if (configType === 'mcp_server' && component.config?.serverName) {
    if (override.configKey === component.config.serverName) {
      return true
    }
  }

  return false
}

/**
 * Apply modification override to a component
 */
function applyModification(
  component: ComponentWithOverrides,
  override: MachineOverride
): ComponentWithOverrides {
  if (!override.overrideData) {
    return component
  }

  try {
    // Parse override data
    const modifications = JSON.parse(override.overrideData)

    // Merge modifications into component config
    const newConfig = {
      ...component.config,
      ...modifications,
    }

    return {
      ...component,
      config: newConfig,
    }
  } catch (error) {
    console.error(
      `Failed to apply modification override for ${component.name}:`,
      error
    )
    return component
  }
}

/**
 * Apply global settings filters
 * Filter or modify components based on global hooks, permissions, and env vars
 */
function applyGlobalSettingsFilters(
  components: ComponentWithOverrides[],
  globalSettings: GlobalSettings,
  overrides: MachineOverride[]
): ComponentWithOverrides[] {
  // Check if there are overrides for global settings
  const hookOverrides = overrides.filter((o) => o.configType === 'hook')
  const permissionOverrides = overrides.filter(
    (o) => o.configType === 'permission'
  )
  const envVarOverrides = overrides.filter((o) => o.configType === 'env_var')

  // Filter global hooks based on overrides
  let filteredHooks = globalSettings.globalHooks
  for (const override of hookOverrides) {
    if (override.action === 'exclude') {
      filteredHooks = filteredHooks.filter(
        (hook) =>
          override.configKey !== '*' &&
          !matchesGlobalSetting(hook, override.configKey)
      )
    }
  }

  // Filter global permissions based on overrides
  let filteredPermissions = globalSettings.globalPermissions
  for (const override of permissionOverrides) {
    if (override.action === 'exclude') {
      filteredPermissions = filteredPermissions.filter(
        (perm) =>
          override.configKey !== '*' &&
          !matchesGlobalSetting(perm, override.configKey)
      )
    }
  }

  // Filter global env vars based on overrides
  let filteredEnvVars = globalSettings.globalEnvVars
  for (const override of envVarOverrides) {
    if (override.action === 'exclude') {
      filteredEnvVars = filteredEnvVars.filter(
        (env) =>
          override.configKey !== '*' &&
          !matchesGlobalSetting(env, override.configKey)
      )
    }
  }

  // Modify components that include global settings
  return components.map((comp) => {
    // If component has hooks, filter them
    if (comp.config?.hooks) {
      comp.config.hooks = filterByList(comp.config.hooks, filteredHooks)
    }

    // If component has permissions, filter them
    if (comp.config?.permissions) {
      comp.config.permissions = filterByList(
        comp.config.permissions,
        filteredPermissions
      )
    }

    // If component has env vars, filter them
    if (comp.config?.envVars) {
      comp.config.envVars = filterByList(comp.config.envVars, filteredEnvVars)
    }

    return comp
  })
}

/**
 * Check if a global setting matches a config key
 */
function matchesGlobalSetting(setting: any, configKey: string): boolean {
  if (setting.id === configKey) return true
  if (setting.name === configKey) return true
  if (setting.key === configKey) return true
  if (setting.hookType === configKey) return true
  if (setting.permission === configKey) return true
  return false
}

/**
 * Filter a list of items based on a filtered global list
 */
function filterByList(items: any[], filteredGlobalList: any[]): any[] {
  if (!Array.isArray(items)) return items

  return items.filter((item) => {
    // Check if item exists in filtered list
    return filteredGlobalList.some(
      (global) =>
        global.id === item.id ||
        global.name === item.name ||
        global.key === item.key
    )
  })
}

/**
 * Convert component type to config type format
 */
function componentTypeToConfigType(componentType: string): string {
  const typeMap: Record<string, string> = {
    MCP_SERVER: 'mcp_server',
    SUBAGENT: 'subagent',
    SKILL: 'skill',
    COMMAND: 'command',
    HOOK: 'hook',
    CLAUDE_MD_TEMPLATE: 'claude_md',
    AUTO_CLAUDE_PROFILE: 'auto_claude',
  }

  return typeMap[componentType] || componentType.toLowerCase()
}

/**
 * Get override summary for debugging/logging
 */
export function getOverrideSummary(overrides: MachineOverride[]): {
  excludes: number
  includes: number
  modifications: number
  byType: Record<string, number>
} {
  const summary = {
    excludes: 0,
    includes: 0,
    modifications: 0,
    byType: {} as Record<string, number>,
  }

  for (const override of overrides) {
    if (override.action === 'exclude') summary.excludes++
    if (override.action === 'include') summary.includes++
    if (override.action === 'modify') summary.modifications++

    const type = override.configType
    summary.byType[type] = (summary.byType[type] || 0) + 1
  }

  return summary
}
