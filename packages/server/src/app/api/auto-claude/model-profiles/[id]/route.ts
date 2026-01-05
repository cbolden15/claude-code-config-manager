import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AutoClaudeModelProfileSchema, ClaudeModelSchema, ThinkingLevelSchema } from '../../../../../../../shared/src/schemas/auto-claude';
import type { AutoClaudeModelProfile } from '../../../../../../../shared/src/types/auto-claude';

/**
 * Schema for updating model profiles (partial updates allowed)
 */
const UpdateModelProfileSchema = z.object({
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  phaseModels: z.object({
    spec: ClaudeModelSchema.optional(),
    planning: ClaudeModelSchema.optional(),
    coding: ClaudeModelSchema.optional(),
    qa: ClaudeModelSchema.optional(),
  }).optional(),
  phaseThinking: z.object({
    spec: ThinkingLevelSchema.optional(),
    planning: ThinkingLevelSchema.optional(),
    coding: ThinkingLevelSchema.optional(),
    qa: ThinkingLevelSchema.optional(),
  }).optional(),
}).refine((data) => {
  // At least one field must be provided for update
  return data.description !== undefined ||
         data.phaseModels !== undefined ||
         data.phaseThinking !== undefined;
}, {
  message: 'At least one field must be provided for update',
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Get a specific Auto-Claude model profile
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate ID format (CUID)
    if (!/^[a-z0-9]+$/i.test(id)) {
      return NextResponse.json(
        { error: 'Invalid model profile ID format' },
        { status: 400 }
      );
    }

    const component = await prisma.component.findFirst({
      where: {
        id,
        type: 'AUTO_CLAUDE_MODEL_PROFILE',
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
        { error: `Model profile with ID '${id}' not found` },
        { status: 404 }
      );
    }

    try {
      const config = JSON.parse(component.config);
      const validatedConfig = AutoClaudeModelProfileSchema.parse(config);

      // Detailed phase analysis
      const phaseAnalysis = {
        models: {
          distribution: Object.values(validatedConfig.phaseModels).reduce(
            (acc, model) => {
              acc[model] = (acc[model] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          phases: validatedConfig.phaseModels,
        },
        thinking: {
          distribution: Object.values(validatedConfig.phaseThinking).reduce(
            (acc, level) => {
              acc[level] = (acc[level] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          phases: validatedConfig.phaseThinking,
        },
        cost: {
          // Cost analysis per phase (opus=3, sonnet=2, haiku=1)
          perPhase: Object.entries(validatedConfig.phaseModels).reduce(
            (acc, [phase, model]) => {
              acc[phase] = model === 'opus' ? 3 : model === 'sonnet' ? 2 : 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          total: Object.values(validatedConfig.phaseModels).reduce((score, model) => {
            return score + (model === 'opus' ? 3 : model === 'sonnet' ? 2 : 1);
          }, 0),
        },
        quality: {
          // Quality score based on model + thinking level
          perPhase: Object.entries(validatedConfig.phaseModels).reduce(
            (acc, [phase, model]) => {
              const modelScore = model === 'opus' ? 3 : model === 'sonnet' ? 2 : 1;
              const thinkingScore = (() => {
                const level = validatedConfig.phaseThinking[phase as keyof typeof validatedConfig.phaseThinking];
                const scores = { none: 0, low: 1, medium: 2, high: 3, ultrathink: 4 };
                return scores[level];
              })();
              acc[phase] = modelScore + thinkingScore;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
      };

      // Overall profile characteristics
      const costEstimate = phaseAnalysis.cost.total >= 10 ? 'high' :
                          phaseAnalysis.cost.total >= 7 ? 'medium' : 'low';

      const qualityLevel = Object.values(phaseAnalysis.quality.perPhase).reduce((sum, score) => sum + score, 0) >= 18 ? 'premium' :
                          Object.values(phaseAnalysis.quality.perPhase).reduce((sum, score) => sum + score, 0) >= 12 ? 'high' :
                          Object.values(phaseAnalysis.quality.perPhase).reduce((sum, score) => sum + score, 0) >= 8 ? 'balanced' : 'basic';

      return NextResponse.json({
        id: component.id,
        name: component.name,
        description: component.description,
        config: validatedConfig,
        enabled: component.enabled,
        tags: component.tags,
        version: component.version,
        sourceUrl: component.sourceUrl,
        createdAt: component.createdAt.toISOString(),
        updatedAt: component.updatedAt.toISOString(),
        analysis: {
          ...phaseAnalysis,
          characteristics: {
            costEstimate,
            qualityLevel,
            totalPhases: 4,
            uniformModels: Object.values(validatedConfig.phaseModels).every(model =>
              model === Object.values(validatedConfig.phaseModels)[0]
            ),
            uniformThinking: Object.values(validatedConfig.phaseThinking).every(level =>
              level === Object.values(validatedConfig.phaseThinking)[0]
            ),
          },
        },
      });
    } catch (configError) {
      console.error(`Invalid config for model profile ${id}:`, configError);
      return NextResponse.json(
        { error: 'Invalid model profile configuration stored in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('GET /api/auto-claude/model-profiles/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model profile' },
      { status: 500 }
    );
  }
}

/**
 * Update a specific Auto-Claude model profile
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate ID format (CUID)
    if (!/^[a-z0-9]+$/i.test(id)) {
      return NextResponse.json(
        { error: 'Invalid model profile ID format' },
        { status: 400 }
      );
    }

    // Validate request body
    const validated = UpdateModelProfileSchema.parse(body);

    // Find existing model profile
    const existing = await prisma.component.findFirst({
      where: {
        id,
        type: 'AUTO_CLAUDE_MODEL_PROFILE',
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Model profile with ID '${id}' not found` },
        { status: 404 }
      );
    }

    // Parse existing configuration
    let existingConfig: AutoClaudeModelProfile;
    try {
      existingConfig = JSON.parse(existing.config);
    } catch (error) {
      console.error(`Failed to parse existing config for model profile ${id}:`, error);
      return NextResponse.json(
        { error: 'Invalid existing configuration' },
        { status: 500 }
      );
    }

    // Merge with updates
    const updatedConfig: AutoClaudeModelProfile = {
      name: existingConfig.name, // Name cannot be changed
      description: validated.description ?? existingConfig.description,
      phaseModels: {
        spec: validated.phaseModels?.spec ?? existingConfig.phaseModels.spec,
        planning: validated.phaseModels?.planning ?? existingConfig.phaseModels.planning,
        coding: validated.phaseModels?.coding ?? existingConfig.phaseModels.coding,
        qa: validated.phaseModels?.qa ?? existingConfig.phaseModels.qa,
      },
      phaseThinking: {
        spec: validated.phaseThinking?.spec ?? existingConfig.phaseThinking.spec,
        planning: validated.phaseThinking?.planning ?? existingConfig.phaseThinking.planning,
        coding: validated.phaseThinking?.coding ?? existingConfig.phaseThinking.coding,
        qa: validated.phaseThinking?.qa ?? existingConfig.phaseThinking.qa,
      },
    };

    // Validate the complete merged configuration
    const finalValidated = AutoClaudeModelProfileSchema.parse(updatedConfig);

    // Update in database
    const component = await prisma.component.update({
      where: { id: existing.id },
      data: {
        description: finalValidated.description,
        config: JSON.stringify(finalValidated),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: component.id,
      name: component.name,
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

    console.error('PUT /api/auto-claude/model-profiles/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update model profile' },
      { status: 500 }
    );
  }
}

/**
 * Delete a specific Auto-Claude model profile
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate ID format (CUID)
    if (!/^[a-z0-9]+$/i.test(id)) {
      return NextResponse.json(
        { error: 'Invalid model profile ID format' },
        { status: 400 }
      );
    }

    const existing = await prisma.component.findFirst({
      where: {
        id,
        type: 'AUTO_CLAUDE_MODEL_PROFILE',
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Model profile with ID '${id}' not found` },
        { status: 404 }
      );
    }

    // Check if profile is being used by any projects
    const projectsUsingProfile = await prisma.project.count({
      where: {
        modelProfileId: id,
      },
    });

    if (projectsUsingProfile > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete model profile '${existing.name}' as it is being used by ${projectsUsingProfile} project(s)`,
          details: {
            projectsCount: projectsUsingProfile,
            suggestion: 'Remove the profile from all projects before deleting it.'
          }
        },
        { status: 409 }
      );
    }

    await prisma.component.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: `Model profile '${existing.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('DELETE /api/auto-claude/model-profiles/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete model profile' },
      { status: 500 }
    );
  }
}