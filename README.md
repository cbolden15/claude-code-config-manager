# Claude Code Config Manager (CCM)

A powerful configuration management tool for **Claude Code** and **Auto-Claude** projects. CCM serves as the single source of truth for agent personas, MCP servers, model profiles, and project settings across multiple machines.

## 🚀 Key Features

### Claude Code Integration
- **MCP Servers**: Manage `.mcp.json` configurations
- **Subagents**: Create and sync `.claude/agents/*.md` files
- **Skills**: Organize `.claude/skills/*/SKILL.md` components
- **Commands**: Define `.claude/commands/*.md` shortcuts
- **Hooks**: Configure `.claude/settings.json` automation
- **Templates**: Generate project-specific `CLAUDE.md` files

### Auto-Claude Integration ✨ NEW
- **Agent Configs**: Define tool and MCP access per agent type (15+ default configs)
- **Prompts**: Manage agent persona prompts with injection points (23 default prompts)
- **Model Profiles**: Configure phase-specific models and thinking levels (3 default profiles)
- **Project Configs**: Set up MCP toggles and API keys per project
- **One-Way Sync**: Auto-Claude configs generated from CCM database
- **Rich Seed Data**: Comprehensive defaults from Auto-Claude for immediate use

## 📸 Screenshots

### CCM Dashboard
![CCM Homepage](screenshots/CCM%20Homepage.png)
*Main dashboard showing projects, components, and monitoring overview*

### Component Management
![All Components](screenshots/CCM%20All%20Components.png)
*Browse and manage MCP servers, subagents, skills, commands, and hooks*

### Auto-Claude Configuration
![Auto-Claude Dashboard](screenshots/Auto-Claude%20Config%20Dashboard.png)
*Manage Auto-Claude agent configs, prompts, and model profiles*

### Prompt Editor
![Prompt Editor](screenshots/Auto-Claude%20Prompt%20Editor.png)
*Monaco-powered prompt editor with markdown preview and injection point configuration*

## 📦 Architecture

**Client-Server Model:**
- **Server**: Web UI and API (Docker-hosted on homelab)
- **CLI**: Local file generation and project management
- **Database**: SQLite with Prisma ORM
- **No Authentication**: Network-level trust (local network/Tailscale)

```bash
ccm init my-project --profile blockchain --auto-claude
# → CLI calls server API
# → Server returns file contents (Claude Code + Auto-Claude)
# → CLI writes .claude/, .mcp.json, .auto-claude/.env, etc.
# → CLI registers project with server
```

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| UI Components | shadcn/ui + Tailwind CSS |
| Database | SQLite + Prisma |
| CLI | Node.js + Commander.js |
| Package Manager | pnpm (workspaces) |
| Deployment | Docker |

## 📋 Quick Start

### Prerequisites

- Node.js 20.0.0+
- pnpm 9.0.0+
- **[Auto-Claude](https://github.com/AndyMik90/Auto-Claude)** (optional, for Auto-Claude features)
  - CCM can import and manage Auto-Claude configurations
  - Install Auto-Claude separately to use autonomous coding features

### Installation

```bash
# Clone repository
git clone https://github.com/cbolden-bd/claude-code-config-manager.git
cd claude-code-config-manager

# Install dependencies
pnpm install

# Setup database
pnpm --filter server db:migrate
pnpm --filter server db:seed

# Build CLI
pnpm build

# Link CLI globally (optional)
cd packages/cli && npm link
```

### Server Setup

```bash
# Development server
pnpm dev

# Production (Docker)
docker-compose up -d
```

### CLI Usage

```bash
# Initialize new project
ccm init my-project --profile fullstack

# With Auto-Claude integration
ccm init my-project --profile fullstack --auto-claude

# List available profiles
ccm profiles list

# Sync existing project
ccm sync
```

## 🤖 Auto-Claude Integration

CCM extends beyond Claude Code to become the **single source of truth** for Auto-Claude configurations. Manage all your agent configs, prompts, and model profiles through CCM's web UI or CLI, then sync them to your Auto-Claude installation.

### Key Benefits

- **Centralized Management**: Edit all configs in one place
- **Version Control**: Track changes to prompts and configs
- **Multi-Machine Sync**: Share configs across environments
- **Visual Editing**: Web UI for complex configurations
- **CLI Automation**: Script-friendly command line interface

### Auto-Claude Components

| Component | Description | Output Files |
|-----------|-------------|-------------|
| **Agent Configs** | Tool and MCP access per agent | `AGENT_CONFIGS.json` |
| **Prompts** | Agent persona prompts | `prompts/*.md` |
| **Model Profiles** | Phase-specific models/thinking | `task_metadata.json` |
| **Project Configs** | MCP toggles and API keys | `.auto-claude/.env` |

### Quick Start with Auto-Claude

```bash
# 1. Configure Auto-Claude backend path
ccm auto-claude config --path ~/Projects/Auto-Claude

# 2. Import existing configs (one-time)
ccm auto-claude import --source ~/Projects/Auto-Claude

# 3. Edit configs via web UI
open http://localhost:3000/auto-claude

# 4. Sync changes to Auto-Claude
ccm auto-claude sync

# 5. Create new projects with Auto-Claude support
ccm init my-ai-project --auto-claude
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Auto-Claude Integration Guide](./docs/AUTO_CLAUDE_INTEGRATION.md) | Complete setup and usage guide |
| [API Reference](./docs/SPECIFICATION.md) | Full API documentation |
| [UI Mockup](./docs/UI-MOCKUP.html) | Interactive HTML mockup |

## 🧠 CLI Command Reference

### Core Commands

```bash
# Project Management
ccm init <project> --profile <name> [--auto-claude]
ccm list [--format json]
ccm sync [--project <name>]
ccm apply <profile> [--project <name>]

# Profile Management
ccm profiles list [--verbose]
ccm profiles show <name>
ccm profiles create <name> --description <desc>
ccm profiles delete <name>

# Component Management
ccm components list [--type <type>] [--format json]
ccm components show <id>
ccm components create --type <type> --name <name>
ccm components delete <id>
```

### Auto-Claude Commands

```bash
# Configuration
ccm auto-claude config --path <auto-claude-path>  # Set backend path
ccm auto-claude config --show                     # Show current config

# Import & Sync
ccm auto-claude import --source <path> [--dry-run]      # Import existing configs
ccm auto-claude sync [--backend <path>] [--dry-run]     # Sync to Auto-Claude backend

# Model Profiles
ccm auto-claude profiles list [--verbose] [--format json]           # List all profiles
ccm auto-claude profiles show <name> [--format json]                # Show profile details
ccm auto-claude profiles apply <name> [--project-id <id>]           # Apply to project by ID
ccm auto-claude profiles apply <name> [--project-name <name>]       # Apply to project by name

# Agent Management
ccm auto-claude agents list [--verbose] [--format json]   # List all agent configs
ccm auto-claude agents show <agent-type> [--format json]  # Show agent details
```

### Auto-Claude Workflow Examples

```bash
# Complete setup workflow
ccm auto-claude config --path ~/Auto-Claude
ccm auto-claude import --source ~/Auto-Claude
ccm auto-claude agents list --verbose
ccm auto-claude profiles apply balanced --project-name my-project

# Development workflow
ccm auto-claude sync --dry-run                    # Preview changes
ccm auto-claude sync                              # Apply changes
ccm init new-project --auto-claude                # Create project with Auto-Claude

# Management and inspection
ccm auto-claude agents show coder                 # Inspect coder agent config
ccm auto-claude profiles show balanced --format json  # Export profile as JSON
ccm auto-claude config --show                     # Verify configuration
```

## 🌐 Web UI

Access the web interface at `http://localhost:3000` for:

- **Dashboard**: Overview of projects, components, and sync status
- **Components**: Browse and edit MCP servers, subagents, skills, commands
- **Profiles**: Manage component bundles for different project types
- **Projects**: Track project sync status and configurations
- **Auto-Claude Section**: Dedicated management for Auto-Claude components
  - **Agents**: Configure tools and MCP access per agent type
  - **Prompts**: Edit agent personas with Monaco editor
  - **Profiles**: Manage model and thinking configurations
  - **Projects**: Set up per-project MCP toggles and credentials

## 🔒 Settings & Security

CCM includes secure credential management for Auto-Claude integration:

- **Encrypted Storage**: API keys encrypted in database with AES-256-GCM
- **Environment Variables**: Sensitive settings loaded from environment
- **Masked UI**: Credentials hidden in web interface
- **Settings Management**: Dedicated settings page for configuration

### Key Settings

```bash
# Auto-Claude Integration
AUTO_CLAUDE_BACKEND_PATH=/path/to/auto-claude
LINEAR_API_KEY=lin_xxx (encrypted with AES-256-GCM)
LINEAR_TEAM_ID=team-id
GITHUB_TOKEN=ghp_xxx (encrypted with AES-256-GCM)
GITHUB_REPO=your-org/your-repo

# CCM Configuration
CCM_SERVER_URL=http://localhost:3000
CCM_ENCRYPTION_KEY=your-32-char-key
```

## 🐛 Development

### Project Structure

```
claude-code-config-manager/
├── packages/
│   ├── server/           # Next.js app (API + UI)
│   ├── cli/             # Command-line interface
│   └── shared/          # Shared types and schemas
├── docs/               # Documentation
└── docker/            # Deployment configuration
```

### Development Commands

```bash
# Development
pnpm dev                          # Run server in dev mode
pnpm --filter cli dev             # Run CLI in watch mode

# Database
pnpm --filter server db:push      # Push schema changes
pnpm --filter server db:studio    # Open Prisma Studio
pnpm --filter server db:seed      # Seed database

# Testing
pnpm test                         # Run all tests
pnpm --filter server test         # Server tests only
pnpm --filter cli test            # CLI tests only

# Building
pnpm build                        # Build all packages
```

### Contributing

1. Read the [specification](./docs/SPECIFICATION.md) and [UI mockup](./docs/UI-MOCKUP.html)
2. Create feature branch: `git checkout -b feature/your-feature`
3. Follow TypeScript strict mode and existing patterns
4. Add tests for new functionality
5. Update documentation as needed
6. Submit pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🤝 Support

- **Documentation**: [Auto-Claude Integration Guide](./docs/AUTO_CLAUDE_INTEGRATION.md)
- **Issues**: [GitHub Issues](https://github.com/cbolden-bd/claude-code-config-manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cbolden-bd/claude-code-config-manager/discussions)

## 🔗 Related Projects

- **[Auto-Claude](https://github.com/AndyMik90/Auto-Claude)** - Autonomous coding system by AndyMik90
  - CCM extends Auto-Claude by providing centralized configuration management
  - Use CCM to manage your Auto-Claude agents, prompts, and model profiles
- **[Claude Code](https://claude.com/claude-code)** - Anthropic's official CLI tool for Claude

---

**CCM** makes managing Claude Code and Auto-Claude configurations simple, scalable, and secure. One tool, one source of truth, unlimited projects. ✨