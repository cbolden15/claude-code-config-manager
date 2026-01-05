# Spec: CCM + Auto-Claude Integration

**Spec ID:** 001-ccm-auto-claude-integration
**Created:** 2026-01-05
**Complexity:** Complex
**Estimated Effort:** 9 phases, 72 subtasks

---

## Executive Summary

Extend Claude Code Config Manager (CCM) to become the **single source of truth** for both Claude Code and Auto-Claude configurations. This integration enables centralized management of agent personas, MCP servers, model profiles, and project settings across multiple machines through a unified CLI and web UI.

### Key Deliverables

1. **New Component Types**: Auto-Claude primitives (agent configs, prompts, model profiles, project configs)
2. **Settings Infrastructure**: Secure credential management with encryption
3. **Generators**: Automatic generation of `.auto-claude/.env`, `task_metadata.json`, and `prompts/*.md`
4. **API Routes**: Full CRUD operations for Auto-Claude components
5. **Import Wizard**: One-time migration from existing Auto-Claude installations
6. **CLI Commands**: `ccm auto-claude` command group for sync and management
7. **Web UI**: Dashboard, agent config editor, prompt editor, model profile manager
8. **Seed Data**: Default prompts, agent configs, and model profiles
9. **Integration Testing**: End-to-end validation of the complete workflow

---

## Problem Statement

### Current Pain Points

**Fragmented Configuration Management:**
- Claude Code configs managed separately from Auto-Claude configs
- Manual sync required between machines
- No centralized editing or version control
- Duplicate configuration definitions

**Auto-Claude Configuration Complexity:**
- Agent configs scattered across Python code (`models.py`)
- Prompt files require manual editing
- Model profiles hardcoded or environment-dependent
- No visual tooling for configuration management

**Limited Discoverability:**
- Hard to know which agents have which tools
- MCP server dependencies not clearly documented
- Model/thinking profiles buried in code

### Success Criteria

1. **Single Source of Truth**: All configurations managed through CCM database
2. **One-Way Sync**: CCM → Auto-Claude (CCM is authoritative)
3. **Import Once**: Migrate existing configs with import wizard
4. **Visual Editing**: Web UI for all configuration types
5. **CLI Access**: Full feature parity between web and CLI
6. **Safe Defaults**: Production-ready seed data included

---

## Architecture Overview

### Current State

**CCM** manages Claude Code primitives:
- MCP Servers → `.mcp.json`
- Subagents → `.claude/agents/*.md`
- Skills → `.claude/skills/*/SKILL.md`
- Commands → `.claude/commands/*.md`
- Hooks → `.claude/settings.json`
- CLAUDE.md templates

**Auto-Claude** has separate configuration:
- Agent configs (tools + MCP access per agent type)
- Agent prompts (`apps/backend/prompts/*.md`)
- Project configs (`.auto-claude/.env`)
- MCP server definitions (built-in + custom)
- Model/thinking profiles per phase

### Target State

```
┌─────────────────────────────────────┐
│   CCM (Single Source of Truth)     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │  Web UI      │  │  CLI Tool   │ │
│  └──────────────┘  └─────────────┘ │
│           │              │          │
│      ┌────┴──────────────┴────┐    │
│      │  SQLite Database       │    │
│      │  - Components          │    │
│      │  - Profiles            │    │
│      │  - Settings            │    │
│      └────────────────────────┘    │
└─────────────────────────────────────┘
              │
              │ ccm auto-claude sync
              │ (one-way generation)
              ▼
┌─────────────────────────────────────┐
│   Auto-Claude Backend               │
│  ~/Projects/Auto-Claude/            │
│  ├── apps/backend/prompts/*.md      │
│  └── [AGENT_CONFIGS from CCM API]   │
│                                     │
│   Per-Project:                      │
│  .auto-claude/                      │
│  ├── .env                           │
│  └── task_metadata.json             │
└─────────────────────────────────────┘
```

### Sync Strategy

**One-Way Sync (CCM → Auto-Claude):**
- CCM database is authoritative
- `ccm auto-claude sync` generates and writes files
- Direct edits in Auto-Claude files will be overwritten
- Import wizard exists only for initial migration

---

## Component Types

### 1. AUTO_CLAUDE_AGENT_CONFIG

Defines per-agent tool and MCP access configuration.

**Schema:**
```typescript
interface AutoClaudeAgentConfig {
  agentType: string;              // e.g., "coder", "planner", "qa_reviewer"
  tools: string[];                // ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
  mcpServers: string[];           // Required MCP servers
  mcpServersOptional: string[];   // Conditional MCP servers
  autoClaudeTools: string[];      // Custom auto-claude tools
  thinkingDefault: "none" | "low" | "medium" | "high" | "ultrathink";
}
```

**Output:** JSON export for Auto-Claude's AGENT_CONFIGS registry

**Example:**
```json
{
  "agentType": "coder",
  "tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
  "mcpServers": ["context7"],
  "mcpServersOptional": ["linear", "graphiti"],
  "autoClaudeTools": ["parallel_shell"],
  "thinkingDefault": "medium"
}
```

### 2. AUTO_CLAUDE_PROMPT

Stores agent persona prompts.

**Schema:**
```typescript
interface AutoClaudePrompt {
  agentType: string;              // Matches agent config
  promptContent: string;          // Full markdown content
  injectionPoints?: {             // Dynamic content markers
    specDirectory: boolean;
    projectContext: boolean;
    mcpDocumentation: boolean;
  };
}
```

**Output:** `prompts/{agentType}.md` in Auto-Claude backend

**Example:**
```markdown
# Coder Agent

You are the implementation specialist...

{{specDirectory}} - Current spec directory
{{projectContext}} - Project analysis results
```

### 3. AUTO_CLAUDE_MODEL_PROFILE

Defines model and thinking configuration per phase.

**Schema:**
```typescript
interface AutoClaudeModelProfile {
  name: string;  // e.g., "cost-optimized", "quality-focused"
  description: string;
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

**Example:**
```json
{
  "name": "balanced",
  "description": "Default balanced configuration",
  "phaseModels": {
    "spec": "sonnet",
    "planning": "sonnet",
    "coding": "sonnet",
    "qa": "sonnet"
  },
  "phaseThinking": {
    "spec": "medium",
    "planning": "high",
    "coding": "medium",
    "qa": "high"
  }
}
```

### 4. AUTO_CLAUDE_PROJECT_CONFIG

Stores project-level Auto-Claude settings.

**Schema:**
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

## Database Schema

### New Models

**Settings Table:**
```prisma
model Settings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   // JSON or plain text
  encrypted Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Settings Keys:**
- `autoClaudeBackendPath`: Path to Auto-Claude installation
- `linearApiKey`: (encrypted) Linear API key
- `linearTeamId`: Linear team ID
- `githubToken`: (encrypted) GitHub token
- `graphitiMcpUrl`: Graphiti MCP server URL

### Extended Models

**Project Model:**
```prisma
model Project {
  // ... existing fields ...

  // Auto-Claude specific
  autoClaudeEnabled    Boolean   @default(false)
  autoClaudeConfigId   String?   // Link to AUTO_CLAUDE_PROJECT_CONFIG
  modelProfileId       String?   // Link to AUTO_CLAUDE_MODEL_PROFILE
  lastAutoClaudeSync   DateTime?
}
```

**ComponentType Enum:**
```prisma
enum ComponentType {
  // ... existing types ...
  AUTO_CLAUDE_AGENT_CONFIG
  AUTO_CLAUDE_PROMPT
  AUTO_CLAUDE_MODEL_PROFILE
  AUTO_CLAUDE_PROJECT_CONFIG
}
```

---

## Generators

### Location
`packages/server/src/lib/generators/auto-claude/`

### Generator Modules

**1. env-file.ts**
- Input: `AutoClaudeProjectConfig` + `Settings`
- Output: `.auto-claude/.env` file content
- Features:
  - MCP toggle flags
  - API keys from encrypted settings
  - Custom MCP server definitions
  - Per-agent MCP overrides

**2. model-profile.ts**
- Input: `AutoClaudeModelProfile`
- Output: `task_metadata.json` content
- Features:
  - Phase model mapping
  - Thinking token budget mapping
  - Auto-Claude format compatibility

**3. prompts.ts**
- Input: Array of `AutoClaudePrompt`
- Output: Array of `{path: 'prompts/{agentType}.md', content: string}`
- Features:
  - Injection point replacement
  - Markdown formatting preservation
  - Agent type directory organization

**4. agent-configs.ts**
- Input: Array of `AutoClaudeAgentConfig`
- Output: JSON export of AGENT_CONFIGS
- Features:
  - Tool permission mapping
  - MCP server dependency tracking
  - Thinking level defaults

### Integration Point

**packages/server/src/lib/generators/index.ts:**
```typescript
function generateProjectFiles(options: GenerateOptions): GeneratedFile[] {
  // ... existing generation ...

  if (options.autoClaudeEnabled || hasAutoClaudeComponents(profile)) {
    files.push(...generateAutoClaudeEnv(projectConfig));
    files.push(...generateAutoClaudePrompts(prompts));
    files.push(...generateModelProfile(modelProfile));
  }

  return files;
}
```

---

## API Routes

### Auto-Claude Endpoints

**POST /api/auto-claude/import**
- Import existing Auto-Claude configs
- Parses `models.py`, `prompts/*.md`, `.auto-claude/.env`
- Creates Component records
- Returns import summary

**POST /api/auto-claude/sync**
- Syncs agent configs to Auto-Claude backend
- Requires Auto-Claude backend path in settings
- Writes prompts/*.md and agent configs
- Updates lastAutoClaudeSync timestamp

**GET /api/auto-claude/agents**
- Lists all agent types with configs
- Returns tool/MCP matrix

**PUT /api/auto-claude/agents/:agentType**
- Updates agent config
- Validates against schema

**GET/POST/PUT/DELETE /api/auto-claude/prompts**
- Full CRUD for prompts
- Markdown content handling

**GET/POST/PUT/DELETE /api/auto-claude/model-profiles**
- Full CRUD for model profiles
- Phase-by-phase configuration

### Extended Generate Endpoint

**POST /api/generate**
- Add `autoClaudeEnabled: boolean` flag
- Include Auto-Claude files when enabled
- Validate Auto-Claude components exist

---

## CLI Commands

### New Command Group

**ccm auto-claude**

Subcommands:
```bash
# Configuration
ccm auto-claude config --path ~/Projects/Auto-Claude

# Import (one-time)
ccm auto-claude import --source ~/Projects/Auto-Claude [--dry-run]

# Sync
ccm auto-claude sync [--backend http://localhost:8000]

# Model Profiles
ccm auto-claude profiles list
ccm auto-claude profiles show <name>
ccm auto-claude profiles apply <name>

# Agents
ccm auto-claude agents list
ccm auto-claude agents show <agentType>
```

### Updated Init Command

```bash
# New flag
ccm init my-project --profile fullstack --auto-claude

# Generates:
# - .auto-claude/.env
# - task_metadata.json
# - Standard Claude Code configs
```

---

## Web UI

### New Pages

**1. Auto-Claude Dashboard** (`/auto-claude`)
- Overview cards: Agent Configs, Prompts, Model Profiles
- Sync status with last sync timestamp
- Quick actions: Import, Sync, Create New

**2. Agent Configs** (`/auto-claude/agents`)
- List all agent types
- Tool/MCP matrix visualization
- Edit modal with multi-select tools
- Thinking level dropdown

**3. Prompts Editor** (`/auto-claude/prompts`)
- List with agent type filter
- Monaco editor with live preview
- Injection point highlighting
- Version history

**4. Model Profiles** (`/auto-claude/profiles`)
- Card view of profiles
- Phase-by-phase configuration
- Cost estimation display
- Create/edit/delete actions

**5. Project Settings** (`/auto-claude/projects`)
- Per-project MCP toggles
- Credential overrides
- Model profile selector

### Updated Components Page
- Filter for Auto-Claude component types
- Auto-Claude badge on relevant components

### Updated Profiles Page
- "Auto-Claude Enabled" toggle
- Show Auto-Claude components included

---

## Seed Data

### Default Agent Configs (from Auto-Claude)

Import from AGENT_CONFIGS:
- spec_gatherer, spec_writer, spec_critic, spec_researcher
- planner, coder
- qa_reviewer, qa_fixer
- insights, analysis, ideation, roadmap_discovery

**Total:** ~15 agent configs

### Default Model Profiles

**1. Balanced** (default)
- Models: All Sonnet
- Thinking: Medium/High mix

**2. Cost-Optimized**
- Models: Haiku/Sonnet mix
- Thinking: Low/Medium mix

**3. Quality-Focused**
- Models: Opus/Sonnet mix
- Thinking: High/Ultrathink mix

### Default Prompts

Import all 23 prompts from `apps/backend/prompts/`:
- planner.md
- coder.md
- coder_recovery.md
- qa_reviewer.md
- qa_fixer.md
- spec_gatherer.md
- spec_writer.md
- spec_critic.md
- complexity_assessor.md
- ... and 14 more

---

## Implementation Phases

### Phase 1: Schema & Types (Foundation)
**Tasks:** 6
**Focus:** TypeScript interfaces, Zod schemas, Prisma models

### Phase 2: Settings Infrastructure
**Tasks:** 4
**Focus:** Encryption utility, settings service, API routes, UI

### Phase 3: Generators
**Tasks:** 6
**Focus:** File generators for .env, prompts, model profiles, agent configs

### Phase 4: API Routes
**Tasks:** 6
**Focus:** Import, sync, CRUD endpoints for all Auto-Claude components

### Phase 5: Import Wizard
**Tasks:** 4
**Focus:** Parsers for models.py, prompts, .env files + UI wizard

### Phase 6: CLI Commands
**Tasks:** 8
**Focus:** auto-claude command group with all subcommands

### Phase 7: Seed Data
**Tasks:** 5
**Focus:** Seed script with defaults from Auto-Claude

### Phase 8: Web UI
**Tasks:** 9
**Focus:** Dashboard, agent configs, prompts editor, profiles, project settings

### Phase 9: Integration & Testing
**Tasks:** 7
**Focus:** End-to-end validation, documentation

**Total:** 72 subtasks across 9 phases

---

## Acceptance Criteria

### Functional Requirements

✅ **Import Workflow**
1. User navigates to /auto-claude/import
2. Selects Auto-Claude installation path
3. Preview shows detected configs (agents, prompts)
4. Import creates Component records
5. All 23 prompts and ~15 agent configs imported

✅ **Edit Workflow**
1. User edits coder agent config (adds/removes tool)
2. User edits coder prompt (modifies markdown)
3. Changes save to database
4. Changes persist after page refresh

✅ **Sync Workflow**
1. User runs `ccm auto-claude sync` or clicks Sync button
2. Files written to Auto-Claude backend:
   - `apps/backend/prompts/*.md`
   - `agent_configs.json`
3. File contents match database state
4. lastAutoClaudeSync timestamp updated

✅ **Project Initialization**
1. User runs `ccm init test-project --profile fullstack --auto-claude`
2. `.auto-claude/.env` generated with MCP toggles
3. `task_metadata.json` generated with model profile
4. API keys included from settings

✅ **Generated Configs Work**
1. Copy generated .env to Auto-Claude project
2. Run `python spec_runner.py --task "Test task"`
3. Spec creation completes without errors
4. MCP servers load correctly
5. Model profile applies to phases

### Non-Functional Requirements

✅ **Security**
- Encrypted storage for API keys (Linear, GitHub)
- Settings masked in UI
- No credentials in generated files (loaded from env)

✅ **Performance**
- Import completes in < 10 seconds
- Sync writes files in < 5 seconds
- UI pages load in < 1 second

✅ **Usability**
- Web UI matches existing CCM style
- CLI help text clear and complete
- Error messages actionable

✅ **Reliability**
- Transaction-based database operations
- Rollback on import/sync errors
- Validation before file writes

---

## Dependencies

### External
- Auto-Claude installation (~/Projects/Auto-Claude)
- SQLite database
- Node.js, pnpm
- Prisma ORM

### Internal (CCM)
- packages/shared (types, schemas)
- packages/server (API, generators, database)
- packages/cli (commands, API client)

---

## Migration Strategy

### First-Time Setup

1. **Configure Backend Path**
   ```bash
   ccm auto-claude config --path ~/Projects/Auto-Claude
   ```

2. **Import Existing Configs** (one-time)
   ```bash
   ccm auto-claude import --source ~/Projects/Auto-Claude
   ```

3. **Verify Import**
   - Web UI: Navigate to /auto-claude
   - CLI: `ccm auto-claude agents list`

### Ongoing Workflow

1. **Edit in CCM** (web UI or CLI)
2. **Sync to Auto-Claude**
   ```bash
   ccm auto-claude sync
   ```
3. **Use Auto-Claude** (configs automatically loaded)

### Rollback Plan

If sync fails or generates incorrect configs:
1. Restore Auto-Claude files from git
2. Fix CCM database records
3. Re-run sync

---

## Testing Strategy

### Unit Tests
- Generator functions (env-file, prompts, model-profile, agent-configs)
- Settings service (encryption/decryption)
- Validation schemas

### Integration Tests
- API endpoints (import, sync, CRUD)
- Database operations (transactions, rollbacks)
- File generation (correct format, content)

### End-to-End Tests
1. Import workflow (UI → database)
2. Edit workflow (UI → database → UI)
3. Sync workflow (database → files)
4. CLI workflow (commands → API → database)
5. Generate workflow (CLI → API → files)
6. Auto-Claude compatibility (generated files → Auto-Claude runtime)

---

## Documentation Requirements

### README Updates
- Auto-Claude integration overview
- Setup guide (install, import, sync)
- CLI command reference
- Troubleshooting section

### Web UI Help
- Import wizard tooltips
- Agent config editor help text
- Model profile cost estimation explanation

### CLI Help Text
- All commands have --help
- Examples for common workflows
- Error message improvements

---

## Success Metrics

### Adoption
- 100% of Auto-Claude prompts imported
- 100% of agent configs imported
- 3 default model profiles available

### Functionality
- All 72 tasks completed
- All acceptance criteria met
- Zero critical bugs

### Quality
- Code coverage > 80%
- All E2E tests passing
- Documentation complete

---

## Risks & Mitigation

### Risk 1: Parsing models.py Fails
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Use robust AST parsing (Python ast module)
- Fallback to regex for simple structures
- Manual import option in UI

### Risk 2: File Sync Conflicts
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Clear documentation: CCM is authoritative
- Backup Auto-Claude files before first sync
- Git integration for version control

### Risk 3: Auto-Claude Breaking Changes
**Impact:** High
**Probability:** Low
**Mitigation:**
- Pin to specific Auto-Claude version
- Version compatibility checks
- Update guide in documentation

### Risk 4: Encryption Key Loss
**Impact:** High
**Probability:** Low
**Mitigation:**
- Key stored in environment variable
- Backup/restore instructions
- Re-entry option in UI

---

## Future Enhancements (Out of Scope for v1)

- Two-way sync (Auto-Claude → CCM)
- Multi-user support with authentication
- Cloud sync across machines
- Auto-Claude execution from CCM UI
- Real-time collaboration
- Version control for prompts/configs
- A/B testing for model profiles
- Cost tracking per profile

---

## Appendix

### File Structure After Implementation

```
claude-code-config-manager/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── types/
│   │       │   ├── index.ts               # ← Component types
│   │       │   └── auto-claude.ts         # ← NEW
│   │       └── schemas/
│   │           └── auto-claude.ts         # ← NEW
│   │
│   ├── server/
│   │   ├── prisma/
│   │   │   ├── schema.prisma              # ← Settings, Project updates
│   │   │   └── seed-auto-claude.ts        # ← NEW
│   │   └── src/
│   │       ├── app/
│   │       │   ├── api/
│   │       │   │   ├── auto-claude/       # ← NEW
│   │       │   │   └── settings/          # ← NEW
│   │       │   ├── auto-claude/           # ← NEW (pages)
│   │       │   └── settings/              # ← NEW (page)
│   │       └── lib/
│   │           ├── generators/
│   │           │   └── auto-claude/       # ← NEW
│   │           ├── import/                # ← NEW
│   │           ├── encryption.ts          # ← NEW
│   │           └── settings.ts            # ← NEW
│   │
│   └── cli/
│       └── src/
│           └── commands/
│               └── auto-claude.ts         # ← NEW
│
└── .auto-claude/
    └── specs/
        └── 001-ccm-auto-claude-integration/
            ├── spec.md                    # ← This file
            ├── implementation_plan.json   # ← Already created
            ├── requirements.json          # ← To be created
            └── context.json               # ← To be created
```

### Related Documents
- Full Plan: `/Users/calebbolden/Projects/claude-code-config-manager/plan.md`
- CCM Specification: `docs/SPECIFICATION.md`
- CCM UI Mockup: `docs/UI-MOCKUP.html`
- Auto-Claude Docs: `~/Projects/Auto-Claude/CLAUDE.md`

---

**End of Specification**
