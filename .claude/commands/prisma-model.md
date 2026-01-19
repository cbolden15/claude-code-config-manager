# Add Prisma Model

Add a new model to the Prisma schema and generate related code.

## Arguments

`$ARGUMENTS` describes the model to create (e.g., "SessionActivity for tracking Claude Code sessions").

## Process

1. **Read the current schema** at `packages/server/prisma/schema.prisma`
2. **Design the model** based on requirements:
   - Use appropriate field types
   - Add relations to existing models (e.g., Machine)
   - Include timestamps (`createdAt`, `updatedAt`)
   - Add indexes for frequently queried fields
   - Use `@id @default(cuid())` for primary keys

3. **Add the model** to schema.prisma following project conventions:

```prisma
model ModelName {
  id        String   @id @default(cuid())

  // Fields
  name      String
  config    String   // JSON stored as TEXT

  // Relations
  machineId String
  machine   Machine  @relation(fields: [machineId], references: [id])

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Indexes
  @@index([machineId])
  @@index([createdAt])
}
```

4. **Update related models** if needed (add reverse relations)

5. **Run Prisma commands**:
   ```bash
   pnpm --filter server db:push    # For development
   # OR
   pnpm --filter server db:migrate # For production migration
   ```

6. **Generate Prisma client**: `pnpm --filter server prisma generate`

## Project Conventions

- Use `cuid()` for IDs
- Store JSON as `String` type with JSON.stringify/parse
- Add `@@index` for foreign keys and frequently filtered fields
- Use `@updatedAt` for automatic timestamp updates
- Add relations to Machine model for multi-machine support

## v3.0 Models Reference

The v3 plan adds these models (see `CCM-V3-UNIFIED-PLAN.md`):
- `SessionActivity` - Tracks Claude Code sessions
- `UsagePattern` - Aggregated usage patterns
- `Recommendation` - Smart suggestions
- `HealthScore` - Optimization metrics
- `ImpactMetric` - Measures results
- `TechnologyUsage` - Tech stack tracking

## Examples

```
/prisma-model SessionActivity for tracking Claude Code sessions
/prisma-model Recommendation for smart MCP/skill suggestions
/prisma-model HealthScore for optimization metrics
```
