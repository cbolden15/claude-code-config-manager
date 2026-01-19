import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for updating plugin
const PluginUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.string().optional().nullable(),
});

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/desktop/plugins/[id]
 * Get single plugin configuration
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    const plugin = await prisma.claudeDesktopPlugin.findUnique({
      where: { id },
    });

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(plugin);
  } catch (error) {
    console.error('[GET /api/desktop/plugins/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/desktop/plugins/[id]
 * Update plugin configuration
 */
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const data = PluginUpdateSchema.parse(body);

    // Check if plugin exists
    const existing = await prisma.claudeDesktopPlugin.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
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

    // Update plugin
    const plugin = await prisma.claudeDesktopPlugin.update({
      where: { id },
      data: {
        enabled: data.enabled,
        config: data.config,
      },
    });

    return NextResponse.json(plugin);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[PATCH /api/desktop/plugins/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/desktop/plugins/[id]
 * Remove plugin from Claude Desktop configuration
 */
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    // Check if plugin exists
    const existing = await prisma.claudeDesktopPlugin.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    // Delete plugin
    await prisma.claudeDesktopPlugin.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/desktop/plugins/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
