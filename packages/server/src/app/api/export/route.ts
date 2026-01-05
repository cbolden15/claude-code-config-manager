import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Fetch all data
    const [components, profiles, projects, monitoring, settings] = await Promise.all([
      prisma.component.findMany({
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      prisma.profile.findMany({
        include: {
          components: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.project.findMany({
        orderBy: [{ machine: 'asc' }, { name: 'asc' }],
      }),
      prisma.monitoringEntry.findMany({
        orderBy: { fetchedAt: 'desc' },
        take: 100, // Limit monitoring entries in export
      }),
      prisma.setting.findMany(),
    ]);

    // Parse JSON fields
    const parsedComponents = components.map((c) => ({
      ...c,
      config: JSON.parse(c.config),
    }));

    const parsedSettings = settings.map((s) => ({
      ...s,
      value: JSON.parse(s.value),
    }));

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        components: parsedComponents,
        profiles: profiles.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          claudeMdTemplate: p.claudeMdTemplate,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          componentIds: p.components.map((pc) => pc.componentId),
        })),
        projects,
        monitoring,
        settings: parsedSettings,
      },
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('GET /api/export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
