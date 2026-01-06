# Auto-Claude Integration Guide

This comprehensive guide covers CCM's Auto-Claude integration, which extends Claude Code Config Manager to become the **single source of truth** for Auto-Claude configurations.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Import Existing Configs](#import-existing-configs)
5. [Component Management](#component-management)
6. [CLI Reference](#cli-reference)
7. [Web UI Guide](#web-ui-guide)
8. [Sync Operations](#sync-operations)
9. [Project Configuration](#project-configuration)
10. [Troubleshooting](#troubleshooting)
11. [Advanced Usage](#advanced-usage)

---

## Overview

CCM's Auto-Claude integration provides centralized management for:

- **Agent Configurations**: Tool and MCP access permissions per agent type
- **Agent Prompts**: Persona prompts with injection point support
- **Model Profiles**: Phase-specific model and thinking configurations
- **Project Settings**: MCP toggles, API keys, and custom server configurations

### Architecture

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
│  ├── apps/backend/prompts/*.md      │
│  └── AGENT_CONFIGS.json             │
│                                     │
│   Per-Project:                      │
│  .auto-claude/                      │
│  ├── .env                           │
│  └── task_metadata.json             │
└─────────────────────────────────────┘
```

### Key Benefits

- **One-Way Sync**: CCM → Auto-Claude (CCM is authoritative)
- **Version Control**: Track all configuration changes
- **Multi-Machine Sync**: Share configs across environments
- **Visual Editing**: Web UI for complex configurations
- **CLI Automation**: Full command-line interface
- **Secure Credentials**: Encrypted API key storage

---

## Prerequisites

### Required Software

- **Node.js**: 20.0.0 or later
- **pnpm**: 9.0.0 or later
- **Auto-Claude**: Working installation

### Auto-Claude Installation

CCM requires a functional Auto-Claude installation with the following structure:

```
Auto-Claude/
├── apps/
│   └── backend/
│       ├── prompts/          # Agent prompt files
│       ├── models.py         # Agent configurations
│       └── package.json      # Version info
├── .auto-claude/
│   └── .env                  # Project configuration
└── task_metadata.json        # Model profiles
```

### Environment Setup

Ensure your environment has the CCM encryption key:

```bash
export CCM_ENCRYPTION_KEY="your-32-character-encryption-key-here"
```

---

## Initial Setup

### 1. Configure Auto-Claude Backend Path

First, tell CCM where your Auto-Claude installation is located:

```bash
ccm auto-claude config --path ~/Projects/Auto-Claude
```

**Verification:**
```bash
ccm auto-claude config --show
```

### 2. Verify Installation

CCM will validate your Auto-Claude installation:

```bash
✅ Auto-Claude installation validated
   Path: /Users/yourname/Projects/Auto-Claude
   Version: 1.0.0
   Structure: ✓ apps/backend/prompts exists
              ✓ models.py found
              ✓ package.json found
```

### 3. Start CCM Server

```bash
# Development
pnpm dev

# Production
docker-compose up -d
```

Access the web UI at `http://localhost:3000/auto-claude`

---

## Import Existing Configs

### One-Time Import Process

Import your existing Auto-Claude configurations into CCM:

```bash
# Preview import (dry run)
ccm auto-claude import --source ~/Projects/Auto-Claude --dry-run

# Perform actual import
ccm auto-claude import --source ~/Projects/Auto-Claude
```

### What Gets Imported

| Source | Component Type | Description |
|--------|----------------|-------------|
| `models.py` | `AUTO_CLAUDE_AGENT_CONFIG` | Agent tool and MCP permissions |
| `prompts/*.md` | `AUTO_CLAUDE_PROMPT` | Agent persona prompts |
| `.auto-claude/.env` | `AUTO_CLAUDE_PROJECT_CONFIG` | Project MCP settings |
| Default Profiles | `AUTO_CLAUDE_MODEL_PROFILE` | Balanced, cost-optimized, quality-focused |

### Import Output Example

```bash
✅ Import completed successfully!

📊 Import Summary:
   Agent Configs: 15 imported
   Prompts: 23 imported
   Model Profiles: 3 created
   Project Config: 1 imported

🔧 Components Imported:
   - coder (tools: Read, Write, Edit, Bash, Glob, Grep)
   - planner (tools: Read, Grep, Task)
   - qa_reviewer (tools: Read, Grep, Bash)
   - spec_gatherer (tools: Read, Grep, WebFetch)
   - [... 11 more agents]

📝 Prompts Imported:
   - coder.md (2,847 chars, 3 injection points)
   - planner.md (1,923 chars, 2 injection points)
   - qa_reviewer.md (1,654 chars, 1 injection point)
   - [... 20 more prompts]

🎯 Model Profiles Created:
   - balanced (Sonnet across all phases)
   - cost-optimized (Haiku/Sonnet mix)
   - quality-focused (Opus/Sonnet mix)

🔧 Next Steps:
   1. Review imported configs: http://localhost:3000/auto-claude
   2. Edit configs as needed
   3. Sync to Auto-Claude: ccm auto-claude sync
```

---

## Component Management

### Agent Configurations

Agent configs define tool access and MCP server permissions:

**Structure:**
```typescript
interface AutoClaudeAgentConfig {
  agentType: string              // e.g., "coder", "planner"
  tools: string[]                // ["Read", "Write", "Edit", "Bash"]
  mcpServers: string[]           // Required MCP servers
  mcpServersOptional: string[]   // Conditional MCP servers
  autoClaudeTools: string[]      // Custom Auto-Claude tools
  thinkingDefault: ThinkingLevel // Default thinking level
}
```

**Default Agent Configs:**

| Agent Type | Tools | Required MCP | Optional MCP | Thinking |
|------------|-------|-------------|-------------|----------|
| `coder` | Read, Write, Edit, Bash, Glob, Grep | context7 | linear, graphiti | medium |
| `planner` | Read, Grep, Task | context7 | linear | high |
| `qa_reviewer` | Read, Grep, Bash | context7 | - | high |
| `spec_gatherer` | Read, Grep, WebFetch | context7 | linear | medium |

### Agent Prompts

Prompts define agent personas with injection point support:

**Injection Points:**
- `{{specDirectory}}`: Current spec directory path
- `{{projectContext}}`: Project analysis and context
- `{{mcpDocumentation}}`: Available MCP server documentation

**Example Prompt:**
```markdown
# Coder Agent

You are the implementation specialist for Auto-Claude...

## Current Context

**Spec Directory:** {{specDirectory}}
**Project Context:** {{projectContext}}

## Available Tools

{{mcpDocumentation}}
```

### Model Profiles

Model profiles configure phase-specific models and thinking levels:

**Built-in Profiles:**

| Profile | Spec | Planning | Coding | QA | Use Case |
|---------|------|----------|--------|----|---------|
| `balanced` | sonnet | sonnet | sonnet | haiku | Default balanced performance |
| `cost-optimized` | haiku | sonnet | sonnet | haiku | Budget-conscious development |
| `quality-focused` | opus | opus | sonnet | sonnet | Maximum quality output |

**Custom Profile Example:**
```json
{
  "name": "rapid-prototype",
  "description": "Fast prototyping with minimal thinking",
  "phaseModels": {
    "spec": "haiku",
    "planning": "haiku",
    "coding": "sonnet",
    "qa": "haiku"
  },
  "phaseThinking": {
    "spec": "low",
    "planning": "low",
    "coding": "medium",
    "qa": "low"
  }
}
```

### Project Configurations

Project configs define per-project MCP and credential settings:

**MCP Server Toggles:**
- `context7Enabled`: Context7 documentation lookup
- `linearMcpEnabled`: Linear issue management
- `electronMcpEnabled`: Electron app development
- `puppeteerMcpEnabled`: Browser automation
- `graphitiEnabled`: Graph-based memory

**API Key Management:**
- `linearApiKey`: Linear API access (encrypted)
- `linearTeamId`: Linear team identifier
- `githubToken`: GitHub API access (encrypted)
- `githubRepo`: GitHub repository

---

## CLI Reference

### Configuration Commands

```bash
# Show current configuration
ccm auto-claude config --show

# Set Auto-Claude backend path
ccm auto-claude config --path <path>

# Example
ccm auto-claude config --path ~/Projects/Auto-Claude
```

### Import Commands

```bash
# Import existing configs (dry run)
ccm auto-claude import --source <path> --dry-run

# Import existing configs
ccm auto-claude import --source <path>

# Examples
ccm auto-claude import --source ~/Projects/Auto-Claude --dry-run
ccm auto-claude import --source /opt/auto-claude
```

### Sync Commands

```bash
# Sync to configured backend
ccm auto-claude sync

# Sync to specific backend
ccm auto-claude sync --backend <url>

# Sync with preview (dry run)
ccm auto-claude sync --dry-run

# Examples
ccm auto-claude sync
ccm auto-claude sync --backend http://localhost:8000
ccm auto-claude sync --dry-run
```

### Model Profile Commands

```bash
# List all model profiles
ccm auto-claude profiles list

# List with detailed analysis
ccm auto-claude profiles list --verbose

# Show specific profile
ccm auto-claude profiles show <name>

# Apply profile to project
ccm auto-claude profiles apply <name> --project <id>

# JSON output
ccm auto-claude profiles list --format json

# Examples
ccm auto-claude profiles list
ccm auto-claude profiles show balanced
ccm auto-claude profiles apply quality-focused --project 123
```

### Agent Commands

```bash
# List all agent types
ccm auto-claude agents list

# List with tool/MCP details
ccm auto-claude agents list --verbose

# Show specific agent config
ccm auto-claude agents show <agent-type>

# JSON output
ccm auto-claude agents list --format json

# Examples
ccm auto-claude agents list
ccm auto-claude agents show coder
ccm auto-claude agents list --verbose --format json
```

### Project Initialization

```bash
# Create project with Auto-Claude support
ccm init <project> --profile <profile> --auto-claude

# Examples
ccm init my-ai-app --profile fullstack --auto-claude
ccm init data-pipeline --profile data-science --auto-claude
```

---

## Web UI Guide

Access the Auto-Claude management interface at `http://localhost:3000/auto-claude`.

### Dashboard (`/auto-claude`)

**Overview Cards:**
- **Agent Configs**: Total count and recent updates
- **Prompts**: Total prompts and character counts
- **Model Profiles**: Available profiles and usage stats
- **Sync Status**: Last sync times and active projects

**Quick Actions:**
- Import existing configs
- Create new components
- Sync to Auto-Claude backend
- View recent activity

### Agents Page (`/auto-claude/agents`)

**Features:**
- **Agent List**: Grid view of all agent configurations
- **Tools Matrix**: Visualization of tool permissions across agents
- **MCP Matrix**: MCP server dependencies across agents
- **Edit Dialog**: Comprehensive agent configuration editor

**Agent Configuration:**
- Tool permissions (multi-select checkboxes)
- Required MCP servers
- Optional MCP servers
- Default thinking level
- Auto-Claude specific tools

### Prompts Page (`/auto-claude/prompts`)

**Monaco Editor Features:**
- Syntax highlighting for Markdown
- Autocomplete for injection points
- Live preview with injection point highlighting
- Front matter support
- Validation and error highlighting

**Prompt Management:**
- Search and filter by agent type
- Content statistics (characters, lines, words)
- Injection point detection
- Version history (future feature)

**Injection Point Autocomplete:**
```
{{spec[TAB]      → {{specDirectory}}
{{project[TAB]   → {{projectContext}}
{{mcp[TAB]       → {{mcpDocumentation}}
```

### Model Profiles Page (`/auto-claude/profiles`)

**Profile Cards:**
- Phase-by-phase model configuration
- Cost estimation badges
- Quality level indicators
- Usage statistics

**Configuration Matrix:**
- Models: opus, sonnet, haiku
- Thinking: none, low, medium, high, ultrathink
- Per-phase customization

**Analysis Features:**
- Cost estimation (high/medium/low)
- Quality scoring (premium/high/balanced/basic)
- Model distribution charts

### Projects Page (`/auto-claude/projects`)

**Project Management:**
- List all projects with Auto-Claude status
- Enable/disable Auto-Claude per project
- Configure MCP server toggles
- Manage project-specific credentials

**Configuration Dialog:**
- MCP server toggles (Context7, Linear, etc.)
- Custom MCP server definitions
- API key management (masked inputs)
- Model profile selection

---

## Sync Operations

### Understanding One-Way Sync

CCM uses **one-way sync** (CCM → Auto-Claude):

- **CCM Database**: Authoritative source
- **Auto-Claude Files**: Generated outputs
- **Direct Edits**: Will be overwritten

### Sync Process

```bash
ccm auto-claude sync
```

**What Happens:**
1. **Validation**: Check backend path and installation
2. **Component Extraction**: Load configs from CCM database
3. **File Generation**: Create Auto-Claude files
4. **Backup**: Create backup of existing files (optional)
5. **Write Files**: Update Auto-Claude installation
6. **Verification**: Validate generated files
7. **Database Update**: Record sync timestamp

### Generated Files

| CCM Component | Output File | Location |
|---------------|-------------|----------|
| Agent Configs | `AGENT_CONFIGS.json` | Auto-Claude backend root |
| Prompts | `*.md` files | `apps/backend/prompts/` |
| Project Config | `.env` | `.auto-claude/.env` |
| Model Profile | `task_metadata.json` | Project root |

### Sync Output Example

```bash
✅ Auto-Claude sync completed!

📁 Files Written:
   ├── apps/backend/prompts/
   │   ├── coder.md (updated)
   │   ├── planner.md (updated)
   │   ├── qa_reviewer.md (new)
   │   └── [20 more files...]
   ├── AGENT_CONFIGS.json (updated)
   └── Project files:
       ├── .auto-claude/.env (updated)
       └── task_metadata.json (updated)

⏱️  Sync completed in 2.3 seconds
🔄 Last sync: 2024-01-06 15:30:45
```

### Dry Run Mode

Preview changes before writing:

```bash
ccm auto-claude sync --dry-run
```

**Output:**
```bash
🔍 Dry Run - No files will be written

📄 Would Update:
   ├── apps/backend/prompts/coder.md
   │   └── Content: 2,847 chars, 3 injection points
   ├── apps/backend/prompts/planner.md
   │   └── Content: 1,923 chars, 2 injection points
   └── AGENT_CONFIGS.json
       └── Content: 15 agent configs, 45 total tools

💡 Run without --dry-run to apply changes
```

---

## Project Configuration

### Enabling Auto-Claude for Projects

**Via CLI:**
```bash
ccm init my-project --profile fullstack --auto-claude
```

**Via Web UI:**
1. Navigate to Projects page
2. Click project name
3. Toggle "Auto-Claude Enabled"
4. Configure settings
5. Save changes

### Generated Project Files

When Auto-Claude is enabled, projects generate:

**`.auto-claude/.env`** (Environment Configuration):
```bash
# Auto-Claude Configuration (Generated by CCM)

# Core Settings
AUTO_CLAUDE_BACKEND_URL=http://localhost:8000
AUTO_CLAUDE_PROJECT_ID=my-project

# API Keys (loaded from CCM settings)
LINEAR_API_KEY=${LINEAR_API_KEY}
GITHUB_TOKEN=${GITHUB_TOKEN}

# MCP Server Toggles
CONTEXT7_MCP_ENABLED=true
LINEAR_MCP_ENABLED=true
ELECTRON_MCP_ENABLED=false
PUPPETEER_MCP_ENABLED=false
GRAPHITI_ENABLED=false

# Custom MCP Servers
# CUSTOM_MCP_SERVER_1=command:~/scripts/my-mcp-server
```

**`task_metadata.json`** (Model Profile):
```json
{
  "modelProfile": "balanced",
  "phaseModels": {
    "spec": "sonnet",
    "planning": "sonnet",
    "coding": "sonnet",
    "qa": "haiku"
  },
  "phaseThinking": {
    "spec": "medium",
    "planning": "high",
    "coding": "medium",
    "qa": "high"
  },
  "generatedBy": "CCM v0.1.0",
  "generatedAt": "2024-01-06T15:30:45Z"
}
```

### Per-Project Customization

**MCP Server Overrides:**
```json
{
  "agentMcpOverrides": {
    "coder": {
      "add": ["puppeteer"],
      "remove": ["linear"]
    },
    "qa_reviewer": {
      "add": ["linear"]
    }
  }
}
```

**Custom MCP Servers:**
```json
{
  "customMcpServers": [
    {
      "id": "company-docs",
      "name": "Company Documentation",
      "type": "command",
      "command": "python",
      "args": ["/opt/company-docs/mcp-server.py"]
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

#### 1. Import Fails - Path Not Found

**Error:**
```
❌ Auto-Claude installation not found at: ~/Projects/Auto-Claude
```

**Solution:**
```bash
# Check path exists
ls -la ~/Projects/Auto-Claude

# Update path if different
ccm auto-claude config --path /correct/path/to/auto-claude
```

#### 2. Import Fails - Invalid Structure

**Error:**
```
❌ Invalid Auto-Claude installation structure
   Missing: apps/backend/prompts
```

**Solution:**
- Ensure complete Auto-Claude installation
- Check for `apps/backend/prompts/` directory
- Verify `models.py` exists

#### 3. Sync Fails - Permission Denied

**Error:**
```
❌ Failed to write to Auto-Claude backend
   Error: EACCES: permission denied
```

**Solution:**
```bash
# Check write permissions
ls -la ~/Projects/Auto-Claude/apps/backend/

# Fix permissions
chmod -R 755 ~/Projects/Auto-Claude/apps/backend/
```

#### 4. Encryption Key Missing

**Error:**
```
❌ CCM_ENCRYPTION_KEY environment variable not set
```

**Solution:**
```bash
# Set encryption key
export CCM_ENCRYPTION_KEY="your-32-character-key-here"

# Add to shell profile for persistence
echo 'export CCM_ENCRYPTION_KEY="your-key"' >> ~/.bashrc
```

#### 5. Database Connection Issues

**Error:**
```
❌ Database connection failed
```

**Solution:**
```bash
# Reset database
pnpm --filter server db:reset
pnpm --filter server db:migrate
pnpm --filter server db:seed
```

### Validation Checks

Run comprehensive validation:

```bash
# Check CCM installation
ccm --version

# Check Auto-Claude configuration
ccm auto-claude config --show

# Check database connection
pnpm --filter server db:studio

# Test sync (dry run)
ccm auto-claude sync --dry-run
```

### Debug Mode

Enable verbose logging:

```bash
# CLI debug mode
DEBUG=ccm:* ccm auto-claude sync

# Server debug mode
DEBUG=server:* pnpm dev
```

### Reset and Reimport

If configs become corrupted:

```bash
# 1. Delete Auto-Claude components
ccm components delete --type AUTO_CLAUDE_AGENT_CONFIG --all
ccm components delete --type AUTO_CLAUDE_PROMPT --all

# 2. Reimport from source
ccm auto-claude import --source ~/Projects/Auto-Claude

# 3. Resync
ccm auto-claude sync
```

---

## Advanced Usage

### Custom Model Profiles

Create specialized model profiles:

```bash
# Via API (JSON)
curl -X POST http://localhost:3000/api/auto-claude/model-profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ultra-quality",
    "description": "Maximum quality for critical projects",
    "phaseModels": {
      "spec": "opus",
      "planning": "opus",
      "coding": "opus",
      "qa": "opus"
    },
    "phaseThinking": {
      "spec": "high",
      "planning": "ultrathink",
      "coding": "high",
      "qa": "ultrathink"
    }
  }'
```

### Batch Operations

Import multiple Auto-Claude installations:

```bash
#!/bin/bash
INSTALLATIONS=(
  "/opt/auto-claude-prod"
  "/opt/auto-claude-dev"
  "/home/user/auto-claude-personal"
)

for installation in "${INSTALLATIONS[@]}"; do
  echo "Importing from: $installation"
  ccm auto-claude import --source "$installation"
done
```

### Custom Agent Types

Define new agent types via API:

```bash
curl -X POST http://localhost:3000/api/auto-claude/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "devops_engineer",
    "tools": ["Bash", "Read", "Write", "Grep"],
    "mcpServers": ["context7"],
    "mcpServersOptional": ["puppeteer", "linear"],
    "autoClaudeTools": ["docker", "kubernetes"],
    "thinkingDefault": "medium"
  }'
```

### Environment-Specific Configurations

Manage different configs per environment:

```bash
# Development environment
ccm auto-claude profiles apply cost-optimized --project dev-project

# Staging environment
ccm auto-claude profiles apply balanced --project staging-project

# Production environment
ccm auto-claude profiles apply quality-focused --project prod-project
```

### Monitoring and Alerts

Set up monitoring for sync operations:

```bash
# Monitor sync status
ccm auto-claude sync --webhook http://monitoring.example.com/ccm-sync

# Check sync health
curl http://localhost:3000/api/auto-claude/sync/health
```

### Integration with CI/CD

Automate sync in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Sync Auto-Claude Configs
  run: |
    ccm auto-claude sync --backend $AUTO_CLAUDE_BACKEND_URL
  env:
    CCM_SERVER_URL: ${{ secrets.CCM_SERVER_URL }}
    CCM_ENCRYPTION_KEY: ${{ secrets.CCM_ENCRYPTION_KEY }}
```

### Performance Optimization

For large installations:

```bash
# Parallel import (custom script)
ccm auto-claude import --source ~/Auto-Claude --parallel=4

# Incremental sync (future feature)
ccm auto-claude sync --incremental

# Compressed transfer (future feature)
ccm auto-claude sync --compress
```

---

## API Integration

For programmatic access, CCM provides REST APIs:

### Authentication

No authentication required (network-level trust).

### Base URL

```
http://localhost:3000/api/auto-claude
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/import` | Import Auto-Claude configs |
| `POST` | `/sync` | Sync to Auto-Claude backend |
| `GET` | `/agents` | List agent configs |
| `PUT` | `/agents/:type` | Update agent config |
| `GET` | `/prompts` | List prompts |
| `PUT` | `/prompts/:id` | Update prompt |
| `GET` | `/model-profiles` | List model profiles |
| `PUT` | `/model-profiles/:id` | Update model profile |

### Example Usage

```javascript
// Import configs
const response = await fetch('/api/auto-claude/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourcePath: '/path/to/auto-claude',
    dryRun: false
  })
});

// Sync to backend
await fetch('/api/auto-claude/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    backendPath: '/opt/auto-claude',
    projectId: '123'
  })
});
```

---

**Need more help?** Check the [main README](../README.md) or open an [issue](https://github.com/your-org/claude-code-config-manager/issues).

---

*This guide covers CCM v0.1.0 with Auto-Claude integration. For updates and latest features, see the [changelog](../CHANGELOG.md).*