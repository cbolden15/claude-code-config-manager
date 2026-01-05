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
│   └── shared/                 # Shared types and schemas
│       ├── src/
│       │   ├── types/
│       │   └── schemas/
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

**Phase:** 1 - Project Scaffold
**Status:** In Progress
**Next:** Verify scaffold works with `pnpm dev`

### Phase Checklist

- [x] **Phase 1: Scaffold** — Monorepo setup, Next.js, Prisma, shadcn/ui
- [ ] **Phase 2: Database** — Prisma schema, migrations, seed data
- [ ] **Phase 3: API Routes** — Components, profiles, projects, generate endpoints
- [ ] **Phase 4: UI Pages** — Dashboard, components, profiles, projects, monitoring, settings
- [ ] **Phase 5: CLI** — Config, list, init, apply, sync commands
- [ ] **Phase 6: Docker** — Dockerfile, compose, deployment docs

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
```

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
