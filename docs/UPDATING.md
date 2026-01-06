# Updating CCM + Auto-Claude

Guide for keeping your Claude Code Config Manager installation up to date.

## Quick Update (Recommended)

```bash
# 1. Navigate to your CCM installation
cd ~/path/to/claude-code-config-manager

# 2. Pull latest changes
git pull origin main

# 3. Update dependencies
pnpm install

# 4. Run database migrations (if any)
pnpm --filter server db:migrate

# 5. Rebuild packages
pnpm build

# 6. Restart server
# Stop existing server (Ctrl+C or kill process)
pnpm dev
```

## Detailed Update Process

### Step 1: Backup Your Data

Before updating, backup your database and configurations:

```bash
# Backup database
cp packages/server/data/ccm.db packages/server/data/ccm.db.backup

# Backup environment files
cp packages/server/.env packages/server/.env.backup
```

### Step 2: Check for Breaking Changes

```bash
# View changes since your last update
git fetch origin
git log HEAD..origin/main --oneline

# Check for migration notes
cat CHANGELOG.md  # if available
```

### Step 3: Update Code

```bash
# Stash any local changes
git stash

# Pull latest code
git pull origin main

# Reapply your changes (if needed)
git stash pop
```

### Step 4: Update Dependencies

```bash
# Update all workspace dependencies
pnpm install

# Or update specific packages
pnpm --filter server install
pnpm --filter cli install
```

### Step 5: Database Migrations

```bash
# Check if migrations are needed
pnpm --filter server db:migrate:status

# Run migrations
pnpm --filter server db:migrate

# Or force reset (WARNING: destroys data)
pnpm --filter server db:reset
pnpm --filter server db:seed
```

### Step 6: Rebuild and Restart

```bash
# Rebuild all packages
pnpm build

# Restart server
pnpm dev
```

## Updating Auto-Claude Integration

When Auto-Claude releases updates, you may need to:

### 1. Update Auto-Claude Itself

```bash
cd ~/Projects/Auto-Claude  # or your Auto-Claude path
git pull origin main
pip install -r requirements.txt --upgrade
```

### 2. Re-import Updated Configs

```bash
# Import new/updated prompts and configs
ccm auto-claude import --source ~/Projects/Auto-Claude

# This will:
# - Add any new agent configs
# - Update existing prompts
# - Add new model options
# - Preserve your customizations
```

### 3. Sync Changes

```bash
# Review what will change
ccm auto-claude sync --dry-run

# Apply changes
ccm auto-claude sync
```

## Update Schedules

### When to Update CCM

**Update immediately for:**
- Security patches
- Critical bug fixes
- Breaking changes in Auto-Claude compatibility

**Update regularly for:**
- New features
- Performance improvements
- New Auto-Claude agent configs

### Checking for Updates

```bash
# Check if you're behind
cd ~/path/to/claude-code-config-manager
git fetch origin
git status

# See what's new
git log HEAD..origin/main --oneline --graph
```

## Troubleshooting Updates

### Issue: Database migration fails

**Solution:**
```bash
# Backup current database
cp packages/server/data/ccm.db packages/server/data/ccm.db.backup

# Reset database
rm packages/server/data/ccm.db
pnpm --filter server db:push
pnpm --filter server db:seed

# Re-import your Auto-Claude configs
ccm auto-claude import
```

### Issue: Build errors after update

**Solution:**
```bash
# Clean install
rm -rf node_modules packages/*/node_modules
pnpm install
pnpm build
```

### Issue: CLI not working after update

**Solution:**
```bash
# Rebuild CLI
pnpm --filter cli build

# Re-link globally
cd packages/cli
npm unlink
npm link
cd ../..
```

### Issue: Server won't start

**Solution:**
```bash
# Check for port conflicts
lsof -ti:3000 | xargs kill -9

# Clear Next.js cache
rm -rf packages/server/.next

# Restart
pnpm dev
```

## Rollback to Previous Version

If an update causes issues:

```bash
# Find the commit you want to rollback to
git log --oneline -20

# Rollback (replace <commit> with actual commit hash)
git reset --hard <commit>

# Restore dependencies
pnpm install
pnpm build

# Restore database (if you backed it up)
cp packages/server/data/ccm.db.backup packages/server/data/ccm.db
```

## Staying Informed

- **Watch the repository** on GitHub for release notifications
- **Check CHANGELOG.md** before updating
- **Read release notes** for breaking changes
- **Test in development** before updating production

## Automated Updates (Advanced)

Create a script to automate updates:

```bash
#!/bin/bash
# update-ccm.sh

cd ~/path/to/claude-code-config-manager

echo "Backing up database..."
cp packages/server/data/ccm.db packages/server/data/ccm.db.backup.$(date +%Y%m%d)

echo "Pulling latest changes..."
git pull origin main

echo "Updating dependencies..."
pnpm install

echo "Running migrations..."
pnpm --filter server db:migrate

echo "Rebuilding..."
pnpm build

echo "Update complete! Restart the server with: pnpm dev"
```

Make it executable:
```bash
chmod +x update-ccm.sh
./update-ccm.sh
```

## Version Compatibility

| CCM Version | Auto-Claude Version | Node.js | pnpm |
|-------------|---------------------|---------|------|
| 1.0.0+      | 1.0.0+             | 20.0+   | 9.0+ |

## Support

If you encounter issues updating:

1. Check [GitHub Issues](https://github.com/YOUR_USERNAME/claude-code-config-manager/issues)
2. Review [Installation Guide](./INSTALLATION.md)
3. Create a new issue with:
   - Current version
   - Update steps taken
   - Error messages
   - System info (Node, pnpm versions)
