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

import { timeOperation, performanceMonitor } from '@/lib/performance-monitor';

// Cache for database components to avoid repeated queries
const componentCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache TTL

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of componentCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      componentCache.delete(key);
    }
  }
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
 * Write multiple files in parallel with progress tracking - optimized version
 */
async function writeFilesInParallel(files: Array<{ path: string; content: string }>): Promise<{ written: number; errors: string[] }> {
  const { result } = await timeOperation(
    `Writing ${files.length} files in parallel`,
    async () => {
      // Adaptive concurrency based on file count and system resources
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const baseConcurrency = Math.min(10, files.length);
      const concurrency = memoryUsage > 300 ? Math.max(3, baseConcurrency - 3) : baseConcurrency;

      const results: Array<{ success: boolean; path: string; error?: string }> = [];

      // Process files in controlled batches to avoid overwhelming the system
      for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);

        const batchResults = await Promise.allSettled(
          batch.map(async (file) => {
            try {
              await writeFileWithBackup(file.path, file.content);
              return { success: true, path: file.path };
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              return { success: false, path: file.path, error: message };
            }
          })
        );

        // Collect results from this batch
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({ success: false, path: 'unknown', error: result.reason?.message || 'Unknown error' });
          }
        }

        // Small delay between batches to prevent system overload
        if (i + concurrency < files.length && files.length > 20) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const written = results.filter(r => r.success).length;
      const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');

      return { written, errors };
    },
    files.length // items processed
  );

  return result;
}

/**
 * Get Auto-Claude components from database with caching - optimized version
 */
async function getAutoClaudeComponents(): Promise<{
  prompts: AutoClaudePrompt[];
  agentConfigs: AutoClaudeAgentConfig[];
}> {
  // Clear expired cache entries first
  clearExpiredCache();

  const cacheKey = 'auto-claude-components';
  const cached = componentCache.get(cacheKey);

  // Return cached data if available and not expired
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const { result } = await timeOperation(
    'Database component fetch',
    async () => {
      const [promptComponents, agentConfigComponents] = await Promise.all([
        prisma.component.findMany({
          where: {
            type: 'AUTO_CLAUDE_PROMPT',
            enabled: true,
          },
          select: {
            id: true,
            name: true,
            config: true,
            updatedAt: true, // Include for change detection
          },
        }),
        prisma.component.findMany({
          where: {
            type: 'AUTO_CLAUDE_AGENT_CONFIG',
            enabled: true,
          },
          select: {
            id: true,
            name: true,
            config: true,
            updatedAt: true, // Include for change detection
          },
        }),
      ]);

      // Optimize JSON parsing with error handling for batches
      const prompts: AutoClaudePrompt[] = [];
      const agentConfigs: AutoClaudeAgentConfig[] = [];

      // Parse prompts with error collection
      const promptErrors: string[] = [];
      for (const component of promptComponents) {
        try {
          prompts.push(JSON.parse(component.config));
        } catch (error) {
          promptErrors.push(`Failed to parse prompt config for ${component.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Parse agent configs with error collection
      const agentConfigErrors: string[] = [];
      for (const component of agentConfigComponents) {
        try {
          agentConfigs.push(JSON.parse(component.config));
        } catch (error) {
          agentConfigErrors.push(`Failed to parse agent config for ${component.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Throw aggregated errors if any parsing failed
      const allErrors = [...promptErrors, ...agentConfigErrors];
      if (allErrors.length > 0) {
        throw new Error(`Component parsing failed: ${allErrors.join('; ')}`);
      }

      const result = { prompts, agentConfigs };

      // Cache the result
      componentCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    },
    undefined, // items processed will be calculated inside
    undefined  // errors will be calculated inside
  );

  return result;
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

  const { result: stats } = await timeOperation(
    'Total sync operation',
    async () => {
      const syncStats: SyncStats = {
        promptsWritten: 0,
        agentConfigsWritten: 0,
        filesWritten: [],
        errors: [],
      };

      try {
        // Generate files in parallel using the performance monitor
        const { result: [generatedPrompts, agentConfigsContent] } = await timeOperation(
          'File generation',
          async () => {
            return await Promise.all([
              // Generate prompt files
              generateAutoClaudePrompts({
                prompts,
                injectionContext: {
                  specDirectory: '{{specDirectory}}',
                  projectContext: '{{projectContext}}',
                  mcpDocumentation: '{{mcpDocumentation}}',
                },
              }),

              // Generate agent configs
              generateAgentConfigs({ agentConfigs }),
            ]);
          },
          prompts.length + agentConfigs.length // items processed
        );

        if (dryRun) {
          // For dry run, just count what would be written
          syncStats.promptsWritten = generatedPrompts.length;
          syncStats.agentConfigsWritten = 1; // agent_configs.json
          syncStats.filesWritten = [
            ...generatedPrompts.map(p => p.path),
            'agent_configs.json',
          ];
          return syncStats;
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
          syncStats.filesWritten.push(prompt.path);
        }

        // Add agent configs file
        const agentConfigsPath = path.join(backendPath, 'agent_configs.json');
        filesToWrite.push({
          path: agentConfigsPath,
          content: agentConfigsContent, // Already a string from generateAgentConfigs
        });
        syncStats.filesWritten.push('agent_configs.json');

        // Write all files in parallel
        if (filesToWrite.length > 0) {
          const writeResults = await writeFilesInParallel(filesToWrite);

          // Count successful writes based on actual results
          const successfulPrompts = writeResults.written - (writeResults.errors.length === 0 ? 1 : 0); // Subtract agent_configs.json
          syncStats.promptsWritten = Math.max(0, successfulPrompts);
          syncStats.agentConfigsWritten = writeResults.written > successfulPrompts ? 1 : 0;

          // Add any write errors to stats
          syncStats.errors.push(...writeResults.errors);

          console.log(`[PERF] Successfully wrote ${writeResults.written}/${filesToWrite.length} files`);
        }

      } catch (error) {
        syncStats.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      return syncStats;
    },
    prompts.length + agentConfigs.length // total items processed
  );

  // Log performance warning if sync takes too long (check metric duration)
  const totalDuration = performanceMonitor.getStats('Total sync operation')?.avgDuration || 0;
  if (totalDuration > 5000) { // 5 seconds
    console.warn(`[PERF WARNING] Sync took ${Math.round(totalDuration)}ms, exceeding 5s target`);
  }

  return stats;
}

export async function POST(request: NextRequest) {
  const { result: response } = await timeOperation(
    'Total sync request',
    async () => {
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
          components = await getAutoClaudeComponents();
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to fetch Auto-Claude components', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
          );
        }

        // Check if there are components to sync
        if (components.prompts.length === 0 && components.agentConfigs.length === 0) {
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
            const { metric } = await timeOperation(
              'Database timestamp update',
              async () => {
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
                return 'success';
              },
              1 // 1 operation
            );
          } catch (error) {
            console.warn('Failed to update lastAutoClaudeSync timestamp:', error);
            // Don't fail the sync for this
          }
        }

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
          performanceMs: Math.round(performanceMonitor.getStats('Total sync request')?.avgDuration || 0),
        });
      } catch (error) {
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
    },
    1 // 1 request processed
  );

  return response;
}