/**
 * GET /api/settings/permissions - List all permissions with stats
 * POST /api/settings/permissions - Create a new permission
 */

import { NextRequest, NextResponse } from 'next/server';
import type { PermissionsListResponse, GlobalPermissionCreate } from '@ccm/shared';
import { getPermissionsWithStats, createPermission } from '@/lib/permissions';

/**
 * GET /api/settings/permissions
 * Returns all permissions with statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Parse query parameters
    const filters: any = {};

    const action = searchParams.get('action');
    if (action === 'allow' || action === 'deny') {
      filters.action = action;
    }

    const category = searchParams.get('category');
    if (category) {
      filters.category = category;
    }

    const enabledParam = searchParams.get('enabled');
    if (enabledParam !== null) {
      filters.enabled = enabledParam === 'true';
    }

    const data = await getPermissionsWithStats(filters);
    const response: PermissionsListResponse = data;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions', details: error },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/permissions
 * Create a new permission
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.permission || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: permission, action' },
        { status: 400 }
      );
    }

    // Validate action
    if (body.action !== 'allow' && body.action !== 'deny') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "allow" or "deny"' },
        { status: 400 }
      );
    }

    const data: GlobalPermissionCreate = {
      permission: body.permission,
      action: body.action,
      description: body.description,
      enabled: body.enabled,
      category: body.category,
      priority: body.priority,
    };

    const permission = await createPermission(data);

    return NextResponse.json(permission, { status: 201 });
  } catch (error: any) {
    console.error('Error creating permission:', error);

    // Handle duplicate permission error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Permission with this combination already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create permission', details: error.message },
      { status: 500 }
    );
  }
}
