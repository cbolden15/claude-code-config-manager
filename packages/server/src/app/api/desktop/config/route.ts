import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/desktop/config
 * Generate claude_desktop_config.json from database
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all enabled MCP servers with their components
    const mcpServers = await prisma.claudeDesktopMcp.findMany({
      where: { enabled: true },
    });

    const mcpConfig: Record<string, any> = {};

    for (const mcp of mcpServers) {
      // Get component details
      const component = await prisma.component.findUnique({
        where: { id: mcp.componentId },
      });

      if (!component || !component.mcpConfig) continue;

      // Parse component config
      let componentConfig;
      try {
        componentConfig = JSON.parse(component.mcpConfig);
      } catch {
        console.error(`Failed to parse MCP config for component ${component.id}`);
        continue;
      }

      // Build MCP server config
      const serverConfig: any = {};

      // Use override command or component command
      if (mcp.commandOverride) {
        serverConfig.command = mcp.commandOverride;
      } else if (componentConfig.command) {
        serverConfig.command = componentConfig.command;
      }

      // Use override args or component args
      if (mcp.argsOverride) {
        try {
          serverConfig.args = JSON.parse(mcp.argsOverride);
        } catch {
          serverConfig.args = componentConfig.args || [];
        }
      } else if (componentConfig.args) {
        serverConfig.args = componentConfig.args;
      }

      // Merge env vars (component env + override env)
      const env: Record<string, string> = {};

      if (componentConfig.env) {
        Object.assign(env, componentConfig.env);
      }

      if (mcp.envOverrides) {
        try {
          const overrides = JSON.parse(mcp.envOverrides);
          Object.assign(env, overrides);
        } catch {
          console.error(`Failed to parse env overrides for MCP ${mcp.id}`);
        }
      }

      if (Object.keys(env).length > 0) {
        serverConfig.env = env;
      }

      // Add to config
      mcpConfig[component.name] = serverConfig;
    }

    // Fetch all enabled plugins
    const plugins = await prisma.claudeDesktopPlugin.findMany({
      where: { enabled: true },
    });

    const pluginConfigs: Record<string, any> = {};

    for (const plugin of plugins) {
      if (plugin.config) {
        try {
          pluginConfigs[plugin.pluginId] = JSON.parse(plugin.config);
        } catch {
          pluginConfigs[plugin.pluginId] = {};
        }
      } else {
        pluginConfigs[plugin.pluginId] = {};
      }
    }

    // Build final config
    const config: any = {};

    if (Object.keys(mcpConfig).length > 0) {
      config.mcpServers = mcpConfig;
    }

    if (Object.keys(pluginConfigs).length > 0) {
      config.plugins = pluginConfigs;
    }

    return NextResponse.json({
      config,
      stats: {
        mcpServers: Object.keys(mcpConfig).length,
        plugins: Object.keys(pluginConfigs).length,
      },
    });
  } catch (error) {
    console.error('[GET /api/desktop/config]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
