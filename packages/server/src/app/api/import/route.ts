import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const ImportSchema = z.object({
  version: z.string(),
  data: z.object({
    components: z.array(z.object({
      id: z.string(),
      type: z.string(),
      name: z.string(),
      description: z.string(),
      config: z.record(z.unknown()),
      sourceUrl: z.string().nullable().optional(),
      version: z.string().nullable().optional(),
      tags: z.string(),
      enabled: z.boolean(),
    })),
    profiles: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      claudeMdTemplate: z.string().nullable().optional(),
      componentIds: z.array(z.string()),
    })),
    settings: z.array(z.object({
      key: z.string(),
      value: z.unknown(),
    })).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ImportSchema.parse(body);

    const stats = {
      componentsImported: 0,
      profilesImported: 0,
      settingsImported: 0,
    };

    // Import in a transaction
    await prisma.$transaction(async (tx) => {
      // Import components
      for (const component of validated.data.components) {
        await tx.component.upsert({
          where: { type_name: { type: component.type, name: component.name } },
          update: {
            description: component.description,
            config: JSON.stringify(component.config),
            sourceUrl: component.sourceUrl ?? null,
            version: component.version ?? null,
            tags: component.tags,
            enabled: component.enabled,
          },
          create: {
            id: component.id,
            type: component.type,
            name: component.name,
            description: component.description,
            config: JSON.stringify(component.config),
            sourceUrl: component.sourceUrl ?? null,
            version: component.version ?? null,
            tags: component.tags,
            enabled: component.enabled,
          },
        });
        stats.componentsImported++;
      }

      // Import profiles
      for (const profile of validated.data.profiles) {
        // Create/update profile
        await tx.profile.upsert({
          where: { name: profile.name },
          update: {
            description: profile.description,
            claudeMdTemplate: profile.claudeMdTemplate ?? null,
          },
          create: {
            id: profile.id,
            name: profile.name,
            description: profile.description,
            claudeMdTemplate: profile.claudeMdTemplate ?? null,
          },
        });

        // Get the profile to ensure we have the correct ID
        const existingProfile = await tx.profile.findUnique({
          where: { name: profile.name },
        });

        if (existingProfile) {
          // Clear existing component associations
          await tx.profileComponent.deleteMany({
            where: { profileId: existingProfile.id },
          });

          // Create new associations
          for (let i = 0; i < profile.componentIds.length; i++) {
            // Find component by ID or by type_name
            const originalComponent = validated.data.components.find(
              (c) => c.id === profile.componentIds[i]
            );

            if (originalComponent) {
              const component = await tx.component.findUnique({
                where: {
                  type_name: {
                    type: originalComponent.type,
                    name: originalComponent.name,
                  },
                },
              });

              if (component) {
                await tx.profileComponent.create({
                  data: {
                    profileId: existingProfile.id,
                    componentId: component.id,
                    order: i,
                  },
                });
              }
            }
          }
        }

        stats.profilesImported++;
      }

      // Import settings
      if (validated.data.settings) {
        for (const setting of validated.data.settings) {
          await tx.setting.upsert({
            where: { key: setting.key },
            update: { value: JSON.stringify(setting.value) },
            create: {
              key: setting.key,
              value: JSON.stringify(setting.value),
            },
          });
          stats.settingsImported++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/import error:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}
