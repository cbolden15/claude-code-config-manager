import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/scheduler/webhooks/[id]/test
 * Send a test notification to the webhook
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Find the webhook
    const webhook = await prisma.webhookConfig.findUnique({
      where: { id }
    });

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Create test payload based on webhook type
    const testPayload = createTestPayload(webhook.webhookType, webhook.name);

    try {
      // Send the test notification
      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CCM-Scheduler/1.0'
        },
        body: JSON.stringify(testPayload)
      });

      if (!response.ok) {
        // Update failure count
        await prisma.webhookConfig.update({
          where: { id },
          data: {
            failureCount: { increment: 1 }
          }
        });

        const errorText = await response.text().catch(() => 'Unknown error');
        return NextResponse.json({
          success: false,
          status: response.status,
          error: `Webhook returned ${response.status}: ${errorText.substring(0, 200)}`
        });
      }

      // Update last used timestamp and reset failure count
      await prisma.webhookConfig.update({
        where: { id },
        data: {
          lastUsedAt: new Date(),
          failureCount: 0
        }
      });

      return NextResponse.json({
        success: true,
        status: response.status,
        message: 'Test notification sent successfully'
      });
    } catch (fetchError) {
      // Network error
      await prisma.webhookConfig.update({
        where: { id },
        data: {
          failureCount: { increment: 1 }
        }
      });

      return NextResponse.json({
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Network error'
      });
    }
  } catch (error) {
    console.error('[POST /api/scheduler/webhooks/[id]/test]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create a test payload based on webhook type
 */
function createTestPayload(webhookType: string, webhookName: string): object {
  const timestamp = new Date().toISOString();

  switch (webhookType) {
    case 'slack':
      return {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🧪 CCM Test Notification'
            }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Webhook:*\n${webhookName}` },
              { type: 'mrkdwn', text: `*Status:*\nTest successful` },
              { type: 'mrkdwn', text: `*Time:*\n${timestamp}` },
              { type: 'mrkdwn', text: '*Source:*\nCCM Scheduler' }
            ]
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: 'This is a test notification from Claude Code Config Manager' }
            ]
          }
        ]
      };

    case 'discord':
      return {
        embeds: [{
          title: '🧪 CCM Test Notification',
          description: 'This is a test notification from Claude Code Config Manager',
          color: 5763719, // Green
          fields: [
            { name: 'Webhook', value: webhookName, inline: true },
            { name: 'Status', value: 'Test successful', inline: true }
          ],
          footer: { text: 'CCM Scheduler' },
          timestamp
        }]
      };

    case 'n8n':
      return {
        event: 'test_notification',
        timestamp,
        webhook: {
          id: 'test',
          name: webhookName
        },
        message: 'This is a test notification from CCM Scheduler',
        source: 'ccm-scheduler',
        test: true
      };

    case 'generic':
    default:
      return {
        event: 'test_notification',
        timestamp,
        webhook: {
          name: webhookName,
          type: webhookType
        },
        message: 'This is a test notification from Claude Code Config Manager Scheduler',
        source: 'ccm-scheduler',
        version: '3.2',
        test: true
      };
  }
}
