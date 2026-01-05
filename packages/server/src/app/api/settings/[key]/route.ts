import { NextRequest, NextResponse } from 'next/server';
import {
  getSetting,
  setSetting,
  deleteSetting,
  hasSetting
} from '@/lib/settings';
import { z } from 'zod';

const UpdateSettingValueSchema = z.object({
  value: z.string(),
});

type RouteParams = { params: Promise<{ key: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    const value = await getSetting(key);

    if (value === null) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      key,
      value
    });
  } catch (error) {
    console.error('GET /api/settings/[key] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setting' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = UpdateSettingValueSchema.parse(body);

    await setSetting(key, validated.value);

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully',
      key,
      value: validated.value
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('PUT /api/settings/[key] error:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    const exists = await hasSetting(key);
    if (!exists) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    const deleted = await deleteSetting(key);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Setting deleted successfully',
      key
    });
  } catch (error) {
    console.error('DELETE /api/settings/[key] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    );
  }
}