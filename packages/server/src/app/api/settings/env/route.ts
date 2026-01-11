/**
 * Environment Variables API Routes
 *
 * GET /api/settings/env - List all environment variables (masked)
 * POST /api/settings/env - Create a new environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { listEnvVars, createEnvVar } from '@/lib/env';
import type { GlobalEnvVarCreate, EnvVarFilters } from '@ccm/shared';

/**
 * GET /api/settings/env
 * Lists all environment variables with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: EnvVarFilters = {};

    if (searchParams.has('scope')) {
      filters.scope = searchParams.get('scope') as any;
    }
    if (searchParams.has('category')) {
      filters.category = searchParams.get('category') as any;
    }
    if (searchParams.has('encrypted')) {
      filters.encrypted = searchParams.get('encrypted') === 'true';
    }
    if (searchParams.has('sensitive')) {
      filters.sensitive = searchParams.get('sensitive') === 'true';
    }

    const result = await listEnvVars(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to list env vars:', error);
    return NextResponse.json(
      { error: 'Failed to list environment variables', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/env
 * Creates a new environment variable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.key || typeof body.key !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: key' },
        { status: 400 }
      );
    }

    if (!body.value || typeof body.value !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: value' },
        { status: 400 }
      );
    }

    const data: GlobalEnvVarCreate = {
      key: body.key,
      value: body.value,
      encrypted: body.encrypted ?? false,
      sensitive: body.sensitive ?? false,
      description: body.description,
      scope: body.scope ?? 'all',
      category: body.category,
    };

    const envVar = await createEnvVar(data);

    return NextResponse.json(
      { envVar, message: 'Environment variable created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create env var:', error);

    // Handle duplicate key error
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create environment variable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
