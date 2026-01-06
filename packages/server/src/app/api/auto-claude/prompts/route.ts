import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AutoClaudePromptSchema } from '../../../../../../shared/src/schemas/auto-claude';
import type { AutoClaudePrompt } from '../../../../../../shared/src/types/auto-claude';

/**
 * Schema for creating prompts
 */
const CreatePromptSchema = AutoClaudePromptSchema;

/**
 * Get all Auto-Claude prompts
 * Returns prompts with optional filtering by agent type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get('agentType');
    const includeContent = searchParams.get('includeContent') === 'true';

    const where: Record<string, unknown> = {
      type: 'AUTO_CLAUDE_PROMPT',
    };

    // Filter by specific agent type if provided
    if (agentType) {
      where.name = agentType;
    }

    const components = await prisma.component.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        config: includeContent, // Only include config (which contains prompt content) if requested
        enabled: true,
        tags: true,
        version: true,
        sourceUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Parse and validate configurations
    const prompts: Array<{
      id: string;
      agentType: string;
      description: string;
      config?: AutoClaudePrompt;
      enabled: boolean;
      tags: string | null;
      version: string | null;
      sourceUrl: string | null;
      createdAt: string;
      updatedAt: string;
      contentPreview?: string;
    }> = [];

    const errors: string[] = [];

    for (const component of components) {
      try {
        let config: AutoClaudePrompt | undefined;
        let contentPreview: string | undefined;

        if (includeContent && component.config) {
          config = JSON.parse(component.config);
          const validatedConfig = AutoClaudePromptSchema.parse(config);
          config = validatedConfig;
        } else if (component.config) {
          // Generate preview without including full content
          const tempConfig = JSON.parse(component.config);
          contentPreview = tempConfig.promptContent?.substring(0, 200) +
            (tempConfig.promptContent?.length > 200 ? '...' : '');
        }

        prompts.push({
          id: component.id,
          agentType: component.name,
          description: component.description,
          config: includeContent ? config : undefined,
          enabled: component.enabled,
          tags: component.tags,
          version: component.version,
          sourceUrl: component.sourceUrl,
          createdAt: component.createdAt.toISOString(),
          updatedAt: component.updatedAt.toISOString(),
          contentPreview: includeContent ? undefined : contentPreview,
        });
      } catch (error) {
        errors.push(`Invalid configuration for prompt ${component.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Collect unique agent types for filtering
    const agentTypes = [...new Set(prompts.map(p => p.agentType))].sort();

    // Analyze injection points if content is included
    const injectionStats = includeContent ?
      prompts.reduce((stats, prompt) => {
        if (prompt.config?.injectionPoints) {
          const points = prompt.config.injectionPoints;
          if (points.specDirectory) stats.specDirectory++;
          if (points.projectContext) stats.projectContext++;
          if (points.mcpDocumentation) stats.mcpDocumentation++;
        }
        return stats;
      }, { specDirectory: 0, projectContext: 0, mcpDocumentation: 0 }) :
      undefined;

    return NextResponse.json({
      prompts,
      stats: {
        total: prompts.length,
        enabled: prompts.filter(p => p.enabled).length,
        agentTypes: agentTypes.length,
        injectionStats,
      },
      agentTypes,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('GET /api/auto-claude/prompts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

/**
 * Create a new Auto-Claude prompt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreatePromptSchema.parse(body);

    // Check if prompt already exists for this agent type
    const existing = await prisma.component.findFirst({
      where: {
        type: 'AUTO_CLAUDE_PROMPT',
        name: validated.agentType,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Prompt for agent '${validated.agentType}' already exists` },
        { status: 409 }
      );
    }

    // Create new prompt
    const component = await prisma.component.create({
      data: {
        type: 'AUTO_CLAUDE_PROMPT',
        name: validated.agentType,
        description: `Auto-Claude prompt for ${validated.agentType} agent`,
        config: JSON.stringify(validated),
        enabled: true,
        tags: 'auto-claude,prompt',
      },
    });

    return NextResponse.json(
      {
        id: component.id,
        agentType: component.name,
        description: component.description,
        config: validated,
        enabled: component.enabled,
        tags: component.tags,
        version: component.version,
        sourceUrl: component.sourceUrl,
        createdAt: component.createdAt.toISOString(),
        updatedAt: component.updatedAt.toISOString(),
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

    console.error('POST /api/auto-claude/prompts error:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}