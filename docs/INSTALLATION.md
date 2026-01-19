# CCM + Auto-Claude Installation Guide

Complete guide for installing and configuring Claude Code Config Manager with Auto-Claude integration.

## Prerequisites

Before installing CCM, ensure you have:

- **Node.js** 20.0.0 or higher ([Download](https://nodejs.org/))
- **pnpm** 9.0.0 or higher (Install: `npm install -g pnpm`)
- **Auto-Claude** (optional, for Auto-Claude features) ([GitHub](https://github.com/AndyMik90/Auto-Claude))
- **Git** for version control

## Installation Methods

### Method 1: Standard Installation (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/cbolden-bd/claude-code-config-manager.git
cd claude-code-config-manager

# 2. Install all dependencies
pnpm install

# 3. Setup database
pnpm --filter server db:push     # Create SQLite database
pnpm --filter server db:seed     # Seed with default data

# 4. Build packages
pnpm build

# 5. Link CLI globally (optional but recommended)
cd packages/cli
npm link
cd ../..

# 6. Verify installation
ccm --version
```

### Method 2: Quick Start (Development)

```bash
# Clone and install
git clone https://github.com/cbolden-bd/claude-code-config-manager.git
cd claude-code-config-manager
pnpm install

# Run everything in dev mode (no build needed)
pnpm dev

# In another terminal, use CLI from source
cd packages/cli
pnpm start -- --help
```

## Configuration

### 1. Environment Variables (Optional)

Create `.env` file in `packages/server/`:

```env
# Encryption key for sensitive credentials (generate with: openssl rand -hex 16)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Auto-Claude backend path (can also set via CLI)
AUTO_CLAUDE_BACKEND_PATH=/Users/you/Projects/Auto-Claude

# Server configuration
CCM_SERVER_URL=http://localhost:3000
NODE_ENV=development
```

### 2. Auto-Claude Integration Setup

If you want to use Auto-Claude features:

```bash
# Set Auto-Claude backend path
ccm auto-claude config --path ~/Projects/Auto-Claude

# Import existing Auto-Claude configurations
ccm auto-claude import

# Verify import
ccm auto-claude agents list
ccm auto-claude profiles list
```

## Verification

Verify your installation is working:

```bash
# Check CLI
ccm --version
ccm --help

# Start server
pnpm dev

# In browser, visit:
# - Main dashboard: http://localhost:3000
# - Auto-Claude: http://localhost:3000/auto-claude

# Test CLI commands
ccm profiles list
ccm auto-claude agents list
```

## Common Installation Issues

### Issue: `pnpm: command not found`

**Solution:**
```bash
npm install -g pnpm
```

### Issue: Port 3000 already in use

**Solution:**
The server will automatically try ports 3001, 3002, etc. Check the terminal output for the actual port.

Or stop the conflicting process:
```bash
lsof -ti:3000 | xargs kill -9
```

### Issue: Database locked errors

**Solution:**
```bash
# Reset the database
rm packages/server/data/ccm.db
pnpm --filter server db:push
pnpm --filter server db:seed
```

### Issue: `ccm: command not found` after `npm link`

**Solution:**
```bash
# Ensure npm global bin is in PATH
npm config get prefix  # Note this path
export PATH="$PATH:/path/to/npm/bin"

# Or use without linking
cd packages/cli
pnpm start -- <command>
```

### Issue: Auto-Claude import fails

**Solution:**
```bash
# Verify Auto-Claude path
ccm auto-claude config --show

# Re-configure path
ccm auto-claude config --path /correct/path/to/Auto-Claude

# Try import with verbose output
ccm auto-claude import --verbose
```

## Next Steps

After successful installation:

1. **Explore the Web UI**: Visit http://localhost:3000/auto-claude
2. **Import Your Configs**: Run `ccm auto-claude import` if you have existing Auto-Claude setup
3. **Create a Test Project**: `ccm init test-project --auto-claude`
4. **Read the Documentation**: Check `docs/AUTO_CLAUDE_INTEGRATION.md`

## Updating CCM

See [UPDATING.md](./UPDATING.md) for instructions on keeping CCM up to date.

## Support

- **Documentation**: [Main README](../README.md)
- **Issues**: [GitHub Issues](https://github.com/cbolden-bd/claude-code-config-manager/issues)
- **Auto-Claude Guide**: [Integration Guide](./AUTO_CLAUDE_INTEGRATION.md)
