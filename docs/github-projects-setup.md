# GitHub Projects Setup for CCM v2.0

## Quick Setup Guide

### 1. Create New Project

1. Go to your repository: `https://github.com/YOUR_USERNAME/claude-code-config-manager`
2. Click **Projects** tab
3. Click **New Project**
4. Choose **Board** template
5. Name it: **CCM v2.0 Implementation**

### 2. Configure Custom Fields

Add these custom fields to your project:

| Field Name | Type | Options |
|------------|------|---------|
| **Workstream** | Single Select | WS0-Foundation, WS1-Machines, WS2-Hooks, WS3-Permissions, WS4-EnvVars, WS5-ClaudeDesktop, WS6-Sync, WS7-MachineUI, WS8-SettingsUI, WS9-DesktopSyncUI, WS10-Integration, WS11-Testing |
| **Terminal** | Single Select | T1, T2, T3, T4, Sequential, Any |
| **Priority** | Single Select | Critical, High, Medium, Low |
| **Estimate** | Number | (hours) |
| **Dependencies** | Text | (e.g., "WS0, WS1") |
| **File Owner** | Text | (file paths) |
| **Phase** | Single Select | Foundation, Parallel-1, Parallel-2, Integration, Testing |
| **Blocked By** | Text | (issue #s or workstream) |

### 3. Create Status Columns

Rename the default columns to:

1. **📋 Backlog**
2. **🔜 Ready** (Dependencies met, can start)
3. **🏗️ In Progress**
4. **👀 Review** (Code review needed)
5. **✅ Done**
6. **🚫 Blocked**

### 4. Create Views

#### View 1: By Workstream
- Group by: **Workstream**
- Sort by: **Priority** (High → Low)
- Filter: Status != Done

#### View 2: Timeline
- Layout: **Roadmap**
- Group by: **Phase**
- X-axis: Date

#### View 3: My Work (Per Terminal)
- Group by: **Terminal**
- Filter: Status = In Progress OR Ready
- Sort by: Priority

#### View 4: Blocked Items
- Filter: Status = Blocked
- Sort by: Priority

---

## Task Breakdown (Import These)

Copy the tasks below into GitHub Issues, then add them to your project board.

### Legend
- 🔴 **Critical Path** - Blocks other work
- 🟡 **High Priority** - Important but not blocking
- 🟢 **Medium Priority** - Can be done anytime
- ⚪ **Low Priority** - Nice to have

---

## WS0: Foundation (SEQUENTIAL - MUST COMPLETE FIRST)

### WS0.1: Update Prisma Schema 🔴
**Workstream:** WS0-Foundation
**Terminal:** T1
**Estimate:** 2h
**Priority:** Critical
**Dependencies:** None
**File Owner:** `packages/server/prisma/schema.prisma`

**Tasks:**
- [ ] Add Machine and MachineOverride models
- [ ] Add GlobalHook model
- [ ] Add GlobalPermission model
- [ ] Add GlobalEnvVar model
- [ ] Add ClaudeDesktopMcp and ClaudeDesktopPlugin models
- [ ] Add SyncLog and SyncState models
- [ ] Review indexes for query performance

---

### WS0.2: Create Shared Types 🔴
**Workstream:** WS0-Foundation
**Terminal:** T1
**Estimate:** 2h
**Priority:** Critical
**Dependencies:** WS0.1
**File Owner:** `packages/shared/src/types/*.ts`

**Tasks:**
- [ ] Create `types/machines.ts`
- [ ] Create `types/hooks.ts`
- [ ] Create `types/permissions.ts`
- [ ] Create `types/env.ts`
- [ ] Create `types/claude-desktop.ts`
- [ ] Create `types/sync.ts`
- [ ] Update `types/index.ts` with exports

---

### WS0.3: Run Database Migration 🔴
**Workstream:** WS0-Foundation
**Terminal:** T1
**Estimate:** 0.5h
**Priority:** Critical
**Dependencies:** WS0.1, WS0.2

**Tasks:**
- [ ] Run `pnpm --filter server db:push`
- [ ] Run `pnpm --filter server db:generate`
- [ ] Verify tables created in Prisma Studio
- [ ] Create backup of existing database

---

### WS0.4: Create Base Utility Files 🔴
**Workstream:** WS0-Foundation
**Terminal:** T1
**Estimate:** 1h
**Priority:** Critical
**Dependencies:** WS0.2
**File Owner:** `packages/server/src/lib/paths.ts`

**Tasks:**
- [ ] Create `lib/paths.ts` with helper functions
- [ ] Test path resolution on macOS
- [ ] Add platform detection utilities
- [ ] Add machine info gathering

---

### WS0.5: Verify Build 🔴
**Workstream:** WS0-Foundation
**Terminal:** T1
**Estimate:** 0.5h
**Priority:** Critical
**Dependencies:** WS0.1, WS0.2, WS0.3, WS0.4

**Tasks:**
- [ ] Run `pnpm build` successfully
- [ ] Run `pnpm typecheck` successfully
- [ ] Create test record in each new table
- [ ] Verify shared types compile
- [ ] Tag as `v2.0-foundation-complete`

---

## WS1: Machine Management (API + CLI)

### WS1.1: Machine API Routes 🔴
**Workstream:** WS1-Machines
**Terminal:** T1
**Estimate:** 2h
**Priority:** Critical
**Dependencies:** WS0
**File Owner:** `packages/server/src/app/api/machines/**`

**Tasks:**
- [ ] Create `GET /api/machines` (list)
- [ ] Create `POST /api/machines` (register)
- [ ] Create `GET /api/machines/[id]`
- [ ] Create `PUT /api/machines/[id]`
- [ ] Create `DELETE /api/machines/[id]`
- [ ] Create `GET /api/machines/[id]/overrides`
- [ ] Create `POST /api/machines/[id]/overrides`
- [ ] Test all routes with curl

---

### WS1.2: Machine CLI Commands 🟡
**Workstream:** WS1-Machines
**Terminal:** T1
**Estimate:** 2h
**Priority:** High
**Dependencies:** WS1.1
**File Owner:** `packages/cli/src/commands/machine.ts`, `packages/cli/src/lib/api-machines.ts`

**Tasks:**
- [ ] Create `api-machines.ts` API client
- [ ] Implement `ccm machine register`
- [ ] Implement `ccm machine list`
- [ ] Implement `ccm machine status`
- [ ] Implement `ccm machine show <id>`
- [ ] Test registration flow
- [ ] Test listing machines

---

## WS2: Global Hooks (API + CLI)

### WS2.1: Hooks Parser & Business Logic 🔴
**Workstream:** WS2-Hooks
**Terminal:** T2
**Estimate:** 2h
**Priority:** Critical
**Dependencies:** WS0
**File Owner:** `packages/server/src/lib/hooks.ts`

**Tasks:**
- [ ] Implement `parseClaudeHooks()`
- [ ] Implement `exportToClaudeFormat()`
- [ ] Implement `guessHookDescription()`
- [ ] Implement `guessHookCategory()`
- [ ] Implement `importHooks()`
- [ ] Write unit tests for parser
- [ ] Test with real settings.local.json

---

### WS2.2: Hooks API Routes 🔴
**Workstream:** WS2-Hooks
**Terminal:** T2
**Estimate:** 2h
**Priority:** Critical
**Dependencies:** WS2.1
**File Owner:** `packages/server/src/app/api/settings/hooks/**`

**Tasks:**
- [ ] Create `GET /api/settings/hooks`
- [ ] Create `POST /api/settings/hooks`
- [ ] Create `GET /api/settings/hooks/[id]`
- [ ] Create `PUT /api/settings/hooks/[id]`
- [ ] Create `DELETE /api/settings/hooks/[id]`
- [ ] Create `POST /api/settings/hooks/import`
- [ ] Create `GET /api/settings/hooks/export`
- [ ] Test import from settings.local.json

---

### WS2.3: Hooks CLI Commands 🟡
**Workstream:** WS2-Hooks
**Terminal:** T2
**Estimate:** 2h
**Priority:** High
**Dependencies:** WS2.2
**File Owner:** `packages/cli/src/commands/settings-hooks.ts`, `packages/cli/src/lib/api-hooks.ts`

**Tasks:**
- [ ] Create `api-hooks.ts` API client
- [ ] Implement `ccm settings hooks list`
- [ ] Implement `ccm settings hooks import`
- [ ] Implement `ccm settings hooks export`
- [ ] Implement `ccm settings hooks add`
- [ ] Implement `ccm settings hooks delete`
- [ ] Test import/export roundtrip

---

## WS3: Global Permissions (API + CLI)

### WS3.1: Permissions Parser & Business Logic 🟡
**Workstream:** WS3-Permissions
**Terminal:** T3
**Estimate:** 1.5h
**Priority:** High
**Dependencies:** WS0
**File Owner:** `packages/server/src/lib/permissions.ts`

**Tasks:**
- [ ] Implement `parsePermission()`
- [ ] Implement `parseClaudePermissions()`
- [ ] Implement `exportPermissions()`
- [ ] Implement `guessCategory()`
- [ ] Write unit tests

---

### WS3.2: Permissions API Routes 🟡
**Workstream:** WS3-Permissions
**Terminal:** T3
**Estimate:** 1.5h
**Priority:** High
**Dependencies:** WS3.1
**File Owner:** `packages/server/src/app/api/settings/permissions/**`

**Tasks:**
- [ ] Create `GET /api/settings/permissions`
- [ ] Create `POST /api/settings/permissions`
- [ ] Create `GET /api/settings/permissions/[id]`
- [ ] Create `PUT /api/settings/permissions/[id]`
- [ ] Create `DELETE /api/settings/permissions/[id]`
- [ ] Create `POST /api/settings/permissions/import`
- [ ] Create `GET /api/settings/permissions/export`

---

### WS3.3: Permissions CLI Commands 🟢
**Workstream:** WS3-Permissions
**Terminal:** T3
**Estimate:** 1.5h
**Priority:** Medium
**Dependencies:** WS3.2
**File Owner:** `packages/cli/src/commands/settings-permissions.ts`

**Tasks:**
- [ ] Create `api-permissions.ts` API client
- [ ] Implement `ccm settings permissions list`
- [ ] Implement `ccm settings permissions import`
- [ ] Implement `ccm settings permissions export`
- [ ] Implement `ccm settings permissions add`
- [ ] Implement `ccm settings permissions delete`

---

## WS4: Environment Variables (API + CLI)

### WS4.1: Env Vars & Encryption 🟡
**Workstream:** WS4-EnvVars
**Terminal:** T4
**Estimate:** 2h
**Priority:** High
**Dependencies:** WS0
**File Owner:** `packages/server/src/lib/env.ts`

**Tasks:**
- [ ] Implement encryption utilities (AES-256-GCM)
- [ ] Implement value masking for sensitive vars
- [ ] Create env management functions
- [ ] Document key management strategy
- [ ] Write unit tests for encryption

---

### WS4.2: Env Vars API Routes 🟡
**Workstream:** WS4-EnvVars
**Terminal:** T4
**Estimate:** 1.5h
**Priority:** High
**Dependencies:** WS4.1
**File Owner:** `packages/server/src/app/api/settings/env/**`

**Tasks:**
- [ ] Create `GET /api/settings/env` (with masking)
- [ ] Create `POST /api/settings/env`
- [ ] Create `GET /api/settings/env/[id]`
- [ ] Create `PUT /api/settings/env/[id]`
- [ ] Create `DELETE /api/settings/env/[id]`
- [ ] Test encryption/decryption

---

### WS4.3: Env Vars CLI Commands 🟢
**Workstream:** WS4-EnvVars
**Terminal:** T4
**Estimate:** 1.5h
**Priority:** Medium
**Dependencies:** WS4.2
**File Owner:** `packages/cli/src/commands/settings-env.ts`

**Tasks:**
- [ ] Create `api-env.ts` API client
- [ ] Implement `ccm settings env list`
- [ ] Implement `ccm settings env add`
- [ ] Implement `ccm settings env set`
- [ ] Implement `ccm settings env delete`
- [ ] Handle sensitive value input securely

---

## WS5: Claude Desktop Integration (API + CLI)

### WS5.1: Desktop Config Management 🟡
**Workstream:** WS5-ClaudeDesktop
**Terminal:** T1 or T5
**Estimate:** 2h
**Priority:** High
**Dependencies:** WS0, WS1
**File Owner:** `packages/server/src/lib/claude-desktop.ts`

**Tasks:**
- [ ] Implement `readDesktopConfig()`
- [ ] Implement `writeDesktopConfig()`
- [ ] Implement `generateDesktopConfig()`
- [ ] Add atomic write (temp file + rename)
- [ ] Add backup mechanism
- [ ] Test on macOS

---

### WS5.2: Desktop API Routes 🟡
**Workstream:** WS5-ClaudeDesktop
**Terminal:** T1 or T5
**Estimate:** 2h
**Priority:** High
**Dependencies:** WS5.1
**File Owner:** `packages/server/src/app/api/claude-desktop/**`

**Tasks:**
- [ ] Create `GET /api/claude-desktop` (read config)
- [ ] Create `POST /api/claude-desktop` (update config)
- [ ] Create `GET /api/claude-desktop/mcp`
- [ ] Create `POST /api/claude-desktop/mcp`
- [ ] Create `PUT /api/claude-desktop/mcp/[id]`
- [ ] Create `GET /api/claude-desktop/plugins`
- [ ] Create `POST /api/claude-desktop/sync`

---

### WS5.3: Desktop CLI Commands 🟢
**Workstream:** WS5-ClaudeDesktop
**Terminal:** T1 or T5
**Estimate:** 1.5h
**Priority:** Medium
**Dependencies:** WS5.2
**File Owner:** `packages/cli/src/commands/desktop.ts`

**Tasks:**
- [ ] Create `api-desktop.ts` API client
- [ ] Implement `ccm desktop list`
- [ ] Implement `ccm desktop add <component>`
- [ ] Implement `ccm desktop remove <component>`
- [ ] Implement `ccm desktop sync --dry-run`
- [ ] Implement `ccm desktop sync`

---

## WS6: Sync System (API + CLI)

### WS6.1: Server-Side Sync Engine 🔴
**Workstream:** WS6-Sync
**Terminal:** T2 or T6
**Estimate:** 3h
**Priority:** Critical
**Dependencies:** WS0, WS1, WS2, WS3, WS4
**File Owner:** `packages/server/src/lib/sync-engine.ts`

**Tasks:**
- [ ] Implement `generateSyncPayload()`
- [ ] Apply machine overrides
- [ ] Implement sync state tracking
- [ ] Add conflict detection
- [ ] Write unit tests
- [ ] Test with multiple machines

---

### WS6.2: Sync API Routes 🔴
**Workstream:** WS6-Sync
**Terminal:** T2 or T6
**Estimate:** 2h
**Priority:** Critical
**Dependencies:** WS6.1
**File Owner:** `packages/server/src/app/api/sync/**`

**Tasks:**
- [ ] Create `POST /api/sync` (trigger sync)
- [ ] Create `GET /api/sync/status`
- [ ] Create `GET /api/sync/preview` (dry-run)
- [ ] Create `GET /api/sync/history`
- [ ] Create `GET /api/sync/conflicts`
- [ ] Create `POST /api/sync/conflicts` (resolve)

---

### WS6.3: Client-Side Sync Engine 🔴
**Workstream:** WS6-Sync
**Terminal:** T2 or T6
**Estimate:** 3h
**Priority:** Critical
**Dependencies:** WS6.2
**File Owner:** `packages/cli/src/lib/sync-engine.ts`

**Tasks:**
- [ ] Implement `performSync()`
- [ ] Write settings.local.json
- [ ] Write agent files
- [ ] Write skill files
- [ ] Write command files
- [ ] Implement rollback on failure
- [ ] Add progress reporting

---

### WS6.4: Sync CLI Commands 🔴
**Workstream:** WS6-Sync
**Terminal:** T2 or T6
**Estimate:** 2h
**Priority:** Critical
**Dependencies:** WS6.3
**File Owner:** `packages/cli/src/commands/sync-new.ts`

**Tasks:**
- [ ] Create `api-sync.ts` API client
- [ ] Implement `ccm sync --dry-run`
- [ ] Implement `ccm sync`
- [ ] Implement `ccm sync --pull`
- [ ] Implement `ccm sync --push`
- [ ] Implement `ccm sync status`
- [ ] Implement `ccm sync history`

---

## WS7: Machine UI

### WS7.1: Machine List Page 🟢
**Workstream:** WS7-MachineUI
**Terminal:** T3 or T7
**Estimate:** 2h
**Priority:** Medium
**Dependencies:** WS1.1 (API complete)
**File Owner:** `packages/server/src/app/machines/**`, `packages/server/src/components/machines/**`

**Tasks:**
- [ ] Create `app/machines/page.tsx`
- [ ] Create `components/machines/machine-list.tsx`
- [ ] Create `components/machines/machine-card.tsx`
- [ ] Add online/offline indicators
- [ ] Add sync status badges
- [ ] Test responsive layout

---

### WS7.2: Machine Detail Page 🟢
**Workstream:** WS7-MachineUI
**Terminal:** T3 or T7
**Estimate:** 2h
**Priority:** Medium
**Dependencies:** WS1.1, WS7.1
**File Owner:** `packages/server/src/app/machines/[id]/**`

**Tasks:**
- [ ] Create `app/machines/[id]/page.tsx`
- [ ] Create `components/machines/machine-detail.tsx`
- [ ] Display machine info
- [ ] Display overrides list
- [ ] Display recent sync logs
- [ ] Add edit machine dialog

---

### WS7.3: Machine Override Management 🟢
**Workstream:** WS7-MachineUI
**Terminal:** T3 or T7
**Estimate:** 1.5h
**Priority:** Medium
**Dependencies:** WS7.2
**File Owner:** `packages/server/src/components/machines/machine-override-form.tsx`

**Tasks:**
- [ ] Create override form component
- [ ] Implement add override
- [ ] Implement edit override
- [ ] Implement delete override
- [ ] Add validation
- [ ] Test all override types

---

## WS8: Settings UI (Hooks + Permissions + Env)

### WS8.1: Hooks Management UI 🟢
**Workstream:** WS8-SettingsUI
**Terminal:** T4 or T8
**Estimate:** 3h
**Priority:** Medium
**Dependencies:** WS2.2 (API complete)
**File Owner:** `packages/server/src/app/settings/hooks/**`, `packages/server/src/components/settings/hooks/**`

**Tasks:**
- [ ] Create `app/settings/hooks/page.tsx`
- [ ] Create `components/settings/hooks/hook-list.tsx`
- [ ] Create `components/settings/hooks/hook-editor.tsx` (Monaco)
- [ ] Create `components/settings/hooks/hook-form.tsx`
- [ ] Create `components/settings/hooks/import-hooks-dialog.tsx`
- [ ] Group by hook type
- [ ] Add enable/disable toggle
- [ ] Test import dialog

---

### WS8.2: Permissions Management UI 🟢
**Workstream:** WS8-SettingsUI
**Terminal:** T4 or T8
**Estimate:** 2h
**Priority:** Medium
**Dependencies:** WS3.2 (API complete)
**File Owner:** `packages/server/src/app/settings/permissions/**`

**Tasks:**
- [ ] Create `app/settings/permissions/page.tsx`
- [ ] Create `components/settings/permissions/permission-list.tsx`
- [ ] Create `components/settings/permissions/permission-form.tsx`
- [ ] Create `components/settings/permissions/permission-categories.tsx`
- [ ] Add allow/deny color coding
- [ ] Test add/edit/delete

---

### WS8.3: Environment Variables UI 🟢
**Workstream:** WS8-SettingsUI
**Terminal:** T4 or T8
**Estimate:** 2h
**Priority:** Medium
**Dependencies:** WS4.2 (API complete)
**File Owner:** `packages/server/src/app/settings/env/**`

**Tasks:**
- [ ] Create `app/settings/env/page.tsx`
- [ ] Create `components/settings/env/env-list.tsx`
- [ ] Create `components/settings/env/env-form.tsx`
- [ ] Create `components/settings/env/env-value-display.tsx` (masking)
- [ ] Add scope filtering
- [ ] Add sensitive value toggle
- [ ] Test encryption roundtrip

---

## WS9: Claude Desktop UI + Sync UI

### WS9.1: Claude Desktop Config UI 🟢
**Workstream:** WS9-DesktopSyncUI
**Terminal:** T2 or T9
**Estimate:** 2h
**Priority:** Medium
**Dependencies:** WS5.2 (API complete)
**File Owner:** `packages/server/src/app/claude-desktop/**`

**Tasks:**
- [ ] Create `app/claude-desktop/page.tsx`
- [ ] Create `components/claude-desktop/mcp-server-list.tsx`
- [ ] Create `components/claude-desktop/mcp-server-toggle.tsx`
- [ ] Create `components/claude-desktop/plugin-list.tsx`
- [ ] Create `components/claude-desktop/sync-button.tsx`
- [ ] Test enable/disable MCP servers

---

### WS9.2: Sync Status Dashboard 🟢
**Workstream:** WS9-DesktopSyncUI
**Terminal:** T2 or T9
**Estimate:** 2h
**Priority:** Medium
**Dependencies:** WS6.2 (API complete)
**File Owner:** `packages/server/src/app/sync/**`

**Tasks:**
- [ ] Create `app/sync/page.tsx`
- [ ] Create `components/sync/sync-status.tsx`
- [ ] Create `components/sync/sync-preview.tsx`
- [ ] Display all machines sync status
- [ ] Add trigger sync button
- [ ] Show sync in progress

---

### WS9.3: Sync History & Conflicts 🟢
**Workstream:** WS9-DesktopSyncUI
**Terminal:** T2 or T9
**Estimate:** 2h
**Priority:** Medium
**Dependencies:** WS9.2
**File Owner:** `packages/server/src/app/sync/history/**`

**Tasks:**
- [ ] Create `app/sync/history/page.tsx`
- [ ] Create `components/sync/sync-history.tsx`
- [ ] Create `components/sync/conflict-resolver.tsx`
- [ ] Display sync logs with details
- [ ] Add conflict resolution UI
- [ ] Test resolution actions

---

## WS10: Integration & Wiring (SEQUENTIAL)

### WS10.1: Wire CLI Commands 🔴
**Workstream:** WS10-Integration
**Terminal:** Sequential
**Estimate:** 2h
**Priority:** Critical
**Dependencies:** All WS1-9
**File Owner:** `packages/cli/src/commands/index.ts`, `packages/cli/src/index.ts`

**Tasks:**
- [ ] Update `commands/index.ts` with all exports
- [ ] Register machine command
- [ ] Register settings subcommands (hooks, permissions, env)
- [ ] Register desktop command
- [ ] Register sync command
- [ ] Test all CLI help texts
- [ ] Verify command hierarchy

---

### WS10.2: Update API Client 🔴
**Workstream:** WS10-Integration
**Terminal:** Sequential
**Estimate:** 0.5h
**Priority:** Critical
**Dependencies:** WS10.1
**File Owner:** `packages/cli/src/lib/api.ts`

**Tasks:**
- [ ] Re-export all domain-specific API clients
- [ ] Verify no circular dependencies
- [ ] Test imports

---

### WS10.3: Update Navigation 🟡
**Workstream:** WS10-Integration
**Terminal:** Sequential
**Estimate:** 1h
**Priority:** High
**Dependencies:** All UI workstreams
**File Owner:** `packages/server/src/components/nav.tsx`

**Tasks:**
- [ ] Create or update navigation component
- [ ] Add Machines link
- [ ] Add Settings submenu (Hooks, Permissions, Env)
- [ ] Add Claude Desktop link
- [ ] Add Sync link
- [ ] Test responsive navigation
- [ ] Highlight active page

---

### WS10.4: Update Dashboard 🟡
**Workstream:** WS10-Integration
**Terminal:** Sequential
**Estimate:** 2h
**Priority:** High
**Dependencies:** All API workstreams
**File Owner:** `packages/server/src/app/page.tsx`

**Tasks:**
- [ ] Add machine status widget
- [ ] Add recent sync activity widget
- [ ] Add hook/permission counts
- [ ] Add Claude Desktop status
- [ ] Add quick actions
- [ ] Test dashboard loads quickly

---

## WS11: Testing & Polish (SEQUENTIAL)

### WS11.1: End-to-End CLI Testing 🔴
**Workstream:** WS11-Testing
**Terminal:** Sequential
**Estimate:** 4h
**Priority:** Critical
**Dependencies:** WS10

**Tasks:**
- [ ] Test machine registration on 2+ machines
- [ ] Test hooks import from real settings.local.json
- [ ] Test hooks export roundtrip
- [ ] Test permissions import/export
- [ ] Test env vars with encryption
- [ ] Test Claude Desktop add/remove MCP
- [ ] Test Claude Desktop sync
- [ ] Test full sync flow (2 machines)
- [ ] Test sync preview (dry-run)
- [ ] Test conflict detection
- [ ] Test sync history
- [ ] Document test results

---

### WS11.2: End-to-End UI Testing 🟡
**Workstream:** WS11-Testing
**Terminal:** Sequential
**Estimate:** 3h
**Priority:** High
**Dependencies:** WS10

**Tasks:**
- [ ] Test all pages load
- [ ] Test all forms submit
- [ ] Test all dialogs open/close
- [ ] Test responsive layouts (mobile, tablet, desktop)
- [ ] Test dark mode (if implemented)
- [ ] Test navigation flows
- [ ] Test error states
- [ ] Create screenshots for docs

---

### WS11.3: Fix Issues & Edge Cases 🟡
**Workstream:** WS11-Testing
**Terminal:** Sequential
**Estimate:** 8h
**Priority:** High
**Dependencies:** WS11.1, WS11.2

**Tasks:**
- [ ] Handle missing settings.local.json gracefully
- [ ] Validate all API inputs
- [ ] Improve error messages
- [ ] Add loading states
- [ ] Handle network errors
- [ ] Handle file write errors
- [ ] Test with malformed configs
- [ ] Test with empty database
- [ ] Test rapid sync requests

---

### WS11.4: Documentation 🟢
**Workstream:** WS11-Testing
**Terminal:** Sequential
**Estimate:** 4h
**Priority:** Medium
**Dependencies:** WS11.3

**Tasks:**
- [ ] Update README.md with v2.0 features
- [ ] Update CLAUDE.md with new architecture
- [ ] Add migration guide from v1 to v2
- [ ] Document CLI commands
- [ ] Document API endpoints
- [ ] Add architecture diagrams
- [ ] Add screenshots to docs/
- [ ] Create CHANGELOG.md entry

---

### WS11.5: Migration Tools 🟢
**Workstream:** WS11-Testing
**Terminal:** Sequential
**Estimate:** 3h
**Priority:** Medium
**Dependencies:** WS11.3

**Tasks:**
- [ ] Create `ccm migrate` command
- [ ] Export v1 data
- [ ] Import v1 data to v2 schema
- [ ] Test migration on real data
- [ ] Document migration process
- [ ] Create rollback script

---

## Summary Statistics

**Total Tasks:** 150+
**Total Estimated Hours:** 110-130 hours
**Parallel Potential:** ~40% time savings with 4 concurrent sessions
**Critical Path Items:** 25 tasks
**Sequential Phases:** 2 (Foundation, Integration/Testing)
**Parallel Phases:** 3 (Workstreams 1-4, 5-7, 8-9)

---

## Quick Reference

### By Priority
- 🔴 Critical Path: 25 tasks
- 🟡 High Priority: 35 tasks
- 🟢 Medium Priority: 40 tasks
- ⚪ Low Priority: 0 tasks

### By Phase
- **Foundation:** 5 tasks (6 hours)
- **Parallel-1:** 15 tasks (24 hours)
- **Parallel-2:** 12 tasks (20 hours)
- **Parallel-3:** 9 tasks (15 hours)
- **Integration:** 4 tasks (5 hours)
- **Testing:** 5 tasks (22 hours)

### By Workstream
- WS0: 5 tasks
- WS1: 2 tasks
- WS2: 3 tasks
- WS3: 3 tasks
- WS4: 3 tasks
- WS5: 3 tasks
- WS6: 4 tasks
- WS7: 3 tasks
- WS8: 3 tasks
- WS9: 3 tasks
- WS10: 4 tasks
- WS11: 5 tasks

---

## Next Steps

1. ✅ Create GitHub Project board
2. ✅ Configure custom fields
3. ✅ Create status columns
4. ✅ Set up views
5. ⬜ Import tasks as GitHub Issues
6. ⬜ Add tasks to project board
7. ⬜ Assign tasks to terminal sessions
8. ⬜ Start WS0: Foundation

---

## Notes

- Update task estimates as you work
- Mark blocked tasks immediately
- Sync progress daily
- Create new issues for bugs found during implementation
- Link pull requests to tasks
- Celebrate completed workstreams! 🎉
