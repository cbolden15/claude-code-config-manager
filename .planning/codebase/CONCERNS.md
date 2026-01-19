# Codebase Concerns

**Analysis Date:** 2026-01-18

## Tech Debt

**Extensive `any` Type Usage:**
- Issue: Over 100 instances of `any` type used throughout shared types and CLI commands
- Files: `packages/shared/src/types/sync.ts` (lines 121, 127-130), `packages/cli/src/commands/desktop.ts` (lines 35, 255), `packages/cli/src/commands/settings-env.ts` (lines 30, 208), `packages/test-utils/src/mocks/fetch.ts` (multiple lines)
- Impact: Reduces type safety, allows runtime type errors to slip through, defeats purpose of TypeScript
- Fix approach: Define proper interfaces for `hooks`, `mcpServers`, `agents`, `skills`, `commands` in `SyncPayload` type; replace filter objects with typed interfaces

**Large Monolithic Files:**
- Issue: Several files exceed 500 lines, indicating need for decomposition
- Files:
  - `packages/server/prisma/seed-auto-claude.ts` (1,729 lines) - Seed data
  - `packages/cli/src/commands/auto-claude.ts` (1,145 lines) - CLI commands
  - `packages/cli/__tests__/commands/auto-claude.test.ts` (770 lines) - Tests
- Impact: Hard to navigate, maintain, and test; increases cognitive load
- Fix approach: Split seed-auto-claude.ts into separate files per entity type; split auto-claude.ts into subcommand modules

**Incomplete Test Suite (CLI Package):**
- Issue: Multiple test files marked as TODO in CLI package
- Files: `packages/cli/__tests__/README.md` (lines 205-225)
  - Missing: `settings-hooks.test.ts`, `settings-env.test.ts`, `machine.test.ts`
  - Missing: `api-hooks.test.ts`, `api-env.test.ts`, `api-machines.test.ts`
  - Missing: `integration.test.ts`
- Impact: Insufficient test coverage for CLI commands; regressions may go undetected
- Fix approach: Implement missing test files using existing test utilities in `@ccm/test-utils`

**v3.0 TODO Comments in Planning Doc:**
- Issue: Implementation plan references unimplemented code with TODO comments
- Files: `CCM-V3-UNIFIED-PLAN.md` (lines 1284, 1682, 1686, 2080)
  - `machineId = 'current-machine-id'; // TODO: Get from session`
  - `// TODO: Implement MCP server addition`
  - `// TODO: Implement skill creation`
- Impact: Planning document contains placeholder code that cannot run as-is
- Fix approach: These are expected in planning docs; ensure implementation properly addresses these when v3.0 work begins

## Security Considerations

**No Authentication or Authorization:**
- Risk: All API endpoints are completely open with no auth checks
- Files: All files in `packages/server/src/app/api/` have no middleware or auth verification
- Current mitigation: Network-level trust (local network/Tailscale) as documented in `CLAUDE.md`
- Recommendations: If exposing beyond trusted network, add API key authentication; consider adding rate limiting to prevent abuse

**No Rate Limiting:**
- Risk: API endpoints vulnerable to abuse, DoS potential
- Files: All route handlers in `packages/server/src/app/api/`
- Current mitigation: None implemented (only mentioned in seed data as a recommendation)
- Recommendations: Implement rate limiting middleware for public endpoints; add request throttling for expensive operations like sync and import

**Encryption Key Management:**
- Risk: Encryption depends on single environment variable `CCM_ENCRYPTION_KEY`
- Files: `packages/server/src/lib/encryption.ts` (line 24)
- Current mitigation: Error thrown if key not set; AES-256-GCM with proper salt/IV
- Recommendations: Add key rotation support; document secure key generation and storage practices; consider using a secrets manager

## Performance Bottlenecks

**Seed File Size:**
- Problem: Single 1,729-line seed file for Auto-Claude data
- Files: `packages/server/prisma/seed-auto-claude.ts`
- Cause: All agent configs, prompts, and model profiles in one file
- Improvement path: Split into multiple seed files by entity type; use lazy loading for seeding

**Repeated Database Decryption:**
- Problem: Each decryption operation derives key from password using scrypt
- Files: `packages/server/src/lib/encryption.ts` (lines 16-18), `packages/server/src/lib/settings.ts` (lines 92-100)
- Cause: No key caching; scrypt is intentionally slow
- Improvement path: Cache derived key in memory for request duration; use connection pooling patterns

**Console Logging in Production Code:**
- Problem: Extensive console.log/error calls in API routes and lib files (100+ instances)
- Files: All `packages/server/src/app/api/**/route.ts` files, `packages/server/src/lib/*.ts` files
- Cause: Development debugging left in place
- Improvement path: Replace with structured logging library; conditionally disable in production; add log levels

## Fragile Areas

**Type Casting in SyncPayload:**
- Files: `packages/shared/src/types/sync.ts` (lines 120-131)
- Why fragile: `hooks: Record<string, any>`, `mcpServers: any[]`, etc. allow any data structure
- Safe modification: Define strict interfaces before changing sync logic
- Test coverage: Sync orchestrator tests exist but don't validate payload shapes

**API Client Type Definitions:**
- Files: `packages/cli/src/lib/api.ts` (lines 209-487)
- Why fragile: Types defined inline at bottom of file, not shared with server
- Safe modification: Move to `@ccm/shared` package; import on both sides
- Test coverage: `api-permissions.test.ts` exists but many API methods untested

**JSON Configuration Parsing:**
- Files: `packages/server/src/app/api/generate/route.ts` (line 40), multiple `**/route.ts` files
- Why fragile: `JSON.parse(pc.component.config)` with no try/catch around individual parse
- Safe modification: Wrap each parse in try/catch; validate with Zod after parsing
- Test coverage: Some validation tests exist but edge cases may not be covered

## Scaling Limits

**SQLite Database:**
- Current capacity: Works well for single-user/small team use
- Limit: Concurrent writes, large datasets, multi-region deployment
- Scaling path: Migration to PostgreSQL for production scale; documented as intentional design choice for homelab use

**Single-Server Architecture:**
- Current capacity: One server handling all requests
- Limit: No horizontal scaling; server restart loses all state
- Scaling path: Add Redis for session/cache; container orchestration for HA; current design intentionally simple for homelab

## Dependencies at Risk

**No Outdated Dependencies Detected:**
- Risk: Low - dependencies appear reasonably current based on lock file
- Impact: N/A
- Migration plan: Regular `pnpm update` cycles recommended

## Missing Critical Features

**WS6: Claude Desktop Integration (Incomplete):**
- Problem: Desktop config management workstream not implemented
- Blocks: Cannot manage Claude Desktop MCP servers and plugins from CCM
- Current state: Schema and API routes exist but UI and full integration pending

**v3.0 Smart Recommendations (Not Started):**
- Problem: Intelligence layer described in planning but not implemented
- Blocks: No session tracking, pattern detection, or recommendation generation
- Current state: Planning complete in `CCM-V3-UNIFIED-PLAN.md`; implementation not started

## Test Coverage Gaps

**CLI Command Tests:**
- What's not tested: `settings-hooks`, `settings-env`, `machine` commands
- Files: `packages/cli/src/commands/settings-hooks.ts`, `packages/cli/src/commands/settings-env.ts`, `packages/cli/src/commands/machine.ts`
- Risk: CLI behavior changes may break user workflows without detection
- Priority: High - CLI is primary user interface

**API Client Tests:**
- What's not tested: Hooks, env, machines API clients
- Files: `packages/cli/src/lib/api-hooks.ts`, `packages/cli/src/lib/api-env.ts`, `packages/cli/src/lib/api-machines.ts`
- Risk: Network error handling and response parsing may have issues
- Priority: Medium - covered partially by command tests

**Integration/E2E Tests:**
- What's not tested: End-to-end command flows
- Files: No files exist - `packages/cli/__tests__/integration.test.ts` marked TODO
- Risk: Individual components may work but fail when combined
- Priority: Medium - manual testing currently covers gaps

**UI Component Tests:**
- What's not tested: React components in server package
- Files: `packages/server/src/app/**/*.tsx`, `packages/server/src/components/**/*.tsx`
- Risk: UI regressions from refactoring
- Priority: Low - UI is secondary to CLI/API

---

*Concerns audit: 2026-01-18*
