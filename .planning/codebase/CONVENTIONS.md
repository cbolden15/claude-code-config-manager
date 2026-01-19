# Coding Conventions

**Analysis Date:** 2026-01-18

## Naming Patterns

**Files:**
- TypeScript source files: `kebab-case.ts` (e.g., `settings-env.ts`, `api-permissions.ts`)
- Test files: `*.test.ts` suffix (e.g., `orchestrator.test.ts`, `machines.test.ts`)
- Configuration files: `*.config.js` or `*.config.ts` (e.g., `jest.config.js`, `vitest.config.ts`)
- React components: `PascalCase.tsx` (e.g., `MachineCard.tsx`)

**Functions:**
- camelCase for all functions (e.g., `listEnvVars`, `createPermission`, `parseResponse`)
- Prefix async data functions with action verbs: `get`, `list`, `create`, `update`, `delete`, `export`, `import`
- Factory functions: `create{Entity}` (e.g., `createMachine`, `createEnvVar`)
- Parser/transformer functions: `parse{Thing}` or `mask{Thing}` (e.g., `parsePermission`, `maskValue`)

**Variables:**
- camelCase for all variables
- Boolean variables: prefix with `is`, `has`, `should`, `can` (e.g., `isCurrentMachine`, `hasValue`, `shouldEncrypt`)
- Constants: UPPER_SNAKE_CASE only for true constants (e.g., `ComponentType`)

**Types:**
- PascalCase for interfaces and type aliases (e.g., `GlobalEnvVar`, `Machine`, `SyncResult`)
- Suffix with purpose: `Create`, `Update`, `Response`, `Filters` (e.g., `GlobalEnvVarCreate`, `EnvVarListResponse`)
- Enums as const objects with type inference:
```typescript
export const ComponentType = {
  MCP_SERVER: 'MCP_SERVER',
  SUBAGENT: 'SUBAGENT',
} as const;
export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];
```

## Code Style

**Formatting:**
- No explicit Prettier/ESLint config files detected
- Next.js built-in linting via `next lint`
- 2-space indentation (inferred from source files)
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line arrays/objects

**Linting:**
- Next.js built-in ESLint configuration for server package
- No explicit ESLint config for CLI or shared packages
- TypeScript strict mode enabled globally via `tsconfig.base.json`

## Import Organization

**Order:**
1. Node built-ins (e.g., `import assert from 'node:assert'`)
2. External packages (e.g., `import { Command } from 'commander'`)
3. Internal packages with `@ccm/` prefix (e.g., `import type { GlobalEnvVar } from '@ccm/shared'`)
4. Relative imports with `.js` extension for ESM (e.g., `import { api } from '../lib/api.js'`)

**Path Aliases:**
- `@/` maps to `src/` in server package (configured in `jest.config.js`)
- `@ccm/shared` for shared types and schemas
- `@ccm/test-utils` for test utilities

**Pattern Example:**
```typescript
import { PrismaClient } from '@prisma/client';
import type { GlobalEnvVar, GlobalEnvVarCreate } from '@ccm/shared';
import { prisma } from './db';
import { encrypt, decrypt } from './encryption';
```

## Error Handling

**Patterns:**
- Wrap async operations in try/catch blocks
- Return error objects rather than throwing in API clients:
```typescript
interface ApiResponse<T> {
  data?: T;
  error?: string;
}
```
- Throw errors in business logic functions with descriptive messages:
```typescript
throw new Error(`Environment variable with key "${data.key}" already exists`);
```
- Use `instanceof Error` for type checking in catch blocks
- Console error for non-fatal logging: `console.error('Failed to decrypt:', error)`

**API Error Responses:**
- Return consistent error format: `{ error: string, details?: unknown }`
- Use appropriate HTTP status codes (400 for validation, 404 for not found, 409 for conflicts, 500 for server errors)
- Assert responses in route handlers with helper functions: `assertSuccess(response)`, `assertError(response, 404)`

## Logging

**Framework:** Console (`console.log`, `console.error`)

**Patterns:**
- CLI: Use `chalk` for colored output:
```typescript
console.log(chalk.green('Environment variable added successfully!'));
console.log(chalk.red('Failed to list environment variables:'), result.error);
```
- Server: Prisma logging configured based on environment:
```typescript
log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
```
- Test output: Emoji indicators for status (e.g., `console.log(' Test passed\n')`)

## Comments

**When to Comment:**
- File-level JSDoc for module purpose (every file has header comment)
- Function-level JSDoc for exported functions explaining purpose and examples
- Inline comments for non-obvious business logic

**JSDoc Pattern:**
```typescript
/**
 * Parse a permission string into its components
 *
 * Examples:
 * - "Bash(git:*)" -> { type: "Bash", pattern: "git:*", raw: "Bash(git:*)" }
 * - "WebFetch(domain:github.com)" -> { type: "WebFetch", pattern: "domain:github.com", raw: "..." }
 */
export function parsePermission(perm: string): ParsedPermission {
```

## Function Design

**Size:** Functions generally under 50 lines; larger functions split into helpers

**Parameters:**
- Use options objects for functions with 3+ optional parameters:
```typescript
async function listEnvVars(filters?: EnvVarFilters): Promise<EnvVarListResponse>
```
- Default parameter values specified inline or via nullish coalescing

**Return Values:**
- Explicit return types for all exported functions
- Async functions return `Promise<T>`
- CRUD operations return the created/updated entity
- List operations return `{ items: T[], stats: Stats }` pattern
- Delete operations return `void` or `{ success: boolean }`

## Module Design

**Exports:**
- Named exports preferred over default exports
- Export types separately with `export type` for type-only exports
- Re-export from index files for clean imports

**Barrel Files:**
- `packages/shared/src/types/index.ts` re-exports all types
- `packages/shared/src/schemas/index.ts` re-exports all schemas
- `packages/test-utils/src/index.ts` exports all utilities

**Package Structure:**
```
packages/{package}/
├── src/
│   ├── index.ts          # Main entry point and exports
│   ├── commands/         # CLI commands (cli package)
│   ├── lib/              # Business logic and utilities
│   ├── types/            # Type definitions (shared package)
│   └── schemas/          # Zod schemas (shared package)
```

## Type Definitions

**Location:**
- Shared types in `packages/shared/src/types/`
- Package-specific types co-located with implementation
- API response types defined alongside API client

**Patterns:**
- Use `type` for object shapes and unions
- Use `interface` for extendable contracts (rarely used in this codebase)
- Import types with `import type` when only used for type annotations
- Define separate `Create`, `Update`, and `Masked` variants:
```typescript
export interface GlobalEnvVar { ... }
export interface GlobalEnvVarCreate { ... }
export interface GlobalEnvVarUpdate { ... }
export interface GlobalEnvVarMasked extends Omit<GlobalEnvVar, 'value'> { ... }
```

## Validation

**Framework:** Zod for runtime validation (used in shared package)

**Patterns:**
- Define schemas in `packages/shared/src/schemas/`
- Use Zod schema inference for types:
```typescript
export type AutoClaudeAgentConfigSchemaType = z.infer<typeof AutoClaudeAgentConfigSchema>;
```
- Validate API request bodies before processing
- Return validation errors with 400 status code

## Database Conventions

**ORM:** Prisma

**Singleton Pattern:**
```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ ... });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Query Patterns:**
- Use `findMany` with `where` and `orderBy` for list operations
- Use `findUnique` with `where: { id }` for single item retrieval
- Handle date conversions from SQLite strings to Date objects:
```typescript
return { ...envVar, createdAt: new Date(envVar.createdAt), updatedAt: new Date(envVar.updatedAt) };
```

## CLI Conventions

**Framework:** Commander.js

**Command Structure:**
```typescript
export function createEnvCommand(): Command {
  const envCmd = new Command('env')
    .description('Manage global environment variables')
    .alias('environment');

  envCmd
    .command('list')
    .description('List all environment variables')
    .option('-s, --scope <scope>', 'Filter by scope')
    .action(async (options) => { ... });

  return envCmd;
}
```

**Output Patterns:**
- Use `chalk` for colored terminal output
- Display stats/summaries before detailed lists
- Group items by category when displaying
- Show helpful messages for empty states:
```typescript
console.log(chalk.gray('No environment variables configured.'));
console.log(`Run ${chalk.cyan('ccm env add')} to create one.`);
```

---

*Convention analysis: 2026-01-18*
