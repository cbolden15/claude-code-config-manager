# Preparing CCM for GitHub

Guide for pushing Claude Code Config Manager to GitHub and managing the repository.

## Pre-Push Checklist

Before pushing to GitHub, ensure:

- [ ] All sensitive data removed (.env files, API keys, personal paths)
- [ ] .gitignore properly configured
- [ ] Documentation complete (README, INSTALLATION, UPDATING)
- [ ] Database and build artifacts excluded
- [ ] Example configuration files created
- [ ] License file added
- [ ] Contributing guidelines added (optional)

## Step 1: Clean Sensitive Data

### Check for Sensitive Files

```bash
# Search for potential secrets
git grep -i "password\|secret\|api_key\|token" -- ':!*.md' ':!docs/*'

# Check what will be committed
git status
```

### Create .gitignore (if not exists)

The project should already have `.gitignore`, but verify it includes:

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
.next/
dist/
build/
*.tsbuildinfo

# Database
*.db
*.db-journal
data/

# Environment & Secrets
.env
.env.local
.env*.local
*.pem
*.key

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/

# Temporary
tmp/
temp/
.cache/

# Auto-Claude worktrees
.auto-claude/worktrees/
.auto-claude/specs/*/task_logs.json
.auto-claude/specs/*/memory/
```

### Create Example Environment File

```bash
# Create example .env
cat > packages/server/.env.example << 'EOF'
# Encryption key for credentials (generate with: openssl rand -hex 16)
ENCRYPTION_KEY=your-32-character-key-replace-this

# Auto-Claude backend path
AUTO_CLAUDE_BACKEND_PATH=/path/to/auto-claude

# Optional: Linear integration
LINEAR_API_KEY=your-linear-api-key
LINEAR_TEAM_ID=your-team-id

# Optional: GitHub integration
GITHUB_TOKEN=your-github-token
GITHUB_REPO=your-org/your-repo

# Server configuration
CCM_SERVER_URL=http://localhost:3000
NODE_ENV=development
EOF
```

## Step 2: Create GitHub Repository

### Option A: GitHub CLI (Recommended)

```bash
# Install GitHub CLI if needed
brew install gh

# Authenticate
gh auth login

# Create repository
gh repo create claude-code-config-manager \
  --public \
  --description "Configuration manager for Claude Code and Auto-Claude projects" \
  --source=. \
  --remote=origin
```

### Option B: Manual Setup

1. Go to https://github.com/new
2. Name: `claude-code-config-manager`
3. Description: `Configuration manager for Claude Code and Auto-Claude projects`
4. Public/Private: Choose based on preference
5. Don't initialize with README (we already have one)
6. Click "Create repository"

Then connect locally:

```bash
git remote add origin https://github.com/YOUR_USERNAME/claude-code-config-manager.git
```

## Step 3: Prepare Commits

### Review Changes

```bash
# See all files that will be committed
git status

# Review changes
git diff

# Check file sizes (avoid committing large files)
git ls-files --stage | awk '{print $4}' | xargs -I {} sh -c 'du -h "{}" 2>/dev/null' | sort -h
```

### Create Clean Commit History

If you want to clean up the Auto-Claude build commits:

```bash
# Option 1: Keep full history
git add .
git commit -m "feat: Add Auto-Claude integration

- Complete Auto-Claude configuration management
- 15 agent configs, 23 prompts, 3 model profiles
- Web UI for agent, prompt, and profile management
- CLI commands for import, sync, and project initialization
- One-way sync: CCM → Auto-Claude
- Full documentation and guides"

# Option 2: Squash into single commit
git reset --soft HEAD~198  # Reset last 198 commits
git add .
git commit -m "feat: Add Auto-Claude integration with full management UI and CLI"
```

## Step 4: Push to GitHub

```bash
# Push main branch
git push -u origin main

# If you squashed commits and need force push
git push -u origin main --force

# Push tags (if any)
git push --tags
```

## Step 5: Configure Repository Settings

### Add Repository Topics

On GitHub, add topics for discoverability:
- `claude-code`
- `auto-claude`
- `configuration-management`
- `ai-agents`
- `anthropic`
- `cli-tool`
- `nextjs`
- `typescript`

### Set Up Branch Protection (Optional)

For collaborative development:
1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date

### Create GitHub Actions (Optional)

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Install pnpm
      run: npm install -g pnpm

    - name: Install dependencies
      run: pnpm install

    - name: Build
      run: pnpm build

    - name: Run tests
      run: pnpm test
```

## Step 6: Update Repository Metadata

### Edit README.md

Update these placeholder URLs:
- `YOUR_USERNAME` → Your actual GitHub username
- `your-org` → Your organization name (if applicable)

### Create CHANGELOG.md

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-01-06

### Added
- Complete Auto-Claude integration
- Agent configuration management (15 default configs)
- Prompt management with Monaco editor (23 default prompts)
- Model profile management (3 default profiles)
- CLI commands for Auto-Claude operations
- Import wizard for existing Auto-Claude installations
- One-way sync: CCM → Auto-Claude
- Comprehensive documentation

### Security
- AES-256-GCM encryption for sensitive credentials
- Secure settings management
- Environment-based configuration

## [0.1.0] - Initial Release

### Added
- Basic CCM functionality
- Claude Code configuration management
- MCP server management
- Component and profile system
```

### Add License

If not already present, add a LICENSE file (MIT recommended):

```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

## Step 7: Post-Push Tasks

### Create Initial Release

```bash
# Tag the release
git tag -a v1.0.0 -m "Auto-Claude Integration Release"
git push origin v1.0.0

# Or use GitHub CLI
gh release create v1.0.0 \
  --title "v1.0.0: Auto-Claude Integration" \
  --notes "Complete Auto-Claude integration with management UI and CLI"
```

### Update Repository Description

```bash
# Using GitHub CLI
gh repo edit --description "Configuration manager for Claude Code and Auto-Claude projects. Single source of truth for agent configs, prompts, and model profiles."
```

### Add Useful Links

In repository settings, add:
- **Website**: Your deployment URL (if applicable)
- **Documentation**: Link to GitHub Pages or wiki

## Installation Instructions for Users

Once pushed, users can install with:

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/claude-code-config-manager.git
cd claude-code-config-manager

# Follow standard installation
pnpm install
pnpm --filter server db:push
pnpm --filter server db:seed
pnpm build

# Optional: Link CLI globally
cd packages/cli && npm link
```

## Keeping Repository Updated

### For Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes, commit
git add .
git commit -m "feat: Add new feature"

# Push and create PR
git push -u origin feature/new-feature
gh pr create
```

### For Releases

```bash
# Update version in package.json files
# Update CHANGELOG.md
# Commit changes
git add .
git commit -m "chore: Bump version to 1.1.0"

# Create tag and push
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin main --tags

# Create GitHub release
gh release create v1.1.0 --generate-notes
```

## Security Considerations

### Secrets Scanning

Enable GitHub's secret scanning:
1. Go to Settings → Code security and analysis
2. Enable "Secret scanning"
3. Enable "Push protection"

### Dependabot

Enable Dependabot for dependency updates:
1. Go to Settings → Code security and analysis
2. Enable "Dependabot alerts"
3. Enable "Dependabot security updates"

### Security Policy

Create `.github/SECURITY.md`:

```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please email [your-email] instead of opening a public issue.

We take security seriously and will respond promptly to fix any issues.
```

## Support Documentation

Create a support section in your README and consider:
- GitHub Discussions for community support
- GitHub Issues for bug reports
- Wiki for extended documentation
- GitHub Pages for hosted documentation

---

Your CCM repository is now ready for GitHub and users can easily install, use, and contribute to it! 🚀
