interface McpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: string;
  url?: string;
  requiredSecrets?: string[];
  documentation?: string;
}

interface McpServer {
  name: string;
  config: McpServerConfig;
}

export function generateMcpJson(servers: McpServer[]): string {
  const mcpServers: Record<string, unknown> = {};

  for (const server of servers) {
    const config = server.config;

    if (config.type === 'streamable-http') {
      // HTTP-based MCP server (like n8n)
      mcpServers[server.name] = {
        type: config.type,
        url: config.url,
      };
    } else {
      // Standard command-based MCP server
      mcpServers[server.name] = {
        command: config.command,
        args: config.args,
        ...(config.env && Object.keys(config.env).length > 0 && { env: config.env }),
      };
    }
  }

  return JSON.stringify({ mcpServers }, null, 2);
}
