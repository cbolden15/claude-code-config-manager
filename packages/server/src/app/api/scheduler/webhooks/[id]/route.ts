import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/scheduler/webhooks/[id]
 * Get a specific webhook configuration
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const webhook = await prisma.webhookConfig.findUnique({
      where: { id },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true,
            platform: true
          }
        }
      }
    });

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Return with masked URL and parsed JSON fields
    const response = {
      ...webhook,
      webhookUrl: maskWebhookUrl(webhook.webhookUrl),
      config: webhook.config ? JSON.parse(webhook.config) : {},
      eventTypes: webhook.eventTypes ? JSON.parse(webhook.eventTypes) : []
    };

    return NextResponse.json({ webhook: response });
  } catch (error) {
    console.error('[GET /api/scheduler/webhooks/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/scheduler/webhooks/[id]
 * Update a webhook configuration
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if webhook exists
    const existingWebhook = await prisma.webhookConfig.findUnique({
      where: { id }
    });

    if (!existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    const {
      name,
      description,
      webhookType,
      webhookUrl,
      config,
      eventTypes,
      machineId,
      enabled
    } = body;

    // Validate webhookType if provided
    if (webhookType) {
      const validTypes = ['slack', 'discord', 'generic', 'n8n'];
      if (!validTypes.includes(webhookType)) {
        return NextResponse.json(
          { error: `webhookType must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate webhookUrl if provided
    if (webhookUrl) {
      try {
        new URL(webhookUrl);
      } catch {
        return NextResponse.json(
          { error: 'webhookUrl must be a valid URL' },
          { status: 400 }
        );
      }
    }

    // Validate eventTypes if provided
    if (eventTypes) {
      const validEventTypes = [
        'task_started',
        'task_completed',
        'task_failed',
        'threshold_triggered',
        'optimization_applied',
        'health_alert'
      ];

      if (!Array.isArray(eventTypes)) {
        return NextResponse.json(
          { error: 'eventTypes must be an array' },
          { status: 400 }
        );
      }

      const invalidEvents = eventTypes.filter(e => !validEventTypes.includes(e));
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid event types: ${invalidEvents.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate machineId if provided
    if (machineId) {
      const machine = await prisma.machine.findUnique({
        where: { id: machineId }
      });
      if (!machine) {
        return NextResponse.json(
          { error: 'Machine not found' },
          { status: 404 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (webhookType !== undefined) updateData.webhookType = webhookType;
    if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl; // TODO: encrypt
    if (config !== undefined) updateData.config = JSON.stringify(config);
    if (eventTypes !== undefined) updateData.eventTypes = JSON.stringify(eventTypes);
    if (machineId !== undefined) updateData.machineId = machineId || null;
    if (enabled !== undefined) updateData.enabled = enabled;

    const webhook = await prisma.webhookConfig.update({
      where: { id },
      data: updateData,
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true
          }
        }
      }
    });

    // Return with masked URL
    const response = {
      ...webhook,
      webhookUrl: maskWebhookUrl(webhook.webhookUrl),
      config: webhook.config ? JSON.parse(webhook.config) : {},
      eventTypes: webhook.eventTypes ? JSON.parse(webhook.eventTypes) : []
    };

    return NextResponse.json({ webhook: response });
  } catch (error) {
    console.error('[PATCH /api/scheduler/webhooks/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scheduler/webhooks/[id]
 * Delete a webhook configuration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if webhook exists
    const existingWebhook = await prisma.webhookConfig.findUnique({
      where: { id }
    });

    if (!existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    await prisma.webhookConfig.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/scheduler/webhooks/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Mask webhook URL for security
 */
function maskWebhookUrl(url: string): string {
  if (url.length <= 20) {
    return '********';
  }
  return '********' + url.slice(-8);
}
