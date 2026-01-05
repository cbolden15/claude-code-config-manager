import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const ComponentType = z.enum([
  'MCP_SERVER',
  'SUBAGENT',
  'SKILL',
  'COMMAND',
  'HOOK',
  'CLAUDE_MD_TEMPLATE',
]);

const CreateComponentSchema = z.object({
  type: ComponentType,
  name: z.string().min(1).max(100),
  description: z.string(),
  config: z.record(z.unknown()),
  sourceUrl: z.string().url().optional().nullable(),
  version: z.string().optional().nullable(),
  tags: z.string().default(''),
  enabled: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');

    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim());
      where.AND = tagList.map((tag) => ({
        tags: { contains: tag },
      }));
    }

    const components = await prisma.component.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    // Parse config JSON for each component
    const parsed = components.map((c) => ({
      ...c,
      config: JSON.parse(c.config),
    }));

    return NextResponse.json({
      components: parsed,
      total: parsed.length,
    });
  } catch (error) {
    console.error('GET /api/components error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateComponentSchema.parse(body);

    const component = await prisma.component.create({
      data: {
        type: validated.type,
        name: validated.name,
        description: validated.description,
        config: JSON.stringify(validated.config),
        sourceUrl: validated.sourceUrl ?? null,
        version: validated.version ?? null,
        tags: validated.tags,
        enabled: validated.enabled,
      },
    });

    return NextResponse.json(
      {
        ...component,
        config: JSON.parse(component.config),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Component with this type and name already exists' },
        { status: 409 }
      );
    }

    console.error('POST /api/components error:', error);
    return NextResponse.json(
      { error: 'Failed to create component' },
      { status: 500 }
    );
  }
}
