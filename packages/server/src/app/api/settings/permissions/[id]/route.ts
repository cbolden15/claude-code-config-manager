/**
 * GET /api/settings/permissions/[id] - Get a single permission
 * PUT /api/settings/permissions/[id] - Update a permission
 * DELETE /api/settings/permissions/[id] - Delete a permission
 */

import { NextRequest, NextResponse } from 'next/server';
import type { GlobalPermissionCreate } from '@ccm/shared';
import {
  getPermissionById,
  updatePermission,
  deletePermission,
} from '@/lib/permissions';

/**
 * GET /api/settings/permissions/[id]
 * Get a single permission by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permission = await getPermissionById(params.id);

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Error fetching permission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permission', details: error },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/permissions/[id]
 * Update a permission
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate action if provided
    if (body.action && body.action !== 'allow' && body.action !== 'deny') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "allow" or "deny"' },
        { status: 400 }
      );
    }

    const data: Partial<GlobalPermissionCreate> = {
      permission: body.permission,
      action: body.action,
      description: body.description,
      enabled: body.enabled,
      category: body.category,
      priority: body.priority,
    };

    const permission = await updatePermission(params.id, data);

    return NextResponse.json(permission);
  } catch (error: any) {
    console.error('Error updating permission:', error);

    // Handle not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Handle duplicate
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Permission with this combination already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update permission', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/permissions/[id]
 * Delete a permission
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deletePermission(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting permission:', error);

    // Handle not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete permission', details: error.message },
      { status: 500 }
    );
  }
}
