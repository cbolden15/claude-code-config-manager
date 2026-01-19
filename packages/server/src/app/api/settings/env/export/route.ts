/**
 * Environment Variables Export API Route
 *
 * GET /api/settings/env/export - Export environment variables in various formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportEnvVars, getEnvVarsForScope } from '@/lib/env';
import type { EnvVarFilters, EnvScope } from '@ccm/shared';

/**
 * GET /api/settings/env/export
 * Exports environment variables in key=value format
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: EnvVarFilters = {};

    if (searchParams.has('scope')) {
      filters.scope = searchParams.get('scope') as EnvScope;
    }
    if (searchParams.has('category')) {
      filters.category = searchParams.get('category') as any;
    }

    const decryptValues = searchParams.get('decrypt') === 'true';
    const format = searchParams.get('format') || 'json';

    // For scope-specific export
    if (searchParams.has('scope') && !searchParams.has('category')) {
      const scope = searchParams.get('scope') as EnvScope;
      const envVars = await getEnvVarsForScope(scope, decryptValues);

      if (format === 'dotenv') {
        // Return as .env format
        const dotenv = Object.entries(envVars)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');

        return new NextResponse(dotenv, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="env-${scope}.env"`,
          },
        });
      }

      return NextResponse.json({ envVars });
    }

    // General export with filters
    const envVars = await exportEnvVars(filters, decryptValues);

    if (format === 'dotenv') {
      // Return as .env format
      const dotenv = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      return new NextResponse(dotenv, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="exported-env.env"',
        },
      });
    }

    return NextResponse.json({ envVars });
  } catch (error) {
    console.error('Failed to export env vars:', error);
    return NextResponse.json(
      { error: 'Failed to export environment variables', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
