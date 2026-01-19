import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1),
  machine: z.string().min(1),
  profileId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machine = searchParams.get('machine');
    const profileId = searchParams.get('profileId');
    const includeAutoClaudeData = searchParams.get('includeAutoClaudeData') === 'true';

    const where: Record<string, unknown> = {};

    if (machine) {
      where.machine = machine;
    }

    if (profileId) {
      where.profileId = profileId;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        profile: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ machine: 'asc' }, { name: 'asc' }],
    });

    // If Auto-Claude data is requested, fetch the related components
    if (includeAutoClaudeData) {
      const projectsWithAutoClaudeData = await Promise.all(
        projects.map(async (project) => {
          let autoClaudeConfig = null;
          let modelProfile = null;

          // Fetch Auto-Claude project config
          if (project.autoClaudeConfigId) {
            try {
              const config = await prisma.component.findUnique({
                where: { id: project.autoClaudeConfigId },
                select: { id: true, name: true, config: true },
              });
              if (config) {
                autoClaudeConfig = {
                  ...config,
                  config: JSON.parse(config.config),
                };
              }
            } catch (err) {
              console.warn(`Failed to fetch Auto-Claude config for project ${project.id}:`, err);
            }
          }

          // Fetch model profile
          if (project.modelProfileId) {
            try {
              const profile = await prisma.component.findUnique({
                where: { id: project.modelProfileId },
                select: { id: true, name: true, description: true },
              });
              if (profile) {
                modelProfile = profile;
              }
            } catch (err) {
              console.warn(`Failed to fetch model profile for project ${project.id}:`, err);
            }
          }

          return {
            ...project,
            autoClaudeConfig,
            modelProfile,
          };
        })
      );

      return NextResponse.json({
        projects: projectsWithAutoClaudeData,
        total: projectsWithAutoClaudeData.length,
      });
    }

    return NextResponse.json({
      projects,
      total: projects.length,
    });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateProjectSchema.parse(body);

    // Verify profile exists if provided
    if (validated.profileId) {
      const profile = await prisma.profile.findUnique({
        where: { id: validated.profileId },
      });
      if (!profile) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        name: validated.name,
        path: validated.path,
        machine: validated.machine,
        profileId: validated.profileId ?? null,
      },
      include: {
        profile: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
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
        { error: 'Project with this path and machine already exists' },
        { status: 409 }
      );
    }

    console.error('POST /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
