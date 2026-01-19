import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/scheduler/webhooks
 * List all webhook configurations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');
    const webhookType = searchParams.get('webhookType');
    const enabled = searchParams.get('enabled');

    const where: Record<string, unknown> = {};

    if (machineId) {
      where.machineId = machineId;
    }

    if (webhookType) {
      const validTypes = ['slack', 'discord', 'generic', 'n8n'];
      if (!validTypes.includes(webhookType)) {
        return NextResponse.json(
          { error: `webhookType must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
      where.webhookType = webhookType;
    }

    if (enabled !== null && enabled !== undefined) {
      where.enabled = enabled === 'true';
    }

    const webhooks = await prisma.webhookConfig.findMany({
      where,
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            hostname: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mask webhook URLs for security (show only last 8 chars)
    const maskedWebhooks = webhooks.map(webhook => ({
      ...webhook,
      webhookUrl: maskWebhookUrl(webhook.webhookUrl),
      config: webhook.config ? JSON.parse(webhook.config) : {},
      eventTypes: webhook.eventTypes ? JSON.parse(webhook.eventTypes) : []
    }));

    return NextResponse.json({ webhooks: maskedWebhooks });
  } catch (error) {
    console.error('[GET /api/scheduler/webhooks]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheduler/webhooks
 * Create a new webhook configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required and must be a string' },
        { status: 400 }
      );
    }

    const validTypes = ['slack', 'discord', 'generic', 'n8n'];
    if (!webhookType || !validTypes.includes(webhookType)) {
      return NextResponse.json(
        { error: `webhookType must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return NextResponse.json(
        { error: 'webhookUrl is required and must be a string' },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json(
        { error: 'webhookUrl must be a valid URL' },
        { status: 400 }
      );
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
          { error: `Invalid event types: ${invalidEvents.join(', ')}. Valid types: ${validEventTypes.join(', ')}` },
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

    // TODO: Encrypt webhookUrl using the encryption library
    // For now, store as-is (Terminal 2 will add encryption)

    const webhook = await prisma.webhookConfig.create({
      data: {
        name,
        description: description || null,
        webhookType,
        webhookUrl, // Should be encrypted
        config: config ? JSON.stringify(config) : '{}',
        eventTypes: eventTypes ? JSON.stringify(eventTypes) : '["task_completed", "task_failed"]',
        machineId: machineId || null,
        enabled: enabled ?? true
      },
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

    return NextResponse.json({ webhook: response }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/scheduler/webhooks]', error);
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
