/**
 * GET /api/settings/permissions/export
 * Export permissions to Claude Code settings.local.json format
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ClaudeSettingsPermissions, PermissionCategory } from '@ccm/shared';
import { exportPermissions } from '@/lib/permissions';

/**
 * GET /api/settings/permissions/export
 *
 * Query params:
 * - enabled: true/false (optional) - Only export enabled/disabled permissions
 * - category: string (optional) - Only export permissions in this category
 *
 * Returns permissions in Claude settings format:
 * {
 *   "allow": ["Bash(git:*)", "WebFetch(domain:github.com)"],
 *   "deny": ["Bash(rm:*)", "Write(path:/etc/*)"]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters: {
      enabled?: boolean;
      category?: PermissionCategory;
    } = {};

    const enabledParam = searchParams.get('enabled');
    if (enabledParam !== null) {
      filters.enabled = enabledParam === 'true';
    }

    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      filters.category = categoryParam as PermissionCategory;
    }

    const result: ClaudeSettingsPermissions = await exportPermissions(filters);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error exporting permissions:', error);
    return NextResponse.json(
      { error: 'Failed to export permissions', details: error.message },
      { status: 500 }
    );
  }
}
