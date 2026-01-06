import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  generateAutoClaudePrompts,
  generateAgentConfigs,
} from '@/lib/generators/auto-claude';
import type {
  AutoClaudePrompt,
  AutoClaudeAgentConfig,
} from '../../../../../../shared/src/types/auto-claude';

/**
 * Performance tracking utility
 */
function createPerformanceTracker(operation: string) {
  const start = performance.now();
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`[PERF] ${operation}: ${Math.round(duration)}ms`);
      return duration;
    }
  };
}

const SyncRequestSchema = z.object({
  backendPath: z.string().optional(), // Override backend path if provided
  projectId: z.string().optional(), // Specific project to sync (optional)
  dryRun: z.boolean().default(false), // Preview without writing files
});

interface SyncStats {
  promptsWritten: number;
  agentConfigsWritten: number;
  filesWritten: string[];
  errors: string[];
}

interface SyncResult {
  success: boolean;
  stats: SyncStats;
  backendPath: string;
  dryRun?: boolean;
}

/**
 * Ensure directory exists, creating it if necessary
 */
async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Write file content with backup if file exists - optimized version
 */
async function writeFileWithBackup(filePath: string, content: string): Promise<void> {
  try {
    // Ensure parent directory exists first
    const parentDir = path.dirname(filePath);
    await ensureDirectory(parentDir);

    // Check if file exists and backup if it does
    try {
      await fs.access(filePath);
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);
    } catch {
      // File doesn't exist, no backup needed
    }

    // Write new content
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Write multiple files in parallel with progress tracking
 */
async function writeFilesInParallel(files: Array<{ path: string; content: string }>): Promise<{ written: number; errors: string[] }> {
  const writeTracker = createPerformanceTracker(`Writing ${files.length} files in parallel`);

  const results = await Promise.allSettled(
    files.map(async (file) => {
      try {
        await writeFileWithBackup(file.path, file.content);
        return { success: true, path: file.path };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, path: file.path, error: message };
      }
    })
  );

  const written = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const errors = results
    .filter(r => r.status === 'fulfilled' && !r.value.success)
    .map(r => r.status === 'fulfilled' && r.value.error ? r.value.error : 'Unknown error');

  writeTracker.end();
  return { written, errors };
}

/**
 * Get Auto-Claude components from database
 */
async function getAutoClaudeComponents(): Promise<{
  prompts: AutoClaudePrompt[];
  agentConfigs: AutoClaudeAgentConfig[];
}> {
  const [promptComponents, agentConfigComponents] = await Promise.all([
    prisma.component.findMany({
      where: {
        type: 'AUTO_CLAUDE_PROMPT',
        enabled: true,
      },
    }),
    prisma.component.findMany({
      where: {
        type: 'AUTO_CLAUDE_AGENT_CONFIG',
        enabled: true,
      },
    }),
  ]);

  // Parse component configs into typed objects
  const prompts: AutoClaudePrompt[] = promptComponents.map(component => {
    try {
      return JSON.parse(component.config);
    } catch (error) {
      throw new Error(`Failed to parse prompt config for ${component.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  const agentConfigs: AutoClaudeAgentConfig[] = agentConfigComponents.map(component => {
    try {
      return JSON.parse(component.config);
    } catch (error) {
      throw new Error(`Failed to parse agent config for ${component.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  return { prompts, agentConfigs };
}

/**
 * Main sync function that writes files to Auto-Claude backend - optimized version
 */
async function syncAutoClaudeFiles(
  backendPath: string,
  prompts: AutoClaudePrompt[],
  agentConfigs: AutoClaudeAgentConfig[],
  dryRun: boolean = false
): Promise<SyncStats> {
  const syncTracker = createPerformanceTracker('Total sync operation');

  const stats: SyncStats = {
    promptsWritten: 0,
    agentConfigsWritten: 0,
    filesWritten: [],
    errors: [],
  };

  try {
    // Generate files in parallel
    const generationTracker = createPerformanceTracker('File generation');
    const [generatedPrompts, agentConfigsContent] = await Promise.all([
      // Generate prompt files
      (async () => generateAutoClaudePrompts({
        prompts,
        injectionContext: {
          specDirectory: '{{specDirectory}}',
          projectContext: '{{projectContext}}',
          mcpDocumentation: '{{mcpDocumentation}}',
        },
      }))(),

      // Generate agent configs
      (async () => generateAgentConfigs({ agentConfigs }))(),
    ]);
    generationTracker.end();

    if (dryRun) {
      // For dry run, just count what would be written
      stats.promptsWritten = generatedPrompts.length;
      stats.agentConfigsWritten = 1; // agent_configs.json
      stats.filesWritten = [
        ...generatedPrompts.map(p => p.path),
        'agent_configs.json',
      ];
      syncTracker.end();
      return stats;
    }

    // Prepare all files to be written
    const filesToWrite: Array<{ path: string; content: string }> = [];

    // Add prompt files
    for (const prompt of generatedPrompts) {
      const promptPath = path.join(backendPath, 'apps', 'backend', prompt.path);
      filesToWrite.push({
        path: promptPath,
        content: prompt.content,
      });
      stats.filesWritten.push(prompt.path);
    }

    // Add agent configs file
    const agentConfigsPath = path.join(backendPath, 'agent_configs.json');
    filesToWrite.push({
      path: agentConfigsPath,
      content: JSON.stringify(agentConfigsContent, null, 2),
    });
    stats.filesWritten.push('agent_configs.json');

    // Write all files in parallel
    if (filesToWrite.length > 0) {
      const writeResults = await writeFilesInParallel(filesToWrite);

      // Count successful writes
      stats.promptsWritten = generatedPrompts.length; // Assume all prompts written successfully
      stats.agentConfigsWritten = 1; // agent_configs.json

      // Add any write errors to stats
      stats.errors.push(...writeResults.errors);

      console.log(`[PERF] Successfully wrote ${writeResults.written}/${filesToWrite.length} files`);
    }

  } catch (error) {
    stats.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const totalDuration = syncTracker.end();

  // Log performance warning if sync takes too long
  if (totalDuration > 5000) { // 5 seconds
    console.warn(`[PERF WARNING] Sync took ${Math.round(totalDuration)}ms, exceeding 5s target`);
  }

  return stats;
}

export async function POST(request: NextRequest) {
  const totalTracker = createPerformanceTracker('Total sync request');

  try {
    const body = await request.json();
    const validated = SyncRequestSchema.parse(body);

    // Get Auto-Claude backend path from settings or request
    let backendPath = validated.backendPath;
    if (!backendPath) {
      const settingValue = await getSetting('autoClaudeBackendPath');
      backendPath = settingValue || undefined;
      if (!backendPath) {
        return NextResponse.json(
          { error: 'Auto-Claude backend path not configured. Please set it in settings or provide it in the request.' },
          { status: 400 }
        );
      }
    }

    // Validate that backend path exists
    try {
      await fs.access(backendPath);
    } catch (error) {
      return NextResponse.json(
        { error: `Auto-Claude backend path does not exist: ${backendPath}` },
        { status: 400 }
      );
    }

    // Verify it's a valid Auto-Claude installation
    const appsBackendPath = path.join(backendPath, 'apps', 'backend');
    try {
      await fs.access(appsBackendPath);
    } catch (error) {
      return NextResponse.json(
        {
          error: `Invalid Auto-Claude installation: ${backendPath}. Expected to find 'apps/backend' directory.`,
        },
        { status: 400 }
      );
    }

    // Get Auto-Claude components from database
    let components: { prompts: AutoClaudePrompt[]; agentConfigs: AutoClaudeAgentConfig[] };
    try {
      const dbTracker = createPerformanceTracker('Database component fetch');
      components = await getAutoClaudeComponents();
      dbTracker.end();
    } catch (error) {
      totalTracker.end();
      return NextResponse.json(
        { error: 'Failed to fetch Auto-Claude components', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }

    // Check if there are components to sync
    if (components.prompts.length === 0 && components.agentConfigs.length === 0) {
      totalTracker.end();
      return NextResponse.json(
        { error: 'No Auto-Claude components found to sync. Please import or create some components first.' },
        { status: 400 }
      );
    }

    // Perform the sync
    const stats = await syncAutoClaudeFiles(
      backendPath,
      components.prompts,
      components.agentConfigs,
      validated.dryRun
    );

    // If there were errors, return them
    if (stats.errors.length > 0) {
      totalTracker.end();
      return NextResponse.json(
        {
          error: 'Sync completed with errors',
          stats,
          backendPath,
        },
        { status: 207 } // Multi-status (partial success)
      );
    }

    // Update lastAutoClaudeSync timestamp for projects (if not dry run)
    if (!validated.dryRun) {
      try {
        const updateTracker = createPerformanceTracker('Database timestamp update');
        if (validated.projectId) {
          // Update specific project
          await prisma.project.update({
            where: { id: validated.projectId },
            data: { lastAutoClaudeSync: new Date() },
          });
        } else {
          // Update all Auto-Claude enabled projects
          await prisma.project.updateMany({
            where: { autoClaudeEnabled: true },
            data: { lastAutoClaudeSync: new Date() },
          });
        }
        updateTracker.end();
      } catch (error) {
        console.warn('Failed to update lastAutoClaudeSync timestamp:', error);
        // Don't fail the sync for this
      }
    }

    const totalDuration = totalTracker.end();

    const result: SyncResult = {
      success: true,
      stats,
      backendPath,
    };

    if (validated.dryRun) {
      result.dryRun = true;
    }

    return NextResponse.json({
      ...result,
      performanceMs: Math.round(totalDuration),
    });
  } catch (error) {
    totalTracker.end();

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/auto-claude/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Auto-Claude files' },
      { status: 500 }
    );
  }
}