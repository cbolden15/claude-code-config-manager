import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/context/rules/[id]
 * Get rule by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const rule = await prisma.contextOptimizationRule.findUnique({
      where: { id },
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

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      rule: {
        ...rule,
        action: JSON.parse(rule.action),
        isGlobal: rule.machineId === null
      }
    });
  } catch (error) {
    console.error('[GET /api/context/rules/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/context/rules/[id]
 * Update rule
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingRule = await prisma.contextOptimizationRule.findUnique({
      where: { id }
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    const {
      name,
      description,
      ruleType,
      sectionPattern,
      contentPattern,
      ageThreshold,
      lineThreshold,
      action,
      enabled,
      priority
    } = body;

    // Validate ruleType if provided
    if (ruleType) {
      const validRuleTypes = ['archive', 'condense', 'remove', 'move'];
      if (!validRuleTypes.includes(ruleType)) {
        return NextResponse.json(
          { error: `Invalid ruleType. Must be one of: ${validRuleTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate regex patterns if provided
    if (sectionPattern !== undefined && sectionPattern !== null) {
      try {
        new RegExp(sectionPattern);
      } catch {
        return NextResponse.json(
          { error: 'Invalid sectionPattern regex' },
          { status: 400 }
        );
      }
    }

    if (contentPattern !== undefined && contentPattern !== null) {
      try {
        new RegExp(contentPattern);
      } catch {
        return NextResponse.json(
          { error: 'Invalid contentPattern regex' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (ruleType !== undefined) updateData.ruleType = ruleType;
    if (sectionPattern !== undefined) updateData.sectionPattern = sectionPattern;
    if (contentPattern !== undefined) updateData.contentPattern = contentPattern;
    if (ageThreshold !== undefined) updateData.ageThreshold = ageThreshold;
    if (lineThreshold !== undefined) updateData.lineThreshold = lineThreshold;
    if (action !== undefined) updateData.action = JSON.stringify(action);
    if (enabled !== undefined) updateData.enabled = enabled;
    if (priority !== undefined) updateData.priority = priority;

    const rule = await prisma.contextOptimizationRule.update({
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

    return NextResponse.json({
      rule: {
        ...rule,
        action: JSON.parse(rule.action),
        isGlobal: rule.machineId === null
      }
    });
  } catch (error) {
    console.error('[PATCH /api/context/rules/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/context/rules/[id]
 * Delete rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const rule = await prisma.contextOptimizationRule.findUnique({
      where: { id }
    });

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    await prisma.contextOptimizationRule.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    console.error('[DELETE /api/context/rules/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
