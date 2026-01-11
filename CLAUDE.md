# Claude Code Config Manager (CCM)

## Project Overview

Personal tool for managing Claude Code project configurations across multiple projects and machines.

**Architecture:** CLI + Server
- **Server** runs on homelab (Docker), hosts web UI and API
- **CLI** runs on laptop/desktop, talks to server API, writes files locally
- **No authentication** — relies on network-level trust (local network / Tailscale)

**Core Workflow:**
```bash
ccm init my-project --profile blockchain
# → CLI calls server API
# → Server returns file contents
# → CLI writes .claude/, .mcp.json, etc. to local filesystem
# → CLI registers project with server
```

---

## Key Documents

| Document | Location | Description |
|----------|----------|-------------|
| Full Specification | `docs/SPECIFICATION.md` | Complete 1200+ line spec with all details |
| UI Mockup | `docs/UI-MOCKUP.html` | Interactive HTML mockup of all screens |

**Always read the relevant spec section before implementing a feature.**

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| UI Components | shadcn/ui + Tailwind CSS |
| Database | SQLite |
| ORM | Prisma |
| CLI | Node.js + Commander.js + TypeScript |
| Package Manager | pnpm (workspaces) |
| Deployment | Docker |

---

## Repository Structure

```
claude-code-config-manager/
├── packages/
│   ├── server/                 # Next.js application
│   │   ├── src/
│   │   │   ├── app/           # Pages and API routes
│   │   │   ├── components/    # React components
│   │   │   └── lib/           # Utilities, generators, validators
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── package.json
│   │
│   ├── cli/                    # CLI tool
│   │   ├── src/
│   │   │   ├── index.ts       # Entry point
│   │   │   ├── commands/      # Command implementations
│   │   │   └── lib/           # API client, config, file utils
│   │   ├── bin/
│   │   │   └── ccm.js
│   │   └── package.json
│   │
│   ├── shared/                 # Shared types and schemas
│   │   ├── src/
│   │   │   ├── types/
│   │   │   └── schemas/
│   │   └── package.json
│   │
│   └── test-utils/             # Test utilities package
│       ├── src/
│       │   ├── factories/     # Factory functions for test data
│       │   ├── mocks/         # API and fetch mocking helpers
│       │   ├── db/            # Database utilities and seeders
│       │   └── utils/         # Test helpers and assertions
│       ├── examples/          # Example test files
│       └── package.json
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── docs/
│   ├── SPECIFICATION.md       # Full project spec
│   └── UI-MOCKUP.html         # Interactive mockup
│
├── pnpm-workspace.yaml
├── package.json
└── CLAUDE.md                   # This file
```

---

## Current Phase

**Phase:** CCM v2.0 - Parallel Development
**Status:** In Progress
**Current Sprint:** WS8 Settings UI Complete

### CCM v2.0 Workstreams

- [x] **WS0: Foundation** — Prisma schema, types, migrations, base utilities (Complete ✅)
- [x] **WS1: Machine Registry** — Machine auto-registration and management (Complete ✅)
- [x] **WS2: Global Hooks** — Hook CRUD, import/export (Complete ✅)
- [x] **WS3: Global Permissions** — Parser, API routes, CLI commands (Complete ✅)
- [x] **WS4: Global Environment Variables** — Env vars with encryption (Complete ✅)
- [x] **WS5: Sync System** — Multi-machine sync orchestration (Complete ✅)
- [ ] **WS6: Claude Desktop Integration** — Desktop config management
- [x] **WS7: Machine UI** — Web UI for machines (Complete ✅)
- [x] **WS8: Settings UI** — Web UI for permissions, hooks, env vars (Complete ✅)

### Testing Infrastructure

- [x] **Server API Tests** — v2.0 API routes (58 tests passing ✅)
- [x] **CLI Testing Setup** — Jest configuration, mocks, utilities (Complete ✅)
- [x] **CLI Permissions Tests** — Comprehensive test suite (105+ tests ✅)
- [x] **Test Utils Package** — @ccm/test-utils (Complete ✅)

---

## Commands

```bash
# Install dependencies (from root)
pnpm install

# Development
pnpm dev                          # Run server in dev mode
pnpm --filter server dev          # Run only server
pnpm --filter cli dev             # Run CLI in watch mode

# Database
pnpm --filter server db:push      # Push schema changes
pnpm --filter server db:migrate   # Run migrations
pnpm --filter server db:studio    # Open Prisma Studio
pnpm --filter server db:seed      # Seed database

# Building
pnpm build                        # Build all packages
pnpm --filter cli build           # Build CLI only

# CLI (after building)
pnpm --filter cli start           # Run CLI
# Or after npm link:
ccm --help

# Environment Variables (CLI)
ccm env list                      # List all env vars
ccm env list --scope claude-code  # Filter by scope
ccm env list --category api       # Filter by category
ccm env get <id>                  # Get env var by ID
ccm env get <id> --show-sensitive # Show unmasked value
ccm env add                       # Add new env var (interactive)
ccm env update <id>               # Update env var (interactive)
ccm env delete <id>               # Delete env var
ccm env export                    # Export all as JSON
ccm env export --format dotenv    # Export as .env format
ccm env export --decrypt          # Export with decrypted values
```

---

## Testing

### API Route Tests (v2.0)

**Status:** ✅ Complete - All 58 tests passing

Comprehensive test suite covering all v2.0 API endpoints with validation, error cases, and edge cases.

**Test Suites:**
```bash
# Run all tests
pnpm --filter server test:v2

# Run individual test suites
pnpm --filter server test:v2:machines
pnpm --filter server test:v2:hooks
pnpm --filter server test:v2:permissions
pnpm --filter server test:v2:env
```

**Coverage:**
- **Machines API** (11 tests) - GET, POST, PUT, DELETE `/api/machines/*`
  - List, register, upsert, CRUD operations
  - Machine overrides (get, create, conflict handling)

- **Hooks API** (16 tests) - `/api/settings/hooks/*`
  - Full CRUD operations
  - Filtering by type, category, enabled
  - Import/export with dry-run, replace, skip duplicates

- **Permissions API** (15 tests) - `/api/settings/permissions/*`
  - Full CRUD operations
  - Filtering by action, category, enabled
  - Import/export functionality
  - Validation and duplicate handling

- **Environment Variables API** (16 tests) - `/api/settings/env/*`
  - Full CRUD operations
  - Sensitive value masking
  - Scope and category filtering
  - Export functionality

**Test Infrastructure:**
- `__tests__/api/v2/test-utils.ts` - Reusable utilities (mock requests, assertions, test data)
- `__tests__/api/v2/run-all-tests.ts` - Test runner with database cleanup and summary
- Individual test files in `__tests__/api/v2/{machines,settings/hooks,settings/permissions,settings/env}/`

### Jest Integration Tests

**Status:** ✅ Complete - 52 tests passing (as of 2026-01-11)

Jest-based integration tests for core sync functionality and API routes using isolated test database.

**Test Suites:**
```bash
# Run sync tests
npx jest __tests__/lib/sync --no-coverage
npx jest __tests__/api/projects/sync.test.ts --no-coverage

# Run machine API tests
npx jest __tests__/api/machines/route.test.ts --no-coverage

# Run all passing Jest tests
pnpm test
```

**Coverage:**
- **Sync Orchestrator** (16 tests) - `__tests__/lib/sync/orchestrator.test.ts`
  - Project/machine validation
  - Override application during sync
  - Dry-run mode
  - Sync logging and timestamps
  - Status calculation (sync needed detection)

- **Sync Overrides** (11 tests) - `__tests__/lib/sync/overrides.test.ts`
  - Exclude by ID/name/wildcard
  - Config modifications (deep merge)
  - Multiple override application
  - Invalid data handling

- **Sync API** (16 tests) - `__tests__/api/projects/sync.test.ts`
  - POST `/api/projects/[id]/sync` - Trigger sync
  - GET `/api/projects/[id]/sync` - Get sync status
  - Request validation, error handling
  - Dry-run support, sync types

- **Machine API** (9 tests) - `__tests__/api/machines/route.test.ts`
  - GET `/api/machines` - List with filtering
  - POST `/api/machines` - Register/upsert
  - Validation and error cases

**Test Infrastructure:**
- `__tests__/helpers/` - Shared test utilities
  - `db.ts` - Test database setup (isolated SQLite)
  - `factories.ts` - Test data factories
  - `api.ts` - Mock request/response helpers
- **Prisma Mocking Pattern** - API routes use getter-based mock to inject test database:
  ```typescript
  let mockPrismaClient: PrismaClient
  jest.mock('@/lib/db', () => ({
    get prisma() { return mockPrismaClient }
  }))
  ```

**Documentation:**
- `WS5_SYNC_SYSTEM_COMPLETE.md` - Sync system implementation
- `WS5_TESTING_COMPLETE.md` - Detailed test documentation
- `WS1.1_MACHINE_API_TESTS_FIXED.md` - Machine API test fixes

### Test Utilities Package (@ccm/test-utils)

**Status:** ✅ Complete - Ready for use across all packages

**Location:** `packages/test-utils/`

Comprehensive test utilities, factories, and mocks for the CCM project.

**Features:**
- **Factory Functions** - Create test data with sensible defaults (40+ factories)
- **API Mocks** - Mock API responses and fetch calls (15+ mocks)
- **Database Utilities** - Mock Prisma client and seeders
- **Test Helpers** - Common testing utilities and assertions (20+ helpers)

**Usage Examples:**
```typescript
import {
  // Factories
  createEnvVar,
  createHook,
  createPermission,
  createMachine,
  resetAllCounters,

  // Mocks
  mockFetch,
  createSuccessResponse,
  mockEnvVarListResponse,

  // Database
  createMockPrismaClient,
  createPrismaTestHelper,
  seedComprehensive,

  // Utilities
  assertContains,
  assertDefined,
  waitFor,
  retry,
} from '@ccm/test-utils';

// Create test data
beforeEach(() => resetAllCounters());
const envVar = createEnvVar({ key: 'API_KEY', sensitive: true });

// Mock fetch calls
const mock = mockFetch()
  .get('/api/settings/env', createSuccessResponse({ envVars: [] }))
  .build();

// Mock Prisma
const prisma = createMockPrismaClient();
const helper = createPrismaTestHelper(prisma);
helper.mockFindMany('globalEnvVar', [envVar]);
```

**Running Tests:**
```bash
# Run test-utils package tests
cd packages/test-utils
pnpm test

# Run with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage
```

**Integration:**
Add to any package's `package.json`:
```json
{
  "devDependencies": {
    "@ccm/test-utils": "workspace:*",
    "vitest": "^1.2.0"
  }
}
```

**Documentation:**
- `packages/test-utils/README.md` - Complete API documentation
- `packages/test-utils/examples/env-api.test.ts` - Example test file
- `TEST-UTILS-COMPLETION.md` - Implementation details

---

## Conventions

### TypeScript
- Strict mode enabled everywhere
- Use `type` for object shapes, `interface` for extendable contracts
- Prefer `const` assertions for literal types

### Validation
- Use Zod for all runtime validation
- Define schemas in `packages/shared/src/schemas/`
- Validate API request bodies and CLI inputs

### Database
- Use Prisma client from `packages/server/src/lib/db.ts` (singleton)
- Store JSON in TEXT columns, parse with Zod on read
- Use transactions for multi-step operations

### API Routes
- Follow REST conventions
- Return consistent error format: `{ error: string, details?: unknown }`
- Use proper HTTP status codes

### UI Components
- Use shadcn/ui components (already installed)
- Follow the mockup in `docs/UI-MOCKUP.html` for layout and styling
- Use Tailwind classes, avoid custom CSS

### File Generation
- Generator functions live in `packages/server/src/lib/generators/`
- Each Claude Code primitive has its own generator
- Return `{ path: string, content: string }[]`

---

## Data Model Quick Reference

See `docs/SPECIFICATION.md` section 8 for full schema.

### Component Types
```typescript
enum ComponentType {
  MCP_SERVER      // .mcp.json entries
  SUBAGENT        // .claude/agents/*.md
  SKILL           // .claude/skills/*/SKILL.md
  COMMAND         // .claude/commands/*.md
  HOOK            // settings.json hooks array
  CLAUDE_MD_TEMPLATE  // CLAUDE.md templates
}
```

### Key Tables
- `Component` — Reusable config elements (MCP servers, subagents, etc.)
- `Profile` — Bundles of components for project types
- `Project` — Tracked projects with sync status
- `MonitoringEntry` — Ecosystem updates from n8n

---

## Notes for Claude Code

1. **Always read the spec section before implementing** — The spec at `docs/SPECIFICATION.md` has all the details including exact schemas, API responses, and UI layouts.

2. **Match the mockup** — The HTML mockup at `docs/UI-MOCKUP.html` shows exactly how each screen should look.

3. **Test as you go** — Don't move to the next phase until current phase works. Use curl for APIs, Prisma Studio for database.

4. **Commit frequently** — After each working feature, suggest a git commit.

5. **Update this file** — After completing a phase, update the "Current Phase" section and check off the phase in the checklist.

---

## Completed Work Sessions

### WS4: Global Environment Variables (2026-01-11)

**Status:** ✅ Complete
**Duration:** ~3 hours
**Completion Document:** `WS4-COMPLETION.md`

Implemented comprehensive environment variable management system with encryption, masking, and multi-scope support.

**Server Implementation:**
- `packages/server/src/lib/env.ts` (295 lines) - Core business logic
  - AES-256-GCM encryption using existing utilities
  - Sensitive value masking (******** in API responses)
  - CRUD operations with filtering by scope/category
  - Export functionality (JSON, dotenv formats)
  - Scope-based retrieval for different targets

- **API Routes:**
  - `GET/POST /api/settings/env` - List and create env vars
  - `GET/PATCH/DELETE /api/settings/env/[id]` - Individual operations
  - `GET /api/settings/env/export` - Export with format options

**CLI Implementation:**
- `packages/cli/src/lib/api-env.ts` (170 lines) - API client
- `packages/cli/src/commands/settings-env.ts` (340 lines) - CLI commands
  - `ccm env list` - List with filtering
  - `ccm env get <id>` - Get individual (with --show-sensitive flag)
  - `ccm env add` - Interactive creation
  - `ccm env update <id>` - Interactive update
  - `ccm env delete <id>` - Delete with confirmation
  - `ccm env export` - Export with format/decrypt options

**Key Features:**
- Encryption key: `CCM_ENCRYPTION_KEY` in `.env`
- Scopes: `all`, `claude-desktop`, `claude-code`, `cli`
- Categories: `api`, `auth`, `database`, `integration`, `build`, `deployment`
- Automatic masking of sensitive values in list responses
- Optional decryption for export (with flag)

### Test Utilities Package (2026-01-11)

**Status:** ✅ Complete
**Duration:** ~2 hours
**Completion Document:** `TEST-UTILS-COMPLETION.md`

Created comprehensive test utilities package (`@ccm/test-utils`) with 21 files and ~2,250 lines of code.

**Package Structure:**
```
packages/test-utils/
├── src/
│   ├── factories/        # 40+ factory functions
│   │   ├── machines.ts   # Machine and override factories
│   │   ├── env.ts        # Environment variable factories
│   │   ├── hooks.ts      # Hook factories
│   │   └── permissions.ts # Permission factories
│   ├── mocks/           # 15+ mock helpers
│   │   ├── api-responses.ts # API response mocks
│   │   └── fetch.ts      # Fetch mocking with fluent API
│   ├── db/              # Database utilities
│   │   ├── setup.ts     # Mock Prisma client
│   │   └── seeders.ts   # Pre-configured test data
│   └── utils/           # 20+ test utilities
│       ├── assertions.ts # Custom assertions (9)
│       └── helpers.ts    # Helper functions (20+)
├── examples/
│   └── env-api.test.ts  # Example test file
└── README.md            # Complete documentation
```

**Key Components:**
- **Factories:** Counter-based IDs, override support, pre-configured variants
- **Mocks:** Fluent builder API for fetch, comprehensive API response mocks
- **Database:** Mock Prisma client with helper class for easy test setup
- **Assertions:** Custom assertions for common test scenarios
- **Seeders:** Pre-configured data sets (minimal, comprehensive, by entity)

**Statistics:**
- 21 files created
- ~2,250 lines of code
- 40+ factory functions
- 15+ mock functions
- 20+ test utilities
- 9 custom assertions
- 6 pre-configured seeders
