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

**Phase:** CCM v3.2 - Scheduled Optimization & Automation
**Status:** 📋 Planned
**Planning Date:** January 19, 2026
**Repository:** https://github.com/cbolden15/claude-code-config-manager

### Next Up: v3.2 Implementation

**Design Document:** `CCM-V3.2-SCHEDULED-OPTIMIZATION-DESIGN.md`
**Terminal Prompts:** `V3.2-TERMINAL-PROMPTS.md`

Ready for 3-terminal parallel implementation:
- **Terminal 1:** Database + Server APIs (ScheduledTask, TaskExecution, WebhookConfig models + 12 API routes)
- **Terminal 2:** Scheduler Engine (runner, triggers, webhooks, task handlers)
- **Terminal 3:** UI + CLI (`/scheduler` dashboard + `ccm schedule` commands)

### CCM v2.0 Workstreams (Foundation Complete)

- [x] **WS0: Foundation** — Prisma schema, types, migrations, base utilities
- [x] **WS1: Machine Registry** — Machine auto-registration and management
- [x] **WS2: Global Hooks** — Hook CRUD, import/export
- [x] **WS3: Global Permissions** — Parser, API routes, CLI commands
- [x] **WS4: Global Environment Variables** — Env vars with encryption
- [x] **WS5: Sync System** — Multi-machine sync orchestration
- [ ] **WS6: Claude Desktop Integration** — Desktop config management
- [x] **WS7: Machine UI** — Web UI for machines
- [x] **WS8: Settings UI** — Web UI for permissions, hooks, env vars

### CCM v3.0 Implementation (Complete)

- [x] **Database Layer** — 6 new Prisma models (SessionActivity, UsagePattern, Recommendation, HealthScore, ImpactMetric, TechnologyUsage)
- [x] **Server APIs** — Session tracking, recommendations CRUD, health scores
- [x] **Intelligence Engine** — Pattern detection, MCP/skill recommenders, cross-project analysis
- [x] **UI Components** — Recommendations dashboard, health score visualization
- [x] **CLI Integration** — Session tracking hook, recommendations commands

### CCM v3.1 Implementation (Complete)

- [x] **Database Layer** — 3 new Prisma models (ContextAnalysis, ContextArchive, ContextOptimizationRule)
- [x] **Server APIs** — Context analysis, optimization, archives, rules CRUD
- [x] **Intelligence Engine** — Analyzer, classifier, detector, optimizer, archiver
- [x] **UI Components** — Context optimizer dashboard, health card, issue cards, archive list
- [x] **CLI Integration** — `ccm context` command with analyze, optimize, archives subcommands

### CCM v3.2 Implementation (Planned)

- [ ] **Database Layer** — 3 new Prisma models (ScheduledTask, TaskExecution, WebhookConfig)
- [ ] **Server APIs** — Task CRUD, execution history, webhook management, scheduler control
- [ ] **Scheduler Engine** — Background runner, cron/threshold triggers, webhook notifications
- [ ] **UI Components** — Scheduler dashboard, task cards, execution history, webhook config
- [ ] **CLI Integration** — `ccm schedule` command with list, create, run, webhooks subcommands

---

## CCM v3.0: Smart Recommendations System

**Planning Date:** January 18, 2026
**Implementation Plan:** `CCM-V3-UNIFIED-PLAN.md`
**Goal:** Transform CCM from configuration manager into intelligent optimization platform

### Vision

CCM v3.0 adds **intelligence** as the core feature. Instead of just managing configurations, CCM will:
- **Learn** from your actual Claude Code usage across all projects
- **Analyze** patterns to understand your workflow
- **Recommend** MCP servers and skills you actually need (not guessing)
- **Optimize** token usage through data-driven suggestions
- **Measure** real impact of applied recommendations

### Key Innovation: Cross-Project Pattern Detection

Unlike v2.0 which manages configurations, v3.0 **observes behavior**:

```
Traditional Approach (v2.0):
- User: "I need PostgreSQL MCP"
- CCM: "OK, here's the config"

Smart Approach (v3.0):
- CCM: "You SSH to PostgreSQL 47 times in 30 days"
- CCM: "Enable PostgreSQL MCP to save 7,050 tokens/month"
- User: "Apply recommendation" [one click]
```

### Core Architecture (4 Layers)

1. **Data Collection** - CLI hook tracks every session (tools, commands, files, tokens)
2. **Intelligence Engine** - Pattern detection + cross-project analysis + confidence scoring
3. **User Interface** - Recommendations dashboard + health score + impact tracking
4. **Actions & Feedback** - One-click apply + learning loop

### Target Results

**After 30 days:**
- 50-80% token reduction for users who apply recommendations
- 10+ smart recommendations generated
- 80%+ recommendation confidence
- Health score improves by 20+ points

**Example Recommendations:**
- "Enable PostgreSQL MCP" (detected: 47 ssh+psql patterns)
- "Create n8n-workflow-status skill" (detected: 23 status checks)
- "Split CLAUDE.md into contexts" (detected: 33KB monolithic context)

### Implementation Timeline

| Week | Phase | Focus | Status |
|------|-------|-------|--------|
| 1 | Data Collection | CLI tracking + API endpoints | ✅ Complete |
| 2 | Intelligence Engine | Pattern detection + recommendations | ✅ Complete |
| 3 | UI & Visualization | Dashboard + recommendation cards | ✅ Complete |
| 4 | CLI Integration | Commands + auto-tracking | ✅ Complete |
| 5 | Health Score | Scoring algorithm + analytics | ✅ Complete |
| 6 | Testing & Polish | End-to-end testing + docs | ⏳ Pending |

### New Database Models (v3.0)

- **SessionActivity** - Tracks every Claude Code session
- **UsagePattern** - Aggregates patterns across sessions
- **Recommendation** - Smart suggestions with confidence scoring
- **HealthScore** - Overall optimization metrics
- **ImpactMetric** - Measures actual results after applying recommendations
- **TechnologyUsage** - Tracks technology stack usage

### Key Features

✅ **Smart Recommendations:**
- MCP servers based on detected tech stack (PostgreSQL, Docker, n8n, etc.)
- Skills for repetitive patterns (database queries, status checks, git workflows)
- Confidence scoring (0.0 to 1.0)
- Impact estimation (tokens + time saved)

✅ **Cross-Project Analysis:**
- Analyzes ALL projects, not just one
- Detects technologies automatically
- Identifies repetitive patterns
- Aggregates usage over 30 days

✅ **One-Click Optimization:**
- Apply recommendations instantly
- Dismiss with reason tracking
- Measure actual impact
- Learning loop improves suggestions

✅ **Health Dashboard:**
- Overall optimization score (0-100)
- Category scores (MCP, Skills, Context, Patterns)
- Active issues tracking
- Trend analysis

### CLI Commands (v3.0)

```bash
# Recommendations
ccm recommendations list              # View all recommendations
ccm recommendations apply <id>        # Apply recommendation
ccm recommendations analyze           # Generate new recommendations

# Health
ccm health                            # Show health score
ccm health --history                  # Show score over time

# Analytics
ccm analytics tokens                  # Token usage stats
ccm analytics patterns                # Detected patterns
```

### Success Metrics

- **Token Efficiency:** 50-80% reduction in token usage
- **Recommendation Quality:** 80%+ confidence in suggestions
- **User Adoption:** 70%+ of recommendations applied
- **Impact Accuracy:** Actual savings match estimates within 20%

### Relationship to v2.0

CCM v3.0 **extends** v2.0, doesn't replace it:
- All v2.0 features remain functional
- v3.0 adds intelligence layer on top
- Recommendations suggest v2.0 configurations to apply
- Existing workflows enhanced with smart suggestions

**Integration Points:**
- v3.0 recommendations → v2.0 configuration sync
- v2.0 machine registry → v3.0 cross-machine analytics
- v2.0 profiles → v3.0 suggests which profiles to use

---

## CCM v3.1: Context Optimizer

**Planning Date:** January 19, 2026
**Implementation Plan:** `CCM-V3.1-CONTEXT-OPTIMIZER-DESIGN.md`
**Goal:** Intelligent CLAUDE.md optimization agent that reduces token waste

### Problem Statement

- CLAUDE.md files accumulate bloat over time (completed work, historical notes, outdated references)
- Every Claude Code session pays token cost for non-actionable information
- Manual maintenance is tedious and often neglected
- No tooling exists to intelligently optimize context files

### Solution

An autonomous agent that analyzes CLAUDE.md files, detects optimization opportunities, and applies improvements while preserving important context in archives.

### New Database Models (v3.1)

- **ContextAnalysis** - Analysis results for CLAUDE.md files (sections, issues, scores)
- **ContextArchive** - Archived content with full history preservation
- **ContextOptimizationRule** - User-configurable optimization rules

### API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/context/analyze` | GET, POST | Analyze CLAUDE.md, get latest analysis |
| `/api/context/analyze/[id]` | GET | Get specific analysis by ID |
| `/api/context/optimize` | GET, POST | Apply optimization, list strategies |
| `/api/context/optimize/preview` | POST | Preview changes without applying |
| `/api/context/archives` | GET | List archives for a project |
| `/api/context/archives/[id]` | GET, DELETE | Get/delete specific archive |
| `/api/context/archives/restore` | POST | Restore content from archive |
| `/api/context/rules` | GET, POST | List/create optimization rules |
| `/api/context/rules/[id]` | GET, PATCH, DELETE | CRUD for individual rules |

### Optimization Strategies

| Strategy | Description | Reduction |
|----------|-------------|-----------|
| Conservative | Archive only, never modify in place | 20-30% |
| Moderate | Archive + condense + dedupe | 40-60% |
| Aggressive | Minimize to essential context only | 60-80% |
| Custom | Apply user-defined rules only | Varies |

### CLI Commands (v3.1)

```bash
# Analyze CLAUDE.md
ccm context analyze                    # Analyze current project
ccm context analyze --project /path    # Analyze specific project

# Optimize
ccm context optimize --dry-run         # Preview optimization
ccm context optimize --strategy moderate  # Apply optimization

# Archives
ccm context archives                   # List archives
ccm context archives show <id>         # View archive content
ccm context archives restore <id>      # Restore from archive
```

### Target Results

- **40-60% reduction** in CLAUDE.md size
- **5,000-15,000 tokens saved** per session
- **100% archive preservation** - never lose content
- **<10% false positive rate** - unnecessary optimizations

---

## CCM v3.2: Scheduled Optimization & Automation

**Planning Date:** January 19, 2026
**Implementation Plan:** `CCM-V3.2-SCHEDULED-OPTIMIZATION-DESIGN.md`
**Terminal Prompts:** `V3.2-TERMINAL-PROMPTS.md`
**Goal:** Automate context optimization with scheduled tasks and webhook notifications

### Problem Statement

- Users forget to run context optimization manually
- CLAUDE.md files degrade over time without intervention
- No way to monitor context health across projects automatically
- Manual optimization requires active user engagement

### Solution

An automation layer that schedules periodic analysis, triggers optimization based on thresholds, and notifies users through webhooks when action is needed.

### New Database Models (v3.2)

- **ScheduledTask** - Cron/interval/threshold scheduled automation tasks
- **TaskExecution** - Execution history with metrics and results
- **WebhookConfig** - Notification webhooks (Slack, Discord, n8n, generic)

### API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/scheduler/tasks` | GET, POST | List/create scheduled tasks |
| `/api/scheduler/tasks/[id]` | GET, PATCH, DELETE | Task CRUD |
| `/api/scheduler/tasks/[id]/run` | POST | Manually trigger task |
| `/api/scheduler/executions` | GET | Execution history |
| `/api/scheduler/executions/[id]` | GET, POST | Details and retry |
| `/api/scheduler/webhooks` | GET, POST | List/create webhooks |
| `/api/scheduler/webhooks/[id]` | GET, PATCH, DELETE | Webhook CRUD |
| `/api/scheduler/webhooks/[id]/test` | POST | Test notification |
| `/api/scheduler/status` | GET | Scheduler status |
| `/api/scheduler/upcoming` | GET | Upcoming tasks |

### Schedule Types

| Type | Description | Example |
|------|-------------|---------|
| Cron | Standard cron expression | `0 9 * * *` (daily 9 AM) |
| Interval | Run every N minutes | `1440` (daily) |
| Threshold | Trigger when metric crosses value | Score < 60 |

### CLI Commands (v3.2)

```bash
# Task management
ccm schedule list                          # List all tasks
ccm schedule create                        # Interactive creation
ccm schedule run <id>                      # Manual trigger
ccm schedule enable/disable <id>           # Toggle task

# Webhooks
ccm schedule webhooks list                 # List webhooks
ccm schedule webhooks add                  # Add webhook
ccm schedule webhooks test <id>            # Test notification

# Quick setup presets
ccm schedule quick daily-analysis          # Daily 9 AM analysis
ccm schedule quick weekly-optimize         # Weekly Monday optimization
ccm schedule quick threshold-alert --score 50  # Alert on low score
```

### Webhook Providers

- **Slack** - Rich message blocks with fields
- **Discord** - Embed format with colors
- **n8n** - Trigger workflow automation
- **Generic** - Standard JSON POST

---

## v3.0 Documentation

| Document | Location | Description |
|----------|----------|-------------|
| **Unified Implementation Plan** | `CCM-V3-UNIFIED-PLAN.md` | Complete 6-week implementation plan with code |
| Smart Recommendations Feature | `SMART-RECOMMENDATIONS-FEATURE.md` | Detailed feature specification |
| v2.0 Specification | `docs/SPECIFICATION.md` | v2.0 architecture and API |

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

## MCP Servers (Project-Specific)

Configured in `.mcp.json` for v3.0 development:

| Server | Purpose |
|--------|---------|
| `context7` | Up-to-date docs for Prisma, Next.js, React, TypeScript |
| `memory` | Persistent context across sessions |
| `sequential-thinking` | Complex algorithm design (intelligence engine, scoring) |
| `sqlite` | Direct database access for dev/debugging |

---

## Project Skills

Available via `/command-name` in Claude Code:

| Skill | Usage | Description |
|-------|-------|-------------|
| `/db` | `/db push`, `/db migrate`, `/db studio` | Prisma database operations |
| `/test` | `/test`, `/test server`, `/test v2` | Run test suites |
| `/build` | `/build`, `/build check` | Build packages, type-check |
| `/api-route` | `/api-route recommendations CRUD` | Generate API route scaffolding |
| `/prisma-model` | `/prisma-model SessionActivity` | Add Prisma model with conventions |

Skills are defined in `.claude/commands/`.

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

### v3.0 Smart Recommendations System (2026-01-18 to 2026-01-19)

**Status:** ✅ Complete
**Approach:** 3 parallel Claude Code terminals
**Commit:** `ffbc3d8` - 377 files, 93,801 insertions

**Terminal 1 - Database + Server APIs:**
- Added 6 Prisma models: SessionActivity, UsagePattern, Recommendation, HealthScore, ImpactMetric, TechnologyUsage
- Updated Machine model with v3.0 relationships
- Created API routes:
  - `POST /api/sessions/track` - Track Claude Code sessions
  - `GET /api/recommendations` - List recommendations with filtering
  - `POST /api/recommendations/generate` - Analyze patterns, create recommendations
  - `GET/DELETE/PATCH /api/recommendations/[id]` - Manage recommendations
  - `POST /api/recommendations/[id]/apply` - Apply with impact tracking
  - `GET/POST /api/health/score` - Health score calculation

**Terminal 2 - Intelligence Engine:**
- `packages/server/src/lib/recommendations/pattern-detector.ts` - 6 pattern types
- `packages/server/src/lib/recommendations/mcp-recommender.ts` - MCP server suggestions
- `packages/server/src/lib/recommendations/skill-recommender.ts` - Skill suggestions
- `packages/server/src/lib/recommendations/cross-project-analyzer.ts` - Aggregated insights
- `packages/server/src/lib/health/calculator.ts` - Health score algorithm

**Terminal 3 - UI + CLI:**
- `packages/server/src/components/recommendations/RecommendationCard.tsx` - Card with actions
- `packages/server/src/components/recommendations/RecommendationsStats.tsx` - Savings overview
- `packages/server/src/app/recommendations/page.tsx` - Dashboard page
- `packages/cli/src/commands/recommendations.ts` - CLI commands
- `packages/cli/src/hooks/session-tracker.ts` - Auto-tracking hook

**Codebase Analysis (`.planning/codebase/`):**
- `STACK.md` - Technologies and dependencies (131 lines)
- `ARCHITECTURE.md` - System design and patterns (171 lines)
- `STRUCTURE.md` - Directory layout (198 lines)
- `CONVENTIONS.md` - Code style and patterns (255 lines)
- `TESTING.md` - Test structure and practices (523 lines)
- `INTEGRATIONS.md` - External services and APIs (151 lines)
- `CONCERNS.md` - Technical debt and issues (159 lines)

### v3.1 Context Optimizer (2026-01-19)

**Status:** ✅ Complete
**Approach:** 3 parallel Claude Code terminals
**Commit:** `8caa20b` - 30 files, 6,449 insertions

**Terminal 1 - Database + Server APIs:**
- Added 3 Prisma models: ContextAnalysis, ContextArchive, ContextOptimizationRule
- Updated Machine model with v3.1 relationships
- Created 9 API route files:
  - `/api/context/analyze` - POST (analyze), GET (latest)
  - `/api/context/analyze/[id]` - GET (by ID)
  - `/api/context/optimize` - POST (apply), GET (strategies)
  - `/api/context/optimize/preview` - POST (preview changes)
  - `/api/context/archives` - GET (list)
  - `/api/context/archives/[id]` - GET, DELETE
  - `/api/context/archives/restore` - POST
  - `/api/context/rules` - GET, POST (CRUD)
  - `/api/context/rules/[id]` - GET, PATCH, DELETE

**Terminal 2 - Intelligence Engine:**
- `packages/server/src/lib/context/analyzer.ts` - Parse CLAUDE.md, extract sections, count tokens
- `packages/server/src/lib/context/classifier.ts` - Categorize sections by type and actionability
- `packages/server/src/lib/context/detector.ts` - Identify optimization issues
- `packages/server/src/lib/context/optimizer.ts` - Generate optimization plans
- `packages/server/src/lib/context/archiver.ts` - Create archives, generate summaries
- `packages/server/src/lib/context/rules.ts` - Default optimization rules
- Updated health calculator with context score

**Terminal 3 - UI + CLI:**
- `packages/server/src/app/context/page.tsx` - Optimization dashboard
- `packages/server/src/components/context/ContextHealthCard.tsx` - Health visualization
- `packages/server/src/components/context/OptimizationIssueCard.tsx` - Issue display
- `packages/server/src/components/context/OptimizationPreviewDialog.tsx` - Preview modal
- `packages/server/src/components/context/ArchiveList.tsx` - Archive browser
- Added Context Optimizer link to sidebar navigation
- `packages/cli/src/commands/context.ts` - CLI with analyze, optimize, archives subcommands
