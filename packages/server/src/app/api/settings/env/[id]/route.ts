/**
 * Individual Environment Variable API Routes
 *
 * GET /api/settings/env/[id] - Get a single environment variable
 * PATCH /api/settings/env/[id] - Update an environment variable
 * DELETE /api/settings/env/[id] - Delete an environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnvVar, updateEnvVar, deleteEnvVar, maskEnvVar } from '@/lib/env';
import type { GlobalEnvVarUpdate } from '@ccm/shared';

/**
 * GET /api/settings/env/[id]
 * Gets a single environment variable by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeSensitive = searchParams.get('includeSensitive') === 'true';

    const envVar = await getEnvVar(params.id, includeSensitive);

    if (!envVar) {
      return NextResponse.json(
        { error: 'Environment variable not found' },
        { status: 404 }
      );
    }

    // Mask the value unless includeSensitive is true
    const response = includeSensitive ? envVar : maskEnvVar(envVar);

    return NextResponse.json({ envVar: response });
  } catch (error) {
    console.error('Failed to get env var:', error);
    return NextResponse.json(
      { error: 'Failed to get environment variable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/env/[id]
 * Updates an existing environment variable
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const data: GlobalEnvVarUpdate = {
      id: params.id,
      key: body.key,
      value: body.value,
      encrypted: body.encrypted,
      sensitive: body.sensitive,
      description: body.description,
      scope: body.scope,
      category: body.category,
    };

    const envVar = await updateEnvVar(data);

    return NextResponse.json({
      envVar: maskEnvVar(envVar),
      message: 'Environment variable updated successfully',
    });
  } catch (error) {
    console.error('Failed to update env var:', error);

    // Handle not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    // Handle duplicate key error
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update environment variable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/env/[id]
 * Deletes an environment variable
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteEnvVar(params.id);

    return NextResponse.json({
      message: 'Environment variable deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete env var:', error);

    // Handle not found error
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Environment variable not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete environment variable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
