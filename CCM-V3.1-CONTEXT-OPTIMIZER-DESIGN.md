# CCM v3.1: Context Optimizer Agent

## Overview

**Feature:** Intelligent CLAUDE.md optimization agent that analyzes, recommends, and applies context file improvements to reduce token waste.

**Problem Statement:**
- CLAUDE.md files accumulate bloat over time (completed work, historical notes, outdated references)
- Every Claude Code session pays token cost for non-actionable information
- Manual maintenance is tedious and often neglected
- No tooling exists to intelligently optimize context files

**Solution:**
An autonomous agent that analyzes CLAUDE.md files, detects optimization opportunities, and applies improvements while preserving important context in archives.

---

## Goals

1. **Reduce token waste** - Target 40-60% reduction in CLAUDE.md size
2. **Preserve history** - Archive verbose content, never delete without backup
3. **Maintain usefulness** - Keep actionable, current information prominent
4. **Integrate with v3.0** - Leverage existing recommendations infrastructure
5. **Automate maintenance** - Trigger on thresholds, not manual intervention

---

## Architecture

### Integration with Existing Systems

```
┌─────────────────────────────────────────────────────────────────┐
│                    CCM v3.0 Infrastructure                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Session    │    │ Intelligence │    │    Health    │      │
│  │   Tracking   │    │    Engine    │    │    Score     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │  Recommendations │                          │
│                    │     System       │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              ▼              ▼              ▼                    │
│      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│      │ MCP Server  │ │   Skill     │ │  Context    │  ◄── NEW  │
│      │    Recs     │ │    Recs     │ │ Optimizer   │           │
│      └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### New Components

```
packages/
├── server/
│   ├── prisma/
│   │   └── schema.prisma          # Add: ContextAnalysis, ContextArchive
│   ├── src/
│   │   ├── app/
│   │   │   └── api/
│   │   │       └── context/       # NEW: Context optimization APIs
│   │   │           ├── analyze/
│   │   │           ├── optimize/
│   │   │           ├── archives/
│   │   │           └── rules/
│   │   ├── lib/
│   │   │   └── context/           # NEW: Context optimization engine
│   │   │       ├── analyzer.ts
│   │   │       ├── classifier.ts
│   │   │       ├── optimizer.ts
│   │   │       ├── archiver.ts
│   │   │       └── index.ts
│   │   └── components/
│   │       └── context/           # NEW: UI components
│   │           ├── ContextAnalysisCard.tsx
│   │           ├── ContextOptimizer.tsx
│   │           └── ArchiveViewer.tsx
│   └── src/app/
│       └── context/               # NEW: Context optimization page
│           └── page.tsx
├── cli/
│   └── src/
│       └── commands/
│           └── context.ts         # NEW: CLI commands
```

---

## Database Schema

### New Models

```prisma
// Context analysis results
model ContextAnalysis {
  id              String   @id @default(cuid())
  machineId       String
  projectPath     String
  filePath        String   // Path to CLAUDE.md or other context file

  // Analysis results
  totalLines      Int
  totalTokens     Int      // Estimated token count

  // Section breakdown (JSON)
  sections        String   // Array of detected sections with metadata

  // Issues detected (JSON)
  issues          String   // Array of optimization opportunities

  // Recommendations
  estimatedSavings    Int  // Tokens that could be saved
  optimizationScore   Int  // 0-100, higher = more optimized

  // Status
  status          String   @default("analyzed") // "analyzed", "optimized", "archived"
  lastAnalyzedAt  DateTime @default(now())

  machine Machine @relation(fields: [machineId], references: [id], onDelete: Cascade)

  @@unique([machineId, projectPath, filePath])
  @@index([machineId])
  @@index([optimizationScore])
}

// Archived content from context files
model ContextArchive {
  id              String   @id @default(cuid())
  machineId       String
  projectPath     String
  sourceFile      String   // Original file (e.g., "CLAUDE.md")
  archiveFile     String   // Archive path (e.g., ".claude/archives/CLAUDE-2026-01.md")

  // What was archived
  sectionName     String   // e.g., "Completed Work Sessions"
  originalLines   Int
  originalTokens  Int
  summaryLines    Int      // Lines in condensed summary

  // Content
  archivedContent String   // Full archived content
  summaryContent  String   // Condensed replacement

  // Metadata
  archiveReason   String   // "completed_work", "outdated", "verbose", "duplicate"
  archivedAt      DateTime @default(now())

  machine Machine @relation(fields: [machineId], references: [id], onDelete: Cascade)

  @@index([machineId])
  @@index([projectPath])
  @@index([archivedAt])
}

// Optimization rules (user-configurable)
model ContextOptimizationRule {
  id              String   @id @default(cuid())
  machineId       String?  // null = global rule

  // Rule definition
  name            String
  description     String?
  ruleType        String   // "archive", "condense", "remove", "move"

  // Pattern matching
  sectionPattern  String?  // Regex to match section headers
  contentPattern  String?  // Regex to match content
  ageThreshold    Int?     // Days old before applying
  lineThreshold   Int?     // Min lines before applying

  // Action
  action          String   // JSON action configuration

  enabled         Boolean  @default(true)
  priority        Int      @default(0)

  machine Machine? @relation(fields: [machineId], references: [id], onDelete: Cascade)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([machineId])
  @@index([ruleType])
  @@index([enabled])
}
```

### Update Machine Model

```prisma
model Machine {
  // ... existing fields ...

  // v3.1 Context Optimizer relationships
  contextAnalyses    ContextAnalysis[]
  contextArchives    ContextArchive[]
  optimizationRules  ContextOptimizationRule[]
}
```

---

## API Endpoints

### Analysis APIs

```
POST /api/context/analyze
  Body: { machineId, projectPath, filePath? }
  Returns: ContextAnalysis with sections and issues

GET /api/context/analyze?machineId=X&projectPath=Y
  Returns: Latest analysis for project

GET /api/context/analyze/[id]
  Returns: Specific analysis with full details
```

### Optimization APIs

```
POST /api/context/optimize
  Body: { analysisId, strategy, dryRun? }
  Returns: Optimization plan or applied changes

POST /api/context/optimize/preview
  Body: { analysisId, strategy }
  Returns: Preview of changes without applying

GET /api/context/optimize/strategies
  Returns: Available optimization strategies
```

### Archive APIs

```
GET /api/context/archives?machineId=X&projectPath=Y
  Returns: List of archives for project

GET /api/context/archives/[id]
  Returns: Archive content

POST /api/context/archives/restore
  Body: { archiveId }
  Returns: Restored content
```

### Rules APIs

```
GET /api/context/rules?machineId=X
  Returns: Optimization rules

POST /api/context/rules
  Body: Rule definition
  Returns: Created rule

PATCH /api/context/rules/[id]
  Body: Rule updates
  Returns: Updated rule

DELETE /api/context/rules/[id]
  Returns: Success
```

---

## Intelligence Engine

### Content Classifier

Detects and categorizes CLAUDE.md sections:

```typescript
type SectionType =
  | 'project_overview'      // Keep: essential context
  | 'current_phase'         // Keep: active work
  | 'technology_stack'      // Keep: reference
  | 'commands'              // Keep or dedupe with README
  | 'conventions'           // Keep: coding standards
  | 'completed_work'        // Archive: historical
  | 'work_sessions'         // Archive: verbose history
  | 'testing'               // Condense: keep summary
  | 'data_model'            // Keep: reference
  | 'notes'                 // Review: may be stale
  | 'unknown'               // Flag for review

interface ClassifiedSection {
  name: string;
  type: SectionType;
  startLine: number;
  endLine: number;
  lineCount: number;
  estimatedTokens: number;
  actionability: 'high' | 'medium' | 'low';
  staleness: number; // 0-1, based on date references
}
```

### Issue Detector

Identifies optimization opportunities:

```typescript
type IssueType =
  | 'oversized_section'     // Section exceeds threshold
  | 'completed_work_verbose'// Detailed history that could be summarized
  | 'outdated_reference'    // References non-existent files/phases
  | 'duplicate_content'     // Same info exists in README/docs
  | 'stale_dates'           // References old dates as "current"
  | 'low_actionability'     // Content unlikely to help current work
  | 'excessive_examples'    // Too many code examples
  | 'nested_detail'         // Deep detail better in separate docs

interface DetectedIssue {
  type: IssueType;
  severity: 'high' | 'medium' | 'low';
  section: string;
  description: string;
  suggestedAction: string;
  estimatedSavings: number; // tokens
  confidence: number; // 0-1
}
```

### Optimization Strategies

```typescript
type Strategy =
  | 'conservative'  // Archive only, never modify in place
  | 'moderate'      // Archive + condense + dedupe
  | 'aggressive'    // Minimize to essential context only
  | 'custom'        // Apply user-defined rules

interface OptimizationPlan {
  strategy: Strategy;
  actions: OptimizationAction[];
  summary: {
    currentLines: number;
    projectedLines: number;
    currentTokens: number;
    projectedTokens: number;
    reductionPercent: number;
  };
}

interface OptimizationAction {
  type: 'archive' | 'condense' | 'remove' | 'move' | 'dedupe';
  section: string;
  reason: string;
  before: string;      // Original content (truncated)
  after: string;       // New content (or archive reference)
  linesSaved: number;
  tokensSaved: number;
}
```

---

## CLI Commands

```bash
# Analyze CLAUDE.md in current project
ccm context analyze
ccm context analyze --project /path/to/project
ccm context analyze --all  # All registered projects

# Show analysis results
ccm context status
ccm context status --verbose

# Preview optimization
ccm context optimize --dry-run
ccm context optimize --dry-run --strategy aggressive

# Apply optimization
ccm context optimize
ccm context optimize --strategy moderate
ccm context optimize --auto-approve  # No confirmation

# Manage archives
ccm context archives                  # List archives
ccm context archives show <id>        # View archive content
ccm context archives restore <id>     # Restore from archive

# Configure rules
ccm context rules list
ccm context rules add --interactive
ccm context rules disable <id>
```

---

## UI Components

### Context Optimization Page (`/context`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Context Optimizer                                    [Analyze] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  CLAUDE.md Health                                        │   │
│  │  ████████████░░░░░░░░░░░░░░░░░░  42/100                 │   │
│  │                                                          │   │
│  │  748 lines • ~18,700 tokens • Last analyzed: 2 min ago  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Optimization Opportunities                        [Apply All]  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️  HIGH: Completed Work Sessions (400 lines)           │   │
│  │     Archive to .claude/archives/ → Save 380 lines       │   │
│  │                                    [Preview] [Apply]     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ⚠️  MEDIUM: Testing section duplicates README           │   │
│  │     Remove duplicate, keep reference → Save 85 lines    │   │
│  │                                    [Preview] [Apply]     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ℹ️  LOW: Commands section could link to docs            │   │
│  │     Replace with link → Save 40 lines                   │   │
│  │                                    [Preview] [Apply]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Archives (3)                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📁 CLAUDE-history-2026-01.md    Jan 19    892 lines     │   │
│  │ 📁 CLAUDE-history-2025-12.md    Dec 31    445 lines     │   │
│  │ 📁 CLAUDE-history-2025-11.md    Nov 30    312 lines     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration with v3.0 Recommendations

Context optimization generates recommendations in the existing system:

```typescript
// New recommendation type
{
  type: 'context_optimization',
  recommendedItem: 'CLAUDE.md optimization',
  category: 'context',
  title: 'Reduce CLAUDE.md by 58%',
  reason: 'CLAUDE.md is 748 lines with 400 lines of completed work history. Archive verbose sections to save ~11,200 tokens per session.',
  detectedPatterns: ['oversized_section', 'completed_work_verbose'],
  tokenSavings: 11200,
  dailySavings: 33600,  // Assuming 3 sessions/day
  monthlySavings: 1008000,
  confidenceScore: 0.92,
  priority: 'high',
  configTemplate: {
    strategy: 'moderate',
    actions: ['archive_completed_work', 'condense_testing']
  }
}
```

This allows context optimization to appear alongside MCP and skill recommendations in the dashboard.

---

## Parallel Implementation Plan

### Terminal 1: Database + Server APIs

**Scope:** Schema, migrations, API routes
**Directories:** `packages/server/prisma/`, `packages/server/src/app/api/context/`

**Tasks:**
1. Add 3 new Prisma models (ContextAnalysis, ContextArchive, ContextOptimizationRule)
2. Update Machine model with relationships
3. Run db:push
4. Create `/api/context/analyze` routes (POST, GET)
5. Create `/api/context/optimize` routes (POST, preview)
6. Create `/api/context/archives` routes (GET, POST restore)
7. Create `/api/context/rules` routes (CRUD)

**DO NOT touch:** `packages/server/src/lib/`, `packages/server/src/components/`, `packages/cli/`

---

### Terminal 2: Intelligence Engine

**Scope:** Analysis, classification, optimization logic
**Directories:** `packages/server/src/lib/context/`

**Tasks:**
1. Create `analyzer.ts` - Parse CLAUDE.md, extract sections, count tokens
2. Create `classifier.ts` - Categorize sections by type and actionability
3. Create `detector.ts` - Identify optimization issues
4. Create `optimizer.ts` - Generate optimization plans
5. Create `archiver.ts` - Create archives, generate summaries
6. Create `index.ts` - Export public API
7. Add context score to health calculator

**DO NOT touch:** `packages/server/src/app/api/`, `packages/server/src/components/`, `packages/cli/`

---

### Terminal 3: UI + CLI

**Scope:** User interfaces and CLI commands
**Directories:** `packages/server/src/components/context/`, `packages/server/src/app/context/`, `packages/cli/src/commands/`

**Tasks:**
1. Create `ContextAnalysisCard.tsx` - Display analysis results
2. Create `OptimizationPreview.tsx` - Show before/after
3. Create `ArchiveViewer.tsx` - Browse archives
4. Create `/context/page.tsx` - Main optimization dashboard
5. Add context link to sidebar navigation
6. Create `packages/cli/src/commands/context.ts` - CLI commands
7. Integrate with recommendations dashboard (new type)

**DO NOT touch:** `packages/server/prisma/`, `packages/server/src/lib/context/`

---

## MCP Servers

**Existing servers sufficient:**
- `context7` - Prisma, Next.js, React docs (already configured)
- `sequential-thinking` - Complex optimization decisions
- `sqlite` - Direct DB access for debugging

**No new MCP servers needed.**

---

## Skills

### New Skill: `/context`

Create `.claude/commands/context.md`:

```markdown
# Context Optimizer

Manage CLAUDE.md optimization.

## Usage

- `/context analyze` - Analyze current project's CLAUDE.md
- `/context optimize` - Run optimization with preview
- `/context status` - Show optimization status
- `/context archives` - List archived content

## Implementation

Run the appropriate ccm command:
- `ccm context analyze`
- `ccm context optimize --dry-run`
- `ccm context status`
- `ccm context archives`
```

### Update Existing Skills

**Update `/db` skill** to include:
```
- `/db push` - includes context models
```

**Update `/test` skill** to include:
```
- `/test context` - Run context optimizer tests
```

---

## Default Optimization Rules

Pre-configured rules applied by default:

```typescript
const DEFAULT_RULES = [
  {
    name: 'Archive Completed Work',
    ruleType: 'archive',
    sectionPattern: /^#{1,3}\s*(Completed|Done|Finished|Historical)/i,
    lineThreshold: 50,
    action: {
      type: 'archive',
      summaryTemplate: 'See `.claude/archives/{filename}` for {lineCount} lines of historical work.'
    }
  },
  {
    name: 'Condense Work Sessions',
    ruleType: 'condense',
    sectionPattern: /^#{1,3}\s*(Work Sessions|Session Log)/i,
    lineThreshold: 100,
    action: {
      type: 'condense',
      keepLines: 10,
      format: 'bullet_summary'
    }
  },
  {
    name: 'Flag Stale Dates',
    ruleType: 'flag',
    contentPattern: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+202[0-4]\b/,
    action: {
      type: 'flag',
      message: 'Contains potentially outdated date references'
    }
  },
  {
    name: 'Dedupe with README',
    ruleType: 'dedupe',
    sectionPattern: /^#{1,3}\s*(Installation|Setup|Getting Started)/i,
    action: {
      type: 'dedupe',
      referenceFile: 'README.md',
      replacementTemplate: 'See `README.md` for installation instructions.'
    }
  }
];
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| CLAUDE.md size reduction | 40-60% |
| Token savings per session | 5,000-15,000 |
| Archive preservation | 100% (never lose content) |
| False positive rate | <10% (unnecessary optimizations) |
| User satisfaction | Optimizations feel helpful, not aggressive |

---

## Testing Plan

### Unit Tests
- Classifier correctly categorizes sections
- Detector finds known issue patterns
- Optimizer generates valid plans
- Archiver creates proper archives

### Integration Tests
- Full analyze → optimize → archive flow
- CLI commands work end-to-end
- API routes handle edge cases
- Recommendations integrate properly

### Manual Testing
- Run on CCM's own CLAUDE.md (meta-test)
- Run on various project types
- Verify archives are restorable
- Check UI responsiveness

---

## Timeline

| Day | Terminal 1 | Terminal 2 | Terminal 3 |
|-----|------------|------------|------------|
| 1 | Schema + db:push | analyzer.ts | ContextAnalysisCard.tsx |
| 1 | /api/context/analyze | classifier.ts | OptimizationPreview.tsx |
| 1 | /api/context/optimize | detector.ts | /context/page.tsx |
| 1 | /api/context/archives | optimizer.ts | context.ts (CLI) |
| 1 | /api/context/rules | archiver.ts + index.ts | Sidebar + integration |

**Estimated completion:** 1 day with 3 parallel terminals

---

## Startup Commands

```bash
# Terminal 1 - Database + APIs
cd /Users/calebbolden/Projects/claude-code-config-manager && claude --dangerously-skip-permissions

# Terminal 2 - Intelligence Engine
cd /Users/calebbolden/Projects/claude-code-config-manager && claude --dangerously-skip-permissions

# Terminal 3 - UI + CLI
cd /Users/calebbolden/Projects/claude-code-config-manager && claude --dangerously-skip-permissions
```

Each terminal receives its specific task list from this document.

---

## Open Questions

1. **Threshold defaults** - What line/token counts trigger recommendations?
2. **Auto-optimization** - Should it ever optimize without user approval?
3. **Multi-file support** - Optimize other context files beyond CLAUDE.md?
4. **Project detection** - How to identify CLAUDE.md in unregistered projects?
5. **Rollback** - How long to retain archives for restoration?

---

## Appendix: Sample CLAUDE.md Analysis

Running on CCM's current CLAUDE.md:

```
File: CLAUDE.md
Lines: 748
Estimated Tokens: ~18,700

Sections:
├── Project Overview (25 lines) ............ KEEP
├── Key Documents (12 lines) ............... KEEP
├── Technology Stack (15 lines) ............ KEEP
├── Repository Structure (50 lines) ........ KEEP
├── Current Phase (30 lines) ............... KEEP
├── CCM v3.0 Description (150 lines) ....... CONDENSE → 30 lines
├── Commands (40 lines) .................... DEDUPE with README
├── MCP Servers (15 lines) ................. KEEP
├── Project Skills (20 lines) .............. KEEP
├── Testing (180 lines) .................... CONDENSE → 40 lines
├── Conventions (35 lines) ................. KEEP
├── Data Model (25 lines) .................. KEEP
├── Notes for Claude Code (15 lines) ....... KEEP
└── Completed Work Sessions (400 lines) .... ARCHIVE

Recommendations:
1. ARCHIVE "Completed Work Sessions" → Save 380 lines (95%)
2. CONDENSE "CCM v3.0 Description" → Save 120 lines (80%)
3. CONDENSE "Testing" → Save 140 lines (78%)
4. DEDUPE "Commands" with README → Save 35 lines (88%)

Total Savings: 675 lines (90%) / ~16,875 tokens
Projected Size: 73 lines / ~1,825 tokens
```
