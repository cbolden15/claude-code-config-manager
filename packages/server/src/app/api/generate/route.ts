import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { generateProjectFiles, generateSummary } from '@/lib/generators';

const GenerateSchema = z.object({
  profileId: z.string(),
  projectName: z.string().min(1),
  projectDescription: z.string().optional(),
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
    const components = profile.components.map((pc) => ({
      type: pc.component.type,
      name: pc.component.name,
      config: JSON.parse(pc.component.config),
    }));

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
