# Technology Stack

**Analysis Date:** 2026-01-18

## Languages

**Primary:**
- TypeScript 5.3.3+ - Used throughout all packages (server, CLI, shared, test-utils)

**Secondary:**
- JavaScript - Build scripts, bin entry points (`packages/cli/bin/ccm.js`)

## Runtime

**Environment:**
- Node.js >=20.0.0 (enforced via `engines` in root `package.json`)
- Docker with node:20-alpine base image for production

**Package Manager:**
- pnpm 9.0.0+ (configured via `packageManager` field)
- Lockfile: `pnpm-lock.yaml` (present, version 9.0)
- Workspace configuration: `pnpm-workspace.yaml`

## Frameworks

**Core:**
- Next.js 14.1.0 - Server package uses App Router for web UI and API routes
  - Location: `packages/server/`
  - API routes in `packages/server/src/app/api/`
  - Pages in `packages/server/src/app/`

**UI:**
- React 18.2.0+ - Frontend components
- Radix UI - Headless component primitives
  - `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`, etc.
- shadcn/ui pattern - Components in `packages/server/src/components/ui/`
- Tailwind CSS 3.4.1 - Styling framework
- tailwind-merge 2.2.0+ - Class merging utility
- class-variance-authority 0.7.0 - Component variants
- lucide-react 0.312.0 - Icon library

**Database:**
- Prisma 5.9.0+ - ORM and query builder
  - Schema: `packages/server/prisma/schema.prisma`
  - Client singleton: `packages/server/src/lib/db.ts`
- SQLite - File-based database via `DATABASE_URL`

**CLI:**
- Commander.js 12.0.0+ - Command-line argument parsing
  - Entry: `packages/cli/src/index.ts`
  - Commands: `packages/cli/src/commands/`
- chalk 5.3.0+ - Terminal output styling

**Code Editor:**
- Monaco Editor 0.55.1 - In-browser code editing (`packages/server/src/app/auto-claude/prompts/components/MonacoEditor.tsx`)

**Validation:**
- Zod 3.22.4+ - Runtime schema validation
  - Shared schemas: `packages/shared/src/schemas/`

**Testing:**
- Jest 29.7.0+ (CLI), Jest 30.2.0+ (Server) - Test runners
- ts-jest - TypeScript support for Jest
- Vitest 1.2.0 - Test runner for test-utils package
- @testing-library/react 16.3.1 - React component testing
- @testing-library/jest-dom - DOM assertions
- @testing-library/user-event - User interaction simulation

**Build/Dev:**
- tsx 4.7.0+ - TypeScript execution for scripts and seeding
- ts-node 10.9.2 - TypeScript execution
- PostCSS 8.4.33 - CSS processing
- Autoprefixer 10.4.17 - CSS vendor prefixing

## Key Dependencies

**Critical:**
- `@prisma/client` 5.9.0+ - Database access layer
- `next` 14.1.0 - Application framework (pinned version)
- `react` / `react-dom` 18.2.0+ - UI rendering
- `commander` 12.0.0+ - CLI framework
- `zod` 3.22.4+ - Runtime validation

**Infrastructure:**
- `clsx` 2.1.0 - Conditional class names
- `tailwindcss-animate` 1.0.7 - Animation utilities

**Internal Workspaces:**
- `@ccm/shared` - Shared types and schemas between packages
- `@ccm/test-utils` - Testing utilities, factories, mocks

## Configuration

**Environment:**
- `DATABASE_URL` - SQLite connection string (e.g., `file:./data/ccm.db`)
- `CCM_ENCRYPTION_KEY` - Required for encrypting sensitive values (env vars)
- `NODE_ENV` - development/production
- `NEXT_TELEMETRY_DISABLED=1` - Disabled in Docker builds

**Key Config Files:**
- `packages/server/.env` - Server environment variables
- `packages/server/.env.example` - Template for required env vars
- `packages/server/prisma/schema.prisma` - Database schema
- `tsconfig.base.json` - Shared TypeScript configuration
- Each package has its own `tsconfig.json` extending base

**Build:**
- `tsconfig.base.json` - Base TypeScript config (ES2022, NodeNext modules, strict mode)
- `packages/server/tailwind.config.js` - Tailwind configuration (assumed)
- `packages/server/postcss.config.js` - PostCSS configuration (assumed)

## Platform Requirements

**Development:**
- Node.js 20.x+
- pnpm 9.x
- SQLite (included with Node.js sqlite3)

**Production:**
- Docker with node:20-alpine
- Volume mount for SQLite persistence (`/app/data/`)
- Port 3000 exposed
- Health check endpoint: `/api/health`

**Deployment Target:**
- Docker container on homelab
- Accessed via local network or Tailscale (no authentication layer)

---

*Stack analysis: 2026-01-18*
