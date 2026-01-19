import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/recommendations/[id]
 * Get a single recommendation by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const recommendation = await prisma.recommendation.findUnique({
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

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const transformed = {
      ...recommendation,
      detectedPatterns: JSON.parse(recommendation.detectedPatterns),
      projectsAffected: JSON.parse(recommendation.projectsAffected),
      configTemplate: recommendation.configTemplate
        ? JSON.parse(recommendation.configTemplate)
        : null
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('[GET /api/recommendations/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recommendations/[id]
 * Dismiss a recommendation (soft delete - sets status to 'dismissed')
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check for optional dismiss reason in body
    let dismissReason: string | undefined;
    try {
      const body = await request.json();
      if (body.reason) {
        dismissReason = body.reason;
      }
    } catch {
      // No body provided, that's fine
    }

    const existing = await prisma.recommendation.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    // Update to dismissed status
    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissReason
      }
    });

    return NextResponse.json({
      success: true,
      recommendation: {
        id: updated.id,
        status: updated.status,
        dismissedAt: updated.dismissedAt,
        dismissReason: updated.dismissReason
      }
    });
  } catch (error) {
    console.error('[DELETE /api/recommendations/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/recommendations/[id]
 * Update recommendation fields (e.g., feedback after applying)
 */
const UpdateSchema = z.object({
  wasUseful: z.boolean().optional(),
  actualSavings: z.number().int().optional(),
  status: z.enum(['active', 'applied', 'dismissed', 'archived']).optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateSchema.parse(body);

    const existing = await prisma.recommendation.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        ...(validated.wasUseful !== undefined && { wasUseful: validated.wasUseful }),
        ...(validated.actualSavings !== undefined && { actualSavings: validated.actualSavings }),
        ...(validated.status !== undefined && { status: validated.status })
      }
    });

    return NextResponse.json({
      ...updated,
      detectedPatterns: JSON.parse(updated.detectedPatterns),
      projectsAffected: JSON.parse(updated.projectsAffected),
      configTemplate: updated.configTemplate ? JSON.parse(updated.configTemplate) : null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[PATCH /api/recommendations/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
