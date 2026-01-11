# CCM v2.0 Implementation Plan

## Unified Claude Config Manager - Parallel Development Guide

**Project:** claude-code-config-manager  
**Goal:** Evolve CCM into a unified configuration management system that syncs Claude Desktop, Claude Code, and Auto-Claude configs across multiple machines  
**Estimated Duration:** 2-3 weeks  

---

## Table of Contents

1. [Parallel Execution Strategy](#parallel-execution-strategy)
2. [File Ownership Matrix](#file-ownership-matrix)
3. [Workstream 0: Foundation](#workstream-0-foundation-sequential---must-complete-first)
4. [Workstream 1: Machine Management](#workstream-1-machine-management-api--cli)
5. [Workstream 2: Global Hooks](#workstream-2-global-hooks-api--cli)
6. [Workstream 3: Global Permissions](#workstream-3-global-permissions-api--cli)
7. [Workstream 4: Environment Variables](#workstream-4-environment-variables-api--cli)
8. [Workstream 5: Claude Desktop Integration](#workstream-5-claude-desktop-integration-api--cli)
9. [Workstream 6: Sync System](#workstream-6-sync-system-api--cli)
10. [Workstream 7: Machine UI](#workstream-7-machine-ui)
11. [Workstream 8: Settings UI](#workstream-8-settings-ui-hooks--permissions--env)
12. [Workstream 9: Claude Desktop UI + Sync UI](#workstream-9-claude-desktop-ui--sync-ui)
13. [Workstream 10: Integration & Wiring](#workstream-10-integration--wiring-sequential)
14. [Workstream 11: Testing & Polish](#workstream-11-testing--polish-sequential)
15. [Parallel Session Assignment](#parallel-session-assignment)
16. [Quick Reference: File Ownership](#quick-reference-file-ownership)

---

## Parallel Execution Strategy

```
Timeline Overview:

Week 1:
├── Day 1-2: [SEQUENTIAL] Workstream 0 - Foundation (MUST COMPLETE FIRST)
│
├── Day 3-5: [PARALLEL] 
│   ├── Workstream 1: Machine Management (API + CLI)
│   ├── Workstream 2: Global Hooks (API + CLI)
│   ├── Workstream 3: Global Permissions (API + CLI)
│   └── Workstream 4: Environment Variables (API + CLI)
│
Week 2:
├── Day 1-3: [PARALLEL]
│   ├── Workstream 5: Claude Desktop Integration (API + CLI)
│   ├── Workstream 6: Sync System (API + CLI)
│   └── Workstream 7: Machine UI
│
├── Day 4-5: [PARALLEL]
│   ├── Workstream 8: Settings UI (Hooks + Permissions + Env)
│   └── Workstream 9: Claude Desktop UI + Sync UI
│
Week 3:
├── Day 1-2: [SEQUENTIAL] Workstream 10: Integration & Wiring
└── Day 3-5: [SEQUENTIAL] Workstream 11: Testing & Polish
```

---

## File Ownership Matrix

Each workstream owns specific files. **No two workstreams touch the same file.**

| Workstream | Owned Files |
|------------|-------------|
| WS0: Foundation | `prisma/schema.prisma`, `packages/shared/src/types/*.ts`, migrations |
| WS1: Machines | `api/machines/**`, `app/machines/**`, `components/machines/**`, `cli/commands/machine.ts`, `cli/lib/api-machines.ts` |
| WS2: Hooks | `api/settings/hooks/**`, `app/settings/hooks/**`, `components/settings/hooks/**`, `cli/commands/settings-hooks.ts`, `cli/lib/api-hooks.ts` |
| WS3: Permissions | `api/settings/permissions/**`, `app/settings/permissions/**`, `components/settings/permissions/**`, `cli/commands/settings-permissions.ts`, `cli/lib/api-permissions.ts` |
| WS4: Env Vars | `api/settings/env/**`, `app/settings/env/**`, `components/settings/env/**`, `cli/commands/settings-env.ts`, `cli/lib/api-env.ts` |
| WS5: Claude Desktop | `api/claude-desktop/**`, `app/claude-desktop/**`, `components/claude-desktop/**`, `cli/commands/desktop.ts`, `cli/lib/api-desktop.ts` |
| WS6: Sync | `api/sync/**`, `app/sync/**`, `components/sync/**`, `cli/commands/sync-new.ts`, `cli/lib/api-sync.ts`, `cli/lib/sync-engine.ts` |
| WS7-9: UI | Component-specific files (see details) |
| WS10: Integration | `cli/commands/index.ts`, `cli/lib/api.ts`, `app/layout.tsx`, navigation, dashboard |

---

## Workstream 0: Foundation (SEQUENTIAL - MUST COMPLETE FIRST)

**Duration:** 2-4 hours  
**Blocks:** All other workstreams  
**Terminal Session:** 1

### Task 0.1: Update Prisma Schema

**File:** `packages/server/prisma/schema.prisma`

```prisma
// ADD these models to existing schema.prisma

// ============================================================================
// Machine Registry
// ============================================================================

model Machine {
  id            String   @id @default(cuid())
  name          String   @unique
  hostname      String?
  platform      String   // "darwin", "linux", "win32"
  arch          String?  // "arm64", "x64"
  homeDir       String?  // For path resolution
  lastSeen      DateTime @default(now())
  lastSyncedAt  DateTime?
  syncEnabled   Boolean  @default(true)
  isCurrentMachine Boolean @default(false)
  
  overrides     MachineOverride[]
  syncLogs      SyncLog[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model MachineOverride {
  id          String   @id @default(cuid())
  machineId   String
  configType  String   // "mcp_server", "hook", "permission", "env_var", "plugin"
  configKey   String   // ID or name of the config being overridden
  action      String   // "include", "exclude", "modify"
  overrideData String? // JSON override data if action is "modify"
  reason      String?  // Why this override exists
  
  machine     Machine  @relation(fields: [machineId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([machineId, configType, configKey])
}

// ============================================================================
// Global Hooks
// ============================================================================

model GlobalHook {
  id          String   @id @default(cuid())
  hookType    String   // "PreToolUse", "PostToolUse", "SessionStart", "Stop", "Notification", "SubagentStop"
  matcher     String   // Tool matcher pattern, e.g., "Edit|Write", "*"
  command     String   @default("") // Shell command to run (can be multi-line)
  timeout     Int?     // Timeout in seconds
  description String?
  enabled     Boolean  @default(true)
  order       Int      @default(0)
  category    String?  // For UI grouping: "git", "security", "formatting", "notifications"
  tags        String   @default("")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([hookType])
  @@index([enabled])
}

// ============================================================================
// Global Permissions
// ============================================================================

model GlobalPermission {
  id          String   @id @default(cuid())
  permission  String   // e.g., "Bash(git:*)", "WebFetch(domain:github.com)"
  action      String   // "allow" or "deny"
  description String?
  enabled     Boolean  @default(true)
  category    String?  // "git", "network", "shell", "file", "docker", "cloud"
  priority    Int      @default(0) // Higher = evaluated first
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([permission, action])
  @@index([action])
  @@index([category])
}

// ============================================================================
// Global Environment Variables
// ============================================================================

model GlobalEnvVar {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String   // Encrypted for sensitive values
  encrypted   Boolean  @default(false)
  sensitive   Boolean  @default(false) // Mask in UI even if not encrypted
  description String?
  scope       String   @default("all") // "all", "claude-desktop", "claude-code", "cli"
  category    String?  // "api_keys", "paths", "webhooks", "database"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ============================================================================
// Claude Desktop Configuration
// ============================================================================

model ClaudeDesktopMcp {
  id              String   @id @default(cuid())
  componentId     String   // Reference to Component with type MCP_SERVER
  enabled         Boolean  @default(true)
  
  // Desktop-specific overrides (JSON)
  commandOverride String?  // Override command for desktop
  argsOverride    String?  // Override args for desktop (JSON array)
  envOverrides    String?  // Additional/override env vars (JSON object)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([componentId])
}

model ClaudeDesktopPlugin {
  id          String   @id @default(cuid())
  pluginId    String   // e.g., "frontend-design@claude-plugins-official"
  enabled     Boolean  @default(true)
  config      String?  // Plugin-specific config (JSON)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([pluginId])
}

// ============================================================================
// Sync System
// ============================================================================

model SyncLog {
  id           String    @id @default(cuid())
  machineId    String
  syncType     String    // "full", "incremental", "push", "pull"
  status       String    // "started", "in_progress", "completed", "failed"
  
  // Stats
  filesCreated  Int      @default(0)
  filesUpdated  Int      @default(0)
  filesDeleted  Int      @default(0)
  filesSkipped  Int      @default(0)
  
  // Details
  details       String?  // JSON with detailed sync info
  errorMessage  String?
  
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  
  machine       Machine  @relation(fields: [machineId], references: [id], onDelete: Cascade)
  
  @@index([machineId])
  @@index([status])
  @@index([startedAt])
}

model SyncState {
  id            String   @id @default(cuid())
  machineId     String
  configType    String   // "hook", "permission", "mcp_server", "agent", etc.
  configId      String   // ID of the config item
  localHash     String?  // Hash of local file content
  serverHash    String?  // Hash of server content
  lastSyncedAt  DateTime?
  syncStatus    String   @default("unknown") // "synced", "local_newer", "server_newer", "conflict"
  
  @@unique([machineId, configType, configId])
  @@index([syncStatus])
}
```

### Task 0.2: Create Shared Types

**File:** `packages/shared/src/types/machines.ts` (NEW)

```typescript
// Machine types
export interface Machine {
  id: string;
  name: string;
  hostname: string | null;
  platform: string;
  arch: string | null;
  homeDir: string | null;
  lastSeen: Date;
  lastSyncedAt: Date | null;
  syncEnabled: boolean;
  isCurrentMachine: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MachineOverride {
  id: string;
  machineId: string;
  configType: 'mcp_server' | 'hook' | 'permission' | 'env_var' | 'plugin';
  configKey: string;
  action: 'include' | 'exclude' | 'modify';
  overrideData: string | null;
  reason: string | null;
}

export interface MachineRegistration {
  name: string;
  hostname?: string;
  platform: string;
  arch?: string;
  homeDir?: string;
}

export interface MachineWithOverrides extends Machine {
  overrides: MachineOverride[];
}
```

**File:** `packages/shared/src/types/hooks.ts` (NEW)

```typescript
export type HookType = 
  | 'PreToolUse' 
  | 'PostToolUse' 
  | 'SessionStart' 
  | 'Stop' 
  | 'Notification' 
  | 'SubagentStop'
  | 'TaskComplete'
  | 'PreSendMessage';

export type HookCategory = 
  | 'git' 
  | 'security' 
  | 'formatting' 
  | 'notifications' 
  | 'logging'
  | 'validation'
  | 'other';

export interface GlobalHook {
  id: string;
  hookType: HookType;
  matcher: string;
  command: string;
  timeout: number | null;
  description: string | null;
  enabled: boolean;
  order: number;
  category: HookCategory | null;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GlobalHookCreate {
  hookType: HookType;
  matcher: string;
  command: string;
  timeout?: number;
  description?: string;
  enabled?: boolean;
  order?: number;
  category?: HookCategory;
  tags?: string;
}

export interface GlobalHookUpdate extends Partial<GlobalHookCreate> {
  id: string;
}

// For import from settings.local.json
export interface ClaudeSettingsHook {
  type?: string;
  command: string;
  timeout?: number;
}

export interface ClaudeSettingsHookGroup {
  matcher?: string;
  hooks?: ClaudeSettingsHook[];
  // Legacy format
  type?: string;
  command?: string;
  timeout?: number;
}
```

**File:** `packages/shared/src/types/permissions.ts` (NEW)

```typescript
export type PermissionAction = 'allow' | 'deny';

export type PermissionCategory = 
  | 'git'
  | 'network' 
  | 'shell'
  | 'file'
  | 'docker'
  | 'cloud'
  | 'database'
  | 'other';

export interface GlobalPermission {
  id: string;
  permission: string;
  action: PermissionAction;
  description: string | null;
  enabled: boolean;
  category: PermissionCategory | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GlobalPermissionCreate {
  permission: string;
  action: PermissionAction;
  description?: string;
  enabled?: boolean;
  category?: PermissionCategory;
  priority?: number;
}

// Parsed permission for UI display
export interface ParsedPermission {
  type: 'Bash' | 'WebFetch' | 'WebSearch' | 'Read' | 'Edit' | 'Other';
  pattern: string;
  raw: string;
}
```

**File:** `packages/shared/src/types/env.ts` (NEW)

```typescript
export type EnvScope = 'all' | 'claude-desktop' | 'claude-code' | 'cli';
export type EnvCategory = 'api_keys' | 'paths' | 'webhooks' | 'database' | 'other';

export interface GlobalEnvVar {
  id: string;
  key: string;
  value: string;
  encrypted: boolean;
  sensitive: boolean;
  description: string | null;
  scope: EnvScope;
  category: EnvCategory | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GlobalEnvVarCreate {
  key: string;
  value: string;
  encrypted?: boolean;
  sensitive?: boolean;
  description?: string;
  scope?: EnvScope;
  category?: EnvCategory;
}

// For display (value masked)
export interface GlobalEnvVarMasked extends Omit<GlobalEnvVar, 'value'> {
  value: string; // Will be "********" if sensitive
  hasValue: boolean;
}
```

**File:** `packages/shared/src/types/claude-desktop.ts` (NEW)

```typescript
export interface ClaudeDesktopMcp {
  id: string;
  componentId: string;
  enabled: boolean;
  commandOverride: string | null;
  argsOverride: string | null; // JSON array
  envOverrides: string | null; // JSON object
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaudeDesktopPlugin {
  id: string;
  pluginId: string;
  enabled: boolean;
  config: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// The actual config file format
export interface ClaudeDesktopConfigFile {
  mcpServers: {
    [name: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

// For UI display - enriched with component info
export interface ClaudeDesktopMcpWithComponent extends ClaudeDesktopMcp {
  component: {
    id: string;
    name: string;
    description: string;
    config: string;
  };
}
```

**File:** `packages/shared/src/types/sync.ts` (NEW)

```typescript
export type SyncType = 'full' | 'incremental' | 'push' | 'pull';
export type SyncStatus = 'started' | 'in_progress' | 'completed' | 'failed';
export type SyncItemStatus = 'synced' | 'local_newer' | 'server_newer' | 'conflict' | 'unknown';

export interface SyncLog {
  id: string;
  machineId: string;
  syncType: SyncType;
  status: SyncStatus;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  filesSkipped: number;
  details: string | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface SyncState {
  id: string;
  machineId: string;
  configType: string;
  configId: string;
  localHash: string | null;
  serverHash: string | null;
  lastSyncedAt: Date | null;
  syncStatus: SyncItemStatus;
}

export interface SyncPreview {
  toCreate: SyncItem[];
  toUpdate: SyncItem[];
  toDelete: SyncItem[];
  conflicts: SyncConflict[];
  unchanged: number;
}

export interface SyncItem {
  type: string;
  id: string;
  name: string;
  path?: string;
}

export interface SyncConflict {
  type: string;
  id: string;
  name: string;
  localModified: Date;
  serverModified: Date;
  resolution?: 'use_local' | 'use_server' | 'skip';
}

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  types?: string[]; // Only sync specific types
  machineId?: string;
}

export interface SyncResult {
  success: boolean;
  syncLogId: string;
  stats: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: number;
  };
  errors: string[];
  details: SyncItem[];
}
```

**File:** `packages/shared/src/types/index.ts` (UPDATE - add exports)

```typescript
// Add to existing exports
export * from './machines';
export * from './hooks';
export * from './permissions';
export * from './env';
export * from './claude-desktop';
export * from './sync';
```

### Task 0.3: Run Database Migration

```bash
cd packages/server
pnpm db:push
pnpm db:generate
```

### Task 0.4: Create Base Utility Files

**File:** `packages/server/src/lib/paths.ts` (NEW)

```typescript
import { homedir, platform, arch } from 'os';
import { join } from 'path';

export function getClaudeDesktopConfigPath(): string {
  const home = homedir();
  
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    case 'linux':
      return join(home, '.config', 'claude', 'claude_desktop_config.json');
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
}

export function getClaudeCodePaths() {
  const home = homedir();
  
  return {
    userConfig: join(home, '.claude.json'),
    settingsDir: join(home, '.claude'),
    settings: join(home, '.claude', 'settings.json'),
    settingsLocal: join(home, '.claude', 'settings.local.json'),
    agents: join(home, '.claude', 'agents'),
    skills: join(home, '.claude', 'skills'),
    commands: join(home, '.claude', 'commands'),
  };
}

export function getMachineInfo() {
  return {
    platform: platform(),
    arch: arch(),
    homeDir: homedir(),
    hostname: require('os').hostname(),
  };
}
```

### Task 0.5: Verify Build

```bash
cd /path/to/claude-code-config-manager
pnpm build
pnpm typecheck  # or pnpm --filter shared build
```

**Completion Criteria for WS0:**
- [ ] Schema updated and migrated
- [ ] All type files created
- [ ] `pnpm build` succeeds
- [ ] Database has new tables (verify with Prisma Studio)

---

## Workstream 1: Machine Management (API + CLI)

**Duration:** 3-4 hours  
**Dependencies:** WS0 complete  
**Terminal Session:** 1  
**Can run parallel with:** WS2, WS3, WS4

### Files Owned (NO OTHER WORKSTREAM TOUCHES THESE)

```
packages/server/src/app/api/machines/
├── route.ts                    # GET (list), POST (register)
├── [id]/
│   ├── route.ts               # GET, PUT, DELETE single machine
│   └── overrides/
│       └── route.ts           # GET, POST overrides for machine
packages/server/src/lib/machines.ts    # Business logic
packages/cli/src/commands/machine.ts   # CLI commands
packages/cli/src/lib/api-machines.ts   # API client methods
```

### Task 1.1: Machine API Routes

**File:** `packages/server/src/app/api/machines/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMachineInfo } from '@/lib/paths';

// GET /api/machines - List all machines
export async function GET() {
  try {
    const machines = await prisma.machine.findMany({
      include: {
        overrides: true,
        _count: {
          select: { syncLogs: true }
        }
      },
      orderBy: { lastSeen: 'desc' }
    });

    return NextResponse.json({
      machines,
      stats: {
        total: machines.length,
        online: machines.filter(m => 
          new Date().getTime() - new Date(m.lastSeen).getTime() < 5 * 60 * 1000
        ).length,
        syncEnabled: machines.filter(m => m.syncEnabled).length
      }
    });
  } catch (error) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machines' },
      { status: 500 }
    );
  }
}

// POST /api/machines - Register a new machine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, hostname, platform, arch, homeDir } = body;

    if (!name || !platform) {
      return NextResponse.json(
        { error: 'name and platform are required' },
        { status: 400 }
      );
    }

    // Upsert - update if exists, create if not
    const machine = await prisma.machine.upsert({
      where: { name },
      update: {
        hostname,
        platform,
        arch,
        homeDir,
        lastSeen: new Date(),
      },
      create: {
        name,
        hostname,
        platform,
        arch,
        homeDir,
        lastSeen: new Date(),
        syncEnabled: true,
      },
    });

    return NextResponse.json({ machine, created: !body.id });
  } catch (error) {
    console.error('Error registering machine:', error);
    return NextResponse.json(
      { error: 'Failed to register machine' },
      { status: 500 }
    );
  }
}
```

**File:** `packages/server/src/app/api/machines/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/machines/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const machine = await prisma.machine.findUnique({
      where: { id: params.id },
      include: {
        overrides: true,
        syncLogs: {
          take: 10,
          orderBy: { startedAt: 'desc' }
        }
      }
    });

    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    return NextResponse.json({ machine });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch machine' }, { status: 500 });
  }
}

// PUT /api/machines/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, syncEnabled, hostname } = body;

    const machine = await prisma.machine.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(typeof syncEnabled === 'boolean' && { syncEnabled }),
        ...(hostname && { hostname }),
        lastSeen: new Date(),
      }
    });

    return NextResponse.json({ machine });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 });
  }
}

// DELETE /api/machines/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.machine.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 });
  }
}
```

**File:** `packages/server/src/app/api/machines/[id]/overrides/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/machines/[id]/overrides
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const overrides = await prisma.machineOverride.findMany({
      where: { machineId: params.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ overrides });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch overrides' }, { status: 500 });
  }
}

// POST /api/machines/[id]/overrides
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { configType, configKey, action, overrideData, reason } = body;

    const override = await prisma.machineOverride.upsert({
      where: {
        machineId_configType_configKey: {
          machineId: params.id,
          configType,
          configKey
        }
      },
      update: { action, overrideData, reason },
      create: {
        machineId: params.id,
        configType,
        configKey,
        action,
        overrideData,
        reason
      }
    });

    return NextResponse.json({ override });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create override' }, { status: 500 });
  }
}
```

### Task 1.2: Machine CLI Commands

**File:** `packages/cli/src/lib/api-machines.ts`

```typescript
import { apiClient } from './config.js';
import type { Machine, MachineRegistration, MachineOverride } from '@ccm/shared';

export interface MachineListResponse {
  machines: Machine[];
  stats: {
    total: number;
    online: number;
    syncEnabled: number;
  };
}

export interface MachineDetailResponse {
  machine: Machine & {
    overrides: MachineOverride[];
    syncLogs: any[];
  };
}

export async function listMachines(): Promise<{ data?: MachineListResponse; error?: string }> {
  try {
    const response = await apiClient.get('/api/machines');
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message || 'Failed to list machines' };
  }
}

export async function registerMachine(registration: MachineRegistration): Promise<{ data?: { machine: Machine }; error?: string }> {
  try {
    const response = await apiClient.post('/api/machines', registration);
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message || 'Failed to register machine' };
  }
}

export async function getMachine(id: string): Promise<{ data?: MachineDetailResponse; error?: string }> {
  try {
    const response = await apiClient.get(`/api/machines/${id}`);
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message || 'Failed to get machine' };
  }
}

export async function updateMachine(id: string, updates: Partial<Machine>): Promise<{ data?: { machine: Machine }; error?: string }> {
  try {
    const response = await apiClient.put(`/api/machines/${id}`, updates);
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message || 'Failed to update machine' };
  }
}

export async function deleteMachine(id: string): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const response = await apiClient.delete(`/api/machines/${id}`);
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete machine' };
  }
}

export async function addMachineOverride(
  machineId: string, 
  override: Omit<MachineOverride, 'id' | 'machineId' | 'createdAt' | 'updatedAt'>
): Promise<{ data?: { override: MachineOverride }; error?: string }> {
  try {
    const response = await apiClient.post(`/api/machines/${machineId}/overrides`, override);
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message || 'Failed to add override' };
  }
}
```

**File:** `packages/cli/src/commands/machine.ts`

```typescript
import chalk from 'chalk';
import { Command } from 'commander';
import { hostname, platform, arch, homedir } from 'os';
import { 
  listMachines, 
  registerMachine, 
  getMachine, 
  updateMachine,
  deleteMachine 
} from '../lib/api-machines.js';

export function createMachineCommand(): Command {
  const machineCmd = new Command('machine');

  machineCmd
    .description('Manage registered machines')
    .addHelpText('after', `

${chalk.gray('Examples:')}
  ${chalk.cyan('ccm machine register')}              Register this machine
  ${chalk.cyan('ccm machine register --name laptop')} Register with custom name
  ${chalk.cyan('ccm machine list')}                  List all machines
  ${chalk.cyan('ccm machine status')}                Show sync status
`);

  // Register command
  machineCmd
    .command('register')
    .description('Register this machine with CCM server')
    .option('-n, --name <name>', 'Machine name (defaults to hostname)')
    .option('--force', 'Re-register even if already registered')
    .action(async (options: { name?: string; force?: boolean }) => {
      const machineName = options.name || hostname().split('.')[0];
      
      console.log(chalk.bold('Registering Machine'));
      console.log();
      console.log(`  Name:     ${chalk.cyan(machineName)}`);
      console.log(`  Hostname: ${chalk.gray(hostname())}`);
      console.log(`  Platform: ${chalk.gray(platform())}`);
      console.log(`  Arch:     ${chalk.gray(arch())}`);
      console.log();

      const result = await registerMachine({
        name: machineName,
        hostname: hostname(),
        platform: platform(),
        arch: arch(),
        homeDir: homedir(),
      });

      if (result.error) {
        console.log(chalk.red('Registration failed:'), result.error);
        process.exit(1);
      }

      const isNew = result.data?.machine.createdAt === result.data?.machine.updatedAt;
      if (isNew) {
        console.log(chalk.green('✓ Machine registered successfully!'));
      } else {
        console.log(chalk.green('✓ Machine registration updated!'));
      }
      
      console.log();
      console.log(`Machine ID: ${chalk.cyan(result.data?.machine.id)}`);
    });

  // List command
  machineCmd
    .command('list')
    .description('List all registered machines')
    .option('-f, --format <format>', 'Output format: table, json', 'table')
    .action(async (options: { format: string }) => {
      const result = await listMachines();

      if (result.error) {
        console.log(chalk.red('Failed to list machines:'), result.error);
        process.exit(1);
      }

      const { machines, stats } = result.data!;

      if (options.format === 'json') {
        console.log(JSON.stringify(result.data, null, 2));
        return;
      }

      console.log(chalk.bold('Registered Machines'));
      console.log();

      if (machines.length === 0) {
        console.log(chalk.gray('No machines registered.'));
        console.log(`Run ${chalk.cyan('ccm machine register')} to register this machine.`);
        return;
      }

      console.log(`Total: ${stats.total} | Online: ${chalk.green(stats.online)} | Sync Enabled: ${stats.syncEnabled}`);
      console.log();

      for (const machine of machines) {
        const isOnline = new Date().getTime() - new Date(machine.lastSeen).getTime() < 5 * 60 * 1000;
        const statusIcon = isOnline ? chalk.green('●') : chalk.gray('○');
        const syncIcon = machine.syncEnabled ? chalk.green('✓') : chalk.red('✗');
        
        console.log(`${statusIcon} ${chalk.bold(machine.name)} ${chalk.gray(`(${machine.platform}/${machine.arch})`)}`);
        console.log(`    ID: ${machine.id}`);
        console.log(`    Last Seen: ${new Date(machine.lastSeen).toLocaleString()}`);
        console.log(`    Sync: ${syncIcon} ${machine.syncEnabled ? 'Enabled' : 'Disabled'}`);
        if (machine.lastSyncedAt) {
          console.log(`    Last Sync: ${new Date(machine.lastSyncedAt).toLocaleString()}`);
        }
        console.log();
      }
    });

  // Status command
  machineCmd
    .command('status')
    .description('Show sync status for all machines')
    .action(async () => {
      const result = await listMachines();

      if (result.error) {
        console.log(chalk.red('Failed to get status:'), result.error);
        process.exit(1);
      }

      console.log(chalk.bold('Machine Sync Status'));
      console.log();

      const { machines } = result.data!;
      const currentHostname = hostname();

      for (const machine of machines) {
        const isCurrent = machine.hostname === currentHostname;
        const marker = isCurrent ? chalk.cyan(' (this machine)') : '';
        
        console.log(`${chalk.bold(machine.name)}${marker}`);
        
        if (machine.lastSyncedAt) {
          const syncAge = new Date().getTime() - new Date(machine.lastSyncedAt).getTime();
          const syncAgeStr = formatAge(syncAge);
          
          if (syncAge < 60 * 60 * 1000) { // Less than 1 hour
            console.log(`  ${chalk.green('✓')} Synced ${syncAgeStr} ago`);
          } else if (syncAge < 24 * 60 * 60 * 1000) { // Less than 24 hours
            console.log(`  ${chalk.yellow('!')} Synced ${syncAgeStr} ago`);
          } else {
            console.log(`  ${chalk.red('✗')} Last sync ${syncAgeStr} ago`);
          }
        } else {
          console.log(`  ${chalk.gray('○')} Never synced`);
        }
      }
    });

  // Show command
  machineCmd
    .command('show <name-or-id>')
    .description('Show details for a specific machine')
    .action(async (nameOrId: string) => {
      // Try to find by name first
      const listResult = await listMachines();
      if (listResult.error) {
        console.log(chalk.red('Error:'), listResult.error);
        process.exit(1);
      }

      const machine = listResult.data!.machines.find(
        m => m.name === nameOrId || m.id === nameOrId
      );

      if (!machine) {
        console.log(chalk.red(`Machine '${nameOrId}' not found`));
        process.exit(1);
      }

      const detailResult = await getMachine(machine.id);
      if (detailResult.error) {
        console.log(chalk.red('Error:'), detailResult.error);
        process.exit(1);
      }

      const detail = detailResult.data!.machine;

      console.log(chalk.bold(`Machine: ${detail.name}`));
      console.log();
      console.log(`  ID:        ${detail.id}`);
      console.log(`  Hostname:  ${detail.hostname || 'N/A'}`);
      console.log(`  Platform:  ${detail.platform}/${detail.arch || 'unknown'}`);
      console.log(`  Home Dir:  ${detail.homeDir || 'N/A'}`);
      console.log(`  Sync:      ${detail.syncEnabled ? chalk.green('Enabled') : chalk.red('Disabled')}`);
      console.log(`  Last Seen: ${new Date(detail.lastSeen).toLocaleString()}`);
      
      if (detail.overrides && detail.overrides.length > 0) {
        console.log();
        console.log(chalk.bold('Overrides:'));
        for (const override of detail.overrides) {
          console.log(`  • ${override.configType}:${override.configKey} → ${override.action}`);
          if (override.reason) {
            console.log(`    ${chalk.gray(override.reason)}`);
          }
        }
      }
    });

  return machineCmd;
}

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
```

**Completion Criteria for WS1:**
- [ ] All API routes working (test with curl)
- [ ] CLI commands functional
- [ ] Can register a machine and list it
- [ ] Machine overrides API working

---

## Workstream 2: Global Hooks (API + CLI)

**Duration:** 3-4 hours  
**Dependencies:** WS0 complete  
**Terminal Session:** 2  
**Can run parallel with:** WS1, WS3, WS4

### Files Owned

```
packages/server/src/app/api/settings/hooks/
├── route.ts                    # GET (list), POST (create)
├── [id]/
│   └── route.ts               # GET, PUT, DELETE single hook
├── import/
│   └── route.ts               # POST - import from settings.local.json
└── export/
    └── route.ts               # GET - export to settings.local.json format
packages/server/src/lib/hooks.ts       # Business logic & parser
packages/cli/src/commands/settings-hooks.ts
packages/cli/src/lib/api-hooks.ts
```

### Task 2.1: Hooks Parser & Business Logic

**File:** `packages/server/src/lib/hooks.ts`

```typescript
import { prisma } from './db';
import type { GlobalHook, GlobalHookCreate, ClaudeSettingsHookGroup, HookType } from '@ccm/shared';

// Parse settings.local.json hook format into our normalized format
export function parseClaudeHooks(settingsHooks: Record<string, ClaudeSettingsHookGroup[]>): GlobalHookCreate[] {
  const hooks: GlobalHookCreate[] = [];
  
  for (const [hookType, hookGroups] of Object.entries(settingsHooks)) {
    if (!Array.isArray(hookGroups)) continue;
    
    for (const group of hookGroups) {
      const matcher = group.matcher || '*';
      
      // Handle nested hooks array format
      if (group.hooks && Array.isArray(group.hooks)) {
        for (const hook of group.hooks) {
          if (hook.command) {
            hooks.push({
              hookType: hookType as HookType,
              matcher,
              command: hook.command,
              timeout: hook.timeout,
              description: guessHookDescription(hook.command),
              category: guessHookCategory(hook.command),
              enabled: true,
            });
          }
        }
      }
      // Handle direct command format (legacy)
      else if (group.command) {
        hooks.push({
          hookType: hookType as HookType,
          matcher,
          command: group.command,
          timeout: group.timeout,
          description: guessHookDescription(group.command),
          category: guessHookCategory(group.command),
          enabled: true,
        });
      }
    }
  }
  
  return hooks;
}

// Export hooks to settings.local.json format
export function exportToClaudeFormat(hooks: GlobalHook[]): Record<string, any[]> {
  const result: Record<string, any[]> = {};
  
  // Group by hookType
  const grouped = hooks.reduce((acc, hook) => {
    if (!hook.enabled) return acc;
    
    if (!acc[hook.hookType]) {
      acc[hook.hookType] = [];
    }
    acc[hook.hookType].push(hook);
    return acc;
  }, {} as Record<string, GlobalHook[]>);
  
  // Convert to Claude format
  for (const [hookType, typeHooks] of Object.entries(grouped)) {
    // Group by matcher
    const byMatcher = typeHooks.reduce((acc, hook) => {
      if (!acc[hook.matcher]) {
        acc[hook.matcher] = [];
      }
      acc[hook.matcher].push(hook);
      return acc;
    }, {} as Record<string, GlobalHook[]>);
    
    result[hookType] = Object.entries(byMatcher).map(([matcher, matcherHooks]) => ({
      matcher,
      hooks: matcherHooks
        .sort((a, b) => a.order - b.order)
        .map(h => ({
          type: 'command',
          command: h.command,
          ...(h.timeout && { timeout: h.timeout }),
        }))
    }));
  }
  
  return result;
}

function guessHookDescription(command: string): string | undefined {
  const lowerCmd = command.toLowerCase();
  
  if (lowerCmd.includes('eslint') || lowerCmd.includes('prettier') || lowerCmd.includes('format')) {
    return 'Auto-format/lint code';
  }
  if (lowerCmd.includes('git add') || lowerCmd.includes('git commit')) {
    return 'Auto-commit changes';
  }
  if (lowerCmd.includes('slack') || lowerCmd.includes('discord') || lowerCmd.includes('webhook')) {
    return 'Send notification';
  }
  if (lowerCmd.includes('security') || lowerCmd.includes('semgrep') || lowerCmd.includes('bandit')) {
    return 'Security scan';
  }
  if (lowerCmd.includes('backup') || lowerCmd.includes('.bak')) {
    return 'Create backup';
  }
  if (lowerCmd.includes('log') || lowerCmd.includes('echo')) {
    return 'Logging';
  }
  
  return undefined;
}

function guessHookCategory(command: string): string | undefined {
  const lowerCmd = command.toLowerCase();
  
  if (lowerCmd.includes('git')) return 'git';
  if (lowerCmd.includes('eslint') || lowerCmd.includes('prettier') || lowerCmd.includes('format') || lowerCmd.includes('lint')) return 'formatting';
  if (lowerCmd.includes('security') || lowerCmd.includes('semgrep') || lowerCmd.includes('bandit') || lowerCmd.includes('gitleaks')) return 'security';
  if (lowerCmd.includes('slack') || lowerCmd.includes('discord') || lowerCmd.includes('webhook') || lowerCmd.includes('notify')) return 'notifications';
  if (lowerCmd.includes('log') || lowerCmd.includes('echo')) return 'logging';
  if (lowerCmd.includes('test') || lowerCmd.includes('validate')) return 'validation';
  
  return 'other';
}

// Import hooks from parsed data
export async function importHooks(hooks: GlobalHookCreate[], replace: boolean = false): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  if (replace) {
    await prisma.globalHook.deleteMany({});
  }

  for (const hook of hooks) {
    try {
      // Check for duplicate
      const existing = await prisma.globalHook.findFirst({
        where: {
          hookType: hook.hookType,
          matcher: hook.matcher,
          command: hook.command,
        }
      });

      if (existing && !replace) {
        skipped++;
        continue;
      }

      await prisma.globalHook.create({
        data: {
          hookType: hook.hookType,
          matcher: hook.matcher,
          command: hook.command,
          timeout: hook.timeout,
          description: hook.description,
          category: hook.category,
          enabled: hook.enabled ?? true,
          order: imported,
        }
      });
      imported++;
    } catch (error) {
      errors.push(`Failed to import hook: ${hook.hookType}/${hook.matcher} - ${error}`);
    }
  }

  return { imported, skipped, errors };
}
```

### Task 2.2: Hooks API Routes

**File:** `packages/server/src/app/api/settings/hooks/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/settings/hooks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hookType = searchParams.get('hookType');
    const category = searchParams.get('category');
    const enabled = searchParams.get('enabled');

    const where: any = {};
    if (hookType) where.hookType = hookType;
    if (category) where.category = category;
    if (enabled !== null) where.enabled = enabled === 'true';

    const hooks = await prisma.globalHook.findMany({
      where,
      orderBy: [
        { hookType: 'asc' },
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Group by hookType for UI
    const grouped = hooks.reduce((acc, hook) => {
      if (!acc[hook.hookType]) {
        acc[hook.hookType] = [];
      }
      acc[hook.hookType].push(hook);
      return acc;
    }, {} as Record<string, typeof hooks>);

    return NextResponse.json({
      hooks,
      grouped,
      stats: {
        total: hooks.length,
        enabled: hooks.filter(h => h.enabled).length,
        byType: Object.fromEntries(
          Object.entries(grouped).map(([k, v]) => [k, v.length])
        )
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch hooks' }, { status: 500 });
  }
}

// POST /api/settings/hooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hookType, matcher, command, timeout, description, category, enabled, order } = body;

    if (!hookType || !matcher || !command) {
      return NextResponse.json(
        { error: 'hookType, matcher, and command are required' },
        { status: 400 }
      );
    }

    const hook = await prisma.globalHook.create({
      data: {
        hookType,
        matcher,
        command,
        timeout,
        description,
        category,
        enabled: enabled ?? true,
        order: order ?? 0,
      }
    });

    return NextResponse.json({ hook }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create hook' }, { status: 500 });
  }
}
```

**File:** `packages/server/src/app/api/settings/hooks/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/settings/hooks/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hook = await prisma.globalHook.findUnique({
      where: { id: params.id }
    });

    if (!hook) {
      return NextResponse.json({ error: 'Hook not found' }, { status: 404 });
    }

    return NextResponse.json({ hook });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch hook' }, { status: 500 });
  }
}

// PUT /api/settings/hooks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const hook = await prisma.globalHook.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json({ hook });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update hook' }, { status: 500 });
  }
}

// DELETE /api/settings/hooks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.globalHook.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete hook' }, { status: 500 });
  }
}
```

**File:** `packages/server/src/app/api/settings/hooks/import/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { parseClaudeHooks, importHooks } from '@/lib/hooks';

// POST /api/settings/hooks/import
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hooks: rawHooks, replace = false, dryRun = false } = body;

    if (!rawHooks || typeof rawHooks !== 'object') {
      return NextResponse.json(
        { error: 'hooks object is required' },
        { status: 400 }
      );
    }

    // Parse from Claude format
    const parsed = parseClaudeHooks(rawHooks);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        preview: {
          total: parsed.length,
          byType: parsed.reduce((acc, h) => {
            acc[h.hookType] = (acc[h.hookType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        hooks: parsed
      });
    }

    const result = await importHooks(parsed, replace);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import hooks' }, { status: 500 });
  }
}
```

**File:** `packages/server/src/app/api/settings/hooks/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exportToClaudeFormat } from '@/lib/hooks';

// GET /api/settings/hooks/export
export async function GET() {
  try {
    const hooks = await prisma.globalHook.findMany({
      where: { enabled: true },
      orderBy: [
        { hookType: 'asc' },
        { order: 'asc' }
      ]
    });

    const exported = exportToClaudeFormat(hooks);

    return NextResponse.json({
      hooks: exported,
      count: hooks.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to export hooks' }, { status: 500 });
  }
}
```

### Task 2.3: Hooks CLI Commands

**File:** `packages/cli/src/lib/api-hooks.ts`

```typescript
import { apiClient } from './config.js';
import type { GlobalHook, GlobalHookCreate } from '@ccm/shared';

export interface HooksListResponse {
  hooks: GlobalHook[];
  grouped: Record<string, GlobalHook[]>;
  stats: {
    total: number;
    enabled: number;
    byType: Record<string, number>;
  };
}

export async function listHooks(filters?: {
  hookType?: string;
  category?: string;
  enabled?: boolean;
}): Promise<{ data?: HooksListResponse; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (filters?.hookType) params.set('hookType', filters.hookType);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.enabled !== undefined) params.set('enabled', String(filters.enabled));

    const response = await apiClient.get(`/api/settings/hooks?${params}`);
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createHook(hook: GlobalHookCreate): Promise<{ data?: { hook: GlobalHook }; error?: string }> {
  try {
    const response = await apiClient.post('/api/settings/hooks', hook);
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateHook(id: string, updates: Partial<GlobalHook>): Promise<{ data?: { hook: GlobalHook }; error?: string }> {
  try {
    const response = await apiClient.put(`/api/settings/hooks/${id}`, updates);
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteHook(id: string): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const response = await apiClient.delete(`/api/settings/hooks/${id}`);
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function importHooks(
  hooks: Record<string, any[]>,
  options: { replace?: boolean; dryRun?: boolean }
): Promise<{ data?: any; error?: string }> {
  try {
    const response = await apiClient.post('/api/settings/hooks/import', {
      hooks,
      ...options
    });
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function exportHooks(): Promise<{ data?: { hooks: Record<string, any[]>; count: number }; error?: string }> {
  try {
    const response = await apiClient.get('/api/settings/hooks/export');
    return { data: response.data };
  } catch (error: any) {
    return { error: error.message };
  }
}
```

**File:** `packages/cli/src/commands/settings-hooks.ts`

```typescript
import chalk from 'chalk';
import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { listHooks, createHook, deleteHook, importHooks, exportHooks } from '../lib/api-hooks.js';

export function createSettingsHooksCommand(): Command {
  const hooksCmd = new Command('hooks');

  hooksCmd
    .description('Manage global Claude Code hooks')
    .addHelpText('after', `

${chalk.gray('Examples:')}
  ${chalk.cyan('ccm settings hooks list')}              List all hooks
  ${chalk.cyan('ccm settings hooks import')}            Import from ~/.claude/settings.local.json
  ${chalk.cyan('ccm settings hooks export')}            Export to Claude format
`);

  // List hooks
  hooksCmd
    .command('list')
    .description('List all global hooks')
    .option('-t, --type <type>', 'Filter by hook type')
    .option('-c, --category <category>', 'Filter by category')
    .option('--enabled', 'Show only enabled hooks')
    .option('--disabled', 'Show only disabled hooks')
    .option('-f, --format <format>', 'Output format: table, json', 'table')
    .action(async (options) => {
      const result = await listHooks({
        hookType: options.type,
        category: options.category,
        enabled: options.enabled ? true : options.disabled ? false : undefined
      });

      if (result.error) {
        console.log(chalk.red('Error:'), result.error);
        process.exit(1);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(result.data, null, 2));
        return;
      }

      const { hooks, stats } = result.data!;

      console.log(chalk.bold('Global Hooks'));
      console.log();
      console.log(`Total: ${stats.total} | Enabled: ${chalk.green(stats.enabled)} | Disabled: ${chalk.red(stats.total - stats.enabled)}`);
      console.log();

      if (hooks.length === 0) {
        console.log(chalk.gray('No hooks configured.'));
        console.log(`Run ${chalk.cyan('ccm settings hooks import')} to import from settings.local.json`);
        return;
      }

      // Group by type for display
      const byType = hooks.reduce((acc, h) => {
        if (!acc[h.hookType]) acc[h.hookType] = [];
        acc[h.hookType].push(h);
        return acc;
      }, {} as Record<string, typeof hooks>);

      for (const [type, typeHooks] of Object.entries(byType)) {
        console.log(chalk.bold.cyan(type) + ` (${typeHooks.length})`);
        
        for (const hook of typeHooks) {
          const status = hook.enabled ? chalk.green('✓') : chalk.red('✗');
          const matcher = chalk.yellow(hook.matcher);
          const desc = hook.description ? chalk.gray(` - ${hook.description}`) : '';
          const cat = hook.category ? chalk.magenta(` [${hook.category}]`) : '';
          
          console.log(`  ${status} ${matcher}${cat}${desc}`);
          
          // Show truncated command
          const cmdPreview = hook.command.length > 60 
            ? hook.command.substring(0, 60) + '...'
            : hook.command;
          console.log(chalk.gray(`     ${cmdPreview}`));
        }
        console.log();
      }
    });

  // Import hooks
  hooksCmd
    .command('import')
    .description('Import hooks from settings.local.json')
    .option('-s, --source <path>', 'Source file path', join(homedir(), '.claude', 'settings.local.json'))
    .option('--replace', 'Replace all existing hooks')
    .option('--dry-run', 'Preview import without making changes')
    .action(async (options) => {
      console.log(chalk.bold('Import Hooks'));
      console.log();

      if (!existsSync(options.source)) {
        console.log(chalk.red(`Source file not found: ${options.source}`));
        process.exit(1);
      }

      console.log(`Source: ${chalk.cyan(options.source)}`);
      if (options.dryRun) {
        console.log(chalk.yellow('Dry run mode - no changes will be made'));
      }
      console.log();

      try {
        const content = readFileSync(options.source, 'utf-8');
        const settings = JSON.parse(content);

        if (!settings.hooks) {
          console.log(chalk.yellow('No hooks found in settings file.'));
          return;
        }

        const result = await importHooks(settings.hooks, {
          replace: options.replace,
          dryRun: options.dryRun
        });

        if (result.error) {
          console.log(chalk.red('Import failed:'), result.error);
          process.exit(1);
        }

        if (options.dryRun) {
          console.log(chalk.bold('Preview:'));
          console.log(`  Total hooks found: ${result.data.preview.total}`);
          console.log('  By type:');
          for (const [type, count] of Object.entries(result.data.preview.byType)) {
            console.log(`    ${type}: ${count}`);
          }
        } else {
          console.log(chalk.green('✓ Import complete!'));
          console.log(`  Imported: ${result.data.imported}`);
          console.log(`  Skipped:  ${result.data.skipped}`);
          if (result.data.errors?.length > 0) {
            console.log(chalk.yellow('  Errors:'));
            for (const err of result.data.errors) {
              console.log(`    - ${err}`);
            }
          }
        }
      } catch (error) {
        console.log(chalk.red('Failed to read/parse source file:'), error);
        process.exit(1);
      }
    });

  // Export hooks
  hooksCmd
    .command('export')
    .description('Export hooks to Claude settings format')
    .option('-f, --format <format>', 'Output format: json, file', 'json')
    .action(async (options) => {
      const result = await exportHooks();

      if (result.error) {
        console.log(chalk.red('Export failed:'), result.error);
        process.exit(1);
      }

      console.log(JSON.stringify(result.data!.hooks, null, 2));
    });

  // Add hook
  hooksCmd
    .command('add')
    .description('Add a new hook')
    .requiredOption('-t, --type <type>', 'Hook type (PreToolUse, PostToolUse, etc.)')
    .requiredOption('-m, --matcher <matcher>', 'Tool matcher pattern')
    .requiredOption('-c, --command <command>', 'Shell command to run')
    .option('--timeout <seconds>', 'Timeout in seconds')
    .option('-d, --description <desc>', 'Description')
    .option('--category <cat>', 'Category (git, security, formatting, etc.)')
    .action(async (options) => {
      const result = await createHook({
        hookType: options.type,
        matcher: options.matcher,
        command: options.command,
        timeout: options.timeout ? parseInt(options.timeout) : undefined,
        description: options.description,
        category: options.category,
      });

      if (result.error) {
        console.log(chalk.red('Failed to add hook:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Hook added successfully!'));
      console.log(`  ID: ${result.data!.hook.id}`);
    });

  // Delete hook
  hooksCmd
    .command('delete <id>')
    .description('Delete a hook by ID')
    .action(async (id) => {
      const result = await deleteHook(id);

      if (result.error) {
        console.log(chalk.red('Failed to delete hook:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✓ Hook deleted'));
    });

  return hooksCmd;
}
```

**Completion Criteria for WS2:**
- [ ] All hooks API routes working
- [ ] Import from settings.local.json works
- [ ] Export to Claude format works
- [ ] CLI commands functional

---

## Workstream 3: Global Permissions (API + CLI)

**Duration:** 2-3 hours  
**Dependencies:** WS0 complete  
**Terminal Session:** 3  
**Can run parallel with:** WS1, WS2, WS4

### Files Owned

```
packages/server/src/app/api/settings/permissions/
├── route.ts
├── [id]/route.ts
├── import/route.ts
└── export/route.ts
packages/server/src/lib/permissions.ts
packages/cli/src/commands/settings-permissions.ts
packages/cli/src/lib/api-permissions.ts
```

*Similar structure to WS2 - abbreviated guidance*

### Key Implementation Notes

```typescript
// Permission parsing - extract type and pattern
function parsePermission(perm: string): ParsedPermission {
  const match = perm.match(/^(\w+)\((.+)\)$/);
  if (match) {
    return { type: match[1] as any, pattern: match[2], raw: perm };
  }
  return { type: 'Other', pattern: perm, raw: perm };
}

// Import from settings.local.json permissions array
function parseClaudePermissions(settings: { permissions?: { allow?: string[]; deny?: string[] } }): GlobalPermissionCreate[] {
  const result: GlobalPermissionCreate[] = [];
  
  for (const perm of settings.permissions?.allow || []) {
    const parsed = parsePermission(perm);
    result.push({
      permission: perm,
      action: 'allow',
      category: guessCategory(parsed),
    });
  }
  
  for (const perm of settings.permissions?.deny || []) {
    const parsed = parsePermission(perm);
    result.push({
      permission: perm,
      action: 'deny',
      category: guessCategory(parsed),
    });
  }
  
  return result;
}
```

**Completion Criteria for WS3:**
- [ ] All permissions API routes working
- [ ] Import from settings.local.json works
- [ ] Export works
- [ ] CLI commands functional

---

## Workstream 4: Environment Variables (API + CLI)

**Duration:** 2-3 hours  
**Dependencies:** WS0 complete  
**Terminal Session:** 4  
**Can run parallel with:** WS1, WS2, WS3

### Files Owned

```
packages/server/src/app/api/settings/env/
├── route.ts
├── [id]/route.ts
packages/server/src/lib/env.ts
packages/cli/src/commands/settings-env.ts
packages/cli/src/lib/api-env.ts
```

### Key Implementation Notes

- Reuse existing encryption utilities from CCM
- Mask sensitive values in API responses
- Support scoping (claude-desktop, claude-code, all)

**Completion Criteria for WS4:**
- [ ] All env API routes working
- [ ] Sensitive values masked in responses
- [ ] CLI commands functional

---

## Workstream 5: Claude Desktop Integration (API + CLI)

**Duration:** 3-4 hours  
**Dependencies:** WS0 complete, WS1 helpful  
**Terminal Session:** 1 (after WS1 complete) or 5  
**Can run parallel with:** WS6, WS7

### Files Owned

```
packages/server/src/app/api/claude-desktop/
├── route.ts                   # GET config, POST update
├── mcp/
│   ├── route.ts              # List/add MCP servers for desktop
│   └── [id]/route.ts         # Enable/disable specific MCP
├── plugins/
│   └── route.ts              # Manage plugins
└── sync/
    └── route.ts              # Sync config to file
packages/server/src/lib/claude-desktop.ts
packages/cli/src/commands/desktop.ts
packages/cli/src/lib/api-desktop.ts
```

### Key Implementation Notes

```typescript
// Read current Claude Desktop config
async function readDesktopConfig(): Promise<ClaudeDesktopConfigFile | null> {
  const configPath = getClaudeDesktopConfigPath();
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Write Claude Desktop config
async function writeDesktopConfig(config: ClaudeDesktopConfigFile): Promise<void> {
  const configPath = getClaudeDesktopConfigPath();
  await fs.mkdir(dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

// Generate config from database
async function generateDesktopConfig(): Promise<ClaudeDesktopConfigFile> {
  const mcpServers = await prisma.claudeDesktopMcp.findMany({
    where: { enabled: true },
    include: { /* component relation */ }
  });
  
  const config: ClaudeDesktopConfigFile = { mcpServers: {} };
  
  for (const mcp of mcpServers) {
    const componentConfig = JSON.parse(mcp.component.config);
    config.mcpServers[mcp.component.name] = {
      command: mcp.commandOverride || componentConfig.command,
      args: mcp.argsOverride ? JSON.parse(mcp.argsOverride) : componentConfig.args,
      env: {
        ...componentConfig.env,
        ...(mcp.envOverrides ? JSON.parse(mcp.envOverrides) : {})
      }
    };
  }
  
  return config;
}
```

**Completion Criteria for WS5:**
- [ ] Can read/write Claude Desktop config
- [ ] API for managing desktop MCP servers
- [ ] CLI commands functional

---

## Workstream 6: Sync System (API + CLI)

**Duration:** 4-5 hours  
**Dependencies:** WS0, WS1, WS2, WS3 complete  
**Terminal Session:** 2 (after earlier work) or 6  
**Can run parallel with:** WS5, WS7

### Files Owned

```
packages/server/src/app/api/sync/
├── route.ts                   # POST sync, GET status
├── preview/route.ts           # GET sync preview (dry run)
├── history/route.ts           # GET sync logs
└── conflicts/route.ts         # GET/POST conflict resolution
packages/server/src/lib/sync-engine.ts
packages/cli/src/commands/sync-new.ts    # New sync (rename to sync.ts in integration)
packages/cli/src/lib/api-sync.ts
packages/cli/src/lib/sync-engine.ts      # Client-side sync logic
```

### Key Implementation

**File:** `packages/server/src/lib/sync-engine.ts` (Server-side)

```typescript
export async function generateSyncPayload(machineId: string): Promise<SyncPayload> {
  // Gather all configs that should be synced
  const [hooks, permissions, envVars, mcpServers, agents, skills, commands] = await Promise.all([
    prisma.globalHook.findMany({ where: { enabled: true } }),
    prisma.globalPermission.findMany({ where: { enabled: true } }),
    prisma.globalEnvVar.findMany(),
    prisma.component.findMany({ where: { type: 'MCP_SERVER', enabled: true } }),
    prisma.component.findMany({ where: { type: 'SUBAGENT', enabled: true } }),
    prisma.component.findMany({ where: { type: 'SKILL', enabled: true } }),
    prisma.component.findMany({ where: { type: 'COMMAND', enabled: true } }),
  ]);

  // Get machine overrides
  const overrides = await prisma.machineOverride.findMany({
    where: { machineId }
  });

  // Apply overrides (exclude items, modify items)
  // ... filtering logic ...

  return {
    hooks: exportToClaudeFormat(hooks),
    permissions: { allow: [...], deny: [...] },
    envVars: envVars.map(e => ({ key: e.key, value: e.value })),
    mcpServers,
    agents,
    skills,
    commands,
    generatedAt: new Date().toISOString(),
  };
}
```

**File:** `packages/cli/src/lib/sync-engine.ts` (Client-side)

```typescript
export async function performSync(options: SyncOptions): Promise<SyncResult> {
  // 1. Get sync payload from server
  const payload = await api.getSyncPayload(options.machineId);
  
  // 2. Write settings.local.json
  await writeSettingsLocal({
    hooks: payload.hooks,
    permissions: payload.permissions,
  });
  
  // 3. Write global agents
  for (const agent of payload.agents) {
    await writeAgentFile(agent);
  }
  
  // 4. Write global skills
  for (const skill of payload.skills) {
    await writeSkillFiles(skill);
  }
  
  // 5. Write global commands
  for (const command of payload.commands) {
    await writeCommandFile(command);
  }
  
  // 6. Report back to server
  await api.reportSyncComplete(options.machineId, result);
  
  return result;
}
```

**Completion Criteria for WS6:**
- [ ] Sync payload generation works
- [ ] Can write all config files
- [ ] Sync history tracking
- [ ] CLI commands functional

---

## Workstream 7: Machine UI

**Duration:** 3-4 hours  
**Dependencies:** WS1 API complete  
**Terminal Session:** 3 (after WS3) or 7  
**Can run parallel with:** WS5, WS6, WS8

### Files Owned

```
packages/server/src/app/machines/
├── page.tsx                   # Machine list page
├── [id]/
│   └── page.tsx              # Machine detail page
└── layout.tsx                 # Optional layout
packages/server/src/components/machines/
├── machine-list.tsx
├── machine-card.tsx
├── machine-detail.tsx
├── machine-override-form.tsx
└── register-machine-dialog.tsx
```

**Completion Criteria for WS7:**
- [ ] Machine list page displays all machines
- [ ] Machine detail page shows overrides
- [ ] Can add/edit machine overrides from UI

---

## Workstream 8: Settings UI (Hooks + Permissions + Env)

**Duration:** 4-5 hours  
**Dependencies:** WS2, WS3, WS4 APIs complete  
**Terminal Session:** 4 (after WS4) or 8  
**Can run parallel with:** WS7, WS9

### Files Owned

```
packages/server/src/app/settings/
├── page.tsx                   # Settings overview
├── hooks/
│   └── page.tsx              # Hooks management
├── permissions/
│   └── page.tsx              # Permissions management
├── env/
│   └── page.tsx              # Environment variables
└── layout.tsx
packages/server/src/components/settings/
├── hooks/
│   ├── hook-list.tsx
│   ├── hook-editor.tsx       # Monaco editor for commands
│   ├── hook-form.tsx
│   └── import-hooks-dialog.tsx
├── permissions/
│   ├── permission-list.tsx
│   ├── permission-form.tsx
│   └── permission-categories.tsx
└── env/
    ├── env-list.tsx
    ├── env-form.tsx
    └── env-value-display.tsx  # Masked display
```

**Completion Criteria for WS8:**
- [ ] Hooks management UI
- [ ] Permissions management UI
- [ ] Environment variables UI
- [ ] Import dialogs working

---

## Workstream 9: Claude Desktop UI + Sync UI

**Duration:** 3-4 hours  
**Dependencies:** WS5, WS6 APIs complete  
**Terminal Session:** 5 (after WS5) or 9  
**Can run parallel with:** WS7, WS8

### Files Owned

```
packages/server/src/app/claude-desktop/
├── page.tsx
└── layout.tsx
packages/server/src/components/claude-desktop/
├── mcp-server-list.tsx
├── mcp-server-toggle.tsx
├── plugin-list.tsx
└── sync-button.tsx

packages/server/src/app/sync/
├── page.tsx
├── history/
│   └── page.tsx
└── layout.tsx
packages/server/src/components/sync/
├── sync-status.tsx
├── sync-preview.tsx
├── sync-history.tsx
└── conflict-resolver.tsx
```

**Completion Criteria for WS9:**
- [ ] Claude Desktop config UI
- [ ] Sync status dashboard
- [ ] Sync history page
- [ ] Conflict resolution UI

---

## Workstream 10: Integration & Wiring (SEQUENTIAL)

**Duration:** 3-4 hours  
**Dependencies:** ALL previous workstreams  
**Terminal Session:** Single session

### Task 10.1: Wire CLI Commands

**File:** `packages/cli/src/commands/index.ts` (UPDATE)

```typescript
// Add new exports
export { createMachineCommand } from './machine.js';
export { createSettingsHooksCommand } from './settings-hooks.js';
export { createSettingsPermissionsCommand } from './settings-permissions.js';
export { createSettingsEnvCommand } from './settings-env.js';
export { createDesktopCommand } from './desktop.js';
export { createSyncCommand } from './sync-new.js';  // Will replace old sync
```

**File:** `packages/cli/src/index.ts` (UPDATE)

```typescript
// Add command registrations
import { createMachineCommand } from './commands/machine.js';
import { createSettingsHooksCommand } from './commands/settings-hooks.js';
// ... etc

program.addCommand(createMachineCommand());

const settingsCmd = new Command('settings').description('Manage global settings');
settingsCmd.addCommand(createSettingsHooksCommand());
settingsCmd.addCommand(createSettingsPermissionsCommand());
settingsCmd.addCommand(createSettingsEnvCommand());
program.addCommand(settingsCmd);

program.addCommand(createDesktopCommand());
// Replace old sync with new
program.addCommand(createSyncCommand());
```

### Task 10.2: Update API Client

**File:** `packages/cli/src/lib/api.ts` (UPDATE)

```typescript
// Re-export all domain-specific API clients
export * from './api-machines.js';
export * from './api-hooks.js';
export * from './api-permissions.js';
export * from './api-env.js';
export * from './api-desktop.js';
export * from './api-sync.js';
```

### Task 10.3: Update Navigation

**File:** `packages/server/src/components/nav.tsx` (UPDATE or CREATE)

```typescript
// Add new navigation items
const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/machines', label: 'Machines', icon: Monitor },
  { href: '/components', label: 'Components', icon: Puzzle },
  { href: '/profiles', label: 'Profiles', icon: Layers },
  { href: '/projects', label: 'Projects', icon: Folder },
  { 
    label: 'Settings', 
    icon: Settings,
    children: [
      { href: '/settings/hooks', label: 'Hooks' },
      { href: '/settings/permissions', label: 'Permissions' },
      { href: '/settings/env', label: 'Environment' },
    ]
  },
  { href: '/claude-desktop', label: 'Claude Desktop', icon: AppWindow },
  { href: '/auto-claude', label: 'Auto-Claude', icon: Bot },
  { href: '/sync', label: 'Sync', icon: RefreshCw },
];
```

### Task 10.4: Update Dashboard

**File:** `packages/server/src/app/page.tsx` (UPDATE)

Add widgets for:
- Machine status overview
- Recent sync activity
- Hook/permission counts
- Claude Desktop status

**Completion Criteria for WS10:**
- [ ] All CLI commands registered
- [ ] Navigation updated
- [ ] Dashboard shows new widgets
- [ ] All routes accessible

---

## Workstream 11: Testing & Polish (SEQUENTIAL)

**Duration:** 2-3 days  
**Dependencies:** WS10 complete  
**Terminal Session:** Single session

### Task 11.1: End-to-End Testing

```bash
# Test machine registration
ccm machine register --name test-laptop
ccm machine list
ccm machine status

# Test hooks import/export
ccm settings hooks import --dry-run
ccm settings hooks import
ccm settings hooks list
ccm settings hooks export

# Test permissions
ccm settings permissions import
ccm settings permissions list

# Test Claude Desktop
ccm desktop list
ccm desktop add github
ccm desktop sync --dry-run
ccm desktop sync

# Test full sync
ccm sync --dry-run
ccm sync
ccm sync --pull
```

### Task 11.2: Fix Issues & Edge Cases

- Handle missing files gracefully
- Validate all inputs
- Proper error messages
- Loading states in UI

### Task 11.3: Documentation

- Update README.md
- Update CLAUDE.md
- Add inline help text
- Screenshot new UI pages

**Completion Criteria for WS11:**
- [ ] All CLI commands work end-to-end
- [ ] UI pages functional
- [ ] Error handling robust
- [ ] Documentation updated

---

## Parallel Session Assignment

| Terminal | Workstream | Duration | Start After |
|----------|------------|----------|-------------|
| **T1** | WS0: Foundation | 2-4h | - |
| **T1** | WS1: Machines | 3-4h | WS0 |
| **T2** | WS2: Hooks | 3-4h | WS0 |
| **T3** | WS3: Permissions | 2-3h | WS0 |
| **T4** | WS4: Env Vars | 2-3h | WS0 |
| **T1** | WS5: Claude Desktop | 3-4h | WS1 |
| **T2** | WS6: Sync | 4-5h | WS2 |
| **T3** | WS7: Machine UI | 3-4h | WS1 API done |
| **T4** | WS8: Settings UI | 4-5h | WS2,3,4 APIs done |
| **T2** | WS9: Desktop+Sync UI | 3-4h | WS5,6 APIs done |
| **T1** | WS10: Integration | 3-4h | ALL |
| **T1** | WS11: Testing | 2-3d | WS10 |

---

## Quick Reference: File Ownership

**NEVER have two sessions edit the same file. Use this reference:**

| Path Pattern | Owner |
|-------------|-------|
| `prisma/schema.prisma` | WS0 only |
| `shared/src/types/*` | WS0 only |
| `api/machines/**` | WS1 |
| `api/settings/hooks/**` | WS2 |
| `api/settings/permissions/**` | WS3 |
| `api/settings/env/**` | WS4 |
| `api/claude-desktop/**` | WS5 |
| `api/sync/**` | WS6 |
| `app/machines/**`, `components/machines/**` | WS7 |
| `app/settings/**`, `components/settings/**` | WS8 |
| `app/claude-desktop/**`, `app/sync/**` | WS9 |
| `cli/commands/index.ts`, `cli/src/index.ts` | WS10 |
| `app/page.tsx` (dashboard), navigation | WS10 |

---

## Summary

This plan enables **4 parallel Claude Code sessions** after WS0 completes, potentially cutting implementation time by 60-70%. The key to success is:

1. **Complete WS0 first** - This creates the shared foundation
2. **Strict file ownership** - Never have two sessions edit the same file
3. **API-first approach** - Build APIs before UI
4. **Sequential integration** - Wire everything together at the end

Good luck with your implementation!
