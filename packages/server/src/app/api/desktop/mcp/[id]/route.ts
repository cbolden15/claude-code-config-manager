import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for updating MCP server
const McpUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  commandOverride: z.string().optional().nullable(),
  argsOverride: z.string().optional().nullable(),
  envOverrides: z.string().optional().nullable(),
});

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/desktop/mcp/[id]
 * Get single MCP server configuration
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    const mcpServer = await prisma.claudeDesktopMcp.findUnique({
      where: { id },
    });

    if (!mcpServer) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      );
    }

    // Get component details
    const component = await prisma.component.findUnique({
      where: { id: mcpServer.componentId },
    });

    return NextResponse.json({
      ...mcpServer,
      component,
    });
  } catch (error) {
    console.error('[GET /api/desktop/mcp/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/desktop/mcp/[id]
 * Update MCP server configuration
 */
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const data = McpUpdateSchema.parse(body);

    // Check if MCP server exists
    const existing = await prisma.claudeDesktopMcp.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
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

    // Update MCP server
    const mcpServer = await prisma.claudeDesktopMcp.update({
      where: { id },
      data: {
        enabled: data.enabled,
        commandOverride: data.commandOverride,
        argsOverride: data.argsOverride,
        envOverrides: data.envOverrides,
      },
    });

    return NextResponse.json(mcpServer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[PATCH /api/desktop/mcp/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/desktop/mcp/[id]
 * Remove MCP server from Claude Desktop configuration
 */
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    // Check if MCP server exists
    const existing = await prisma.claudeDesktopMcp.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      );
    }

    // Delete MCP server
    await prisma.claudeDesktopMcp.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/desktop/mcp/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
