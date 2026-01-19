# CCM v3.0: Unified Implementation Plan
## Smart Recommendations System

**Created:** January 18, 2026
**Status:** Ready to Implement
**Core Principle:** Learn from behavior, recommend what you need

---

## Executive Summary

CCM v3.0 transforms from a configuration manager into an **intelligent optimization platform**. The system:

1. **Tracks** your Claude Code usage across all projects
2. **Analyzes** patterns to understand your workflow
3. **Recommends** MCP servers and skills you actually need
4. **Applies** optimizations with one click
5. **Learns** from your feedback to improve recommendations

**Key Metric:** Achieve 50-80% token reduction through intelligent configuration optimization.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    CCM v3.0 Architecture                   │
└────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Data Collection (CLI Hook)                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Tracks every Claude Code session                         │
│  • Logs: tools, commands, files, tokens, errors             │
│  • Sends to CCM server API after session ends               │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Intelligence Engine (Server)                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Technology Detection   (PostgreSQL, n8n, Docker, etc.)   │
│  • Pattern Recognition    (ssh+psql, git workflow, etc.)    │
│  • Cross-Project Analysis (aggregate all projects)          │
│  • Recommendation Engine  (MCP servers, skills, context)    │
│  • Confidence Scoring     (0.0 to 1.0)                      │
│  • Impact Estimation      (tokens saved, time saved)        │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: User Interface (Web + CLI)                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Recommendations Dashboard (Web UI)                       │
│  • Apply/Dismiss Actions     (One-click)                    │
│  • Impact Tracking           (Before/after metrics)         │
│  • CLI Commands              (ccm recommendations)          │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Actions & Feedback (Automated)                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Apply MCP server to .mcp.json                            │
│  • Create skill from template                               │
│  • Split CLAUDE.md into contexts                            │
│  • Track usage of recommendations (learning loop)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

```prisma
// ============================================================================
// CCM v3.0 - Smart Recommendations System
// ============================================================================

// Session activity tracking
model SessionActivity {
  id              String   @id @default(cuid())
  machineId       String
  projectId       String?
  sessionId       String   // Unique per Claude Code session

  // Basic metadata
  projectPath     String?
  duration        Int      // Seconds
  timestamp       DateTime @default(now())

  // Tools used (JSON array)
  toolsUsed       String   // ["Read", "Bash", "Edit", "Grep", ...]

  // Commands executed (JSON array)
  commandsRun     String   // ["git status", "psql -h ...", ...]

  // Files accessed (JSON array)
  filesAccessed   String   // ["/path/to/file1.ts", "/path/to/file2.sql", ...]

  // Errors encountered (JSON array)
  errors          String   // ["ENOENT", "Connection refused", ...]

  // Token usage
  startupTokens   Int      // Tokens at session start
  totalTokens     Int      // Total tokens used
  toolTokens      Int      // Tokens from tool use
  contextTokens   Int      // Tokens from context

  // Detected technologies (JSON array)
  detectedTechs   String   // ["postgresql", "n8n", "docker", "nextjs", ...]

  // Patterns detected (JSON array)
  detectedPatterns String  // ["ssh_database_query", "git_workflow", ...]

  machine Machine @relation(fields: [machineId], references: [id])

  @@index([machineId])
  @@index([projectId])
  @@index([timestamp])
  @@index([sessionId])
}

// Aggregated usage patterns (computed from SessionActivity)
model UsagePattern {
  id              String   @id @default(cuid())
  machineId       String
  patternType     String   // "ssh_database_query", "git_workflow", etc.

  // Occurrence statistics
  occurrences     Int      @default(0)
  lastSeen        DateTime
  firstSeen       DateTime
  avgFrequency    Float    // Occurrences per week

  // Context
  projectIds      String   // JSON array of project IDs where seen
  technologies    String   // JSON array of related technologies

  // Examples (for UI display)
  exampleCommand  String?
  exampleFiles    String?  // JSON array

  // Pattern confidence
  confidence      Float    @default(1.0) // 0.0 to 1.0

  machine Machine @relation(fields: [machineId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([machineId, patternType])
  @@index([machineId])
  @@index([occurrences])
  @@index([confidence])
}

// Smart recommendations
model Recommendation {
  id              String   @id @default(cuid())
  machineId       String
  type            String   // "mcp_server" or "skill"

  // What to recommend
  recommendedItem String   // Name of MCP server or skill
  category        String   // "database", "cicd", "automation", etc.

  // Why recommend (human-readable)
  title           String   // Short title
  reason          String   // Detailed explanation

  // Evidence
  detectedPatterns String  // JSON array of pattern types
  occurrenceCount Int      // How many times pattern seen
  projectsAffected String  // JSON array of project IDs
  exampleUsage    String?  // Example of the pattern

  // Impact estimation
  timeSavings     Int      // Seconds saved per use
  tokenSavings    Int      // Tokens saved per use
  dailySavings    Int      // Estimated daily savings
  monthlySavings  Int      // Estimated monthly savings

  // Confidence & priority
  confidenceScore Float    // 0.0 to 1.0
  priority        String   // "critical", "high", "medium", "low"

  // Status tracking
  status          String   @default("active") // "active", "applied", "dismissed", "archived"
  appliedAt       DateTime?
  dismissedAt     DateTime?
  dismissReason   String?  // Why user dismissed

  // Configuration to apply
  configTemplate  String?  // JSON config

  // Feedback (for learning)
  wasUseful       Boolean? // User feedback after applying
  actualSavings   Int?     // Measured savings after applying

  machine Machine @relation(fields: [machineId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([machineId, recommendedItem])
  @@index([machineId])
  @@index([status])
  @@index([priority])
  @@index([confidenceScore])
}

// Health score tracking
model HealthScore {
  id              String   @id @default(cuid())
  machineId       String

  // Overall score (0-100)
  totalScore      Int

  // Category scores (0-100)
  mcpScore        Int      // MCP server optimization
  skillScore      Int      // Skill utilization
  contextScore    Int      // Context efficiency
  patternScore    Int      // Pattern optimization

  // Metrics
  activeRecommendations  Int  // Open recommendations
  appliedRecommendations Int  // Applied recommendations
  estimatedDailyWaste    Int  // Tokens wasted per day
  estimatedDailySavings  Int  // Tokens saved per day (after optimizations)

  // Trend
  previousScore   Int?     // Score from last calculation
  trend           String   // "improving", "stable", "declining"

  timestamp       DateTime @default(now())
  machine         Machine  @relation(fields: [machineId], references: [id])

  @@index([machineId])
  @@index([timestamp])
}

// Impact tracking (measures actual results)
model ImpactMetric {
  id              String   @id @default(cuid())
  machineId       String
  recommendationId String?
  metricType      String   // "token_savings", "time_savings", "pattern_reduction"

  // Before/after comparison
  beforeValue     Int
  afterValue      Int
  improvement     Float    // Percentage improvement

  // Time period
  measurementStart DateTime
  measurementEnd   DateTime

  timestamp       DateTime @default(now())
  machine         Machine  @relation(fields: [machineId], references: [id])

  @@index([machineId])
  @@index([recommendationId])
  @@index([timestamp])
}

// Technology usage tracking
model TechnologyUsage {
  id              String   @id @default(cuid())
  machineId       String
  technology      String   // "postgresql", "docker", "n8n", etc.

  // Usage stats
  projectCount    Int      @default(0)  // Projects using this
  sessionCount    Int      @default(0)  // Sessions using this
  commandCount    Int      @default(0)  // Commands related to this
  lastUsed        DateTime?

  // Recommendations
  hasRecommendation Boolean @default(false)
  recommendationId  String?

  machine Machine @relation(fields: [machineId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([machineId, technology])
  @@index([machineId])
  @@index([sessionCount])
}
```

### Extended Machine Model

```prisma
model Machine {
  // ... existing fields ...

  // v3.0 Relationships
  sessionActivities  SessionActivity[]
  usagePatterns      UsagePattern[]
  recommendations    Recommendation[]
  healthScores       HealthScore[]
  impactMetrics      ImpactMetric[]
  technologyUsage    TechnologyUsage[]
}
```

---

## Implementation Phases

### **Phase 1: Data Collection Foundation** (Week 1)

#### Goals
- ✅ CLI can track session activity
- ✅ Data flows to CCM server
- ✅ Basic pattern detection works

#### Tasks

**1.1 Database Setup**
```bash
# Add new schema to Prisma
cd packages/server
# Edit prisma/schema.prisma (add v3.0 models)
pnpm db:push
```

**Files to create:**
- `packages/server/prisma/schema.prisma` (update with v3.0 models)
- `packages/server/prisma/migrations/` (new migration)

**1.2 CLI Session Tracking Hook**

Create hook that runs at session end:

**File:** `packages/cli/src/hooks/session-tracker.ts`
```typescript
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

interface SessionData {
  sessionId: string;
  startTime: number;
  endTime: number;
  toolsUsed: string[];
  commandsRun: string[];
  filesAccessed: string[];
  errors: string[];
  startupTokens: number;
  totalTokens: number;
}

export async function trackSession() {
  try {
    // Read Claude Code session log (if available)
    const sessionLogPath = join(homedir(), '.claude', 'session.log');
    const sessionLog = await readFile(sessionLogPath, 'utf-8');
    const sessionData = parseSessionLog(sessionLog);

    // Get machine ID
    const config = await getConfig();
    const machineId = config.machineId;

    // Get project context
    const projectPath = process.cwd();
    const projectId = await getProjectId(projectPath);

    // Detect technologies
    const detectedTechs = detectTechnologies(sessionData);

    // Detect patterns
    const detectedPatterns = detectPatterns(sessionData);

    // Send to CCM server
    await fetch(`${config.serverUrl}/api/sessions/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machineId,
        projectId,
        projectPath,
        sessionId: sessionData.sessionId,
        duration: (sessionData.endTime - sessionData.startTime) / 1000,
        toolsUsed: sessionData.toolsUsed,
        commandsRun: sessionData.commandsRun,
        filesAccessed: sessionData.filesAccessed,
        errors: sessionData.errors,
        startupTokens: sessionData.startupTokens,
        totalTokens: sessionData.totalTokens,
        detectedTechs,
        detectedPatterns,
        timestamp: new Date().toISOString()
      })
    });

    console.log('✅ Session tracked');
  } catch (error) {
    // Silent fail - don't break user workflow
    console.error('Session tracking failed:', error);
  }
}

function parseSessionLog(log: string): SessionData {
  // Parse Claude Code session log
  // Extract tools used, commands, files, tokens, etc.
  // This will need to be implemented based on actual log format
  return {
    sessionId: generateSessionId(),
    startTime: Date.now() - 3600000, // 1 hour ago (example)
    endTime: Date.now(),
    toolsUsed: [],
    commandsRun: [],
    filesAccessed: [],
    errors: [],
    startupTokens: 0,
    totalTokens: 0
  };
}

function detectTechnologies(session: SessionData): string[] {
  const techs = new Set<string>();

  // Check commands
  for (const cmd of session.commandsRun) {
    if (cmd.includes('psql')) techs.add('postgresql');
    if (cmd.includes('docker')) techs.add('docker');
    if (cmd.includes('git')) techs.add('git');
    // ... more detection
  }

  // Check files
  for (const file of session.filesAccessed) {
    if (file.endsWith('.sql')) techs.add('sql');
    if (file.includes('package.json')) techs.add('nodejs');
    if (file.includes('docker-compose')) techs.add('docker');
    // ... more detection
  }

  return Array.from(techs);
}

function detectPatterns(session: SessionData): string[] {
  const patterns: string[] = [];

  // SSH + database pattern
  const hasSsh = session.commandsRun.some(c => c.includes('ssh'));
  const hasDb = session.commandsRun.some(c =>
    c.includes('psql') || c.includes('mysql')
  );
  if (hasSsh && hasDb) patterns.push('ssh_database_query');

  // Git workflow pattern
  const gitCommands = session.commandsRun.filter(c => c.startsWith('git'));
  if (gitCommands.length >= 3) patterns.push('git_workflow');

  // ... more pattern detection

  return patterns;
}
```

**File:** `packages/cli/src/commands/track.ts`
```typescript
import { Command } from 'commander';
import { trackSession } from '../hooks/session-tracker';

export const trackCommand = new Command('track')
  .description('Track current session (usually automatic)')
  .action(async () => {
    await trackSession();
  });
```

**1.3 Server API Endpoint**

**File:** `packages/server/src/app/api/sessions/track/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      machineId,
      projectId,
      projectPath,
      sessionId,
      duration,
      toolsUsed,
      commandsRun,
      filesAccessed,
      errors,
      startupTokens,
      totalTokens,
      toolTokens,
      contextTokens,
      detectedTechs,
      detectedPatterns,
      timestamp
    } = body;

    // Save session activity
    await prisma.sessionActivity.create({
      data: {
        machineId,
        projectId,
        sessionId,
        projectPath,
        duration,
        toolsUsed: JSON.stringify(toolsUsed),
        commandsRun: JSON.stringify(commandsRun),
        filesAccessed: JSON.stringify(filesAccessed),
        errors: JSON.stringify(errors),
        startupTokens,
        totalTokens,
        toolTokens: toolTokens || 0,
        contextTokens: contextTokens || 0,
        detectedTechs: JSON.stringify(detectedTechs),
        detectedPatterns: JSON.stringify(detectedPatterns),
        timestamp: new Date(timestamp)
      }
    });

    // Update or create usage patterns
    for (const pattern of detectedPatterns) {
      await prisma.usagePattern.upsert({
        where: {
          machineId_patternType: { machineId, patternType: pattern }
        },
        update: {
          occurrences: { increment: 1 },
          lastSeen: new Date(timestamp)
        },
        create: {
          machineId,
          patternType: pattern,
          occurrences: 1,
          lastSeen: new Date(timestamp),
          firstSeen: new Date(timestamp),
          avgFrequency: 0,
          projectIds: JSON.stringify(projectId ? [projectId] : []),
          technologies: JSON.stringify(detectedTechs),
          confidence: 1.0
        }
      });
    }

    // Update technology usage
    for (const tech of detectedTechs) {
      await prisma.technologyUsage.upsert({
        where: {
          machineId_technology: { machineId, technology: tech }
        },
        update: {
          sessionCount: { increment: 1 },
          lastUsed: new Date(timestamp)
        },
        create: {
          machineId,
          technology: tech,
          projectCount: 1,
          sessionCount: 1,
          commandCount: 0,
          lastUsed: new Date(timestamp)
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track session' },
      { status: 500 }
    );
  }
}
```

**1.4 Testing**

```bash
# Test data collection
cd packages/cli
pnpm build

# Simulate a session
node dist/index.js track

# Verify data in database
cd ../server
pnpm db:studio
# Check SessionActivity table
```

---

### **Phase 2: Intelligence Engine** (Week 2)

#### Goals
- ✅ Pattern detection engine works
- ✅ Cross-project analysis aggregates data
- ✅ Recommendation generation creates smart suggestions

#### Tasks

**2.1 Pattern Detection Engine**

**File:** `packages/server/src/lib/recommendations/pattern-detector.ts`
```typescript
import { SessionActivity } from '@prisma/client';

export interface DetectedPattern {
  type: string;
  occurrences: number;
  examples: string[];
  technologies: string[];
  confidence: number;
}

export function detectPatterns(
  sessions: SessionActivity[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // SSH + Database Query Pattern
  const sshDbSessions = sessions.filter(s => {
    const commands = JSON.parse(s.commandsRun) as string[];
    return commands.some(c =>
      c.includes('ssh') && (c.includes('psql') || c.includes('mysql'))
    );
  });

  if (sshDbSessions.length >= 5) {
    patterns.push({
      type: 'ssh_database_query',
      occurrences: sshDbSessions.length,
      examples: sshDbSessions
        .slice(0, 3)
        .map(s => JSON.parse(s.commandsRun)[0]),
      technologies: ['postgresql', 'ssh'],
      confidence: Math.min(sshDbSessions.length / 20, 1.0)
    });
  }

  // Git Workflow Pattern
  const gitWorkflowSessions = sessions.filter(s => {
    const commands = JSON.parse(s.commandsRun) as string[];
    const gitCommands = commands.filter(c => c.startsWith('git'));
    return gitCommands.length >= 3;
  });

  if (gitWorkflowSessions.length >= 5) {
    patterns.push({
      type: 'git_workflow',
      occurrences: gitWorkflowSessions.length,
      examples: ['git add . && git commit && git push'],
      technologies: ['git'],
      confidence: Math.min(gitWorkflowSessions.length / 15, 1.0)
    });
  }

  // n8n Workflow Management Pattern
  const n8nSessions = sessions.filter(s => {
    const commands = JSON.parse(s.commandsRun) as string[];
    const techs = JSON.parse(s.detectedTechs) as string[];
    return techs.includes('n8n') ||
           commands.some(c => c.includes('curl') && c.includes('workflow'));
  });

  if (n8nSessions.length >= 5) {
    patterns.push({
      type: 'n8n_workflow_management',
      occurrences: n8nSessions.length,
      examples: ['curl n8n/api/workflows'],
      technologies: ['n8n'],
      confidence: Math.min(n8nSessions.length / 10, 1.0)
    });
  }

  // Docker Management Pattern
  const dockerSessions = sessions.filter(s => {
    const commands = JSON.parse(s.commandsRun) as string[];
    return commands.some(c =>
      c.includes('docker ps') ||
      c.includes('docker logs') ||
      c.includes('docker restart')
    );
  });

  if (dockerSessions.length >= 5) {
    patterns.push({
      type: 'docker_management',
      occurrences: dockerSessions.length,
      examples: ['docker ps', 'docker logs container'],
      technologies: ['docker'],
      confidence: Math.min(dockerSessions.length / 10, 1.0)
    });
  }

  // Service Health Check Pattern
  const healthCheckSessions = sessions.filter(s => {
    const commands = JSON.parse(s.commandsRun) as string[];
    return commands.some(c =>
      c.includes('systemctl status') ||
      c.includes('curl') && c.includes('health')
    );
  });

  if (healthCheckSessions.length >= 5) {
    patterns.push({
      type: 'service_health_check',
      occurrences: healthCheckSessions.length,
      examples: ['systemctl status nginx', 'curl /health'],
      technologies: [],
      confidence: Math.min(healthCheckSessions.length / 10, 1.0)
    });
  }

  // File Search Pattern
  const fileSearchSessions = sessions.filter(s => {
    const tools = JSON.parse(s.toolsUsed) as string[];
    const globCount = tools.filter(t => t === 'Glob').length;
    const grepCount = tools.filter(t => t === 'Grep').length;
    return (globCount + grepCount) >= 5;
  });

  if (fileSearchSessions.length >= 3) {
    patterns.push({
      type: 'frequent_file_search',
      occurrences: fileSearchSessions.length,
      examples: ['Frequent Glob and Grep usage'],
      technologies: [],
      confidence: Math.min(fileSearchSessions.length / 5, 1.0)
    });
  }

  return patterns;
}
```

**2.2 Cross-Project Analyzer**

**File:** `packages/server/src/lib/recommendations/cross-project-analyzer.ts`
```typescript
import { prisma } from '@/lib/db';
import { detectPatterns } from './pattern-detector';

export interface CrossProjectAnalysis {
  technologies: string[];
  patterns: DetectedPattern[];
  projectCount: number;
  sessionCount: number;
  techByProject: Record<string, string[]>;
  projectPatterns: Record<string, string[]>;
  avgSessionDuration: number;
  totalTokensUsed: number;
}

export async function analyzeCrossProject(
  machineId: string,
  daysBack: number = 30
): Promise<CrossProjectAnalysis> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // Get all sessions from specified period
  const sessions = await prisma.sessionActivity.findMany({
    where: {
      machineId,
      timestamp: { gte: cutoffDate }
    },
    orderBy: { timestamp: 'desc' }
  });

  // Detect technologies across all projects
  const allTechs = new Set<string>();
  const techByProject = new Map<string, Set<string>>();

  for (const session of sessions) {
    const techs = JSON.parse(session.detectedTechs) as string[];
    techs.forEach(t => allTechs.add(t));

    if (session.projectId) {
      if (!techByProject.has(session.projectId)) {
        techByProject.set(session.projectId, new Set());
      }
      techs.forEach(t => techByProject.get(session.projectId)!.add(t));
    }
  }

  // Detect patterns across all sessions
  const patterns = detectPatterns(sessions);

  // Aggregate patterns by project
  const projectPatterns = new Map<string, Set<string>>();
  for (const session of sessions) {
    if (!session.projectId) continue;

    const sessionPatterns = JSON.parse(session.detectedPatterns) as string[];
    if (!projectPatterns.has(session.projectId)) {
      projectPatterns.set(session.projectId, new Set());
    }
    sessionPatterns.forEach(p =>
      projectPatterns.get(session.projectId)!.add(p)
    );
  }

  // Calculate statistics
  const avgSessionDuration = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
    : 0;

  const totalTokensUsed = sessions.reduce((sum, s) => sum + s.totalTokens, 0);

  return {
    technologies: Array.from(allTechs),
    patterns,
    projectCount: techByProject.size,
    sessionCount: sessions.length,
    techByProject: Object.fromEntries(
      Array.from(techByProject.entries()).map(([k, v]) => [k, Array.from(v)])
    ),
    projectPatterns: Object.fromEntries(
      Array.from(projectPatterns.entries()).map(([k, v]) => [k, Array.from(v)])
    ),
    avgSessionDuration,
    totalTokensUsed
  };
}
```

**2.3 Recommendation Engine (MCP Servers)**

**File:** `packages/server/src/lib/recommendations/mcp-recommender.ts`
```typescript
import { prisma } from '@/lib/db';
import { analyzeCrossProject } from './cross-project-analyzer';

interface RecommendationInput {
  type: 'mcp_server' | 'skill';
  recommendedItem: string;
  category: string;
  title: string;
  reason: string;
  detectedPatterns: string[];
  occurrenceCount: number;
  projectsAffected: string[];
  exampleUsage?: string;
  timeSavings: number;
  tokenSavings: number;
  confidenceScore: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  configTemplate?: any;
}

export async function generateMcpRecommendations(
  machineId: string
): Promise<RecommendationInput[]> {
  const analysis = await analyzeCrossProject(machineId);
  const recommendations: RecommendationInput[] = [];

  // PostgreSQL MCP
  if (analysis.technologies.includes('postgresql')) {
    const dbPattern = analysis.patterns.find(p =>
      p.type === 'ssh_database_query'
    );

    if (dbPattern && dbPattern.occurrences >= 10) {
      const projectsUsingPostgres = Object.entries(analysis.techByProject)
        .filter(([_, techs]) => techs.includes('postgresql'))
        .map(([projectId]) => projectId);

      recommendations.push({
        type: 'mcp_server',
        recommendedItem: 'PostgreSQL MCP',
        category: 'database',
        title: 'Enable Direct PostgreSQL Access',
        reason: `You query PostgreSQL ${dbPattern.occurrences} times in 30 days via SSH. PostgreSQL MCP provides direct database access without SSH overhead, saving ~100 tokens per query.`,
        detectedPatterns: ['ssh_database_query', 'postgresql'],
        occurrenceCount: dbPattern.occurrences,
        projectsAffected: projectsUsingPostgres,
        exampleUsage: dbPattern.examples[0],
        timeSavings: 30,
        tokenSavings: 100,
        confidenceScore: dbPattern.confidence,
        priority: dbPattern.occurrences >= 20 ? 'critical' : 'high',
        configTemplate: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-postgres'],
          env: {
            POSTGRES_CONNECTION_STRING: 'postgresql://postgres:password@192.168.1.2:5432/database'
          }
        }
      });
    }
  }

  // GitHub MCP
  if (analysis.technologies.includes('git')) {
    const gitPattern = analysis.patterns.find(p => p.type === 'git_workflow');

    if (gitPattern && gitPattern.occurrences >= 10) {
      recommendations.push({
        type: 'mcp_server',
        recommendedItem: 'GitHub MCP',
        category: 'cicd',
        title: 'Improve Git Workflow Management',
        reason: `You use git commands ${gitPattern.occurrences} times. GitHub MCP provides better PR management, issue tracking, and reduces token overhead for git operations.`,
        detectedPatterns: ['git_workflow'],
        occurrenceCount: gitPattern.occurrences,
        projectsAffected: [],
        timeSavings: 20,
        tokenSavings: 50,
        confidenceScore: gitPattern.confidence * 0.9,
        priority: 'medium',
        configTemplate: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: '<YOUR_TOKEN>'
          }
        }
      });
    }
  }

  // n8n MCP
  if (analysis.technologies.includes('n8n')) {
    const n8nPattern = analysis.patterns.find(p =>
      p.type === 'n8n_workflow_management'
    );

    if (n8nPattern && n8nPattern.occurrences >= 5) {
      recommendations.push({
        type: 'mcp_server',
        recommendedItem: 'n8n MCP',
        category: 'automation',
        title: 'Direct n8n Workflow Management',
        reason: `You manage n8n workflows ${n8nPattern.occurrences} times. n8n MCP provides direct API access, eliminating curl commands and saving significant tokens.`,
        detectedPatterns: ['n8n_workflow_management'],
        occurrenceCount: n8nPattern.occurrences,
        projectsAffected: [],
        timeSavings: 40,
        tokenSavings: 120,
        confidenceScore: n8nPattern.confidence,
        priority: 'high',
        configTemplate: {
          url: 'https://homelab.bream-python.ts.net/n8n/mcp-server/http',
          type: 'streamable-http'
        }
      });
    }
  }

  // Docker MCP
  if (analysis.technologies.includes('docker')) {
    const dockerPattern = analysis.patterns.find(p =>
      p.type === 'docker_management'
    );

    if (dockerPattern && dockerPattern.occurrences >= 5) {
      const projectsUsingDocker = Object.entries(analysis.techByProject)
        .filter(([_, techs]) => techs.includes('docker'))
        .map(([projectId]) => projectId);

      recommendations.push({
        type: 'mcp_server',
        recommendedItem: 'Docker MCP',
        category: 'infrastructure',
        title: 'Streamline Container Management',
        reason: `You manage Docker containers ${dockerPattern.occurrences} times across ${projectsUsingDocker.length} projects. Docker MCP simplifies container operations.`,
        detectedPatterns: ['docker_management'],
        occurrenceCount: dockerPattern.occurrences,
        projectsAffected: projectsUsingDocker,
        timeSavings: 15,
        tokenSavings: 40,
        confidenceScore: dockerPattern.confidence * 0.85,
        priority: 'medium',
        configTemplate: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-docker']
        }
      });
    }
  }

  return recommendations;
}
```

**2.4 Recommendation Engine (Skills)**

**File:** `packages/server/src/lib/recommendations/skill-recommender.ts`
```typescript
import { analyzeCrossProject } from './cross-project-analyzer';

export async function generateSkillRecommendations(
  machineId: string
): Promise<RecommendationInput[]> {
  const analysis = await analyzeCrossProject(machineId);
  const recommendations: RecommendationInput[] = [];

  // Database Query Skill
  const dbPattern = analysis.patterns.find(p =>
    p.type === 'ssh_database_query'
  );

  if (dbPattern && dbPattern.occurrences >= 10) {
    const dailyOccurrences = dbPattern.occurrences / 30;
    const dailySavings = Math.round(dailyOccurrences * 150);
    const monthlySavings = dailySavings * 30;

    recommendations.push({
      type: 'skill',
      recommendedItem: 'homelab-database-query',
      category: 'database',
      title: 'One-Command Database Queries',
      reason: `You query databases ${dbPattern.occurrences} times in 30 days. Create a skill to query with one command instead of SSH + psql workflow.`,
      detectedPatterns: ['ssh_database_query'],
      occurrenceCount: dbPattern.occurrences,
      projectsAffected: [],
      exampleUsage: dbPattern.examples[0],
      timeSavings: 60,
      tokenSavings: 150,
      confidenceScore: dbPattern.confidence,
      priority: 'critical',
      configTemplate: {
        skillTemplate: 'database-query',
        databases: ['my_business_operations', 'ai_life_agent'],
        host: '192.168.1.2'
      }
    });
  }

  // n8n Workflow Status Skill
  const n8nPattern = analysis.patterns.find(p =>
    p.type === 'n8n_workflow_management'
  );

  if (n8nPattern && n8nPattern.occurrences >= 10) {
    const dailyOccurrences = n8nPattern.occurrences / 30;
    const dailySavings = Math.round(dailyOccurrences * 130);

    recommendations.push({
      type: 'skill',
      recommendedItem: 'n8n-workflow-status',
      category: 'automation',
      title: 'Instant n8n Workflow Overview',
      reason: `You check n8n workflows ${n8nPattern.occurrences} times. A skill provides instant status with one command.`,
      detectedPatterns: ['n8n_workflow_management'],
      occurrenceCount: n8nPattern.occurrences,
      projectsAffected: [],
      timeSavings: 50,
      tokenSavings: 130,
      confidenceScore: n8nPattern.confidence,
      priority: 'high',
      configTemplate: {
        skillTemplate: 'n8n-status',
        workflows: ['email-classifier', 'lead-enrichment']
      }
    });
  }

  // Service Health Check Skill
  const healthPattern = analysis.patterns.find(p =>
    p.type === 'service_health_check'
  );

  if (healthPattern && healthPattern.occurrences >= 8) {
    recommendations.push({
      type: 'skill',
      recommendedItem: 'homelab-service-health',
      category: 'monitoring',
      title: 'Quick Service Health Checks',
      reason: `You check service status ${healthPattern.occurrences} times. A health check skill provides instant overview.`,
      detectedPatterns: ['service_health_check'],
      occurrenceCount: healthPattern.occurrences,
      projectsAffected: [],
      timeSavings: 45,
      tokenSavings: 120,
      confidenceScore: healthPattern.confidence * 0.9,
      priority: 'medium',
      configTemplate: {
        skillTemplate: 'health-check',
        services: ['n8n', 'postgresql', 'docker', 'vaultwarden']
      }
    });
  }

  // Git Workflow Skill
  const gitPattern = analysis.patterns.find(p =>
    p.type === 'git_workflow'
  );

  if (gitPattern && gitPattern.occurrences >= 15) {
    recommendations.push({
      type: 'skill',
      recommendedItem: 'git-smart-commit',
      category: 'cicd',
      title: 'Automated Git Workflows',
      reason: `You run git workflows ${gitPattern.occurrences} times. A skill can automate commit, push, and PR creation.`,
      detectedPatterns: ['git_workflow'],
      occurrenceCount: gitPattern.occurrences,
      projectsAffected: [],
      timeSavings: 35,
      tokenSavings: 90,
      confidenceScore: gitPattern.confidence * 0.85,
      priority: 'medium',
      configTemplate: {
        skillTemplate: 'git-workflow',
        features: ['auto-commit', 'pr-creation']
      }
    });
  }

  return recommendations;
}
```

**2.5 Recommendation Generator API**

**File:** `packages/server/src/app/api/recommendations/generate/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateMcpRecommendations } from '@/lib/recommendations/mcp-recommender';
import { generateSkillRecommendations } from '@/lib/recommendations/skill-recommender';

export async function POST(request: NextRequest) {
  try {
    const { machineId } = await request.json();

    // Generate recommendations
    const mcpRecs = await generateMcpRecommendations(machineId);
    const skillRecs = await generateSkillRecommendations(machineId);
    const allRecs = [...mcpRecs, ...skillRecs];

    // Calculate daily/monthly savings
    for (const rec of allRecs) {
      const dailyOccurrences = rec.occurrenceCount / 30;
      rec.dailySavings = Math.round(dailyOccurrences * rec.tokenSavings);
      rec.monthlySavings = rec.dailySavings * 30;
    }

    // Save to database (upsert)
    for (const rec of allRecs) {
      await prisma.recommendation.upsert({
        where: {
          machineId_recommendedItem: {
            machineId,
            recommendedItem: rec.recommendedItem
          }
        },
        update: {
          occurrenceCount: rec.occurrenceCount,
          confidenceScore: rec.confidenceScore,
          priority: rec.priority,
          detectedPatterns: JSON.stringify(rec.detectedPatterns),
          projectsAffected: JSON.stringify(rec.projectsAffected),
          updatedAt: new Date()
        },
        create: {
          machineId,
          type: rec.type,
          recommendedItem: rec.recommendedItem,
          category: rec.category,
          title: rec.title,
          reason: rec.reason,
          detectedPatterns: JSON.stringify(rec.detectedPatterns),
          occurrenceCount: rec.occurrenceCount,
          projectsAffected: JSON.stringify(rec.projectsAffected),
          exampleUsage: rec.exampleUsage,
          timeSavings: rec.timeSavings,
          tokenSavings: rec.tokenSavings,
          dailySavings: rec.dailySavings || 0,
          monthlySavings: rec.monthlySavings || 0,
          confidenceScore: rec.confidenceScore,
          priority: rec.priority,
          status: 'active',
          configTemplate: rec.configTemplate
            ? JSON.stringify(rec.configTemplate)
            : null
        }
      });
    }

    return NextResponse.json({
      success: true,
      count: allRecs.length,
      recommendations: allRecs
    });
  } catch (error) {
    console.error('Recommendation generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
```

**2.6 Testing**

```bash
# Generate recommendations
curl -X POST http://localhost:3000/api/recommendations/generate \
  -H 'Content-Type: application/json' \
  -d '{"machineId":"your-machine-id"}'

# View in database
pnpm --filter server db:studio
# Check Recommendation table
```

---

### **Phase 3: UI & Visualization** (Week 3)

#### Goals
- ✅ Recommendations dashboard is functional
- ✅ Users can apply/dismiss recommendations
- ✅ Impact is visualized

#### Tasks

**3.1 Recommendations Dashboard**

**File:** `packages/server/src/app/recommendations/page.tsx`
```typescript
import { Suspense } from 'react';
import { prisma } from '@/lib/db';
import { RecommendationCard } from '@/components/recommendations/RecommendationCard';
import { RecommendationsStats } from '@/components/recommendations/RecommendationsStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import Link from 'next/link';

async function getRecommendations(machineId: string) {
  return await prisma.recommendation.findMany({
    where: {
      machineId,
      status: 'active'
    },
    orderBy: [
      { priority: 'desc' },
      { confidenceScore: 'desc' }
    ]
  });
}

async function getStats(machineId: string, recommendations: any[]) {
  const totalSavings = recommendations.reduce(
    (sum, r) => sum + (r.dailySavings || 0),
    0
  );

  const highPriority = recommendations.filter(
    r => r.priority === 'critical' || r.priority === 'high'
  ).length;

  const projectsSet = new Set(
    recommendations.flatMap(r => JSON.parse(r.projectsAffected || '[]'))
  );

  return {
    total: recommendations.length,
    highPriority,
    dailySavings: totalSavings,
    monthlySavings: totalSavings * 30,
    projectsAffected: projectsSet.size
  };
}

export default async function RecommendationsPage() {
  // Get current machine ID (from session or config)
  const machineId = 'current-machine-id'; // TODO: Get from session

  const recommendations = await getRecommendations(machineId);
  const stats = await getStats(machineId, recommendations);

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Smart Recommendations</h1>
          <p className="text-muted-foreground">
            AI-powered suggestions based on your usage patterns
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/recommendations/history">
              View History
            </Link>
          </Button>
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <RecommendationsStats stats={stats} />

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>No Recommendations Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We need at least 1-2 weeks of usage data to generate meaningful
              recommendations. Keep using Claude Code, and we'll analyze your
              patterns to suggest optimizations.
            </p>
            <Button>Learn More</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {recommendations.map(rec => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**3.2 Recommendation Card Component**

**File:** `packages/server/src/components/recommendations/RecommendationCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Server,
  Zap,
  Clock,
  Sparkles,
  Activity,
  Check,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface RecommendationCardProps {
  recommendation: any;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  const typeIcon = recommendation.type === 'mcp_server' ? (
    <Server className="h-5 w-5" />
  ) : (
    <Zap className="h-5 w-5" />
  );

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const response = await fetch(
        `/api/recommendations/${recommendation.id}/apply`,
        { method: 'POST' }
      );

      if (response.ok) {
        // Show success message
        alert('Recommendation applied successfully!');
        // Reload page
        window.location.reload();
      } else {
        alert('Failed to apply recommendation');
      }
    } catch (error) {
      alert('Error applying recommendation');
    } finally {
      setIsApplying(false);
    }
  };

  const handleDismiss = async () => {
    if (!confirm('Are you sure you want to dismiss this recommendation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/recommendations/${recommendation.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      alert('Error dismissing recommendation');
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {typeIcon}
            </div>
            <div>
              <CardTitle className="text-xl">
                {recommendation.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground capitalize">
                {recommendation.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={priorityColors[recommendation.priority]}>
              {recommendation.priority}
            </Badge>
            <Badge variant="outline">
              {Math.round(recommendation.confidenceScore * 100)}% confident
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Reason */}
        <p className="text-base mb-4">{recommendation.reason}</p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {recommendation.timeSavings}s
              </p>
              <p className="text-xs text-muted-foreground">per use</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {recommendation.tokenSavings}
              </p>
              <p className="text-xs text-muted-foreground">tokens/use</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {recommendation.occurrenceCount}x
              </p>
              <p className="text-xs text-muted-foreground">in 30 days</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-600">
                {recommendation.dailySavings}
              </p>
              <p className="text-xs text-muted-foreground">daily savings</p>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Detected Patterns</h4>
            <ul className="list-disc list-inside space-y-1 mb-3">
              {JSON.parse(recommendation.detectedPatterns).map(
                (pattern: string) => (
                  <li key={pattern} className="text-sm">
                    {pattern.replace(/_/g, ' ')}
                  </li>
                )
              )}
            </ul>

            {recommendation.exampleUsage && (
              <>
                <h4 className="font-semibold mb-2">Example Usage</h4>
                <code className="block text-sm bg-background p-2 rounded mb-3">
                  {recommendation.exampleUsage}
                </code>
              </>
            )}

            {recommendation.projectsAffected &&
              JSON.parse(recommendation.projectsAffected).length > 0 && (
                <>
                  <h4 className="font-semibold mb-2">Affected Projects</h4>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(recommendation.projectsAffected).map(
                      (projectId: string) => (
                        <Badge key={projectId} variant="secondary">
                          {projectId}
                        </Badge>
                      )
                    )}
                  </div>
                </>
              )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            {isApplying ? 'Applying...' : 'Apply Recommendation'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <Button variant="ghost" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**3.3 Stats Component**

**File:** `packages/server/src/components/recommendations/RecommendationsStats.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertTriangle, Sparkles, FolderOpen } from 'lucide-react';

interface StatsProps {
  stats: {
    total: number;
    highPriority: number;
    dailySavings: number;
    monthlySavings: number;
    projectsAffected: number;
  };
}

export function RecommendationsStats({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Recommendations
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.highPriority} high priority
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Savings</CardTitle>
          <Sparkles className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.dailySavings.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">tokens per day</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Monthly Savings
          </CardTitle>
          <Sparkles className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.monthlySavings.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">tokens per month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Projects Affected
          </CardTitle>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.projectsAffected}</div>
          <p className="text-xs text-muted-foreground">across workspace</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**3.4 Apply/Dismiss Actions**

**File:** `packages/server/src/app/api/recommendations/[id]/apply/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: params.id }
    });

    if (!recommendation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Apply based on type
    if (recommendation.type === 'mcp_server') {
      // Add MCP server to machine config
      // This would sync to .mcp.json on next CLI sync
      // TODO: Implement MCP server addition
    } else if (recommendation.type === 'skill') {
      // Create skill from template
      // This would sync to .claude/skills/ on next CLI sync
      // TODO: Implement skill creation
    }

    // Mark as applied
    await prisma.recommendation.update({
      where: { id: params.id },
      data: {
        status: 'applied',
        appliedAt: new Date()
      }
    });

    // Track impact (start measuring)
    await prisma.impactMetric.create({
      data: {
        machineId: recommendation.machineId,
        recommendationId: recommendation.id,
        metricType: 'token_savings',
        beforeValue: 0, // Will be calculated from historical data
        afterValue: 0, // Will be measured going forward
        improvement: 0,
        measurementStart: new Date(),
        measurementEnd: new Date() // Will be updated later
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Apply recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to apply recommendation' },
      { status: 500 }
    );
  }
}
```

**File:** `packages/server/src/app/api/recommendations/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Dismiss recommendation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.recommendation.update({
      where: { id: params.id },
      data: {
        status: 'dismissed',
        dismissedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to dismiss recommendation' },
      { status: 500 }
    );
  }
}
```

---

### **Phase 4: CLI Integration** (Week 4)

#### Goals
- ✅ CLI commands for recommendations
- ✅ Auto-tracking is seamless
- ✅ Apply recommendations from CLI

#### Tasks

**4.1 CLI Commands**

**File:** `packages/cli/src/commands/recommendations.ts`

```typescript
import { Command } from 'commander';
import { getConfig } from '../lib/config';
import { formatTable } from '../lib/format';

export const recommendationsCommand = new Command('recommendations')
  .alias('rec')
  .description('Manage smart recommendations')
  .addCommand(
    new Command('list')
      .description('List active recommendations')
      .option('--type <type>', 'Filter by type (mcp_server, skill)')
      .option('--priority <priority>', 'Filter by priority')
      .action(async (options) => {
        const config = await getConfig();
        const params = new URLSearchParams({
          machineId: config.machineId,
          status: 'active',
          ...(options.type && { type: options.type }),
          ...(options.priority && { priority: options.priority })
        });

        const response = await fetch(
          `${config.serverUrl}/api/recommendations?${params}`
        );
        const { recommendations } = await response.json();

        if (recommendations.length === 0) {
          console.log('No recommendations yet. Keep using Claude Code!');
          return;
        }

        console.log('\n🎯 Smart Recommendations\n');

        const table = recommendations.map((r: any) => ({
          Priority: r.priority.toUpperCase(),
          Type: r.type,
          Item: r.recommendedItem,
          'Daily Savings': `${r.dailySavings} tokens`,
          Confidence: `${Math.round(r.confidenceScore * 100)}%`
        }));

        console.log(formatTable(table));

        const totalSavings = recommendations.reduce(
          (sum: number, r: any) => sum + r.dailySavings,
          0
        );
        console.log(`\nTotal potential savings: ${totalSavings} tokens/day`);
        console.log('\nRun "ccm rec apply <id>" to apply a recommendation');
      })
  )
  .addCommand(
    new Command('show')
      .description('Show recommendation details')
      .argument('<id>', 'Recommendation ID')
      .action(async (id) => {
        const config = await getConfig();
        const response = await fetch(
          `${config.serverUrl}/api/recommendations/${id}`
        );
        const recommendation = await response.json();

        console.log('\n' + recommendation.title);
        console.log('='.repeat(recommendation.title.length) + '\n');
        console.log(recommendation.reason + '\n');
        console.log('Details:');
        console.log(`  Type: ${recommendation.type}`);
        console.log(`  Priority: ${recommendation.priority}`);
        console.log(`  Confidence: ${Math.round(recommendation.confidenceScore * 100)}%`);
        console.log(`  Occurrences: ${recommendation.occurrenceCount} times`);
        console.log(`  Daily savings: ${recommendation.dailySavings} tokens`);
        console.log(`  Time savings: ${recommendation.timeSavings}s per use`);
      })
  )
  .addCommand(
    new Command('apply')
      .description('Apply a recommendation')
      .argument('<id>', 'Recommendation ID')
      .action(async (id) => {
        const config = await getConfig();

        console.log('Applying recommendation...');

        const response = await fetch(
          `${config.serverUrl}/api/recommendations/${id}/apply`,
          { method: 'POST' }
        );

        if (response.ok) {
          console.log('✅ Recommendation applied successfully!');
          console.log('\nRun "ccm sync" to sync changes to your machine.');
        } else {
          console.error('❌ Failed to apply recommendation');
        }
      })
  )
  .addCommand(
    new Command('dismiss')
      .description('Dismiss a recommendation')
      .argument('<id>', 'Recommendation ID')
      .action(async (id) => {
        const config = await getConfig();

        const response = await fetch(
          `${config.serverUrl}/api/recommendations/${id}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          console.log('✅ Recommendation dismissed');
        } else {
          console.error('❌ Failed to dismiss recommendation');
        }
      })
  )
  .addCommand(
    new Command('analyze')
      .description('Analyze patterns and generate new recommendations')
      .action(async () => {
        const config = await getConfig();

        console.log('Analyzing usage patterns...');

        const response = await fetch(
          `${config.serverUrl}/api/recommendations/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ machineId: config.machineId })
          }
        );

        const { count } = await response.json();

        console.log(`✅ Generated ${count} recommendations`);
        console.log('\nRun "ccm rec list" to view them.');
      })
  );
```

**4.2 Auto-tracking Integration**

Add to CLI main entry point:

**File:** `packages/cli/src/index.ts`

```typescript
import { trackSession } from './hooks/session-tracker';

// ... existing code ...

// Add session tracking on exit
process.on('exit', () => {
  trackSession().catch(() => {
    // Silent fail
  });
});

// Also track on SIGINT/SIGTERM
process.on('SIGINT', async () => {
  await trackSession();
  process.exit();
});
```

---

### **Phase 5: Health Score & Analytics** (Week 5)

#### Goals
- ✅ Health score calculation works
- ✅ Dashboard shows health metrics
- ✅ Trend tracking over time

#### Tasks

**5.1 Health Score Calculator**

**File:** `packages/server/src/lib/health/calculator.ts`

```typescript
import { prisma } from '@/lib/db';

export async function calculateHealthScore(machineId: string) {
  // Get active recommendations
  const recommendations = await prisma.recommendation.findMany({
    where: { machineId, status: 'active' }
  });

  const appliedRecommendations = await prisma.recommendation.findMany({
    where: { machineId, status: 'applied' }
  });

  // MCP Score: How well optimized are MCP servers?
  const mcpRecs = recommendations.filter(r => r.type === 'mcp_server');
  const mcpApplied = appliedRecommendations.filter(r => r.type === 'mcp_server');
  const mcpScore = mcpRecs.length === 0
    ? 100
    : Math.round((mcpApplied.length / (mcpApplied.length + mcpRecs.length)) * 100);

  // Skill Score: How well utilized are skills?
  const skillRecs = recommendations.filter(r => r.type === 'skill');
  const skillApplied = appliedRecommendations.filter(r => r.type === 'skill');
  const skillScore = skillRecs.length === 0
    ? 100
    : Math.round((skillApplied.length / (skillApplied.length + skillRecs.length)) * 100);

  // Context Score: Based on estimated token usage
  // (Would need actual context size tracking)
  const contextScore = 75; // Placeholder

  // Pattern Score: How many patterns are optimized?
  const allPatterns = await prisma.usagePattern.findMany({
    where: { machineId }
  });
  const optimizedPatterns = allPatterns.filter(p => p.confidence > 0.8);
  const patternScore = allPatterns.length === 0
    ? 100
    : Math.round((optimizedPatterns.length / allPatterns.length) * 100);

  // Total Score (weighted average)
  const totalScore = Math.round(
    mcpScore * 0.35 +
    skillScore * 0.30 +
    contextScore * 0.20 +
    patternScore * 0.15
  );

  // Estimate daily waste
  const estimatedDailyWaste = recommendations.reduce(
    (sum, r) => sum + r.dailySavings,
    0
  );

  // Estimate daily savings (from applied recommendations)
  const estimatedDailySavings = appliedRecommendations.reduce(
    (sum, r) => sum + r.dailySavings,
    0
  );

  // Get previous score for trend
  const previousHealth = await prisma.healthScore.findFirst({
    where: { machineId },
    orderBy: { timestamp: 'desc' }
  });

  const trend =
    !previousHealth ? 'stable' :
    totalScore > previousHealth.totalScore + 5 ? 'improving' :
    totalScore < previousHealth.totalScore - 5 ? 'declining' :
    'stable';

  // Save new health score
  await prisma.healthScore.create({
    data: {
      machineId,
      totalScore,
      mcpScore,
      skillScore,
      contextScore,
      patternScore,
      activeRecommendations: recommendations.length,
      appliedRecommendations: appliedRecommendations.length,
      estimatedDailyWaste,
      estimatedDailySavings,
      previousScore: previousHealth?.totalScore,
      trend
    }
  });

  return {
    totalScore,
    mcpScore,
    skillScore,
    contextScore,
    patternScore,
    activeRecommendations: recommendations.length,
    appliedRecommendations: appliedRecommendations.length,
    estimatedDailyWaste,
    estimatedDailySavings,
    trend
  };
}
```

**5.2 Health Dashboard**

**File:** `packages/server/src/app/health/page.tsx`

```typescript
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

async function getHealthScore(machineId: string) {
  return await prisma.healthScore.findFirst({
    where: { machineId },
    orderBy: { timestamp: 'desc' }
  });
}

async function getHealthHistory(machineId: string) {
  return await prisma.healthScore.findMany({
    where: { machineId },
    orderBy: { timestamp: 'desc' },
    take: 30
  });
}

export default async function HealthPage() {
  const machineId = 'current-machine-id'; // TODO: Get from session

  const currentHealth = await getHealthScore(machineId);
  const history = await getHealthHistory(machineId);

  if (!currentHealth) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Health Score</h1>
        <Card>
          <CardContent className="pt-6">
            <p>No health data yet. Start using Claude Code to generate data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trendIcon =
    currentHealth.trend === 'improving' ? (
      <TrendingUp className="h-5 w-5 text-green-600" />
    ) : currentHealth.trend === 'declining' ? (
      <TrendingDown className="h-5 w-5 text-red-600" />
    ) : (
      <Minus className="h-5 w-5 text-muted-foreground" />
    );

  const scoreColor =
    currentHealth.totalScore >= 80 ? 'text-green-600' :
    currentHealth.totalScore >= 60 ? 'text-yellow-600' :
    'text-red-600';

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Optimization Health Score</h1>

      {/* Overall Score */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Health</span>
            {trendIcon}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-6xl font-bold ${scoreColor} mb-4`}>
            {currentHealth.totalScore}/100
          </div>
          <Progress value={currentHealth.totalScore} className="mb-4" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Active Issues</p>
              <p className="text-xl font-semibold">
                {currentHealth.activeRecommendations}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Daily Token Waste</p>
              <p className="text-xl font-semibold text-red-600">
                ~{currentHealth.estimatedDailyWaste.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Scores */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">MCP Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentHealth.mcpScore}</div>
            <Progress value={currentHealth.mcpScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Skill Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentHealth.skillScore}</div>
            <Progress value={currentHealth.skillScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Context Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentHealth.contextScore}</div>
            <Progress value={currentHealth.contextScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pattern Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentHealth.patternScore}</div>
            <Progress value={currentHealth.patternScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* History Chart would go here */}
    </div>
  );
}
```

---

### **Phase 6: Testing & Refinement** (Week 6)

#### Goals
- ✅ End-to-end testing complete
- ✅ Real usage tested with your setup
- ✅ Documentation complete

#### Tasks

1. **Test with real data** - Use your actual .mcp.json and usage
2. **Test recommendation accuracy** - Verify suggestions make sense
3. **Test apply flow** - Ensure recommendations can be applied
4. **Test CLI commands** - All commands work correctly
5. **Write documentation** - User guide and API docs
6. **Performance testing** - System handles large datasets

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | Week 1 | Data collection working |
| Phase 2 | Week 2 | Recommendations generating |
| Phase 3 | Week 3 | UI functional |
| Phase 4 | Week 4 | CLI integration complete |
| Phase 5 | Week 5 | Health scoring live |
| Phase 6 | Week 6 | Tested and documented |
| **Total** | **6 weeks** | **Fully functional system** |

---

## Success Metrics

**After 30 days of usage:**
- ✅ 10+ recommendations generated
- ✅ 80%+ recommendation confidence
- ✅ 50%+ token reduction for users who apply recommendations
- ✅ Health score improves by 20+ points

**After 90 days:**
- ✅ Self-learning improves recommendations
- ✅ False positive rate <10%
- ✅ 70%+ of recommendations applied

---

## Next Steps

1. **Review this plan** - Confirm approach
2. **Start Phase 1** - Begin with database schema
3. **Test with your setup** - Use real usage data
4. **Iterate** - Refine based on real behavior

Ready to start implementation? Let me know which phase to begin with!
