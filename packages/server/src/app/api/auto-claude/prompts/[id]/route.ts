import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AutoClaudePromptSchema } from '../../../../../../../shared/src/schemas/auto-claude';
import type { AutoClaudePrompt } from '../../../../../../../shared/src/types/auto-claude';

/**
 * Schema for updating prompts (partial updates allowed)
 */
const UpdatePromptSchema = z.object({
  promptContent: z.string()
    .min(10, 'Prompt content must be at least 10 characters')
    .max(50000, 'Prompt content cannot exceed 50,000 characters')
    .optional(),
  injectionPoints: z.object({
    specDirectory: z.boolean().default(false),
    projectContext: z.boolean().default(false),
    mcpDocumentation: z.boolean().default(false),
  }).optional(),
}).refine((data) => {
  // At least one field must be provided for update
  return data.promptContent !== undefined || data.injectionPoints !== undefined;
}, {
  message: 'At least one field must be provided for update',
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Get a specific Auto-Claude prompt
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate ID format (CUID)
    if (!/^[a-z0-9]+$/i.test(id)) {
      return NextResponse.json(
        { error: 'Invalid prompt ID format' },
        { status: 400 }
      );
    }

    const component = await prisma.component.findFirst({
      where: {
        id,
        type: 'AUTO_CLAUDE_PROMPT',
      },
      select: {
        id: true,
        name: true,
        description: true,
        config: true,
        enabled: true,
        tags: true,
        version: true,
        sourceUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: `Prompt with ID '${id}' not found` },
        { status: 404 }
      );
    }

    try {
      const config = JSON.parse(component.config);
      const validatedConfig = AutoClaudePromptSchema.parse(config);

      // Count injection points used
      const injectionPointsUsed = validatedConfig.injectionPoints ?
        Object.values(validatedConfig.injectionPoints).filter(Boolean).length :
        0;

      // Analyze markdown content
      const contentStats = {
        length: validatedConfig.promptContent.length,
        lines: validatedConfig.promptContent.split('\n').length,
        words: validatedConfig.promptContent.split(/\s+/).filter(word => word.length > 0).length,
        hasHeaders: /^#+\s/.test(validatedConfig.promptContent),
        hasCodeBlocks: /```/.test(validatedConfig.promptContent),
        hasInjectionPoints: /\{\{[^}]+\}\}/.test(validatedConfig.promptContent),
      };

      return NextResponse.json({
        id: component.id,
        agentType: component.name,
        description: component.description,
        config: validatedConfig,
        enabled: component.enabled,
        tags: component.tags,
        version: component.version,
        sourceUrl: component.sourceUrl,
        createdAt: component.createdAt.toISOString(),
        updatedAt: component.updatedAt.toISOString(),
        stats: {
          injectionPointsUsed,
          content: contentStats,
        },
      });
    } catch (configError) {
      console.error(`Invalid config for prompt ${id}:`, configError);
      return NextResponse.json(
        { error: 'Invalid prompt configuration stored in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('GET /api/auto-claude/prompts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}

/**
 * Update a specific Auto-Claude prompt
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate ID format (CUID)
    if (!/^[a-z0-9]+$/i.test(id)) {
      return NextResponse.json(
        { error: 'Invalid prompt ID format' },
        { status: 400 }
      );
    }

    // Validate request body
    const validated = UpdatePromptSchema.parse(body);

    // Find existing prompt
    const existing = await prisma.component.findFirst({
      where: {
        id,
        type: 'AUTO_CLAUDE_PROMPT',
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Prompt with ID '${id}' not found` },
        { status: 404 }
      );
    }

    // Parse existing configuration
    let existingConfig: AutoClaudePrompt;
    try {
      existingConfig = JSON.parse(existing.config);
    } catch (error) {
      console.error(`Failed to parse existing config for prompt ${id}:`, error);
      return NextResponse.json(
        { error: 'Invalid existing configuration' },
        { status: 500 }
      );
    }

    // Merge with updates
    const updatedConfig: AutoClaudePrompt = {
      agentType: existingConfig.agentType, // Agent type cannot be changed
      promptContent: validated.promptContent ?? existingConfig.promptContent,
      injectionPoints: validated.injectionPoints ?? existingConfig.injectionPoints,
    };

    // Validate the complete merged configuration
    const finalValidated = AutoClaudePromptSchema.parse(updatedConfig);

    // Update in database
    const component = await prisma.component.update({
      where: { id: existing.id },
      data: {
        config: JSON.stringify(finalValidated),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: component.id,
      agentType: component.name,
      description: component.description,
      config: finalValidated,
      enabled: component.enabled,
      tags: component.tags,
      version: component.version,
      sourceUrl: component.sourceUrl,
      createdAt: component.createdAt.toISOString(),
      updatedAt: component.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('PUT /api/auto-claude/prompts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

/**
 * Delete a specific Auto-Claude prompt
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate ID format (CUID)
    if (!/^[a-z0-9]+$/i.test(id)) {
      return NextResponse.json(
        { error: 'Invalid prompt ID format' },
        { status: 400 }
      );
    }

    const existing = await prisma.component.findFirst({
      where: {
        id,
        type: 'AUTO_CLAUDE_PROMPT',
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Prompt with ID '${id}' not found` },
        { status: 404 }
      );
    }

    await prisma.component.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: `Prompt for agent '${existing.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('DELETE /api/auto-claude/prompts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}