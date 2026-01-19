#!/bin/bash
# Import CCM v2.0 tasks into GitHub Issues
# Usage: ./scripts/import-github-tasks.sh [--dry-run]

set -e

REPO_OWNER="YOUR_USERNAME"  # Change this to your GitHub username
REPO_NAME="claude-code-config-manager"
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No issues will be created"
  echo ""
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed"
  echo "Install it from: https://cli.github.com/"
  exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ Not authenticated with GitHub CLI"
  echo "Run: gh auth login"
  exit 1
fi

echo "🚀 Creating GitHub Issues for CCM v2.0 Implementation"
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Function to create issue
create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  local milestone="$4"

  if [[ "$DRY_RUN" == true ]]; then
    echo "Would create: $title"
    echo "  Labels: $labels"
    return
  fi

  local cmd="gh issue create --repo $REPO_OWNER/$REPO_NAME --title \"$title\" --body \"$body\""

  if [[ -n "$labels" ]]; then
    cmd="$cmd --label \"$labels\""
  fi

  if [[ -n "$milestone" ]]; then
    cmd="$cmd --milestone \"$milestone\""
  fi

  eval "$cmd"
  echo "✓ Created: $title"
}

# Create milestones first
echo "📍 Creating Milestones..."
if [[ "$DRY_RUN" == false ]]; then
  gh api --method POST "/repos/$REPO_OWNER/$REPO_NAME/milestones" \
    -f title="WS0: Foundation" \
    -f description="Database schema, types, and base utilities" 2>/dev/null || true

  gh api --method POST "/repos/$REPO_OWNER/$REPO_NAME/milestones" \
    -f title="WS1-4: Core APIs" \
    -f description="Machines, Hooks, Permissions, Env Vars" 2>/dev/null || true

  gh api --method POST "/repos/$REPO_OWNER/$REPO_NAME/milestones" \
    -f title="WS5-6: Desktop & Sync" \
    -f description="Claude Desktop integration and sync system" 2>/dev/null || true

  gh api --method POST "/repos/$REPO_OWNER/$REPO_NAME/milestones" \
    -f title="WS7-9: UI" \
    -f description="All UI pages and components" 2>/dev/null || true

  gh api --method POST "/repos/$REPO_OWNER/$REPO_NAME/milestones" \
    -f title="WS10-11: Integration & Testing" \
    -f description="Wire everything together and test" 2>/dev/null || true

  echo "✓ Milestones created"
else
  echo "Would create 5 milestones"
fi
echo ""

# Create labels
echo "🏷️  Creating Labels..."
if [[ "$DRY_RUN" == false ]]; then
  labels=(
    "workstream:ws0,Foundation,#dc143c"
    "workstream:ws1,Machines,#ff6b6b"
    "workstream:ws2,Hooks,#4ecdc4"
    "workstream:ws3,Permissions,#45b7d1"
    "workstream:ws4,EnvVars,#96ceb4"
    "workstream:ws5,ClaudeDesktop,#ffeaa7"
    "workstream:ws6,Sync,#dfe6e9"
    "workstream:ws7,MachineUI,#a29bfe"
    "workstream:ws8,SettingsUI,#fd79a8"
    "workstream:ws9,DesktopSyncUI,#fdcb6e"
    "workstream:ws10,Integration,#6c5ce7"
    "workstream:ws11,Testing,#00b894"
    "priority:critical,Critical Path,#b60205"
    "priority:high,High Priority,#d93f0b"
    "priority:medium,Medium Priority,#fbca04"
    "priority:low,Low Priority,#0e8a16"
    "terminal:t1,Terminal 1,#c5def5"
    "terminal:t2,Terminal 2,#bfdadc"
    "terminal:t3,Terminal 3,#d4c5f9"
    "terminal:t4,Terminal 4,#f9d0c4"
    "terminal:sequential,Sequential,#cccccc"
    "phase:foundation,Foundation,#0052cc"
    "phase:parallel-1,Parallel Phase 1,#0052cc"
    "phase:parallel-2,Parallel Phase 2,#0052cc"
    "phase:parallel-3,Parallel Phase 3,#0052cc"
    "phase:integration,Integration,#5319e7"
    "phase:testing,Testing,#006b75"
  )

  for label in "${labels[@]}"; do
    IFS=',' read -r name description color <<< "$label"
    gh api --method POST "/repos/$REPO_OWNER/$REPO_NAME/labels" \
      -f name="$name" \
      -f description="$description" \
      -f color="$color" 2>/dev/null || true
  done
  echo "✓ Labels created"
else
  echo "Would create 27 labels"
fi
echo ""

echo "📝 Creating Issues..."
echo ""

# WS0: Foundation
cat << 'EOF' | while IFS='|' read -r title labels milestone body; do
  [[ "$title" == "TITLE" ]] && continue
  create_issue "$title" "$body" "$labels" "$milestone"
done
TITLE|LABELS|MILESTONE|BODY
WS0.1: Update Prisma Schema|workstream:ws0,priority:critical,terminal:t1,phase:foundation|WS0: Foundation|**Estimate:** 2h
**Dependencies:** None
**File Owner:** packages/server/prisma/schema.prisma

**Tasks:**
- [ ] Add Machine and MachineOverride models
- [ ] Add GlobalHook model
- [ ] Add GlobalPermission model
- [ ] Add GlobalEnvVar model
- [ ] Add ClaudeDesktopMcp and ClaudeDesktopPlugin models
- [ ] Add SyncLog and SyncState models
- [ ] Review indexes for query performance

**Notes:**
- Consider adding indexes on Machine.lastSeen, SyncLog.startedAt
- Change GlobalHook.tags to String[] for better querying
- Document encryption approach for GlobalEnvVar.value
WS0.2: Create Shared Types|workstream:ws0,priority:critical,terminal:t1,phase:foundation|WS0: Foundation|**Estimate:** 2h
**Dependencies:** WS0.1
**File Owner:** packages/shared/src/types/*.ts

**Tasks:**
- [ ] Create types/machines.ts
- [ ] Create types/hooks.ts
- [ ] Create types/permissions.ts
- [ ] Create types/env.ts
- [ ] Create types/claude-desktop.ts
- [ ] Create types/sync.ts
- [ ] Update types/index.ts with exports

**Success Criteria:**
- All types compile without errors
- Types exported from @ccm/shared
WS0.3: Run Database Migration|workstream:ws0,priority:critical,terminal:t1,phase:foundation|WS0: Foundation|**Estimate:** 0.5h
**Dependencies:** WS0.1, WS0.2

**Tasks:**
- [ ] Run pnpm --filter server db:push
- [ ] Run pnpm --filter server db:generate
- [ ] Verify tables created in Prisma Studio
- [ ] Create backup of existing database

**Success Criteria:**
- All new tables exist in database
- Prisma client regenerated
WS0.4: Create Base Utility Files|workstream:ws0,priority:critical,terminal:t1,phase:foundation|WS0: Foundation|**Estimate:** 1h
**Dependencies:** WS0.2
**File Owner:** packages/server/src/lib/paths.ts

**Tasks:**
- [ ] Create lib/paths.ts with helper functions
- [ ] Test path resolution on macOS
- [ ] Add platform detection utilities
- [ ] Add machine info gathering

**Functions to implement:**
- getClaudeDesktopConfigPath()
- getClaudeCodePaths()
- getMachineInfo()
WS0.5: Verify Build|workstream:ws0,priority:critical,terminal:t1,phase:foundation|WS0: Foundation|**Estimate:** 0.5h
**Dependencies:** WS0.1, WS0.2, WS0.3, WS0.4

**Tasks:**
- [ ] Run pnpm build successfully
- [ ] Run pnpm typecheck successfully
- [ ] Create test record in each new table
- [ ] Verify shared types compile
- [ ] Tag as v2.0-foundation-complete

**Success Criteria:**
- No build errors
- No type errors
- All new tables accessible
- Ready for parallel development
EOF

echo ""
echo "✅ Foundation issues created"
echo ""

# WS1: Machines
cat << 'EOF' | while IFS='|' read -r title labels milestone body; do
  [[ "$title" == "TITLE" ]] && continue
  create_issue "$title" "$body" "$labels" "$milestone"
done
TITLE|LABELS|MILESTONE|BODY
WS1.1: Machine API Routes|workstream:ws1,priority:critical,terminal:t1,phase:parallel-1|WS1-4: Core APIs|**Estimate:** 2h
**Dependencies:** WS0
**File Owner:** packages/server/src/app/api/machines/**

**Tasks:**
- [ ] Create GET /api/machines (list)
- [ ] Create POST /api/machines (register)
- [ ] Create GET /api/machines/[id]
- [ ] Create PUT /api/machines/[id]
- [ ] Create DELETE /api/machines/[id]
- [ ] Create GET /api/machines/[id]/overrides
- [ ] Create POST /api/machines/[id]/overrides
- [ ] Test all routes with curl

**Testing:**
```bash
curl http://localhost:3000/api/machines
curl -X POST http://localhost:3000/api/machines -d '{"name":"test","platform":"darwin"}'
```
WS1.2: Machine CLI Commands|workstream:ws1,priority:high,terminal:t1,phase:parallel-1|WS1-4: Core APIs|**Estimate:** 2h
**Dependencies:** WS1.1
**File Owner:** packages/cli/src/commands/machine.ts, packages/cli/src/lib/api-machines.ts

**Tasks:**
- [ ] Create api-machines.ts API client
- [ ] Implement ccm machine register
- [ ] Implement ccm machine list
- [ ] Implement ccm machine status
- [ ] Implement ccm machine show <id>
- [ ] Test registration flow
- [ ] Test listing machines

**Testing:**
```bash
ccm machine register
ccm machine list
ccm machine status
```
EOF

echo "✅ Machine management issues created"
echo ""

# For brevity, I'll create a few more key issues
cat << 'EOF' | while IFS='|' read -r title labels milestone body; do
  [[ "$title" == "TITLE" ]] && continue
  create_issue "$title" "$body" "$labels" "$milestone"
done
TITLE|LABELS|MILESTONE|BODY
WS2.1: Hooks Parser & Business Logic|workstream:ws2,priority:critical,terminal:t2,phase:parallel-1|WS1-4: Core APIs|**Estimate:** 2h
**Dependencies:** WS0
**File Owner:** packages/server/src/lib/hooks.ts

See implementation plan section "WS2: Global Hooks" for full details.
WS2.2: Hooks API Routes|workstream:ws2,priority:critical,terminal:t2,phase:parallel-1|WS1-4: Core APIs|**Estimate:** 2h
**Dependencies:** WS2.1
**File Owner:** packages/server/src/app/api/settings/hooks/**

Create all CRUD routes plus import/export endpoints.
WS2.3: Hooks CLI Commands|workstream:ws2,priority:high,terminal:t2,phase:parallel-1|WS1-4: Core APIs|**Estimate:** 2h
**Dependencies:** WS2.2
**File Owner:** packages/cli/src/commands/settings-hooks.ts

Implement list, import, export, add, delete commands.
WS6.1: Server-Side Sync Engine|workstream:ws6,priority:critical,terminal:t2,phase:parallel-2|WS5-6: Desktop & Sync|**Estimate:** 3h
**Dependencies:** WS0, WS1, WS2, WS3, WS4
**File Owner:** packages/server/src/lib/sync-engine.ts

**CRITICAL:** This is the most complex workstream.

**Tasks:**
- [ ] Implement generateSyncPayload()
- [ ] Apply machine overrides
- [ ] Implement sync state tracking
- [ ] Add conflict detection
- [ ] Write unit tests
- [ ] Test with multiple machines

**Edge cases to handle:**
- Machine offline mid-sync
- Concurrent syncs from different machines
- Partial sync failures
- File write errors
WS10.1: Wire CLI Commands|workstream:ws10,priority:critical,terminal:sequential,phase:integration|WS10-11: Integration & Testing|**Estimate:** 2h
**Dependencies:** All WS1-9
**File Owner:** packages/cli/src/commands/index.ts, packages/cli/src/index.ts

Register all commands in CLI hierarchy.
WS11.1: End-to-End CLI Testing|workstream:ws11,priority:critical,terminal:sequential,phase:testing|WS10-11: Integration & Testing|**Estimate:** 4h
**Dependencies:** WS10

**Critical test scenarios:**
- [ ] Register 2 machines
- [ ] Import hooks from settings.local.json
- [ ] Sync to Machine A
- [ ] Sync to Machine B
- [ ] Verify identical configs
- [ ] Modify hook on Machine A
- [ ] Sync back to server
- [ ] Pull changes to Machine B
- [ ] Test conflict resolution
- [ ] Test Claude Desktop sync
EOF

echo ""
echo "✅ Sample issues created"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "  • Created milestones for all workstreams"
echo "  • Created comprehensive label system"
echo "  • Created sample issues (10 shown here)"
echo ""
echo "📝 Next Steps:"
echo "  1. Update REPO_OWNER in this script"
echo "  2. Run: ./scripts/import-github-tasks.sh --dry-run"
echo "  3. Review the output"
echo "  4. Run: ./scripts/import-github-tasks.sh"
echo "  5. Add remaining issues manually or extend this script"
echo "  6. Create GitHub Project and add issues"
echo ""
echo "💡 Tip: You can bulk-create more issues by adding them to the"
echo "   heredoc sections in this script following the same pattern."
echo ""
echo "🔗 Helpful commands:"
echo "  gh issue list --label workstream:ws0"
echo "  gh issue list --milestone 'WS0: Foundation'"
echo "  gh project item-add PROJECT_NUMBER --owner OWNER"
echo ""
EOF

echo "✅ All sample issues created!"
