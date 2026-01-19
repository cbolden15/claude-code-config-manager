import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for creating/updating MCP server
const McpSchema = z.object({
  componentId: z.string().min(1),
  enabled: z.boolean().optional(),
  commandOverride: z.string().optional(),
  argsOverride: z.string().optional(), // JSON array as string
  envOverrides: z.string().optional(), // JSON object as string
});

/**
 * GET /api/desktop/mcp
 * List all Claude Desktop MCP servers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get('enabled');

    const where = enabled !== null ? { enabled: enabled === 'true' } : {};

    const mcpServers = await prisma.claudeDesktopMcp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Also get component details for each MCP server
    const mcpWithComponents = await Promise.all(
      mcpServers.map(async (mcp) => {
        const component = await prisma.component.findUnique({
          where: { id: mcp.componentId },
        });
        return {
          ...mcp,
          component,
        };
      })
    );

    const stats = {
      total: mcpServers.length,
      enabled: mcpServers.filter((m) => m.enabled).length,
      disabled: mcpServers.filter((m) => !m.enabled).length,
    };

    return NextResponse.json({
      mcpServers: mcpWithComponents,
      total: mcpServers.length,
      stats,
    });
  } catch (error) {
    console.error('[GET /api/desktop/mcp]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/desktop/mcp
 * Add MCP server to Claude Desktop configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const data = McpSchema.parse(body);

    // Check if component exists
    const component = await prisma.component.findUnique({
      where: { id: data.componentId },
    });

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    if (component.type !== 'MCP_SERVER') {
      return NextResponse.json(
        { error: 'Component is not an MCP server' },
        { status: 400 }
      );
    }

    // Check if MCP server already exists
    const existing = await prisma.claudeDesktopMcp.findUnique({
      where: { componentId: data.componentId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'MCP server already added to Claude Desktop' },
        { status: 409 }
      );
    }

    // Validate JSON strings if provided
    if (data.argsOverride) {
      try {
        JSON.parse(data.argsOverride);
      } catch {
        return NextResponse.json(
          { error: 'Invalid argsOverride JSON' },
          { status: 400 }
        );
      }
    }

    if (data.envOverrides) {
      try {
        JSON.parse(data.envOverrides);
      } catch {
        return NextResponse.json(
          { error: 'Invalid envOverrides JSON' },
          { status: 400 }
        );
      }
    }

    // Create MCP server
    const mcpServer = await prisma.claudeDesktopMcp.create({
      data: {
        componentId: data.componentId,
        enabled: data.enabled ?? true,
        commandOverride: data.commandOverride,
        argsOverride: data.argsOverride,
        envOverrides: data.envOverrides,
      },
    });

    return NextResponse.json(mcpServer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/desktop/mcp]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
