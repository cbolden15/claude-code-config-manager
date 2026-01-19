# Create API Route

Create a new Next.js API route following project patterns.

## Arguments

`$ARGUMENTS` describes the API route to create (e.g., "recommendations CRUD", "sessions tracking endpoint").

## Process

1. **Understand the requirement** from the description
2. **Determine route structure**:
   - Collection route: `packages/server/src/app/api/{resource}/route.ts`
   - Individual route: `packages/server/src/app/api/{resource}/[id]/route.ts`
   - Nested route: `packages/server/src/app/api/{parent}/{resource}/route.ts`

3. **Create the route file** following project patterns:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Implementation
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate with Zod if needed
    // Implementation
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

4. **Add types** to `packages/shared/src/types/` if needed
5. **Create tests** in `packages/server/__tests__/api/`

## Project Patterns

- Use `prisma` singleton from `@/lib/db`
- Return consistent error format: `{ error: string, details?: unknown }`
- Use proper HTTP status codes (200, 201, 400, 404, 409, 500)
- Handle Zod validation errors as 400
- Handle Prisma unique constraint errors as 409
- Log errors with `console.error`

## Examples

```
/api-route recommendations CRUD
/api-route sessions tracking endpoint
/api-route health scores calculation
```
