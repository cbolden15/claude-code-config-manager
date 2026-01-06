import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AutoClaudeModelProfileSchema } from '../../../../../../shared/src/schemas/auto-claude';
import type { AutoClaudeModelProfile } from '../../../../../../shared/src/types/auto-claude';

/**
 * Schema for creating model profiles
 */
const CreateModelProfileSchema = AutoClaudeModelProfileSchema;

/**
 * Get all Auto-Claude model profiles
 * Returns profiles with phase-by-phase configuration analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileName = searchParams.get('profileName');
    const includePhaseDetails = searchParams.get('includePhaseDetails') === 'true';

    const where: Record<string, unknown> = {
      type: 'AUTO_CLAUDE_MODEL_PROFILE',
    };

    // Filter by specific profile name if provided
    if (profileName) {
      where.name = profileName;
    }

    const components = await prisma.component.findMany({
      where,
      orderBy: { name: 'asc' },
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

    // Parse and validate configurations
    const modelProfiles: Array<{
      id: string;
      name: string;
      description: string;
      config: AutoClaudeModelProfile;
      enabled: boolean;
      tags: string | null;
      version: string | null;
      sourceUrl: string | null;
      createdAt: string;
      updatedAt: string;
      phaseAnalysis?: {
        modelDistribution: Record<string, number>;
        thinkingDistribution: Record<string, number>;
        costEstimate: string;
        qualityLevel: string;
      };
    }> = [];

    const errors: string[] = [];

    for (const component of components) {
      try {
        const config = JSON.parse(component.config);
        const validatedConfig = AutoClaudeModelProfileSchema.parse(config);

        // Analyze phase configuration
        let phaseAnalysis;
        if (includePhaseDetails) {
          const modelDistribution = Object.values(validatedConfig.phaseModels).reduce(
            (acc, model) => {
              acc[model] = (acc[model] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

          const thinkingDistribution = Object.values(validatedConfig.phaseThinking).reduce(
            (acc, level) => {
              acc[level] = (acc[level] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

          // Simple cost estimation (opus > sonnet > haiku)
          const costScore = Object.values(validatedConfig.phaseModels).reduce((score, model) => {
            return score + (model === 'opus' ? 3 : model === 'sonnet' ? 2 : 1);
          }, 0);

          const costEstimate = costScore >= 10 ? 'high' : costScore >= 7 ? 'medium' : 'low';

          // Quality estimation (based on model choices and thinking levels)
          const qualityScore = Object.values(validatedConfig.phaseModels).reduce((score, model) => {
            return score + (model === 'opus' ? 3 : model === 'sonnet' ? 2 : 1);
          }, 0) + Object.values(validatedConfig.phaseThinking).reduce((score, level) => {
            const thinkingScores = { none: 0, low: 1, medium: 2, high: 3, ultrathink: 4 };
            return score + thinkingScores[level];
          }, 0);

          const qualityLevel = qualityScore >= 18 ? 'premium' : qualityScore >= 12 ? 'high' : qualityScore >= 8 ? 'balanced' : 'basic';

          phaseAnalysis = {
            modelDistribution,
            thinkingDistribution,
            costEstimate,
            qualityLevel,
          };
        }

        modelProfiles.push({
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
          phaseAnalysis,
        });
      } catch (error) {
        errors.push(`Invalid configuration for model profile ${component.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Collect unique profile names for filtering
    const profileNames = [...new Set(modelProfiles.map(p => p.name))].sort();

    // Build phase configuration matrix for visualization
    const phaseMatrix: Record<string, {
      models: { spec: string; planning: string; coding: string; qa: string };
      thinking: { spec: string; planning: string; coding: string; qa: string };
    }> = {};

    // Collect all unique models and thinking levels
    const allModels = new Set<string>();
    const allThinkingLevels = new Set<string>();

    for (const { name, config } of modelProfiles) {
      phaseMatrix[name] = {
        models: config.phaseModels,
        thinking: config.phaseThinking,
      };

      Object.values(config.phaseModels).forEach(model => allModels.add(model));
      Object.values(config.phaseThinking).forEach(level => allThinkingLevels.add(level));
    }

    return NextResponse.json({
      modelProfiles,
      matrices: {
        phases: ['spec', 'planning', 'coding', 'qa'],
        profiles: profileNames,
        models: Array.from(allModels).sort(),
        thinkingLevels: Array.from(allThinkingLevels).sort(),
        matrix: phaseMatrix,
      },
      stats: {
        total: modelProfiles.length,
        enabled: modelProfiles.filter(p => p.enabled).length,
        uniqueModels: allModels.size,
        uniqueThinkingLevels: allThinkingLevels.size,
        phases: 4, // spec, planning, coding, qa
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('GET /api/auto-claude/model-profiles error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model profiles' },
      { status: 500 }
    );
  }
}

/**
 * Create a new Auto-Claude model profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateModelProfileSchema.parse(body);

    // Check if model profile already exists
    const existing = await prisma.component.findFirst({
      where: {
        type: 'AUTO_CLAUDE_MODEL_PROFILE',
        name: validated.name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Model profile '${validated.name}' already exists` },
        { status: 409 }
      );
    }

    // Create new model profile
    const component = await prisma.component.create({
      data: {
        type: 'AUTO_CLAUDE_MODEL_PROFILE',
        name: validated.name,
        description: validated.description,
        config: JSON.stringify(validated),
        enabled: true,
        tags: 'auto-claude,model-profile',
      },
    });

    return NextResponse.json(
      {
        id: component.id,
        name: component.name,
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

    console.error('POST /api/auto-claude/model-profiles error:', error);
    return NextResponse.json(
      { error: 'Failed to create model profile' },
      { status: 500 }
    );
  }
}