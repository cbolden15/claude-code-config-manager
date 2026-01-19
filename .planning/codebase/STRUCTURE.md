# Codebase Structure

**Analysis Date:** 2026-01-18

## Directory Layout

```
claude-code-config-manager/
├── packages/                    # pnpm workspace packages
│   ├── server/                  # Next.js web app and API
│   ├── cli/                     # Command-line interface
│   ├── shared/                  # Shared types and schemas
│   └── test-utils/              # Testing utilities package
├── docker/                      # Docker deployment configs
├── docs/                        # Documentation
├── __tests__/                   # Root-level integration tests
├── scripts/                     # Build/deployment scripts
├── .planning/                   # GSD planning documents
├── .auto-claude/                # Auto-Claude integration files
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml          # Workspace definition
├── tsconfig.base.json           # Shared TypeScript config
└── CLAUDE.md                    # Project documentation for Claude
```

## Directory Purposes

**packages/server/**
- Purpose: Next.js 14 application serving web UI and REST API
- Contains: React components, API routes, Prisma schema, generators
- Key files: `src/app/`, `src/lib/`, `prisma/schema.prisma`

**packages/cli/**
- Purpose: Command-line tool for local project management
- Contains: Commander.js commands, API client, file utilities
- Key files: `src/index.ts`, `src/commands/`, `src/lib/api.ts`

**packages/shared/**
- Purpose: TypeScript types and Zod schemas shared between packages
- Contains: Type definitions, validation schemas
- Key files: `src/types/`, `src/schemas/`

**packages/test-utils/**
- Purpose: Test factories, mocks, and utilities for all packages
- Contains: Factory functions, API mocks, Prisma mocks
- Key files: `src/factories/`, `src/mocks/`, `src/db/`

**docker/**
- Purpose: Docker deployment configuration
- Contains: Dockerfile, docker-compose.yml
- Key files: `Dockerfile`, `docker-compose.yml`

## Key File Locations

**Entry Points:**
- `packages/server/src/app/layout.tsx`: Root layout for web app
- `packages/server/src/app/page.tsx`: Dashboard homepage
- `packages/cli/src/index.ts`: CLI entry point
- `packages/cli/bin/ccm.js`: CLI executable shim

**Configuration:**
- `packages/server/prisma/schema.prisma`: Database schema
- `packages/server/tsconfig.json`: Server TypeScript config
- `packages/cli/tsconfig.json`: CLI TypeScript config
- `tsconfig.base.json`: Shared TypeScript base config
- `pnpm-workspace.yaml`: Workspace packages definition

**Core Logic:**
- `packages/server/src/lib/db.ts`: Prisma client singleton
- `packages/server/src/lib/generators/index.ts`: File generation orchestrator
- `packages/server/src/lib/sync/orchestrator.ts`: Sync process coordinator
- `packages/server/src/lib/env.ts`: Environment variable management
- `packages/server/src/lib/hooks.ts`: Global hooks management
- `packages/server/src/lib/permissions.ts`: Global permissions management
- `packages/server/src/lib/encryption.ts`: AES encryption utilities

**API Routes:**
- `packages/server/src/app/api/profiles/route.ts`: Profile CRUD
- `packages/server/src/app/api/components/route.ts`: Component CRUD
- `packages/server/src/app/api/projects/[id]/sync/route.ts`: Sync endpoint
- `packages/server/src/app/api/machines/route.ts`: Machine registry
- `packages/server/src/app/api/settings/*/route.ts`: Settings (hooks, permissions, env)
- `packages/server/src/app/api/generate/route.ts`: File generation
- `packages/server/src/app/api/health/route.ts`: Health check

**Web Pages:**
- `packages/server/src/app/page.tsx`: Dashboard
- `packages/server/src/app/components/page.tsx`: Components list
- `packages/server/src/app/profiles/page.tsx`: Profiles list
- `packages/server/src/app/projects/page.tsx`: Projects list
- `packages/server/src/app/machines/page.tsx`: Machines list
- `packages/server/src/app/settings/page.tsx`: Settings overview
- `packages/server/src/app/auto-claude/page.tsx`: Auto-Claude dashboard

**CLI Commands:**
- `packages/cli/src/commands/init.ts`: Initialize project
- `packages/cli/src/commands/apply.ts`: Apply profile
- `packages/cli/src/commands/sync.ts`: Sync configuration
- `packages/cli/src/commands/config.ts`: CLI configuration
- `packages/cli/src/commands/machine.ts`: Machine management
- `packages/cli/src/commands/settings-env.ts`: Environment variables
- `packages/cli/src/commands/settings-hooks.ts`: Hooks management
- `packages/cli/src/commands/settings-permissions.ts`: Permissions
- `packages/cli/src/commands/auto-claude.ts`: Auto-Claude commands

**Testing:**
- `packages/server/__tests__/`: Server unit/integration tests
- `packages/cli/__tests__/`: CLI unit tests
- `packages/test-utils/src/`: Test utilities and factories
- `__tests__/`: Root-level integration tests

## Naming Conventions

**Files:**
- React components: PascalCase.tsx (`ProfilesList.tsx`, `Dashboard.tsx`)
- Pages: lowercase with hyphens in folder names (`page.tsx` inside `auto-claude/`)
- API routes: `route.ts` in folder matching endpoint
- Utilities: camelCase.ts (`db.ts`, `encryption.ts`)
- Types: camelCase.ts (`machines.ts`, `env.ts`)
- Tests: `*.test.ts` or `*.test.tsx`

**Directories:**
- Features: lowercase with hyphens (`auto-claude/`, `settings/`)
- Dynamic routes: brackets (`[id]/`, `[componentId]/`)
- Submodules: lowercase (`lib/`, `components/`, `commands/`)

## Where to Add New Code

**New API Endpoint:**
- Create folder: `packages/server/src/app/api/{resource}/`
- Add `route.ts` for collection, `[id]/route.ts` for individual
- Add types to `packages/shared/src/types/`
- Add business logic to `packages/server/src/lib/`

**New Web Page:**
- Create folder: `packages/server/src/app/{feature}/`
- Add `page.tsx` for the page component
- Add components in `packages/server/src/app/{feature}/components/`

**New CLI Command:**
- Add command file: `packages/cli/src/commands/{command}.ts`
- Export from `packages/cli/src/commands/index.ts`
- Add to CLI in `packages/cli/src/index.ts`
- Add API client methods to `packages/cli/src/lib/api.ts` or dedicated file

**New Component Type:**
- Add generator: `packages/server/src/lib/generators/{type}.ts`
- Export from `packages/server/src/lib/generators/index.ts`
- Handle in `generateProjectFiles()` orchestrator

**New Shared Type:**
- Add type file: `packages/shared/src/types/{domain}.ts`
- Export from `packages/shared/src/types/index.ts`

**New UI Component:**
- Shared components: `packages/server/src/components/ui/`
- Feature components: `packages/server/src/app/{feature}/components/`

**New Test Utilities:**
- Factories: `packages/test-utils/src/factories/`
- Mocks: `packages/test-utils/src/mocks/`
- Helpers: `packages/test-utils/src/utils/`

## Special Directories

**.auto-claude/**
- Purpose: Auto-Claude workflow integration files
- Generated: Partially (specs, worktrees)
- Committed: No (except config files)

**.planning/**
- Purpose: GSD planning and codebase analysis documents
- Generated: By GSD commands
- Committed: Yes

**packages/server/prisma/migrations/**
- Purpose: Database migration history
- Generated: By `prisma migrate`
- Committed: Yes

**packages/server/.next/**
- Purpose: Next.js build output
- Generated: By Next.js build
- Committed: No

**node_modules/**
- Purpose: Package dependencies
- Generated: By pnpm install
- Committed: No

**dist/**
- Purpose: TypeScript compilation output (cli, shared)
- Generated: By tsc
- Committed: No

---

*Structure analysis: 2026-01-18*
