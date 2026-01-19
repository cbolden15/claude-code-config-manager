# Architecture

**Analysis Date:** 2026-01-18

## Pattern Overview

**Overall:** Monorepo with CLI + Server Architecture

**Key Characteristics:**
- pnpm workspace monorepo with 4 packages (server, cli, shared, test-utils)
- Server-side rendering with Next.js 14 App Router
- CLI communicates with server via REST API over HTTP
- Shared types/schemas package for cross-package consistency
- SQLite database with Prisma ORM

## Layers

**Presentation Layer (Web UI):**
- Purpose: Renders web dashboard and management interface
- Location: `packages/server/src/app/`
- Contains: Next.js pages, React components, layouts
- Depends on: API routes (internal), Prisma (direct for SSR)
- Used by: End users via web browser

**API Layer:**
- Purpose: REST API endpoints for CLI and internal use
- Location: `packages/server/src/app/api/`
- Contains: Route handlers (route.ts files)
- Depends on: Business logic layer, Prisma
- Used by: CLI, Web UI fetch calls

**Business Logic Layer:**
- Purpose: Core application logic, validation, transformations
- Location: `packages/server/src/lib/`
- Contains: Domain services (env.ts, hooks.ts, permissions.ts), sync orchestrator, generators
- Depends on: Database layer, shared types
- Used by: API routes, Web UI server components

**Data Access Layer:**
- Purpose: Database operations via Prisma ORM
- Location: `packages/server/src/lib/db.ts`
- Contains: Prisma client singleton
- Depends on: Prisma schema
- Used by: All server-side code

**CLI Layer:**
- Purpose: Command-line interface for local operations
- Location: `packages/cli/src/`
- Contains: Commands, API client, file utilities
- Depends on: Server API (remote), local filesystem
- Used by: Developers from terminal

**Shared Types Layer:**
- Purpose: Type definitions and Zod schemas shared across packages
- Location: `packages/shared/src/`
- Contains: TypeScript types, Zod validation schemas
- Depends on: Nothing (leaf package)
- Used by: Server, CLI

## Data Flow

**Project Initialization (ccm init):**

1. User runs `ccm init my-project --profile blockchain` in terminal
2. CLI loads config (server URL, machine name) from `~/.ccm/config.json`
3. CLI calls `POST /api/generate` with profile name and project info
4. Server fetches profile with components from database
5. Server runs generators to produce file contents
6. Server returns `{ files: [{ path, content }], summary }` to CLI
7. CLI writes files to local filesystem (.claude/, .mcp.json, etc.)
8. CLI calls `POST /api/projects` to register project with server

**Configuration Sync (ccm sync):**

1. CLI calls `POST /api/projects/{id}/sync` with machine ID
2. Server runs sync orchestrator with machine overrides
3. Orchestrator fetches project, profile, components, global settings
4. Orchestrator applies machine-specific overrides
5. Orchestrator generates files through generators
6. Server returns generated file contents
7. CLI writes files to local project directory

**State Management:**
- Server-side: Prisma models stored in SQLite
- Client-side (Web UI): Server Components (no client state for data)
- CLI: Config file at `~/.ccm/config.json`

## Key Abstractions

**Component:**
- Purpose: Reusable configuration element (MCP server, subagent, skill, command, hook)
- Examples: `packages/server/prisma/schema.prisma` (Component model)
- Pattern: Generic storage with JSON config field, type discriminator

**Profile:**
- Purpose: Bundle of components representing a project archetype
- Examples: `packages/server/prisma/schema.prisma` (Profile model)
- Pattern: Many-to-many with Component through ProfileComponent

**Generator:**
- Purpose: Transform component configs into file contents
- Examples: `packages/server/src/lib/generators/claude-md.ts`, `packages/server/src/lib/generators/mcp-json.ts`
- Pattern: Function per file type, orchestrated by index.ts

**Machine Override:**
- Purpose: Machine-specific config variations (include/exclude/modify)
- Examples: `packages/server/src/lib/sync/overrides.ts`
- Pattern: Applied during sync to customize per-machine output

**Sync Orchestrator:**
- Purpose: Coordinate full sync process with overrides
- Examples: `packages/server/src/lib/sync/orchestrator.ts`
- Pattern: Transaction-like process with logging and rollback

## Entry Points

**Server Entry:**
- Location: `packages/server/src/app/layout.tsx`
- Triggers: HTTP requests, Next.js dev server
- Responsibilities: Render root layout, initialize app

**API Routes:**
- Location: `packages/server/src/app/api/*/route.ts`
- Triggers: HTTP requests to /api/*
- Responsibilities: Handle CRUD operations, validation, response formatting

**CLI Entry:**
- Location: `packages/cli/src/index.ts`
- Triggers: `ccm` command execution
- Responsibilities: Parse args, dispatch to command handlers

**Web Pages:**
- Location: `packages/server/src/app/*/page.tsx`
- Triggers: Browser navigation
- Responsibilities: Render server components, fetch data

## Error Handling

**Strategy:** Try-catch with structured error responses

**Patterns:**
- API routes return `{ error: string, details?: unknown }` with appropriate HTTP status
- Zod validation errors caught and returned as 400 with details
- Prisma unique constraint errors caught and returned as 409
- CLI catches errors and displays with chalk.red()
- Sync orchestrator logs errors to SyncLog table

## Cross-Cutting Concerns

**Logging:**
- Server: Prisma query logging in development, console.error for failures
- CLI: Console output with chalk colors
- Sync: SyncLog table with status, errors, timestamps

**Validation:**
- Zod schemas in shared package and inline in API routes
- Prisma schema for database constraints
- Runtime validation at API boundary

**Authentication:**
- None - relies on network-level trust (local network/Tailscale)
- No user accounts or sessions

**Encryption:**
- AES-256-GCM for sensitive environment variables
- Key stored in CCM_ENCRYPTION_KEY env var
- `packages/server/src/lib/encryption.ts`

---

*Architecture analysis: 2026-01-18*
