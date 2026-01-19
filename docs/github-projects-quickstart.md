# GitHub Projects Quick Start Guide

## 5-Minute Setup

### Step 1: Create the Project Board (2 minutes)

1. Go to: https://github.com/YOUR_USERNAME/claude-code-config-manager/projects
2. Click **"New project"**
3. Select **"Board"** template
4. Name it: **"CCM v2.0 Implementation"**
5. Click **"Create"**

### Step 2: Add Custom Fields (2 minutes)

Click the **"+"** next to field names to add these:

**Workstream** (Single select):
- WS0-Foundation
- WS1-Machines
- WS2-Hooks
- WS3-Permissions
- WS4-EnvVars
- WS5-ClaudeDesktop
- WS6-Sync
- WS7-MachineUI
- WS8-SettingsUI
- WS9-DesktopSyncUI
- WS10-Integration
- WS11-Testing

**Terminal** (Single select):
- T1, T2, T3, T4, Sequential, Any

**Priority** (Single select):
- 🔴 Critical
- 🟡 High
- 🟢 Medium

**Estimate** (Number):
- Hours

### Step 3: Rename Columns (1 minute)

Edit the default columns to:
1. 📋 **Backlog**
2. 🔜 **Ready**
3. 🏗️ **In Progress**
4. 👀 **Review**
5. ✅ **Done**
6. 🚫 **Blocked**

### Step 4: Create First 5 Issues

Click **"+"** in Backlog column and add:

#### Issue 1: WS0.1 - Update Prisma Schema
```
Labels: critical, foundation
Workstream: WS0-Foundation
Terminal: T1
Priority: Critical
Estimate: 2

Add all new models to schema:
- Machine, MachineOverride
- GlobalHook, GlobalPermission, GlobalEnvVar
- ClaudeDesktopMcp, ClaudeDesktopPlugin
- SyncLog, SyncState
```

#### Issue 2: WS0.2 - Create Shared Types
```
Labels: critical, foundation
Workstream: WS0-Foundation
Terminal: T1
Priority: Critical
Estimate: 2
Depends on: #1

Create TypeScript types in packages/shared/src/types/
- machines.ts, hooks.ts, permissions.ts
- env.ts, claude-desktop.ts, sync.ts
```

#### Issue 3: WS0.3 - Run Database Migration
```
Labels: critical, foundation
Workstream: WS0-Foundation
Terminal: T1
Priority: Critical
Estimate: 0.5
Depends on: #1, #2

Run migrations:
- pnpm --filter server db:push
- pnpm --filter server db:generate
- Verify in Prisma Studio
```

#### Issue 4: WS0.4 - Create Base Utils
```
Labels: critical, foundation
Workstream: WS0-Foundation
Terminal: T1
Priority: Critical
Estimate: 1
Depends on: #2

Create packages/server/src/lib/paths.ts with:
- getClaudeDesktopConfigPath()
- getClaudeCodePaths()
- getMachineInfo()
```

#### Issue 5: WS0.5 - Verify Build
```
Labels: critical, foundation
Workstream: WS0-Foundation
Terminal: T1
Priority: Critical
Estimate: 0.5
Depends on: #1, #2, #3, #4

Final verification:
- pnpm build succeeds
- pnpm typecheck passes
- Test DB records
- Tag: v2.0-foundation-complete
```

---

## Views to Create

### View 1: Workstream Board
- Layout: **Board**
- Group by: **Workstream**
- Sort by: **Priority**

### View 2: Timeline
- Layout: **Roadmap**
- Group by: **Terminal**
- Show: Start date, Target date

### View 3: My Terminal
- Layout: **Table**
- Filter: **Status = In Progress OR Ready**
- Group by: **Terminal**

---

## Daily Workflow

### Morning:
1. Check "Ready" column
2. Move task to "In Progress"
3. Assign to yourself
4. Set Terminal field

### During Work:
1. Update issue with progress notes
2. Link PRs: `Closes #123`
3. Mark tasks with ✅ as you complete them

### When Blocked:
1. Move to "Blocked" column
2. Add comment explaining blocker
3. Set "Blocked By" field

### When Done:
1. Move to "Review" column
2. Request PR review
3. After merge, move to "Done"

---

## Advanced: Automation (Optional)

Add these automation rules:

**Auto-assign**:
- When item moves to "In Progress" → Assign to person who moved it

**Auto-move**:
- When PR linked → Move to "Review"
- When PR merged → Move to "Done"

**Auto-label**:
- When Workstream = WS0 → Add label "foundation"
- When Priority = Critical → Add label "critical"

---

## Quick Tips

**Filtering:**
```
is:open label:critical
is:open workstream:ws0-foundation
is:open assignee:@me
is:open milestone:"WS0: Foundation"
```

**Bulk Operations:**
- Select multiple cards: Hold Cmd/Ctrl + Click
- Bulk move: Drag selection to new column
- Bulk label: Select → Label dropdown

**Keyboard Shortcuts:**
- `c` - Create new card
- `e` - Edit card
- `x` - Close card
- `/` - Quick filter

---

## Progress Tracking

### Daily Standup Template

Post this in project discussions daily:

```markdown
## Daily Progress - [Date]

### ✅ Completed (T1)
- WS0.1: Updated Prisma schema
- WS0.2: Created shared types

### 🏗️ In Progress (T1, T2)
- T1: WS0.3 - Running migrations
- T2: Starting WS2.1 - Hooks parser

### 🚫 Blocked
- None

### 📊 Stats
- Completed: 12/150 tasks (8%)
- In Progress: 4 tasks
- Foundation: 60% complete
```

### Weekly Review Template

```markdown
## Week 1 Review

### Completed Workstreams
- ✅ WS0: Foundation (100%)
- ⏳ WS1: Machines (40%)

### Velocity
- Estimated: 24 hours
- Actual: 28 hours
- Efficiency: 86%

### Blockers Resolved
- Database migration issues - Fixed

### Next Week Focus
- Complete WS1-4 in parallel
- Start WS5-6
```

---

## Import Automation (Optional)

If you want to bulk-create issues:

1. Install GitHub CLI: `brew install gh`
2. Authenticate: `gh auth login`
3. Edit script: `scripts/import-github-tasks.sh`
   - Change `REPO_OWNER` to your username
4. Test: `./scripts/import-github-tasks.sh --dry-run`
5. Run: `./scripts/import-github-tasks.sh`

---

## Templates for Common Issues

### Bug Template
```markdown
**Bug Description:**
[What's broken]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Steps to Reproduce:**
1. ...
2. ...

**Environment:**
- Terminal: T1
- Workstream: WS6-Sync
- OS: macOS 14.0

**Related Issues:**
#123, #456
```

### Feature Template
```markdown
**Feature:**
[Feature name]

**Workstream:** WS1-Machines
**Estimate:** 2h
**Priority:** High
**Dependencies:** #123

**Requirements:**
- [ ] Requirement 1
- [ ] Requirement 2

**Implementation Notes:**
[Technical approach]

**Testing Checklist:**
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
```

---

## Success Criteria

By end of setup, you should have:
- ✅ Project board created
- ✅ Custom fields configured
- ✅ 6 columns set up
- ✅ First 5 issues created
- ✅ At least 1 view configured
- ✅ Team members invited (if applicable)

---

## Resources

- **Full Task List:** See `docs/github-projects-setup.md`
- **Import Script:** See `scripts/import-github-tasks.sh`
- **Implementation Plan:** See `ccm-v2-implementation-plan.md`
- **GitHub Projects Docs:** https://docs.github.com/en/issues/planning-and-tracking-with-projects

---

## Need Help?

**Common Issues:**

1. **Can't add custom fields**
   - Make sure you're using GitHub Projects (Beta), not classic projects

2. **Automation not working**
   - Go to Project Settings → Workflows
   - Enable built-in workflows

3. **Can't see project in repo**
   - Go to Project Settings → Visibility
   - Set to "Public" or link to repository

**Quick Commands:**

```bash
# List all issues
gh issue list

# Create issue from CLI
gh issue create --title "WS0.1: Update Schema" --body "..." --label critical

# Add issue to project
gh project item-add <PROJECT_NUMBER> --owner <OWNER> --url <ISSUE_URL>

# View project
gh project view <PROJECT_NUMBER> --owner <OWNER>
```

---

**Ready to start? Create the board and add your first issue! 🚀**
