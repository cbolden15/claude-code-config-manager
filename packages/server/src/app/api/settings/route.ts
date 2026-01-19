import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSettings,
  setSetting,
  setSettings,
  deleteSettings,
  getSettingKeys
} from '@/lib/settings';
import { z } from 'zod';

const UpdateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const BatchUpdateSettingsSchema = z.record(z.string().min(1), z.string());

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeSensitive = searchParams.get('includeSensitive') === 'true';
    const keysOnly = searchParams.get('keysOnly') === 'true';
    const pattern = searchParams.get('pattern') || undefined;

    if (keysOnly) {
      const keys = await getSettingKeys(pattern);
      return NextResponse.json({ keys });
    }

    const settings = await getAllSettings(includeSensitive);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if it's a single setting or batch update
    if (body.key && body.value !== undefined) {
      // Single setting update
      const validated = UpdateSettingSchema.parse(body);
      await setSetting(validated.key, validated.value);

      return NextResponse.json({
        success: true,
        message: 'Setting updated successfully',
        key: validated.key
      });
    } else {
      // Batch settings update
      const validated = BatchUpdateSettingsSchema.parse(body);
      await setSettings(validated);

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully',
        count: Object.keys(validated).length
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('PUT /api/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.keys || !Array.isArray(body.keys)) {
      return NextResponse.json(
        { error: 'keys array is required' },
        { status: 400 }
      );
    }

    const deletedCount = await deleteSettings(body.keys);

    return NextResponse.json({
      success: true,
      message: 'Settings deleted successfully',
      deletedCount
    });
  } catch (error) {
    console.error('DELETE /api/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to delete settings' },
      { status: 500 }
    );
  }
}
