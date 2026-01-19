# Database Operations

Run Prisma database operations for this project.

## Arguments

`$ARGUMENTS` specifies the operation:
- `push` - Push schema changes to database (no migration)
- `migrate` - Create and run a migration
- `seed` - Seed the database with initial data
- `studio` - Open Prisma Studio to browse data
- `generate` - Regenerate Prisma client
- `reset` - Reset database (drop all data, re-apply migrations, re-seed)

## Process

1. **Identify the operation** from arguments
2. **Run the appropriate command**:

| Operation | Command |
|-----------|---------|
| `push` | `pnpm --filter server db:push` |
| `migrate` | `pnpm --filter server db:migrate` |
| `seed` | `pnpm --filter server db:seed` |
| `studio` | `pnpm --filter server db:studio` |
| `generate` | `pnpm --filter server prisma generate` |
| `reset` | `pnpm --filter server prisma migrate reset` |

3. **Report results** and any errors

## Examples

```
/db push       # Push schema changes
/db migrate    # Create migration
/db seed       # Seed database
/db studio     # Open Prisma Studio
```

## Schema Location

The Prisma schema is at `packages/server/prisma/schema.prisma`.

## Environment

Requires `DATABASE_URL` in `packages/server/.env`.
