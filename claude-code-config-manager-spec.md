# Claude Code Config Manager (CCM)

## Complete Project Specification

**Version:** 1.0.0-draft
**Last Updated:** January 2025
**Status:** Pre-implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [User Context](#4-user-context)
5. [Claude Code Primitives Reference](#5-claude-code-primitives-reference)
6. [Architecture](#6-architecture)
7. [Technology Stack](#7-technology-stack)
8. [Data Model](#8-data-model)
9. [API Specification](#9-api-specification)
10. [CLI Specification](#10-cli-specification)
11. [UI Specification](#11-ui-specification)
12. [Monitoring System](#12-monitoring-system)
13. [File Structure](#13-file-structure)
14. [Configuration](#14-configuration)
15. [Deployment](#15-deployment)
16. [Development Workflow](#16-development-workflow)
17. [Future Considerations](#17-future-considerations)

---

## 1. Executive Summary

### What is CCM?

Claude Code Config Manager (CCM) is a personal tool for managing Claude Code project configurations across multiple projects. It provides:

- A **web UI** (hosted on homelab) for managing components, profiles, and projects
- A **CLI tool** (installed on laptops/desktops) for scaffolding and configuring projects
- A **monitoring system** (n8n workflow) for tracking updates to Claude Code ecosystem

### Core Value Proposition

Instead of manually creating `.claude/` directories, writing CLAUDE.md files, configuring MCP servers, and copying subagents for each new project, the user:

1. Opens the web UI
2. Creates reusable components (MCP servers, subagents, skills, etc.)
3. Groups them into profiles (e.g., "blockchain", "automation", "general")
4. Uses the CLI to scaffold new projects with a single command

### Key Workflow

```bash
# On laptop, starting a new blockchain project
cd ~/projects
mkdir staking-monitor && cd staking-monitor

# Initialize with CCM
ccm init --profile blockchain
# → Creates .claude/, .mcp.json, CLAUDE.md, subagents, skills, etc.

# Start working
claude
```

---

## 2. Problem Statement

### The Pain Points

The user works on 10-15 projects simultaneously across multiple machines (laptop + desktop Mac mini). Without tooling:

1. **Setup Time:** Each new project requires manually creating Claude Code configuration files
2. **Inconsistency:** Different projects end up with different configurations, missing useful components
3. **Discovery:** Hard to remember which MCP servers, subagents, or skills exist and how to configure them
4. **Updates:** When Claude Code or MCP servers update, manually updating all projects is tedious
5. **Context Switching:** Moving between projects with different setups creates cognitive load

### Current State

- User has zero Claude Code configuration set up (no `~/.claude/` directory)
- User knows this is limiting their Claude Code effectiveness
- User wants to fix this systematically rather than ad-hoc

---

## 3. Solution Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     HOMELAB SERVER                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Next.js Application (Docker)                        │   │
│  │                                                      │   │
│  │  - Web UI for management                             │   │
│  │  - REST API for CLI                                  │   │
│  │  - SQLite database (Prisma)                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  n8n Workflow                                        │   │
│  │                                                      │   │
│  │  - Weekly monitoring of Claude Code ecosystem        │   │
│  │  - Generates digest of changes                       │   │
│  │  - Writes to CCM database via API                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ HTTPS API (no auth, network trust)
                          │
┌─────────────────────────────────────────────────────────────┐
│              LAPTOP / DESKTOP                               │
│                                                             │
│  CLI Tool: ccm                                              │
│                                                             │
│  - Talks to server API                                      │
│  - Writes files locally                                     │
│  - Config stored in ~/.config/ccm/                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Component Creation:** User creates components (MCP servers, subagents, etc.) via web UI → stored in SQLite
2. **Profile Creation:** User groups components into profiles via web UI → stored in SQLite
3. **Project Scaffolding:** User runs `ccm init --profile X` on laptop → CLI calls API → API returns component configs → CLI writes files to local filesystem
4. **Project Tracking:** CLI registers project with server → server tracks which projects use which components
5. **Monitoring:** n8n workflow runs weekly → checks ecosystem sources → writes digest to database → user views in UI

---

## 4. User Context

### Environment

| Item | Details |
|------|---------|
| Primary Machine | Laptop (macOS) |
| Secondary Machine | Desktop Mac mini |
| Homelab | Runs Docker containers, n8n already installed |
| Projects | 10-15 active simultaneously |
| Project Types | Blockchain, automation/n8n, general development |

### Usage Patterns

- Works across multiple machines (needs CLI on each)
- Wants to manage everything from one place (web UI on homelab)
- Prefers visual UI for component editing (not file-based)
- Wants weekly digest of ecosystem changes (not real-time)

---

## 5. Claude Code Primitives Reference

This section documents all Claude Code developer capabilities that CCM manages.

### 5.1 CLAUDE.md

**Purpose:** Persistent project memory and constitution. The most important file for Claude Code.

**Locations (in priority order):**
1. `~/.claude/CLAUDE.md` — Global defaults
2. `.claude/CLAUDE.md` — Project-specific (gitignored by convention)
3. `CLAUDE.md` — Project root (can be committed)

**Contents:**
- Project conventions and architecture
- Coding patterns and preferences
- File structure explanations
- Common commands
- Things Claude should always/never do

**Example:**
```markdown
# Project: Staking Monitor

## Architecture
This is a TypeScript Node.js application that monitors blockchain staking rewards.

## Conventions
- Use functional programming patterns
- All async functions should use async/await, not .then()
- Error handling: use Result types, not try/catch

## File Structure
- src/monitors/ — Blockchain monitoring logic
- src/alerts/ — Notification handlers
- src/config/ — Configuration schemas

## Commands
- `npm run dev` — Start development server
- `npm run test` — Run tests
- `npm run build` — Production build
```

### 5.2 Settings & Configuration Files

**Global Settings:**
- `~/.claude.json` — Main global config
- `~/.claude/settings.json` — User global settings

**Project Settings:**
- `.claude/settings.json` — Project settings (committed)
- `.claude/settings.local.json` — Local overrides (gitignored)

**MCP Configuration:**
- `.mcp.json` — Project MCP server definitions

**Settings Schema:**
```json
{
  "permissions": {
    "allow": ["Read", "Edit", "Create"],
    "deny": ["Bash(rm -rf *)"]
  },
  "env": {
    "NODE_ENV": "development"
  },
  "hooks": { ... },
  "mcpServers": { ... }
}
```

### 5.3 MCP Servers

**Purpose:** External tool integrations via Model Context Protocol (official standard).

**Location:** Defined in `.mcp.json` or settings files.

**Installation:**
```bash
claude mcp add <name> -- npx @modelcontextprotocol/server-<name>
```

**Configuration Format:**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

**Popular MCP Servers:**
- GitHub — Repository operations
- Notion — Workspace integration
- Google Drive — File access
- Postgres — Database queries
- Playwright — Browser automation
- n8n — Workflow automation
- Stripe — Payment operations
- Linear — Issue tracking
- Slack — Messaging

### 5.4 Subagents

**Purpose:** Specialized AI instances with isolated context, auto-delegated by Claude or manually requested.

**Locations:**
- `.claude/agents/` — Project-specific
- `~/.claude/agents/` — Global

**File Format:** Markdown with YAML frontmatter

**Example (.claude/agents/security-reviewer.md):**
```markdown
---
name: Security Reviewer
description: Reviews code for security vulnerabilities
tools:
  - Read
  - Grep
  - Glob
model: claude-sonnet-4-20250514
---

You are a security-focused code reviewer. Your job is to:

1. Identify potential security vulnerabilities
2. Check for common issues (SQL injection, XSS, CSRF, etc.)
3. Review authentication and authorization logic
4. Flag any hardcoded secrets or credentials

When reviewing, be thorough but prioritize high-severity issues.
Always explain WHY something is a vulnerability, not just WHAT.
```

**Frontmatter Fields:**
- `name` (required): Display name
- `description` (required): What the agent does
- `tools` (optional): Allowed tools (defaults to all)
- `model` (optional): Model to use (defaults to current)
- `maxTokens` (optional): Context limit

**Built-in Subagents:**
- `general-purpose` — Default delegation target
- `Explore` — Codebase exploration

### 5.5 Skills

**Purpose:** Auto-triggered capability extensions. Claude uses these automatically when relevant (not user-invoked).

**Locations:**
- `.claude/skills/` — Project-specific
- `~/.claude/skills/` — Global

**Structure:**
```
.claude/skills/
└── api-documentation/
    ├── SKILL.md          # Required: Skill definition
    ├── examples/         # Optional: Example inputs/outputs
    │   ├── input1.json
    │   └── output1.md
    └── scripts/          # Optional: Helper scripts
        └── fetch-schema.sh
```

**SKILL.md Format:**
```markdown
---
name: API Documentation Generator
description: Generates OpenAPI documentation from code
triggers:
  - "generate api docs"
  - "document this api"
  - "create openapi spec"
---

# API Documentation Generator

When asked to generate API documentation, follow these steps:

1. Scan for route definitions in src/routes/
2. Extract request/response types from TypeScript interfaces
3. Generate OpenAPI 3.0 spec
4. Output as YAML

## Output Format

Always generate valid OpenAPI 3.0 YAML with:
- Info section with title and version
- Paths for each endpoint
- Schemas for all request/response types
- Examples where available
```

### 5.6 Slash Commands

**Purpose:** User-triggered workflow shortcuts.

**Locations:**
- `.claude/commands/` — Project-specific
- `~/.claude/commands/` — Global

**File Format:** Markdown with frontmatter

**Example (.claude/commands/deploy.md):**
```markdown
---
name: deploy
description: Deploy the application to production
---

Please help me deploy the application:

1. Run the test suite and ensure all tests pass
2. Build the production bundle
3. Run database migrations if any are pending
4. Deploy to the production server
5. Verify the deployment is healthy

If any step fails, stop and report the issue.
```

**Usage:** `/deploy` in Claude Code

**Built-in Commands:**
- `/init` — Initialize Claude Code in a project
- `/clear` — Clear conversation history
- `/compact` — Compress conversation context
- `/memory` — View/edit CLAUDE.md
- `/mcp` — Manage MCP servers
- `/agents` — List available agents
- `/model` — Switch model
- `/rewind` — Restore from checkpoint
- `/resume` — Continue previous session

### 5.7 Hooks

**Purpose:** Automated lifecycle triggers that run scripts/commands at specific points.

**Location:** Defined in settings.json

**Hook Types:**
- `SessionStart` — When Claude Code session begins
- `PreToolUse` — Before a tool is executed
- `PostToolUse` — After a tool is executed
- `PermissionRequest` — When Claude requests permission
- `Stop` — When Claude stops
- `TaskComplete` — When a task completes
- `Notification` — When Claude sends a notification
- `PreSendMessage` — Before Claude sends a message

**Configuration Format:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Create",
        "command": "npm run format -- $FILE",
        "description": "Auto-format after file changes"
      }
    ],
    "SessionStart": [
      {
        "command": "echo 'Session started at $(date)' >> ~/.claude/session.log",
        "description": "Log session starts"
      }
    ]
  }
}
```

**Use Cases:**
- Auto-format code after edits
- Auto-approve certain permissions
- Send notifications on task completion
- Log activity for debugging

### 5.8 Plugins

**Purpose:** Shareable bundles of commands, agents, hooks, and MCP configurations.

**Structure:**
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json      # Plugin manifest
├── commands/            # Slash commands
├── agents/              # Subagents
├── hooks/               # Hook configurations
├── .mcp.json           # MCP server configs
└── scripts/            # Supporting scripts
```

**plugin.json Format:**
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A useful plugin",
  "author": "username",
  "commands": ["commands/"],
  "agents": ["agents/"],
  "hooks": "hooks.json",
  "mcpServers": ".mcp.json"
}
```

**Installation:**
```
/plugin marketplace add <url>
/plugin install <name>
```

### 5.9 Advanced Features

**Checkpoints:**
- Auto-save before file changes
- Restore with `/rewind`
- Enables safe experimentation

**Background Tasks:**
- Long-running processes
- Non-blocking execution

**Parallel Subagents:**
- Multiple agents via Task tool
- Concurrent work on different parts

**Plan Mode:**
- Review before execution
- Approve/reject proposed changes

**Git Worktrees:**
- Multiple agents in isolated branches
- Parallel development streams

---

## 6. Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOMELAB SERVER                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Docker Container                       │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              Next.js Application                    │  │  │
│  │  │                                                    │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │  │
│  │  │  │   Web UI    │  │  API Routes │  │  Prisma   │  │  │  │
│  │  │  │  (React +   │  │  /api/*     │  │  Client   │  │  │  │
│  │  │  │  shadcn/ui) │  │             │  │           │  │  │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  │  │                                           │         │  │  │
│  │  │                                           ▼         │  │  │
│  │  │                                    ┌───────────┐    │  │  │
│  │  │                                    │  SQLite   │    │  │  │
│  │  │                                    │  Database │    │  │  │
│  │  │                                    └───────────┘    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    n8n (existing)                         │  │
│  │                                                          │  │
│  │  Workflow: CCM Ecosystem Monitor                         │  │
│  │  - Runs weekly                                           │  │
│  │  - Checks Claude Code docs, MCP repos, etc.              │  │
│  │  - POSTs digest to CCM API                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP (local network / Tailscale)
                              │ No authentication
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT MACHINES                            │
│                                                                 │
│  ┌────────────────────────┐    ┌────────────────────────┐      │
│  │       Laptop           │    │    Desktop Mac mini    │      │
│  │                        │    │                        │      │
│  │  $ ccm init            │    │  $ ccm init            │      │
│  │  $ ccm apply           │    │  $ ccm apply           │      │
│  │  $ ccm list            │    │  $ ccm list            │      │
│  │                        │    │                        │      │
│  │  Config:               │    │  Config:               │      │
│  │  ~/.config/ccm/        │    │  ~/.config/ccm/        │      │
│  │    config.json         │    │    config.json         │      │
│  └────────────────────────┘    └────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Request Flow: Project Scaffolding

```
User runs: ccm init my-project --profile blockchain

┌─────────────────────────────────────────────────────────────────┐
│ CLI (laptop)                                                    │
│                                                                 │
│ 1. Parse command: init, name=my-project, profile=blockchain     │
│ 2. Read server URL from ~/.config/ccm/config.json               │
│ 3. GET /api/profiles/blockchain                                 │
│    └─→ Returns profile with component IDs                       │
│ 4. GET /api/generate?profileId=blockchain&projectName=my-project│
│    └─→ Returns all file contents to create                      │
│ 5. Write files to current directory:                            │
│    - .claude/CLAUDE.md                                          │
│    - .claude/settings.json                                      │
│    - .claude/agents/*.md                                        │
│    - .claude/skills/*/SKILL.md                                  │
│    - .claude/commands/*.md                                      │
│    - .mcp.json                                                  │
│ 6. POST /api/projects (register project)                        │
│    └─→ {name, path, machine, profileId}                         │
│ 7. Print success message                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Request Flow: Component Update

```
User updates MCP server config in web UI

┌─────────────────────────────────────────────────────────────────┐
│ Browser                                                         │
│                                                                 │
│ 1. User edits GitHub MCP server config                          │
│ 2. Form submits PUT /api/components/mcp-github                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Next.js API Route                                               │
│                                                                 │
│ 1. Validate request body                                        │
│ 2. Update component in database                                 │
│ 3. Find all projects using this component                       │
│ 4. Mark projects as "needs sync"                                │
│ 5. Return updated component                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Technology Stack

### 7.1 Complete Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| **Frontend** | Next.js | 14.x | App Router |
| **UI Components** | shadcn/ui | latest | Tailwind-based |
| **Styling** | Tailwind CSS | 3.x | Utility-first |
| **Database** | SQLite | 3.x | Single file |
| **ORM** | Prisma | 5.x | Type-safe queries |
| **CLI** | Node.js | 20.x LTS | TypeScript |
| **CLI Framework** | Commander.js | 11.x | Command parsing |
| **HTTP Client** | ky or fetch | - | For CLI API calls |
| **Container** | Docker | - | Deployment |
| **Monitoring** | n8n | existing | Workflow automation |

### 7.2 Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript | Type safety across all code |
| ESLint | Linting |
| Prettier | Formatting |
| pnpm | Package management (workspaces) |
| Turborepo (optional) | Monorepo build system |

### 7.3 Monorepo Structure

The project uses a pnpm workspace monorepo:

```
claude-code-config-manager/
├── packages/
│   ├── server/          # Next.js application
│   ├── cli/             # CCM CLI tool
│   └── shared/          # Shared types and utilities
├── pnpm-workspace.yaml
├── package.json
└── turbo.json           # Optional: Turborepo config
```

---

## 8. Data Model

### 8.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────────┐
│    Component    │       │       Profile       │
├─────────────────┤       ├─────────────────────┤
│ id              │       │ id                  │
│ type            │       │ name                │
│ name            │◄──────┤ description         │
│ description     │   N:M │ claudeMdTemplate    │
│ config (JSON)   │       │ createdAt           │
│ sourceUrl       │       │ updatedAt           │
│ version         │       └─────────────────────┘
│ createdAt       │                │
│ updatedAt       │                │
└─────────────────┘                │
        │                          │
        │ N:M                      │ 1:N
        │                          │
        ▼                          ▼
┌─────────────────────────────────────────────┐
│                   Project                    │
├─────────────────────────────────────────────┤
│ id                                          │
│ name                                        │
│ path                                        │
│ machine                                     │
│ profileId (FK)                              │
│ syncStatus (enum)                           │
│ lastSyncedAt                                │
│ createdAt                                   │
│ updatedAt                                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│              MonitoringEntry                 │
├─────────────────────────────────────────────┤
│ id                                          │
│ source (enum)                               │
│ changeType (enum)                           │
│ title                                       │
│ description                                 │
│ url                                         │
│ detectedAt                                  │
│ acknowledged                                │
└─────────────────────────────────────────────┘
```

### 8.2 Prisma Schema

```prisma
// packages/server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============================================================================
// Components
// ============================================================================

enum ComponentType {
  MCP_SERVER
  SUBAGENT
  SKILL
  COMMAND
  HOOK
  CLAUDE_MD_TEMPLATE
}

model Component {
  id          String        @id @default(cuid())
  type        ComponentType
  name        String
  description String?
  config      String        // JSON blob
  sourceUrl   String?       // GitHub repo, docs link, etc.
  version     String?
  tags        String?       // Comma-separated tags for filtering
  
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  profiles    ProfileComponent[]
  projects    ProjectComponent[]
  
  @@unique([type, name])
  @@index([type])
}

// ============================================================================
// Profiles
// ============================================================================

model Profile {
  id                String   @id @default(cuid())
  name              String   @unique
  description       String?
  claudeMdTemplate  String?  // Base CLAUDE.md content for this profile
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  components        ProfileComponent[]
  projects          Project[]
}

model ProfileComponent {
  profileId   String
  componentId String
  
  profile     Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  component   Component @relation(fields: [componentId], references: [id], onDelete: Cascade)
  
  @@id([profileId, componentId])
}

// ============================================================================
// Projects
// ============================================================================

enum SyncStatus {
  SYNCED
  NEEDS_SYNC
  NEVER_SYNCED
}

model Project {
  id           String     @id @default(cuid())
  name         String
  path         String?    // Filesystem path, e.g., ~/projects/my-app
  machine      String?    // Machine identifier, e.g., "laptop", "desktop"
  profileId    String?
  syncStatus   SyncStatus @default(NEVER_SYNCED)
  lastSyncedAt DateTime?
  notes        String?
  
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  profile      Profile?   @relation(fields: [profileId], references: [id])
  components   ProjectComponent[]
  
  @@unique([path, machine])
  @@index([profileId])
  @@index([syncStatus])
}

model ProjectComponent {
  projectId   String
  componentId String
  
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  component   Component @relation(fields: [componentId], references: [id], onDelete: Cascade)
  
  @@id([projectId, componentId])
}

// ============================================================================
// Monitoring
// ============================================================================

enum MonitoringSource {
  CLAUDE_CODE_DOCS
  ANTHROPIC_BLOG
  MCP_GITHUB
  AWESOME_CLAUDE_CODE
  NPM_PACKAGES
}

enum ChangeType {
  NEW_FEATURE
  UPDATE
  DEPRECATION
  BREAKING_CHANGE
  NEW_RELEASE
  NEW_COMPONENT
}

model MonitoringEntry {
  id           Int              @id @default(autoincrement())
  source       MonitoringSource
  changeType   ChangeType
  title        String
  description  String?
  url          String?
  metadata     String?          // JSON blob for source-specific data
  detectedAt   DateTime         @default(now())
  acknowledged Boolean          @default(false)
  
  @@index([source])
  @@index([detectedAt])
  @@index([acknowledged])
}

// ============================================================================
// Settings (Key-Value Store)
// ============================================================================

model Setting {
  key       String   @id
  value     String   // JSON blob
  updatedAt DateTime @updatedAt
}
```

### 8.3 Component Config Schemas

Each component type has a specific JSON schema for its `config` field:

#### MCP Server Config
```typescript
interface McpServerConfig {
  // How to run the server
  command: string;           // e.g., "npx"
  args: string[];           // e.g., ["-y", "@modelcontextprotocol/server-github"]
  
  // Environment variables (can use ${VAR} syntax for secrets)
  env?: Record<string, string>;
  
  // Optional metadata
  documentation?: string;    // Link to docs
  requiredSecrets?: string[]; // e.g., ["GITHUB_TOKEN"]
}
```

#### Subagent Config
```typescript
interface SubagentConfig {
  // Frontmatter fields
  name: string;
  description: string;
  tools?: string[];          // e.g., ["Read", "Edit", "Bash"]
  model?: string;            // e.g., "claude-sonnet-4-20250514"
  maxTokens?: number;
  
  // Body content
  instructions: string;      // Markdown content after frontmatter
}
```

#### Skill Config
```typescript
interface SkillConfig {
  // Frontmatter fields
  name: string;
  description: string;
  triggers?: string[];       // Phrases that activate the skill
  
  // Body content
  instructions: string;      // Markdown content after frontmatter
  
  // Optional additional files
  examples?: Array<{
    filename: string;
    content: string;
  }>;
  scripts?: Array<{
    filename: string;
    content: string;
  }>;
}
```

#### Command Config
```typescript
interface CommandConfig {
  // Frontmatter fields
  name: string;              // Command name (without slash)
  description: string;
  
  // Body content
  prompt: string;            // Markdown content after frontmatter
}
```

#### Hook Config
```typescript
interface HookConfig {
  hookType: 'SessionStart' | 'PreToolUse' | 'PostToolUse' | 'PermissionRequest' | 'Stop' | 'TaskComplete' | 'Notification' | 'PreSendMessage';
  
  // For tool-based hooks
  matcher?: string;          // Regex to match tool names, e.g., "Edit|Create"
  
  // What to run
  command: string;           // Shell command
  
  // Metadata
  description?: string;
}
```

#### CLAUDE.md Template Config
```typescript
interface ClaudeMdTemplateConfig {
  name: string;
  description: string;
  content: string;           // Markdown content with {{placeholders}}
  placeholders?: Array<{
    name: string;
    description: string;
    default?: string;
  }>;
}
```

---

## 9. API Specification

### 9.1 Base URL

```
http://<homelab-ip>:3000/api
```

### 9.2 Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Components** | | |
| GET | `/components` | List all components |
| GET | `/components/:id` | Get single component |
| POST | `/components` | Create component |
| PUT | `/components/:id` | Update component |
| DELETE | `/components/:id` | Delete component |
| **Profiles** | | |
| GET | `/profiles` | List all profiles |
| GET | `/profiles/:id` | Get profile with components |
| POST | `/profiles` | Create profile |
| PUT | `/profiles/:id` | Update profile |
| DELETE | `/profiles/:id` | Delete profile |
| POST | `/profiles/:id/components` | Add component to profile |
| DELETE | `/profiles/:id/components/:componentId` | Remove component |
| **Projects** | | |
| GET | `/projects` | List all projects |
| GET | `/projects/:id` | Get single project |
| POST | `/projects` | Register project |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/sync` | Mark as synced |
| **Generation** | | |
| POST | `/generate` | Generate files for a project |
| **Monitoring** | | |
| GET | `/monitoring` | List monitoring entries |
| POST | `/monitoring` | Add monitoring entry (from n8n) |
| PUT | `/monitoring/:id/acknowledge` | Mark as acknowledged |
| **Export/Import** | | |
| GET | `/export` | Export all data as JSON |
| POST | `/import` | Import data from JSON |
| **Health** | | |
| GET | `/health` | Health check |

### 9.3 Endpoint Details

#### GET /api/components

List all components with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by component type |
| search | string | Search in name and description |
| tags | string | Filter by tags (comma-separated) |

**Response:**
```json
{
  "components": [
    {
      "id": "clx1234...",
      "type": "MCP_SERVER",
      "name": "github",
      "description": "GitHub integration via MCP",
      "config": { ... },
      "sourceUrl": "https://github.com/modelcontextprotocol/servers",
      "version": "1.0.0",
      "tags": "git,vcs,collaboration",
      "createdAt": "2025-01-15T...",
      "updatedAt": "2025-01-15T..."
    }
  ],
  "total": 42
}
```

#### POST /api/components

Create a new component.

**Request Body:**
```json
{
  "type": "MCP_SERVER",
  "name": "github",
  "description": "GitHub integration via MCP",
  "config": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_TOKEN": "${GITHUB_TOKEN}"
    },
    "requiredSecrets": ["GITHUB_TOKEN"]
  },
  "sourceUrl": "https://github.com/modelcontextprotocol/servers",
  "version": "1.0.0",
  "tags": "git,vcs,collaboration"
}
```

**Response:** Created component object

#### POST /api/generate

Generate all configuration files for a project.

**Request Body:**
```json
{
  "profileId": "clx1234...",
  "projectName": "my-staking-monitor",
  "placeholders": {
    "projectDescription": "A tool for monitoring staking rewards"
  }
}
```

**Response:**
```json
{
  "files": [
    {
      "path": ".claude/CLAUDE.md",
      "content": "# Project: my-staking-monitor\n\n..."
    },
    {
      "path": ".claude/settings.json",
      "content": "{\n  \"permissions\": {...}\n}"
    },
    {
      "path": ".claude/agents/security-reviewer.md",
      "content": "---\nname: Security Reviewer\n..."
    },
    {
      "path": ".mcp.json",
      "content": "{\n  \"mcpServers\": {...}\n}"
    }
  ],
  "summary": {
    "mcpServers": 3,
    "subagents": 2,
    "skills": 1,
    "commands": 4,
    "hooks": 2
  }
}
```

#### GET /api/export

Export entire database for backup.

**Response:**
```json
{
  "version": "1.0.0",
  "exportedAt": "2025-01-15T...",
  "data": {
    "components": [...],
    "profiles": [...],
    "projects": [...],
    "monitoring": [...]
  }
}
```

---

## 10. CLI Specification

### 10.1 Installation

```bash
npm install -g @username/ccm
```

Or via the monorepo:
```bash
cd packages/cli
pnpm build
pnpm link --global
```

### 10.2 Configuration

The CLI stores configuration in `~/.config/ccm/config.json`:

```json
{
  "serverUrl": "http://192.168.1.100:3000",
  "defaultProfile": "general",
  "machine": "laptop"
}
```

### 10.3 Command Tree

```
ccm
├── config                    # Manage CLI configuration
│   ├── set <key> <value>    # Set a config value
│   ├── get <key>            # Get a config value
│   └── list                 # List all config
│
├── init [name]              # Initialize new project
│   ├── --profile, -p        # Profile to use
│   ├── --template, -t       # CLAUDE.md template to use
│   └── --dry-run           # Show what would be created
│
├── apply                    # Apply/update config to existing project
│   ├── --profile, -p        # Profile to apply
│   ├── --component, -c      # Specific component to add
│   ├── --force, -f          # Overwrite existing files
│   └── --dry-run           # Show what would change
│
├── list                     # List things
│   ├── profiles            # List available profiles
│   ├── components          # List available components
│   └── projects            # List tracked projects
│
├── sync                     # Sync project with server
│   └── --all               # Sync all projects on this machine
│
├── status                   # Show project status
│
├── export                   # Export project config to JSON
│   └── --output, -o        # Output file path
│
└── help                     # Show help
```

### 10.4 Command Details

#### ccm init

Initialize a new project with Claude Code configuration.

```bash
# Basic usage (uses default profile)
ccm init my-project

# With specific profile
ccm init my-project --profile blockchain

# In current directory (no name = use current dir name)
ccm init --profile automation

# Dry run to see what would be created
ccm init my-project --profile blockchain --dry-run
```

**Behavior:**
1. If name provided, create directory `./name/`
2. Fetch profile from server
3. Generate all configuration files
4. Write files to filesystem
5. Register project with server
6. Print summary

**Output:**
```
✓ Created .claude/CLAUDE.md
✓ Created .claude/settings.json
✓ Created .claude/agents/security-reviewer.md
✓ Created .claude/agents/code-reviewer.md
✓ Created .claude/skills/api-docs/SKILL.md
✓ Created .claude/commands/deploy.md
✓ Created .mcp.json

Project initialized with profile "blockchain":
  • 3 MCP servers (github, postgres, notion)
  • 2 subagents
  • 1 skill
  • 1 command
  • 2 hooks

Run 'claude' to start coding!
```

#### ccm apply

Apply configuration to an existing project.

```bash
# Apply a profile to current directory
ccm apply --profile automation

# Add a specific component
ccm apply --component mcp-github

# Force overwrite existing files
ccm apply --profile blockchain --force
```

**Behavior:**
1. Check if project is already tracked
2. If tracked, compare current vs new config
3. Generate files
4. Prompt for confirmation if files would be overwritten (unless --force)
5. Write files
6. Update project record

#### ccm list

List available resources.

```bash
# List profiles
ccm list profiles

# List components (optionally filter by type)
ccm list components
ccm list components --type mcp_server
ccm list components --type subagent

# List tracked projects
ccm list projects
ccm list projects --machine laptop
```

**Output (profiles):**
```
Available Profiles:

  blockchain
    Components: 8 (3 MCP, 2 agents, 1 skill, 2 commands)
    Projects: 3

  automation  
    Components: 6 (4 MCP, 1 agent, 1 skill)
    Projects: 5

  general (default)
    Components: 4 (2 MCP, 2 agents)
    Projects: 7
```

#### ccm status

Show current project status.

```bash
ccm status
```

**Output:**
```
Project: staking-monitor
Path: ~/projects/staking-monitor
Machine: laptop
Profile: blockchain
Last Synced: 2 days ago
Status: NEEDS_SYNC

Components needing update:
  • mcp-github (version 1.0.0 → 1.1.0)
  • subagent-security-reviewer (modified)

Run 'ccm sync' to update.
```

#### ccm sync

Synchronize project with latest component versions.

```bash
# Sync current project
ccm sync

# Sync all projects on this machine
ccm sync --all
```

### 10.5 CLI Architecture

```
packages/cli/
├── src/
│   ├── index.ts              # Entry point, command registration
│   ├── commands/
│   │   ├── init.ts
│   │   ├── apply.ts
│   │   ├── list.ts
│   │   ├── sync.ts
│   │   ├── status.ts
│   │   ├── export.ts
│   │   └── config.ts
│   ├── lib/
│   │   ├── api.ts            # Server API client
│   │   ├── config.ts         # CLI config management
│   │   ├── files.ts          # File system operations
│   │   └── output.ts         # Console formatting
│   └── types/
│       └── index.ts          # Shared types
├── package.json
└── tsconfig.json
```

---

## 11. UI Specification

### 11.1 Page Structure

```
/                           # Dashboard
/components                 # Component library
/components/new             # Create component
/components/:id             # Edit component
/profiles                   # Profile management
/profiles/new               # Create profile
/profiles/:id               # Edit profile
/projects                   # Project list
/projects/:id               # Project details
/monitoring                 # Monitoring digest
/settings                   # App settings
/export                     # Export/Import
```

### 11.2 Page Descriptions

#### Dashboard (/)

**Purpose:** Quick overview of system state.

**Content:**
- Stats cards: Total components, profiles, projects, pending updates
- Recent activity feed
- Projects needing sync (highlighted)
- Latest monitoring alerts (if unacknowledged)
- Quick actions: New project, New component

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code Config Manager                    [Settings] [?]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │   42    │ │    5    │ │   15    │ │    3    │              │
│  │Components│ │ Profiles│ │ Projects│ │ Updates │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                 │
│  Projects Needing Sync                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ staking-monitor      blockchain    2 components outdated │   │
│  │ n8n-workflows        automation    1 component outdated  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recent Monitoring Alerts                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🆕 New MCP server: Linear integration    [Acknowledge]   │   │
│  │ 📦 Update: @mcp/server-github v1.1.0     [Acknowledge]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Components (/components)

**Purpose:** Browse and manage component library.

**Content:**
- Filter by type (tabs or dropdown)
- Search box
- Component cards with: name, type badge, description, tags
- Click to edit, quick actions (duplicate, delete)

**Component Card:**
```
┌────────────────────────────────────────────────┐
│ [MCP]  GitHub                           [···]  │
│                                                │
│ GitHub integration via Model Context Protocol  │
│                                                │
│ Tags: git, vcs, collaboration                  │
│ Used in: 3 profiles, 8 projects               │
└────────────────────────────────────────────────┘
```

#### Component Editor (/components/:id)

**Purpose:** Create or edit a component.

**Content:**
- Type selector (for new)
- Name field
- Description field
- Dynamic config form based on type:
  - MCP: command, args, env vars, required secrets
  - Subagent: name, description, tools, model, instructions
  - Skill: name, triggers, instructions, examples
  - Command: name, prompt
  - Hook: type, matcher, command
- Source URL field
- Version field
- Tags field
- Preview of generated file(s)
- Save / Cancel buttons

#### Profiles (/profiles)

**Purpose:** Manage component bundles.

**Content:**
- Profile cards with: name, description, component count, project count
- Click to edit

#### Profile Editor (/profiles/:id)

**Purpose:** Create or edit a profile.

**Content:**
- Name field
- Description field
- CLAUDE.md template (markdown editor)
- Component selector:
  - Available components (grouped by type)
  - Selected components
  - Drag to reorder (for settings merge order)
- Preview generated .claude/ structure
- Save / Cancel buttons

#### Projects (/projects)

**Purpose:** View tracked projects.

**Content:**
- Table with: name, path, machine, profile, status, last synced
- Filter by machine, profile, status
- Bulk actions: sync selected, remove from tracking

#### Monitoring (/monitoring)

**Purpose:** View ecosystem updates digest.

**Content:**
- Filter by source, change type, date range
- Entries grouped by date
- Each entry: source badge, type badge, title, description, link
- Acknowledge button
- "Acknowledge all" bulk action

---

## 12. Monitoring System

### 12.1 Overview

The monitoring system runs as an n8n workflow that periodically checks ecosystem sources and reports changes to CCM.

### 12.2 Sources to Monitor

| Source | What to Check | Frequency |
|--------|--------------|-----------|
| Claude Code Docs | docs.anthropic.com/claude-code | Weekly |
| Anthropic Blog | anthropic.com/blog | Weekly |
| MCP GitHub | github.com/modelcontextprotocol/servers | Weekly |
| awesome-claude-code | GitHub awesome list | Weekly |
| npm Packages | MCP server packages | Weekly |

### 12.3 n8n Workflow Structure

```
┌─────────────┐
│   Trigger   │ (Schedule: Weekly on Monday 9am)
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Check Docs  │────▶│ Check Blog  │────▶│ Check GitHub│
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Compare   │     │   Compare   │     │   Compare   │
│  with last  │     │  with last  │     │  with last  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Merge &   │
                    │   Format    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  POST to    │
                    │  CCM API    │
                    └─────────────┘
```

### 12.4 Detection Logic

For each source, detect:

**Claude Code Docs:**
- New pages added
- Content changes (diff)
- New features mentioned

**Anthropic Blog:**
- New posts mentioning "Claude Code"
- New posts about MCP

**MCP GitHub:**
- New releases in modelcontextprotocol/servers
- New servers added to registry
- Breaking changes in changelogs

**awesome-claude-code:**
- New entries added to the list
- Categories changed

**npm Packages:**
- Version bumps for known MCP packages
- New packages matching patterns

### 12.5 API Payload

When n8n detects changes, it POSTs to CCM:

```json
{
  "entries": [
    {
      "source": "MCP_GITHUB",
      "changeType": "NEW_RELEASE",
      "title": "@modelcontextprotocol/server-github v1.1.0",
      "description": "Added support for GitHub Actions integration",
      "url": "https://github.com/...",
      "metadata": {
        "packageName": "@modelcontextprotocol/server-github",
        "previousVersion": "1.0.0",
        "newVersion": "1.1.0"
      }
    }
  ]
}
```

---

## 13. File Structure

### 13.1 Complete Repository Structure

```
claude-code-config-manager/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline
│
├── packages/
│   ├── server/                       # Next.js application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx          # Dashboard
│   │   │   │   ├── components/
│   │   │   │   │   ├── page.tsx      # Components list
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx  # New component
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Edit component
│   │   │   │   ├── profiles/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── monitoring/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── api/
│   │   │   │       ├── components/
│   │   │   │       │   ├── route.ts          # GET, POST
│   │   │   │       │   └── [id]/
│   │   │   │       │       └── route.ts      # GET, PUT, DELETE
│   │   │   │       ├── profiles/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── [id]/
│   │   │   │       │       ├── route.ts
│   │   │   │       │       └── components/
│   │   │   │       │           └── route.ts
│   │   │   │       ├── projects/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── [id]/
│   │   │   │       │       ├── route.ts
│   │   │   │       │       └── sync/
│   │   │   │       │           └── route.ts
│   │   │   │       ├── generate/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── monitoring/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── [id]/
│   │   │   │       │       └── acknowledge/
│   │   │   │       │           └── route.ts
│   │   │   │       ├── export/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── import/
│   │   │   │       │   └── route.ts
│   │   │   │       └── health/
│   │   │   │           └── route.ts
│   │   │   ├── components/                   # React components
│   │   │   │   ├── ui/                       # shadcn/ui components
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── card.tsx
│   │   │   │   │   ├── input.tsx
│   │   │   │   │   ├── select.tsx
│   │   │   │   │   ├── table.tsx
│   │   │   │   │   ├── tabs.tsx
│   │   │   │   │   ├── textarea.tsx
│   │   │   │   │   ├── badge.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── layout/
│   │   │   │   │   ├── header.tsx
│   │   │   │   │   ├── sidebar.tsx
│   │   │   │   │   └── nav.tsx
│   │   │   │   ├── forms/
│   │   │   │   │   ├── component-form.tsx
│   │   │   │   │   ├── profile-form.tsx
│   │   │   │   │   ├── mcp-config-form.tsx
│   │   │   │   │   ├── subagent-config-form.tsx
│   │   │   │   │   ├── skill-config-form.tsx
│   │   │   │   │   ├── command-config-form.tsx
│   │   │   │   │   └── hook-config-form.tsx
│   │   │   │   ├── component-card.tsx
│   │   │   │   ├── profile-card.tsx
│   │   │   │   ├── project-table.tsx
│   │   │   │   ├── monitoring-feed.tsx
│   │   │   │   └── file-preview.tsx
│   │   │   ├── lib/
│   │   │   │   ├── db.ts                     # Prisma client singleton
│   │   │   │   ├── generators/               # File content generators
│   │   │   │   │   ├── claude-md.ts
│   │   │   │   │   ├── settings-json.ts
│   │   │   │   │   ├── mcp-json.ts
│   │   │   │   │   ├── subagent.ts
│   │   │   │   │   ├── skill.ts
│   │   │   │   │   ├── command.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── validators/               # Zod schemas
│   │   │   │   │   ├── component.ts
│   │   │   │   │   ├── profile.ts
│   │   │   │   │   ├── project.ts
│   │   │   │   │   └── monitoring.ts
│   │   │   │   └── utils.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts                       # Seed data
│   │   ├── public/
│   │   ├── tailwind.config.ts
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                                  # CLI application
│   │   ├── src/
│   │   │   ├── index.ts                      # Entry point
│   │   │   ├── commands/
│   │   │   │   ├── init.ts
│   │   │   │   ├── apply.ts
│   │   │   │   ├── list.ts
│   │   │   │   ├── sync.ts
│   │   │   │   ├── status.ts
│   │   │   │   ├── export.ts
│   │   │   │   └── config.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts                    # HTTP client
│   │   │   │   ├── config.ts                 # CLI config (~/.config/ccm/)
│   │   │   │   ├── files.ts                  # Filesystem operations
│   │   │   │   └── output.ts                 # Console formatting
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── bin/
│   │   │   └── ccm.js                        # Executable entry
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                               # Shared code
│       ├── src/
│       │   ├── types/
│       │   │   ├── component.ts
│       │   │   ├── profile.ts
│       │   │   ├── project.ts
│       │   │   ├── monitoring.ts
│       │   │   └── api.ts
│       │   ├── schemas/                      # Zod schemas used by both
│       │   │   └── index.ts
│       │   └── constants/
│       │       └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── CLI.md
│   └── DEPLOYMENT.md
│
├── .env.example
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── package.json                              # Root package.json
├── pnpm-workspace.yaml
├── turbo.json                                # Turborepo config
└── README.md
```

### 13.2 Generated Project Files

When `ccm init` runs, it creates this structure in the target project:

```
my-project/
├── .claude/
│   ├── CLAUDE.md                # Project constitution
│   ├── settings.json            # Claude Code settings
│   ├── settings.local.json      # Local overrides (gitignored)
│   ├── agents/                  # Subagents
│   │   ├── security-reviewer.md
│   │   └── code-reviewer.md
│   ├── skills/                  # Skills
│   │   └── api-documentation/
│   │       ├── SKILL.md
│   │       └── examples/
│   └── commands/                # Slash commands
│       └── deploy.md
└── .mcp.json                    # MCP server configuration
```

---

## 14. Configuration

### 14.1 Environment Variables (Server)

```bash
# .env

# Database
DATABASE_URL="file:./data/ccm.db"

# Server
PORT=3000
HOST=0.0.0.0

# Optional: for n8n webhook auth
N8N_WEBHOOK_SECRET=your-secret-here
```

### 14.2 CLI Configuration

Location: `~/.config/ccm/config.json`

```json
{
  "serverUrl": "http://192.168.1.100:3000",
  "defaultProfile": "general",
  "machine": "laptop",
  "checkUpdates": true
}
```

### 14.3 Docker Configuration

`docker/docker-compose.yml`:
```yaml
version: '3.8'

services:
  ccm:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ccm-data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/ccm.db
      - PORT=3000
    restart: unless-stopped

volumes:
  ccm-data:
```

`docker/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/server ./packages/server
COPY packages/shared ./packages/shared

# Generate Prisma client
RUN cd packages/server && pnpm prisma generate

# Build
RUN pnpm --filter server build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/packages/server/.next/standalone ./
COPY --from=builder /app/packages/server/.next/static ./.next/static
COPY --from=builder /app/packages/server/public ./public
COPY --from=builder /app/packages/server/prisma ./prisma

# Create data directory
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
```

---

## 15. Deployment

### 15.1 Initial Setup

```bash
# Clone repository
git clone https://github.com/username/claude-code-config-manager.git
cd claude-code-config-manager

# Build and start with Docker
cd docker
docker-compose up -d

# Initialize database
docker-compose exec ccm npx prisma migrate deploy
docker-compose exec ccm npx prisma db seed
```

### 15.2 Updates

```bash
cd claude-code-config-manager
git pull
cd docker
docker-compose build
docker-compose up -d
docker-compose exec ccm npx prisma migrate deploy
```

### 15.3 Backups

```bash
# Backup database
docker cp ccm:/app/data/ccm.db ./backups/ccm-$(date +%Y%m%d).db

# Or use the export API
curl http://localhost:3000/api/export > backup-$(date +%Y%m%d).json
```

### 15.4 CLI Installation (on client machines)

```bash
# Option 1: Install from npm (if published)
npm install -g @username/ccm

# Option 2: Install from source
git clone https://github.com/username/claude-code-config-manager.git
cd claude-code-config-manager
pnpm install
pnpm --filter cli build
cd packages/cli
npm link

# Configure
ccm config set serverUrl http://homelab:3000
ccm config set machine laptop
```

---

## 16. Development Workflow

### 16.1 Local Development

```bash
# Clone and install
git clone https://github.com/username/claude-code-config-manager.git
cd claude-code-config-manager
pnpm install

# Setup database
cd packages/server
cp .env.example .env
pnpm prisma migrate dev
pnpm prisma db seed

# Run development server
pnpm dev

# In another terminal, work on CLI
cd packages/cli
pnpm dev
```

### 16.2 Testing

```bash
# Run all tests
pnpm test

# Run server tests
pnpm --filter server test

# Run CLI tests
pnpm --filter cli test
```

### 16.3 Adding a New Component Type

1. Update Prisma schema enum
2. Add config interface to `packages/shared/src/types/component.ts`
3. Add Zod schema to `packages/server/src/lib/validators/component.ts`
4. Add generator function to `packages/server/src/lib/generators/`
5. Add form component to `packages/server/src/components/forms/`
6. Update component editor page to handle new type
7. Update CLI to handle new type in file generation

---

## 17. Future Considerations

### 17.1 Potential Enhancements

**Not in v1, but may add later:**

- **Component versioning:** Track history of component changes
- **Project groups:** Organize projects into groups/folders
- **Template variables:** More sophisticated placeholder system
- **Import from GitHub:** Import components from public repos
- **Share profiles:** Export/import profiles as JSON
- **Multiple servers:** Support connecting CLI to different servers
- **Mobile view:** Responsive UI for phone access
- **Notifications:** Email/push when monitoring detects important changes
- **Component testing:** Validate components work before adding to projects

### 17.2 Known Limitations

- **No auth:** Relies on network-level security
- **Single user:** No multi-user support
- **Manual sync:** Projects don't auto-update when components change
- **No rollback:** No built-in way to revert project config changes

### 17.3 Dependencies on Claude Code

This tool depends on Claude Code's configuration format remaining stable. If Anthropic changes:
- File locations (`.claude/`, `.mcp.json`)
- File formats (settings.json schema)
- Feature semantics (how subagents/skills work)

...then CCM's generators will need updates. The monitoring system should help detect these changes.

---

## Appendix A: Example Components

### A.1 MCP Server: GitHub

```json
{
  "type": "MCP_SERVER",
  "name": "github",
  "description": "GitHub integration for repository operations, issues, PRs, and actions",
  "config": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_TOKEN": "${GITHUB_TOKEN}"
    },
    "requiredSecrets": ["GITHUB_TOKEN"],
    "documentation": "https://github.com/modelcontextprotocol/servers/tree/main/src/github"
  },
  "sourceUrl": "https://github.com/modelcontextprotocol/servers",
  "version": "1.0.0",
  "tags": "git,vcs,collaboration,github"
}
```

### A.2 Subagent: Security Reviewer

```json
{
  "type": "SUBAGENT",
  "name": "security-reviewer",
  "description": "Reviews code for security vulnerabilities and best practices",
  "config": {
    "name": "Security Reviewer",
    "description": "Reviews code for security vulnerabilities",
    "tools": ["Read", "Grep", "Glob"],
    "model": "claude-sonnet-4-20250514",
    "instructions": "You are a security-focused code reviewer. Your job is to:\n\n1. Identify potential security vulnerabilities\n2. Check for common issues (SQL injection, XSS, CSRF, etc.)\n3. Review authentication and authorization logic\n4. Flag any hardcoded secrets or credentials\n\nWhen reviewing, be thorough but prioritize high-severity issues.\nAlways explain WHY something is a vulnerability, not just WHAT."
  },
  "tags": "security,review,audit"
}
```

### A.3 Skill: API Documentation

```json
{
  "type": "SKILL",
  "name": "api-documentation",
  "description": "Generates OpenAPI documentation from code",
  "config": {
    "name": "API Documentation Generator",
    "description": "Generates OpenAPI documentation from code",
    "triggers": [
      "generate api docs",
      "document this api",
      "create openapi spec"
    ],
    "instructions": "# API Documentation Generator\n\nWhen asked to generate API documentation, follow these steps:\n\n1. Scan for route definitions\n2. Extract request/response types\n3. Generate OpenAPI 3.0 spec\n4. Output as YAML"
  },
  "tags": "documentation,api,openapi"
}
```

### A.4 Command: Deploy

```json
{
  "type": "COMMAND",
  "name": "deploy",
  "description": "Guided deployment workflow",
  "config": {
    "name": "deploy",
    "description": "Deploy the application to production",
    "prompt": "Please help me deploy the application:\n\n1. Run the test suite and ensure all tests pass\n2. Build the production bundle\n3. Run database migrations if any are pending\n4. Deploy to the production server\n5. Verify the deployment is healthy\n\nIf any step fails, stop and report the issue."
  },
  "tags": "deployment,ci,workflow"
}
```

### A.5 Profile: Blockchain

```json
{
  "name": "blockchain",
  "description": "Profile for blockchain and Web3 development projects",
  "claudeMdTemplate": "# Project: {{projectName}}\n\n## Overview\n{{projectDescription}}\n\n## Tech Stack\n- Solidity / Ethereum\n- TypeScript\n- Hardhat / Foundry\n\n## Conventions\n- Use OpenZeppelin contracts where possible\n- All amounts in wei unless otherwise noted\n- Test coverage must be >90%\n\n## Security\n- Never commit private keys\n- Use environment variables for RPC URLs\n- All external calls must be checked for reentrancy",
  "componentIds": [
    "mcp-github",
    "mcp-postgres",
    "subagent-security-reviewer",
    "subagent-code-reviewer",
    "skill-api-documentation",
    "command-deploy",
    "hook-auto-format"
  ]
}
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **CCM** | Claude Code Config Manager - this tool |
| **Component** | A reusable configuration element (MCP server, subagent, skill, etc.) |
| **Profile** | A bundle of components for a specific project type |
| **Project** | A tracked directory using Claude Code |
| **CLAUDE.md** | Claude Code's project memory/constitution file |
| **MCP** | Model Context Protocol - standard for AI tool integrations |
| **Subagent** | Specialized AI instance with isolated context |
| **Skill** | Auto-triggered capability extension |
| **Slash Command** | User-triggered workflow shortcut (e.g., `/deploy`) |
| **Hook** | Automated lifecycle trigger |

---

*End of specification*
