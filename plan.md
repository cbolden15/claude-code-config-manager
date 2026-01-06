# Integration Plan: CCM + Auto-Claude

## Overview

Extend Claude Code Config Manager (CCM) to manage Auto-Claude configurations, enabling centralized management of agent personas, MCP servers, model profiles, and project settings across multiple machines.

---

## Architecture Summary

### Current State

**CCM** manages Claude Code primitives:
- MCP Servers → `.mcp.json`
- Subagents → `.claude/agents/*.md`
- Skills → `.claude/skills/*/SKILL.md`
- Commands → `.claude/commands/*.md`
- Hooks → `.claude/settings.json`
- CLAUDE.md templates

**Auto-Claude** has its own configuration system:
- Agent configs (tools + MCP access per agent type)
- Agent prompts (`apps/backend/prompts/*.md`)
- Project configs (`.auto-claude/.env`)
- MCP server definitions (built-in + custom)
- Model/thinking profiles per phase
- Spec templates and formats

### Integration Goal

CCM becomes the **single source of truth** for both Claude Code and Auto-Claude configurations, with:
1. New component types for Auto-Claude primitives
2. Auto-Claude-specific profiles
3. CLI commands to initialize/sync Auto-Claude projects
4. Web UI to manage agent configs, prompts, and model profiles

---

## New Component Types

### 1. `AUTO_CLAUDE_AGENT_CONFIG`

Stores per-agent tool and MCP access configuration.

```typescript
interface AutoClaudeAgentConfig {
  agentType: string;  // e.g., "coder", "planner", "qa_reviewer"
  tools: string[];    // ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
  mcpServers: string[];          // Required MCP servers
  mcpServersOptional: string[];  // Conditional MCP servers
  autoClaudeTools: string[];     // Custom auto-claude tools
  thinkingDefault: "none" | "low" | "medium" | "high" | "ultrathink";
}
```

**Output:** Contributes to `AGENT_CONFIGS` registry in models.py (or exported JSON for runtime)

### 2. `AUTO_CLAUDE_PROMPT`

Stores agent persona prompts.

```typescript
interface AutoClaudePrompt {
  agentType: string;      // Matches agent config
  promptContent: string;  // Full markdown content
  injectionPoints?: {     // Dynamic content markers
    specDirectory: boolean;
    projectContext: boolean;
    mcpDocumentation: boolean;
  };
}
```

**Output:** `prompts/{agentType}.md` in Auto-Claude backend

### 3. `AUTO_CLAUDE_MODEL_PROFILE`

Stores model and thinking configuration per phase.

```typescript
interface AutoClaudeModelProfile {
  name: string;  // e.g., "cost-optimized", "quality-focused", "balanced"
  phaseModels: {
    spec: "opus" | "sonnet" | "haiku";
    planning: "opus" | "sonnet" | "haiku";
    coding: "opus" | "sonnet" | "haiku";
    qa: "opus" | "sonnet" | "haiku";
  };
  phaseThinking: {
    spec: "none" | "low" | "medium" | "high" | "ultrathink";
    planning: "none" | "low" | "medium" | "high" | "ultrathink";
    coding: "none" | "low" | "medium" | "high" | "ultrathink";
    qa: "none" | "low" | "medium" | "high" | "ultrathink";
  };
}
```

**Output:** `task_metadata.json` defaults or `.auto-claude/.env` overrides

### 4. `AUTO_CLAUDE_PROJECT_CONFIG`

Stores project-level Auto-Claude settings.

```typescript
interface AutoClaudeProjectConfig {
  // MCP toggles
  context7Enabled: boolean;
  linearMcpEnabled: boolean;
  electronMcpEnabled: boolean;
  puppeteerMcpEnabled: boolean;
  graphitiEnabled: boolean;

  // Per-agent MCP overrides
  agentMcpOverrides?: {
    [agentType: string]: {
      add?: string[];
      remove?: string[];
    };
  };

  // Custom MCP servers
  customMcpServers?: Array<{
    id: string;
    name: string;
    type: "command" | "http";
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
  }>;

  // Integration settings
  linearApiKey?: string;
  linearTeamId?: string;
  githubToken?: string;
  githubRepo?: string;
}
```

**Output:** `.auto-claude/.env` file

---

## Database Schema Changes

```prisma
// Add to ComponentType enum in shared types
// AUTO_CLAUDE_AGENT_CONFIG
// AUTO_CLAUDE_PROMPT
// AUTO_CLAUDE_MODEL_PROFILE
// AUTO_CLAUDE_PROJECT_CONFIG

// New Settings model for global configuration
model Settings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   // JSON or plain text
  encrypted Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Settings keys:
// - autoClaudeBackendPath: path to Auto-Claude installation
// - linearApiKey: (encrypted) Linear API key
// - linearTeamId: Linear team ID
// - githubToken: (encrypted) GitHub token
// - graphitiMcpUrl: Graphiti MCP server URL

// Extend Project model for Auto-Claude tracking
model Project {
  // ... existing fields ...

  // Auto-Claude specific
  autoClaudeEnabled    Boolean   @default(false)
  autoClaudeConfigId   String?   // Link to AUTO_CLAUDE_PROJECT_CONFIG component
  modelProfileId       String?   // Link to AUTO_CLAUDE_MODEL_PROFILE component
  lastAutoClaudeSync   DateTime?
}
```

---

## New Generators

### Location: `packages/server/src/lib/generators/auto-claude/`

1. **`agent-configs.ts`** - Generate AGENT_CONFIGS export
2. **`prompts.ts`** - Generate prompt markdown files
3. **`env-file.ts`** - Generate `.auto-claude/.env`
4. **`model-profile.ts`** - Generate `task_metadata.json`

### Main Generator Update

```typescript
// packages/server/src/lib/generators/index.ts

function generateProjectFiles(options: GenerateOptions): GeneratedFile[] {
  // ... existing generation ...

  // Auto-Claude generation (if profile contains Auto-Claude components)
  if (hasAutoClaudeComponents) {
    files.push(...generateAutoClaudeEnv(projectConfig));
    files.push(...generateAutoClaudePrompts(prompts));
    // Note: agent-configs would be synced to Auto-Claude backend, not project
  }

  return files;
}
```

---

## New API Routes

### Auto-Claude Sync Endpoints

```
POST /api/auto-claude/sync-agents
  - Syncs agent configs to Auto-Claude backend
  - Requires Auto-Claude backend URL in settings

POST /api/auto-claude/import
  - Imports existing Auto-Claude configs into CCM
  - Reads from Auto-Claude installation path

GET /api/auto-claude/agents
  - Lists all agent types with their configs

PUT /api/auto-claude/agents/:agentType
  - Updates agent config
```

### Extended Generate Endpoint

```
POST /api/generate
  - Add autoClaudeEnabled flag
  - Include Auto-Claude files in output when enabled
```

---

## CLI Commands

### New Commands

```bash
# Initialize project with Auto-Claude support
ccm init my-project --profile fullstack --auto-claude

# Import existing Auto-Claude configs
ccm auto-claude import --source ~/Projects/Auto-Claude

# Sync agent configs to Auto-Claude backend
ccm auto-claude sync-agents --backend http://localhost:8000

# Apply model profile to project
ccm auto-claude set-profile --profile cost-optimized

# List available agent types
ccm auto-claude agents list

# Show agent config
ccm auto-claude agents show coder
```

### Updated Init Command

```typescript
// packages/cli/src/commands/init.ts

interface InitOptions {
  profile: string;
  description?: string;
  dryRun?: boolean;
  force?: boolean;
  autoClaude?: boolean;  // NEW: Enable Auto-Claude config generation
}
```

---

## Web UI Updates

### New Pages

1. **Auto-Claude Dashboard** (`/auto-claude`)
   - Overview of agent configs
   - Quick access to model profiles
   - Sync status with backend

2. **Agent Configs** (`/auto-claude/agents`)
   - List all agent types
   - Edit tools, MCP access, thinking levels
   - Visual tool matrix

3. **Prompts Editor** (`/auto-claude/prompts`)
   - Edit agent prompts
   - Preview with injection points highlighted
   - Version history

4. **Model Profiles** (`/auto-claude/profiles`)
   - Create/edit model profiles
   - Phase-by-phase configuration
   - Cost estimation

### Updated Components Page

- Add filter for Auto-Claude component types
- Show Auto-Claude badge on relevant components

### Updated Profiles Page

- Add "Auto-Claude Enabled" toggle
- Show which Auto-Claude components are included

---

## Seed Data

### Default Agent Configs

Import from Auto-Claude's `AGENT_CONFIGS`:
- spec_gatherer, spec_writer, spec_critic, spec_researcher
- planner, coder
- qa_reviewer, qa_fixer
- insights, analysis, ideation, roadmap_discovery

### Default Model Profiles

```typescript
const defaultProfiles = [
  {
    name: "balanced",
    description: "Default balanced configuration",
    phaseModels: { spec: "sonnet", planning: "sonnet", coding: "sonnet", qa: "sonnet" },
    phaseThinking: { spec: "medium", planning: "high", coding: "medium", qa: "high" }
  },
  {
    name: "cost-optimized",
    description: "Minimize API costs",
    phaseModels: { spec: "haiku", planning: "sonnet", coding: "haiku", qa: "haiku" },
    phaseThinking: { spec: "low", planning: "medium", coding: "low", qa: "medium" }
  },
  {
    name: "quality-focused",
    description: "Maximum quality for complex projects",
    phaseModels: { spec: "opus", planning: "opus", coding: "sonnet", qa: "opus" },
    phaseThinking: { spec: "high", planning: "ultrathink", coding: "high", qa: "ultrathink" }
  }
];
```

### Default Prompts

Import all 23 prompt files from `apps/backend/prompts/`

---

## Implementation Phases

### Phase 1: Schema & Types (Foundation)
- [ ] Add new component types to `packages/shared/src/types/index.ts`
- [ ] Create `packages/shared/src/types/auto-claude.ts` with interfaces
- [ ] Create `packages/shared/src/schemas/auto-claude.ts` with Zod schemas
- [ ] Add Settings model to `packages/server/prisma/schema.prisma`
- [ ] Add Auto-Claude fields to Project model
- [ ] Run `pnpm --filter server db:push`

### Phase 2: Settings Infrastructure
- [ ] Create `/api/settings` CRUD routes
- [ ] Add encryption utility for sensitive values (Linear key, GitHub token)
- [ ] Create settings service in `packages/server/src/lib/settings.ts`
- [ ] Add Settings page to web UI at `/settings`

### Phase 3: Generators
- [ ] Create `packages/server/src/lib/generators/auto-claude/` directory
- [ ] Implement `env-file.ts` - generates `.auto-claude/.env`
- [ ] Implement `model-profile.ts` - generates `task_metadata.json`
- [ ] Implement `prompts.ts` - generates `prompts/*.md` files
- [ ] Implement `agent-configs.ts` - generates JSON export of AGENT_CONFIGS
- [ ] Update `packages/server/src/lib/generators/index.ts` to include Auto-Claude

### Phase 4: API Routes
- [ ] Add `/api/auto-claude/import` - one-time import from existing installation
- [ ] Add `/api/auto-claude/sync` - sync configs to Auto-Claude backend
- [ ] Add `/api/auto-claude/agents` - CRUD for agent configs
- [ ] Add `/api/auto-claude/prompts` - CRUD for prompts
- [ ] Add `/api/auto-claude/model-profiles` - CRUD for model profiles
- [ ] Update `/api/generate` for Auto-Claude support

### Phase 5: Import Wizard
- [ ] Create import service to parse Auto-Claude's `models.py`
- [ ] Create import service to read `prompts/*.md` files
- [ ] Create import service to read existing `.auto-claude/.env` files
- [ ] Build import wizard UI at `/auto-claude/import`

### Phase 6: CLI Commands
- [ ] Add `autoClaudeBackendPath` to `~/.ccm/config.json`
- [ ] Add `--auto-claude` flag to `init` command
- [ ] Create `ccm auto-claude` command group in `packages/cli/src/commands/auto-claude.ts`
- [ ] Implement `ccm auto-claude config` - set backend path
- [ ] Implement `ccm auto-claude import` - run import wizard
- [ ] Implement `ccm auto-claude sync` - sync to backend
- [ ] Implement `ccm auto-claude agents list|show`
- [ ] Implement `ccm auto-claude profiles list|show|apply`

### Phase 7: Seed Data
- [ ] Create `packages/server/prisma/seed-auto-claude.ts`
- [ ] Import all 23 default prompts from Auto-Claude
- [ ] Import all agent configs from AGENT_CONFIGS
- [ ] Create 3 default model profiles (balanced, cost-optimized, quality-focused)

### Phase 8: Web UI - Auto-Claude Section
- [ ] Add "Auto-Claude" nav item to `packages/server/src/app/layout.tsx`
- [ ] Create dashboard at `/auto-claude` with overview cards
- [ ] Create agent configs page at `/auto-claude/agents`
  - [ ] List view with tool/MCP matrix
  - [ ] Edit modal for agent config
- [ ] Create prompts editor at `/auto-claude/prompts`
  - [ ] List view with agent type filter
  - [ ] Monaco editor with markdown preview
  - [ ] Injection point highlighting
- [ ] Create model profiles page at `/auto-claude/profiles`
  - [ ] Card view of profiles
  - [ ] Phase-by-phase editor
  - [ ] Cost estimation display
- [ ] Create project settings page at `/auto-claude/projects`
  - [ ] Per-project MCP toggles
  - [ ] Per-project credential overrides

### Phase 9: Integration & Testing
- [ ] End-to-end test: Import → Edit → Sync workflow
- [ ] Test generated `.auto-claude/.env` works with Auto-Claude
- [ ] Test generated prompts are loaded correctly
- [ ] Document the integration in README

---

## File Changes Summary

### New Files

```
packages/shared/src/types/auto-claude.ts
packages/shared/src/schemas/auto-claude.ts
packages/server/src/lib/generators/auto-claude/
  ├── index.ts
  ├── env-file.ts
  ├── model-profile.ts
  └── prompts.ts
packages/server/src/app/api/auto-claude/
  ├── import/route.ts
  ├── sync-agents/route.ts
  └── agents/route.ts
packages/server/src/app/auto-claude/
  ├── page.tsx
  ├── agents/page.tsx
  ├── prompts/page.tsx
  └── profiles/page.tsx
packages/cli/src/commands/auto-claude.ts
packages/server/prisma/seed-auto-claude.ts
```

### Modified Files

```
packages/shared/src/types/index.ts          # Add new component types
packages/server/prisma/schema.prisma        # Add Auto-Claude fields to Project
packages/server/src/lib/generators/index.ts # Include Auto-Claude generation
packages/cli/src/commands/init.ts           # Add --auto-claude flag
packages/cli/src/index.ts                   # Register auto-claude commands
packages/server/src/app/layout.tsx          # Add Auto-Claude nav item
```

---

## Sync Strategy

**Decision: CCM is the single source of truth (one-way sync)**

```
CCM (Server/Database)
        │
        │  ccm auto-claude sync
        │  (generates & writes files)
        ▼
Auto-Claude Backend
~/Projects/Auto-Claude/
├── apps/backend/prompts/*.md        ← Generated from CCM
└── [runtime reads AGENT_CONFIGS from CCM API or generated JSON]

Per-Project:
.auto-claude/
├── .env                             ← Generated from CCM
└── task_metadata.json               ← Generated from CCM (model profile)
```

**Implications:**
- Edits made directly in Auto-Claude files will be overwritten on next sync
- CCM web UI is the canonical editor for all configs
- Import command exists only for initial migration (one-time)

---

## Design Decisions

1. **Auto-Claude backend location:** Configurable per machine in CCM settings
   - Stored in `Settings` table with key `autoClaudeBackendPath`
   - CLI config also stores local path in `~/.ccm/config.json`
   - Default: `~/Projects/Auto-Claude`

2. **Integration credentials:** CCM manages centrally
   - Linear API key, GitHub token, etc. stored as encrypted settings
   - Included in generated `.auto-claude/.env` files
   - Supports per-project overrides

3. **Scope for v1:** Full implementation
   - MCP servers + Model profiles
   - Agent configs (tools/MCP per agent)
   - Project settings
   - Prompt editing with preview
   - Complete web UI
   - Import wizard for initial migration
