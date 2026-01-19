import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for creating/updating plugin
const PluginSchema = z.object({
  pluginId: z.string().min(1),
  enabled: z.boolean().optional(),
  config: z.string().optional(), // JSON config as string
});

/**
 * GET /api/desktop/plugins
 * List all Claude Desktop plugins
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get('enabled');

    const where = enabled !== null ? { enabled: enabled === 'true' } : {};

    const plugins = await prisma.claudeDesktopPlugin.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: plugins.length,
      enabled: plugins.filter((p) => p.enabled).length,
      disabled: plugins.filter((p) => !p.enabled).length,
    };

    return NextResponse.json({
      plugins,
      total: plugins.length,
      stats,
    });
  } catch (error) {
    console.error('[GET /api/desktop/plugins]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/desktop/plugins
 * Add plugin to Claude Desktop configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const data = PluginSchema.parse(body);

    // Check if plugin already exists
    const existing = await prisma.claudeDesktopPlugin.findUnique({
      where: { pluginId: data.pluginId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Plugin already added to Claude Desktop' },
        { status: 409 }
      );
    }

    // Validate JSON config if provided
    if (data.config) {
      try {
        JSON.parse(data.config);
      } catch {
        return NextResponse.json(
          { error: 'Invalid config JSON' },
          { status: 400 }
        );
      }
    }

    // Create plugin
    const plugin = await prisma.claudeDesktopPlugin.create({
      data: {
        pluginId: data.pluginId,
        enabled: data.enabled ?? true,
        config: data.config,
      },
    });

    return NextResponse.json(plugin, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/desktop/plugins]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
