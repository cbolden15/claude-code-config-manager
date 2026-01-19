# External Integrations

**Analysis Date:** 2026-01-18

## APIs & External Services

**None Detected:**
- This is a self-hosted personal tool
- No external API integrations (Stripe, AWS, etc.)
- Designed to run on local network / Tailscale without cloud dependencies

**Internal API:**
- REST API exposed by Next.js server on port 3000
- CLI communicates with server via HTTP (`packages/cli/src/lib/config.ts`)
- Default server URL: `http://localhost:3000`
- CLI config stored in `~/.ccm/config.json`

## Data Storage

**Databases:**
- SQLite (file-based)
  - Connection: `DATABASE_URL` environment variable
  - Default path: `file:./data/ccm.db` (dev), `file:/app/data/ccm.db` (Docker)
  - Client: Prisma ORM (`packages/server/src/lib/db.ts`)
  - Schema: `packages/server/prisma/schema.prisma`

**File Storage:**
- Local filesystem only
- CLI writes Claude Code config files to project directories
- Database file persisted via Docker volume (`ccm-data:/app/data`)

**Caching:**
- None (no Redis, memcached, etc.)
- Prisma client uses singleton pattern to avoid connection pooling issues

## Authentication & Identity

**Auth Provider:**
- None - Relies on network-level trust
- Expected deployment: Local network or Tailscale VPN
- No user accounts, sessions, or tokens

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Bugsnag, etc.)

**Logs:**
- Console logging via Prisma client
  - Development: query, error, warn levels
  - Production: error level only
- No structured logging framework

**Health Check:**
- `GET /api/health` endpoint
  - Returns database connectivity status
  - Returns component/profile/project counts
  - Used by Docker healthcheck

## CI/CD & Deployment

**Hosting:**
- Docker container on self-hosted homelab
- Dockerfile: `docker/Dockerfile`
- Multi-stage build (deps -> builder -> runner)
- Base image: node:20-alpine

**Docker Compose:**
- `docker/docker-compose.yml` - Standard deployment
- `docker/docker-compose.homelab.yml` - Homelab-specific config

**CI Pipeline:**
- None detected (no GitHub Actions, GitLab CI, etc.)
- Manual deployment via Docker

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - SQLite connection string
- `CCM_ENCRYPTION_KEY` - Master key for encrypting sensitive environment variables

**Optional env vars:**
- `NODE_ENV` - development/production
- `PORT` - Server port (default: 3000)
- `HOSTNAME` - Server hostname (default: 0.0.0.0)

**Secrets location:**
- Environment variables only
- No secrets manager integration
- Encryption uses AES-256-GCM with scrypt key derivation (`packages/server/src/lib/encryption.ts`)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## CLI-Server Communication

**Protocol:**
- HTTP REST API
- CLI makes fetch calls to server endpoints

**Configuration:**
- CLI config file: `~/.ccm/config.json`
- Stores `serverUrl` and `machine` name
- File utilities: `packages/cli/src/lib/config.ts`

**Machine Registration:**
- CLI auto-registers with server on first use
- Machine identified by hostname
- Server tracks machine registry for multi-machine sync

## File Generation

**Output Targets:**
- `.claude/` directory - Claude Code configuration
- `.mcp.json` - MCP server configuration
- `CLAUDE.md` - Project context file
- Claude Code settings files

**Generator Location:**
- `packages/server/src/lib/generators/`
  - `claude-md.ts` - CLAUDE.md templates
  - `mcp-json.ts` - MCP configuration
  - `settings-json.ts` - Settings file generation
  - `subagent.ts`, `skill.ts`, `command.ts` - Component generators
  - `auto-claude/` - Auto-Claude specific generators

## External Tool Integration

**Claude Code:**
- Primary integration target
- Generates configuration files for Claude Code projects
- Manages MCP servers, subagents, skills, commands, hooks

**Claude Desktop:**
- Desktop configuration management (WS6 - in progress)
- MCP server configuration for Claude Desktop app
- Model: `ClaudeDesktopMcp`, `ClaudeDesktopPlugin` in Prisma schema

**n8n:**
- Monitoring integration via `MonitoringEntry` model
- Receives ecosystem updates (changelog, MCP servers)
- Not directly integrated - data pushed from external n8n workflows

---

*Integration audit: 2026-01-18*
