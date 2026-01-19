/**
 * Override Application Logic Unit Tests
 */

import {
  applyMachineOverrides,
  getOverrideSummary,
  type ComponentWithOverrides,
  type GlobalSettings,
} from '@/lib/sync/overrides'

describe('Override Application', () => {
  const mockComponents: ComponentWithOverrides[] = [
    {
      id: 'comp-1',
      type: 'MCP_SERVER',
      name: 'test-server',
      description: 'Test MCP server',
      config: { serverName: 'test-server', port: 3000 },
      enabled: true,
    },
    {
      id: 'comp-2',
      type: 'SUBAGENT',
      name: 'test-agent',
      description: 'Test agent',
      config: { agentType: 'general' },
      enabled: true,
    },
    {
      id: 'comp-3',
      type: 'HOOK',
      name: 'test-hook',
      description: 'Test hook',
      config: { command: 'echo test' },
      enabled: true,
    },
  ]

  const mockGlobalSettings: GlobalSettings = {
    globalHooks: [
      { id: 'hook-1', name: 'Global Hook 1', hookType: 'PreToolUse' },
      { id: 'hook-2', name: 'Global Hook 2', hookType: 'PostToolUse' },
    ],
    globalPermissions: [
      { id: 'perm-1', permission: 'Bash(*)', action: 'allow' },
      { id: 'perm-2', permission: 'Read(*)', action: 'allow' },
    ],
    globalEnvVars: [
      { id: 'env-1', key: 'TEST_VAR', value: 'test' },
      { id: 'env-2', key: 'ANOTHER_VAR', value: 'another' },
    ],
  }

  describe('applyMachineOverrides', () => {
    it('should return components unchanged when no overrides', () => {
      // Act
      const result = applyMachineOverrides(mockComponents, [], mockGlobalSettings)

      // Assert
      expect(result).toEqual(mockComponents)
      expect(result).toHaveLength(3)
    })

    it('should exclude components by ID', () => {
      // Arrange
      const overrides = [
        {
          id: 'override-1',
          machineId: 'machine-1',
          configType: 'mcp_server' as const,
          configKey: 'comp-1',
          action: 'exclude' as const,
          overrideData: null,
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Act
      const result = applyMachineOverrides(mockComponents, overrides, mockGlobalSettings)

      // Assert
      expect(result).toHaveLength(2)
      expect(result.find((c) => c.id === 'comp-1')).toBeUndefined()
      expect(result.find((c) => c.id === 'comp-2')).toBeDefined()
    })

    it('should exclude components by name', () => {
      // Arrange
      const overrides = [
        {
          id: 'override-1',
          machineId: 'machine-1',
          configType: 'subagent' as const,
          configKey: 'test-agent',
          action: 'exclude' as const,
          overrideData: null,
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Act
      const result = applyMachineOverrides(mockComponents, overrides, mockGlobalSettings)

      // Assert
      expect(result).toHaveLength(2)
      expect(result.find((c) => c.name === 'test-agent')).toBeUndefined()
    })

    it('should exclude all components with wildcard', () => {
      // Arrange
      const overrides = [
        {
          id: 'override-1',
          machineId: 'machine-1',
          configType: 'mcp_server' as const,
          configKey: '*',
          action: 'exclude' as const,
          overrideData: null,
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Act
      const result = applyMachineOverrides(mockComponents, overrides, mockGlobalSettings)

      // Assert
      expect(result).toHaveLength(2) // Only non-MCP_SERVER components remain
      expect(result.find((c) => c.type === 'MCP_SERVER')).toBeUndefined()
    })

    it('should modify component config', () => {
      // Arrange
      const overrides = [
        {
          id: 'override-1',
          machineId: 'machine-1',
          configType: 'mcp_server' as const,
          configKey: 'comp-1',
          action: 'modify' as const,
          overrideData: JSON.stringify({ port: 4000, enabled: false }),
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Act
      const result = applyMachineOverrides(mockComponents, overrides, mockGlobalSettings)

      // Assert
      const modified = result.find((c) => c.id === 'comp-1')
      expect(modified).toBeDefined()
      expect(modified?.config.port).toBe(4000)
      expect(modified?.config.enabled).toBe(false)
      expect(modified?.config.serverName).toBe('test-server') // Original value preserved
    })

    it('should handle invalid modification data gracefully', () => {
      // Arrange
      const overrides = [
        {
          id: 'override-1',
          machineId: 'machine-1',
          configType: 'mcp_server' as const,
          configKey: 'comp-1',
          action: 'modify' as const,
          overrideData: 'invalid json',
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Act
      const result = applyMachineOverrides(mockComponents, overrides, mockGlobalSettings)

      // Assert - component should be unchanged
      const component = result.find((c) => c.id === 'comp-1')
      expect(component?.config).toEqual(mockComponents[0].config)
    })

    it('should apply multiple overrides in correct order', () => {
      // Arrange
      const overrides = [
        {
          id: 'override-1',
          machineId: 'machine-1',
          configType: 'mcp_server' as const,
          configKey: 'comp-1',
          action: 'exclude' as const,
          overrideData: null,
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'override-2',
          machineId: 'machine-1',
          configType: 'subagent' as const,
          configKey: 'comp-2',
          action: 'modify' as const,
          overrideData: JSON.stringify({ agentType: 'specialized' }),
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Act
      const result = applyMachineOverrides(mockComponents, overrides, mockGlobalSettings)

      // Assert
      expect(result).toHaveLength(2)
      expect(result.find((c) => c.id === 'comp-1')).toBeUndefined()

      const modified = result.find((c) => c.id === 'comp-2')
      expect(modified?.config.agentType).toBe('specialized')
    })

    it('should exclude hook components by type', () => {
      // Arrange
      const overrides = [
        {
          id: 'override-1',
          machineId: 'machine-1',
          configType: 'hook' as const,
          configKey: 'test-hook',
          action: 'exclude' as const,
          overrideData: null,
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Act
      const result = applyMachineOverrides(mockComponents, overrides, mockGlobalSettings)

      // Assert
      expect(result).toHaveLength(2)
      expect(result.find((c) => c.name === 'test-hook')).toBeUndefined()
      expect(result.find((c) => c.type === 'MCP_SERVER')).toBeDefined()
      expect(result.find((c) => c.type === 'SUBAGENT')).toBeDefined()
    })

    it('should match MCP server by serverName', () => {
      // Arrange
      const overrides = [
        {
          id: 'override-1',
          machineId: 'machine-1',
          configType: 'mcp_server' as const,
          configKey: 'test-server', // Matches config.serverName
          action: 'exclude' as const,
          overrideData: null,
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Act
      const result = applyMachineOverrides(mockComponents, overrides, mockGlobalSettings)

      // Assert
      expect(result.find((c) => c.config?.serverName === 'test-server')).toBeUndefined()
    })
  })

  describe('getOverrideSummary', () => {
    it('should return summary of overrides', () => {
      // Arrange
      const overrides = [
        {
          id: '1',
          machineId: 'm1',
          configType: 'hook' as const,
          configKey: 'key1',
          action: 'exclude' as const,
          overrideData: null,
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          machineId: 'm1',
          configType: 'hook' as const,
          configKey: 'key2',
          action: 'exclude' as const,
          overrideData: null,
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          machineId: 'm1',
          configType: 'mcp_server' as const,
          configKey: 'key3',
          action: 'modify' as const,
          overrideData: '{}',
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '4',
          machineId: 'm1',
          configType: 'permission' as const,
          configKey: 'key4',
          action: 'include' as const,
          overrideData: null,
          reason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Act
      const summary = getOverrideSummary(overrides)

      // Assert
      expect(summary.excludes).toBe(2)
      expect(summary.includes).toBe(1)
      expect(summary.modifications).toBe(1)
      expect(summary.byType.hook).toBe(2)
      expect(summary.byType.mcp_server).toBe(1)
      expect(summary.byType.permission).toBe(1)
    })

    it('should return zeros for empty overrides', () => {
      // Act
      const summary = getOverrideSummary([])

      // Assert
      expect(summary.excludes).toBe(0)
      expect(summary.includes).toBe(0)
      expect(summary.modifications).toBe(0)
      expect(summary.byType).toEqual({})
    })
  })
})
