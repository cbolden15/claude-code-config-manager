import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { generateProjectFiles, generateSummary } from '@/lib/generators';

const GenerateSchema = z.object({
  profileId: z.string(),
  projectName: z.string().min(1),
  projectDescription: z.string().optional(),
  autoClaudeEnabled: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = GenerateSchema.parse(body);

    // Fetch profile with components
    const profile = await prisma.profile.findUnique({
      where: { id: validated.profileId },
      include: {
        components: {
          include: { component: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse component configs
    let components = profile.components.map((pc) => ({
      type: pc.component.type,
      name: pc.component.name,
      config: JSON.parse(pc.component.config),
    }));

    // If autoClaudeEnabled is true and no Auto-Claude components exist, add minimal defaults
    if (validated.autoClaudeEnabled) {
      const hasAutoClaudeComponents = components.some(c =>
        c.type.startsWith('AUTO_CLAUDE_')
      );

      if (!hasAutoClaudeComponents) {
        // Add minimal default Auto-Claude project config to trigger file generation
        components.push({
          type: 'AUTO_CLAUDE_PROJECT_CONFIG',
          name: 'default-config',
          config: {
            context7Enabled: true,
            linearMcpEnabled: false,
            electronMcpEnabled: false,
            puppeteerMcpEnabled: false,
            graphitiEnabled: false,
          },
        });

        // Add default model profile for balanced configuration
        components.push({
          type: 'AUTO_CLAUDE_MODEL_PROFILE',
          name: 'default-profile',
          config: {
            name: 'balanced',
            description: 'Default balanced configuration',
            phaseModels: {
              spec: 'sonnet',
              planning: 'sonnet',
              coding: 'sonnet',
              qa: 'sonnet',
            },
            phaseThinking: {
              spec: 'medium',
              planning: 'high',
              coding: 'medium',
              qa: 'high',
            },
          },
        });
      }
    }

    // Generate files
    const files = generateProjectFiles({
      projectName: validated.projectName,
      projectDescription: validated.projectDescription,
      claudeMdTemplate: profile.claudeMdTemplate,
      components,
    });

    // Generate summary
    const summary = generateSummary(components);

    return NextResponse.json({
      files,
      summary,
      profile: {
        id: profile.id,
        name: profile.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate files' },
      { status: 500 }
    );
  }
}
