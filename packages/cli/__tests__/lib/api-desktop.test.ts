/**
 * API Desktop Client Tests
 *
 * Tests for the Claude Desktop API client functions
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the api module before importing
jest.unstable_mockModule('../../src/lib/api.js', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Import after mocking
const { api } = await import('../../src/lib/api.js');
const {
  listMcpServers,
  getMcpServer,
  addMcpServer,
  updateMcpServer,
  removeMcpServer,
  listPlugins,
  getPlugin,
  addPlugin,
  updatePlugin,
  removePlugin,
  getConfig,
} = await import('../../src/lib/api-desktop.js');

const mockedApi = api as jest.Mocked<typeof api>;

describe('API Desktop Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== MCP Server Tests ====================

  describe('listMcpServers', () => {
    it('should list all MCP servers', async () => {
      const mockResponse = {
        data: {
          mcpServers: [
            { id: 'mcp-1', componentId: 'comp-1', enabled: true },
            { id: 'mcp-2', componentId: 'comp-2', enabled: false },
          ],
          total: 2,
          stats: { total: 2, enabled: 1, disabled: 1 },
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await listMcpServers();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/desktop/mcp');
      expect(result.data?.mcpServers).toHaveLength(2);
      expect(result.data?.stats.enabled).toBe(1);
    });

    it('should filter by enabled status', async () => {
      const mockResponse = {
        data: {
          mcpServers: [{ id: 'mcp-1', componentId: 'comp-1', enabled: true }],
          total: 1,
          stats: { total: 1, enabled: 1, disabled: 0 },
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await listMcpServers({ enabled: true });

      expect(mockedApi.get).toHaveBeenCalledWith('/api/desktop/mcp?enabled=true');
      expect(result.data?.mcpServers).toHaveLength(1);
    });

    it('should handle errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await listMcpServers();

      expect(result.error).toBe('Network error');
      expect(result.data).toBeUndefined();
    });
  });

  describe('getMcpServer', () => {
    it('should get MCP server by ID', async () => {
      const mockResponse = {
        data: {
          id: 'mcp-123',
          componentId: 'comp-1',
          enabled: true,
          commandOverride: '/usr/local/bin/server',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await getMcpServer('mcp-123');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/desktop/mcp/mcp-123');
      expect(result.data?.id).toBe('mcp-123');
      expect(result.data?.commandOverride).toBe('/usr/local/bin/server');
    });

    it('should handle not found', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('MCP server not found'));

      const result = await getMcpServer('non-existent');

      expect(result.error).toBe('MCP server not found');
    });
  });

  describe('addMcpServer', () => {
    it('should add new MCP server', async () => {
      const mockResponse = {
        data: {
          id: 'new-mcp',
          componentId: 'comp-1',
          enabled: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await addMcpServer({
        componentId: 'comp-1',
        enabled: true,
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/api/desktop/mcp', {
        componentId: 'comp-1',
        enabled: true,
      });
      expect(result.data?.id).toBe('new-mcp');
    });

    it('should add MCP server with overrides', async () => {
      const mockResponse = {
        data: {
          id: 'new-mcp',
          componentId: 'comp-1',
          enabled: true,
          commandOverride: '/custom/path',
          argsOverride: '["--verbose"]',
          envOverrides: '{"DEBUG":"1"}',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await addMcpServer({
        componentId: 'comp-1',
        enabled: true,
        commandOverride: '/custom/path',
        argsOverride: '["--verbose"]',
        envOverrides: '{"DEBUG":"1"}',
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/api/desktop/mcp', {
        componentId: 'comp-1',
        enabled: true,
        commandOverride: '/custom/path',
        argsOverride: '["--verbose"]',
        envOverrides: '{"DEBUG":"1"}',
      });
      expect(result.data?.envOverrides).toBe('{"DEBUG":"1"}');
    });

    it('should handle creation errors', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Component not found'));

      const result = await addMcpServer({ componentId: 'invalid' });

      expect(result.error).toBe('Component not found');
    });
  });

  describe('updateMcpServer', () => {
    it('should update MCP server', async () => {
      const mockResponse = {
        data: {
          id: 'mcp-123',
          componentId: 'comp-1',
          enabled: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      };

      mockedApi.patch.mockResolvedValueOnce(mockResponse);

      const result = await updateMcpServer('mcp-123', { enabled: false });

      expect(mockedApi.patch).toHaveBeenCalledWith('/api/desktop/mcp/mcp-123', {
        enabled: false,
      });
      expect(result.data?.enabled).toBe(false);
    });

    it('should clear overrides with null', async () => {
      const mockResponse = {
        data: {
          id: 'mcp-123',
          componentId: 'comp-1',
          enabled: true,
          commandOverride: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      };

      mockedApi.patch.mockResolvedValueOnce(mockResponse);

      const result = await updateMcpServer('mcp-123', { commandOverride: null });

      expect(mockedApi.patch).toHaveBeenCalledWith('/api/desktop/mcp/mcp-123', {
        commandOverride: null,
      });
      expect(result.data?.commandOverride).toBeNull();
    });

    it('should handle update errors', async () => {
      mockedApi.patch.mockRejectedValueOnce(new Error('Update failed'));

      const result = await updateMcpServer('mcp-123', { enabled: true });

      expect(result.error).toBe('Update failed');
    });
  });

  describe('removeMcpServer', () => {
    it('should remove MCP server', async () => {
      const mockResponse = { data: { success: true } };

      mockedApi.delete.mockResolvedValueOnce(mockResponse);

      const result = await removeMcpServer('mcp-123');

      expect(mockedApi.delete).toHaveBeenCalledWith('/api/desktop/mcp/mcp-123');
      expect(result.data?.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      mockedApi.delete.mockRejectedValueOnce(new Error('Cannot delete'));

      const result = await removeMcpServer('mcp-123');

      expect(result.error).toBe('Cannot delete');
    });
  });

  // ==================== Plugin Tests ====================

  describe('listPlugins', () => {
    it('should list all plugins', async () => {
      const mockResponse = {
        data: {
          plugins: [
            { id: 'plugin-1', pluginId: 'artifacts', enabled: true },
            { id: 'plugin-2', pluginId: 'analysis', enabled: false },
          ],
          total: 2,
          stats: { total: 2, enabled: 1, disabled: 1 },
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await listPlugins();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/desktop/plugins');
      expect(result.data?.plugins).toHaveLength(2);
    });

    it('should filter by enabled status', async () => {
      const mockResponse = {
        data: {
          plugins: [{ id: 'plugin-1', pluginId: 'artifacts', enabled: true }],
          total: 1,
          stats: { total: 1, enabled: 1, disabled: 0 },
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await listPlugins({ enabled: true });

      expect(mockedApi.get).toHaveBeenCalledWith('/api/desktop/plugins?enabled=true');
    });

    it('should handle errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await listPlugins();

      expect(result.error).toBe('Network error');
    });
  });

  describe('getPlugin', () => {
    it('should get plugin by ID', async () => {
      const mockResponse = {
        data: {
          id: 'plugin-123',
          pluginId: 'artifacts',
          enabled: true,
          config: '{"showPreview":true}',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await getPlugin('plugin-123');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/desktop/plugins/plugin-123');
      expect(result.data?.pluginId).toBe('artifacts');
    });

    it('should handle not found', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Plugin not found'));

      const result = await getPlugin('non-existent');

      expect(result.error).toBe('Plugin not found');
    });
  });

  describe('addPlugin', () => {
    it('should add new plugin', async () => {
      const mockResponse = {
        data: {
          id: 'new-plugin',
          pluginId: 'artifacts',
          enabled: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await addPlugin({
        pluginId: 'artifacts',
        enabled: true,
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/api/desktop/plugins', {
        pluginId: 'artifacts',
        enabled: true,
      });
      expect(result.data?.id).toBe('new-plugin');
    });

    it('should add plugin with config', async () => {
      const mockResponse = {
        data: {
          id: 'new-plugin',
          pluginId: 'artifacts',
          enabled: true,
          config: '{"showPreview":true}',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await addPlugin({
        pluginId: 'artifacts',
        enabled: true,
        config: '{"showPreview":true}',
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/api/desktop/plugins', {
        pluginId: 'artifacts',
        enabled: true,
        config: '{"showPreview":true}',
      });
    });

    it('should handle creation errors', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Invalid plugin ID'));

      const result = await addPlugin({ pluginId: 'invalid' });

      expect(result.error).toBe('Invalid plugin ID');
    });
  });

  describe('updatePlugin', () => {
    it('should update plugin', async () => {
      const mockResponse = {
        data: {
          id: 'plugin-123',
          pluginId: 'artifacts',
          enabled: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      };

      mockedApi.patch.mockResolvedValueOnce(mockResponse);

      const result = await updatePlugin('plugin-123', { enabled: false });

      expect(mockedApi.patch).toHaveBeenCalledWith('/api/desktop/plugins/plugin-123', {
        enabled: false,
      });
      expect(result.data?.enabled).toBe(false);
    });

    it('should clear config with null', async () => {
      const mockResponse = {
        data: {
          id: 'plugin-123',
          pluginId: 'artifacts',
          enabled: true,
          config: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      };

      mockedApi.patch.mockResolvedValueOnce(mockResponse);

      const result = await updatePlugin('plugin-123', { config: null });

      expect(mockedApi.patch).toHaveBeenCalledWith('/api/desktop/plugins/plugin-123', {
        config: null,
      });
      expect(result.data?.config).toBeNull();
    });

    it('should handle update errors', async () => {
      mockedApi.patch.mockRejectedValueOnce(new Error('Update failed'));

      const result = await updatePlugin('plugin-123', { enabled: true });

      expect(result.error).toBe('Update failed');
    });
  });

  describe('removePlugin', () => {
    it('should remove plugin', async () => {
      const mockResponse = { data: { success: true } };

      mockedApi.delete.mockResolvedValueOnce(mockResponse);

      const result = await removePlugin('plugin-123');

      expect(mockedApi.delete).toHaveBeenCalledWith('/api/desktop/plugins/plugin-123');
      expect(result.data?.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      mockedApi.delete.mockRejectedValueOnce(new Error('Cannot delete'));

      const result = await removePlugin('plugin-123');

      expect(result.error).toBe('Cannot delete');
    });
  });

  // ==================== Config Tests ====================

  describe('getConfig', () => {
    it('should get generated Claude Desktop config', async () => {
      const mockResponse = {
        data: {
          config: {
            mcpServers: {
              'postgres-mcp': {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-postgres'],
              },
            },
            plugins: {
              artifacts: { enabled: true },
            },
          },
          stats: {
            mcpServers: 1,
            plugins: 1,
          },
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await getConfig();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/desktop/config');
      expect(result.data?.stats.mcpServers).toBe(1);
      expect(result.data?.config.mcpServers).toHaveProperty('postgres-mcp');
    });

    it('should handle empty config', async () => {
      const mockResponse = {
        data: {
          config: {},
          stats: { mcpServers: 0, plugins: 0 },
        },
      };

      mockedApi.get.mockResolvedValueOnce(mockResponse);

      const result = await getConfig();

      expect(result.data?.stats.mcpServers).toBe(0);
      expect(result.data?.stats.plugins).toBe(0);
    });

    it('should handle errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Server error'));

      const result = await getConfig();

      expect(result.error).toBe('Server error');
    });
  });
});
