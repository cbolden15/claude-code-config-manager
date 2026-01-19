# Build Project

Build all packages and check for TypeScript errors.

## Arguments

`$ARGUMENTS` specifies what to build:
- (empty) - Build all packages
- `server` - Build server package only
- `cli` - Build CLI package only
- `shared` - Build shared package only
- `check` - TypeScript type-check only (no emit)

## Process

1. **Identify build target** from arguments
2. **Run the appropriate command**:

| Argument | Command |
|----------|---------|
| (empty) | `pnpm build` |
| `server` | `pnpm --filter server build` |
| `cli` | `pnpm --filter cli build` |
| `shared` | `pnpm --filter @ccm/shared build` |
| `check` | `pnpm -r exec tsc --noEmit` |

3. **Report any TypeScript errors** with file locations
4. **Confirm successful build** if no errors

## Examples

```
/build         # Build all packages
/build cli     # Build CLI only
/build check   # Type-check without building
```

## Build Order

The packages build in dependency order:
1. `@ccm/shared` (no dependencies)
2. `@ccm/test-utils` (depends on shared)
3. `server` (depends on shared)
4. `cli` (depends on shared)

## Common Issues

- **Missing types**: Run `pnpm --filter @ccm/shared build` first
- **Prisma client**: Run `pnpm --filter server prisma generate` if missing
