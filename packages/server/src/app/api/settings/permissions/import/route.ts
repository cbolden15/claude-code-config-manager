/**
 * POST /api/settings/permissions/import
 * Import permissions from Claude Code settings.local.json format
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ClaudeSettingsPermissions, PermissionsImportResult } from '@ccm/shared';
import { parseClaudePermissions } from '@/lib/permissions';

/**
 * POST /api/settings/permissions/import
 *
 * Body should contain permissions in Claude settings format:
 * {
 *   "allow": ["Bash(git:*)", "WebFetch(domain:github.com)"],
 *   "deny": ["Bash(rm:*)", "Write(path:/etc/*)"]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate body
    if (!body.allow && !body.deny) {
      return NextResponse.json(
        { error: 'Body must contain at least one of: allow, deny' },
        { status: 400 }
      );
    }

    // Validate arrays
    if (body.allow && !Array.isArray(body.allow)) {
      return NextResponse.json(
        { error: 'Field "allow" must be an array' },
        { status: 400 }
      );
    }

    if (body.deny && !Array.isArray(body.deny)) {
      return NextResponse.json(
        { error: 'Field "deny" must be an array' },
        { status: 400 }
      );
    }

    const settings: ClaudeSettingsPermissions = {
      allow: body.allow || [],
      deny: body.deny || [],
    };

    const result: PermissionsImportResult = await parseClaudePermissions(settings);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error importing permissions:', error);
    return NextResponse.json(
      { error: 'Failed to import permissions', details: error.message },
      { status: 500 }
    );
  }
}
