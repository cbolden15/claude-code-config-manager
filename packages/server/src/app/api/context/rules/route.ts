import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/context/rules
 * List optimization rules
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const machineId = searchParams.get('machineId');
    const ruleType = searchParams.get('ruleType');
    const enabled = searchParams.get('enabled');
    const includeGlobal = searchParams.get('includeGlobal') !== 'false';

    // Build where clause
    const where: any = {};

    if (machineId) {
      if (includeGlobal) {
        // Include both machine-specific and global rules
        where.OR = [
          { machineId },
          { machineId: null }
        ];
      } else {
        where.machineId = machineId;
      }
    }

    if (ruleType) {
      where.ruleType = ruleType;
    }

    if (enabled !== null) {
      where.enabled = enabled === 'true';
    }

    const rules = await prisma.contextOptimizationRule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
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

    // Parse JSON action field
    const transformedRules = rules.map(rule => ({
      ...rule,
      action: JSON.parse(rule.action),
      isGlobal: rule.machineId === null
    }));

    // Calculate stats
    const stats = {
      total: rules.length,
      enabled: rules.filter(r => r.enabled).length,
      disabled: rules.filter(r => !r.enabled).length,
      global: rules.filter(r => r.machineId === null).length,
      machineSpecific: rules.filter(r => r.machineId !== null).length,
      byType: {
        archive: rules.filter(r => r.ruleType === 'archive').length,
        condense: rules.filter(r => r.ruleType === 'condense').length,
        remove: rules.filter(r => r.ruleType === 'remove').length,
        move: rules.filter(r => r.ruleType === 'move').length
      }
    };

    return NextResponse.json({
      rules: transformedRules,
      stats
    });
  } catch (error) {
    console.error('[GET /api/context/rules]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/context/rules
 * Create new rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      machineId,
      name,
      description,
      ruleType,
      sectionPattern,
      contentPattern,
      ageThreshold,
      lineThreshold,
      action,
      enabled = true,
      priority = 0
    } = body;

    // Validate required fields
    if (!name || !ruleType || !action) {
      return NextResponse.json(
        { error: 'name, ruleType, and action are required' },
        { status: 400 }
      );
    }

    // Validate ruleType
    const validRuleTypes = ['archive', 'condense', 'remove', 'move'];
    if (!validRuleTypes.includes(ruleType)) {
      return NextResponse.json(
        { error: `Invalid ruleType. Must be one of: ${validRuleTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate machine if provided
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

    // Validate regex patterns if provided
    if (sectionPattern) {
      try {
        new RegExp(sectionPattern);
      } catch {
        return NextResponse.json(
          { error: 'Invalid sectionPattern regex' },
          { status: 400 }
        );
      }
    }

    if (contentPattern) {
      try {
        new RegExp(contentPattern);
      } catch {
        return NextResponse.json(
          { error: 'Invalid contentPattern regex' },
          { status: 400 }
        );
      }
    }

    const rule = await prisma.contextOptimizationRule.create({
      data: {
        machineId: machineId || null,
        name,
        description: description || null,
        ruleType,
        sectionPattern: sectionPattern || null,
        contentPattern: contentPattern || null,
        ageThreshold: ageThreshold || null,
        lineThreshold: lineThreshold || null,
        action: JSON.stringify(action),
        enabled,
        priority
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

    return NextResponse.json({
      rule: {
        ...rule,
        action: JSON.parse(rule.action),
        isGlobal: rule.machineId === null
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/context/rules]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
