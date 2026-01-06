import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  AutoClaudeAgentConfigSchema,
  AutoClaudePromptSchema,
  AutoClaudeModelProfileSchema,
  AutoClaudeProjectConfigSchema,
} from '../../../../../../shared/src/schemas/auto-claude';
import { parseModelsFile } from '@/lib/import/models-parser';
import { parsePromptsDirectory } from '@/lib/import/prompts-parser';
import { parseEnvFile } from '@/lib/import/env-parser';

const ImportRequestSchema = z.object({
  autoClaudeInstallPath: z.string().min(1, 'Auto-Claude installation path is required'),
  dryRun: z.boolean().default(false),
});

interface ParsedAutoClaudeConfigs {
  agentConfigs: Array<{
    agentType: string;
    config: any;
  }>;
  prompts: Array<{
    agentType: string;
    content: string;
  }>;
  projectConfig?: any;
  modelProfiles: Array<any>;
}

interface ImportStats {
  agentConfigsImported: number;
  promptsImported: number;
  modelProfilesImported: number;
  projectConfigImported: number;
  errors: string[];
}

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

/**
 * Create default model profiles
 */
function getDefaultModelProfiles(): Array<any> {
  return [
    {
      name: 'balanced',
      description: 'Balanced configuration for general use',
      phaseModels: {
        spec: 'sonnet',
        planning: 'sonnet',
        coding: 'sonnet',
        qa: 'sonnet',
      },
      phaseThinking: {
        spec: 'medium',
        planning: 'high',
        coding: 'medium',
        qa: 'high',
      },
    },
    {
      name: 'cost-optimized',
      description: 'Cost-optimized configuration using cheaper models',
      phaseModels: {
        spec: 'haiku',
        planning: 'sonnet',
        coding: 'sonnet',
        qa: 'sonnet',
      },
      phaseThinking: {
        spec: 'low',
        planning: 'medium',
        coding: 'low',
        qa: 'medium',
      },
    },
    {
      name: 'quality-focused',
      description: 'Quality-focused configuration using premium models',
      phaseModels: {
        spec: 'opus',
        planning: 'opus',
        coding: 'sonnet',
        qa: 'opus',
      },
      phaseThinking: {
        spec: 'high',
        planning: 'ultrathink',
        coding: 'high',
        qa: 'ultrathink',
      },
    },
  ];
}

/**
 * Parse Auto-Claude installation directory with optimized parallel processing
 */
async function parseAutoClaudeConfigs(installPath: string): Promise<ParsedAutoClaudeConfigs> {
  const parseTracker = createPerformanceTracker('Total parsing');

  const configs: ParsedAutoClaudeConfigs = {
    agentConfigs: [],
    prompts: [],
    modelProfiles: [],
  };

  // Define file paths
  const modelsPath = path.join(installPath, 'apps', 'backend', 'models.py');
  const promptsPath = path.join(installPath, 'apps', 'backend', 'prompts');
  const envPaths = [
    path.join(installPath, '.auto-claude', '.env'),
    path.join(installPath, '.env'),
  ];

  // Parse all components in parallel for better performance
  const [modelsResult, promptsResult, envResult] = await Promise.allSettled([
    // Parse models.py for agent configs
    (async () => {
      try {
        await fs.access(modelsPath);
        const modelTracker = createPerformanceTracker('Models parsing');
        const result = await parseModelsFile(modelsPath);
        modelTracker.end();

        if (result.errors.length > 0) {
          console.warn('Errors during models.py parsing:', result.errors);
        }

        return result.agentConfigs.map(config => ({
          agentType: config.agentType,
          config: config.config,
        }));
      } catch (error) {
        console.warn('Could not find or parse models.py:', error);
        return [];
      }
    })(),

    // Parse prompts directory
    (async () => {
      try {
        await fs.access(promptsPath);
        const promptTracker = createPerformanceTracker('Prompts parsing');
        const result = await parsePromptsDirectory(promptsPath);
        promptTracker.end();

        if (result.errors.length > 0) {
          console.warn('Errors during prompts parsing:', result.errors);
        }

        return result.prompts.map(prompt => ({
          agentType: prompt.agentType,
          content: JSON.stringify(prompt.prompt),
        }));
      } catch (error) {
        console.warn('Could not find or parse prompts directory:', error);
        return [];
      }
    })(),

    // Parse project config from .env files
    (async () => {
      for (const envPath of envPaths) {
        try {
          await fs.access(envPath);
          const envTracker = createPerformanceTracker('Env parsing');
          const result = await parseEnvFile(envPath);
          envTracker.end();

          if (result.errors.length > 0) {
            console.warn('Errors during env parsing:', result.errors);
          }

          return result.config?.projectConfig || null;
        } catch (error) {
          // Try next path
          continue;
        }
      }
      console.warn('Could not find any .env file');
      return null;
    })(),
  ]);

  // Collect results from parallel operations
  if (modelsResult.status === 'fulfilled') {
    configs.agentConfigs = modelsResult.value;
  }

  if (promptsResult.status === 'fulfilled') {
    configs.prompts = promptsResult.value;
  }

  if (envResult.status === 'fulfilled') {
    configs.projectConfig = envResult.value;
  }

  // Add default model profiles
  configs.modelProfiles = getDefaultModelProfiles();

  parseTracker.end();
  return configs;
}

export async function POST(request: NextRequest) {
  const totalTracker = createPerformanceTracker('Total import operation');

  try {
    const body = await request.json();
    const validated = ImportRequestSchema.parse(body);

    const stats: ImportStats = {
      agentConfigsImported: 0,
      promptsImported: 0,
      modelProfilesImported: 0,
      projectConfigImported: 0,
      errors: [],
    };

    // Parse Auto-Claude configs
    let configs: ParsedAutoClaudeConfigs;
    try {
      configs = await parseAutoClaudeConfigs(validated.autoClaudeInstallPath);
    } catch (error) {
      totalTracker.end();
      return NextResponse.json(
        { error: 'Failed to parse Auto-Claude configs', details: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      );
    }

    if (validated.dryRun) {
      totalTracker.end();
      // Return preview without importing
      return NextResponse.json({
        success: true,
        dryRun: true,
        preview: {
          agentConfigs: configs.agentConfigs.length,
          prompts: configs.prompts.length,
          modelProfiles: configs.modelProfiles.length,
          projectConfig: configs.projectConfig ? 1 : 0,
        },
        configs, // Include parsed configs for preview
      });
    }

    // Pre-validate all configs to fail fast if there are validation errors
    const validationTracker = createPerformanceTracker('Validation');
    const validatedConfigs = {
      agentConfigs: [] as Array<{ agentType: string; config: any }>,
      prompts: [] as Array<{ agentType: string; data: any }>,
      modelProfiles: [] as Array<{ name: string; description: string; config: any }>,
      projectConfig: null as any,
    };

    // Validate all agent configs
    for (const { agentType, config } of configs.agentConfigs) {
      try {
        const validatedConfig = AutoClaudeAgentConfigSchema.parse(config);
        validatedConfigs.agentConfigs.push({ agentType, config: validatedConfig });
      } catch (error) {
        stats.errors.push(`Failed to validate agent config ${agentType}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Validate all prompts
    for (const { agentType, content } of configs.prompts) {
      try {
        const promptData = JSON.parse(content);
        const validatedPrompt = AutoClaudePromptSchema.parse(promptData);
        validatedConfigs.prompts.push({ agentType, data: validatedPrompt });
      } catch (error) {
        stats.errors.push(`Failed to validate prompt ${agentType}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Validate all model profiles
    for (const profile of configs.modelProfiles) {
      try {
        const validatedProfile = AutoClaudeModelProfileSchema.parse(profile);
        validatedConfigs.modelProfiles.push({ name: profile.name, description: profile.description, config: validatedProfile });
      } catch (error) {
        stats.errors.push(`Failed to validate model profile ${profile.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Validate project config
    if (configs.projectConfig) {
      try {
        const validatedConfig = AutoClaudeProjectConfigSchema.parse(configs.projectConfig);
        validatedConfigs.projectConfig = validatedConfig;
      } catch (error) {
        stats.errors.push(`Failed to validate project config: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    validationTracker.end();

    // If there are validation errors, return early
    if (stats.errors.length > 0) {
      totalTracker.end();
      return NextResponse.json({
        success: false,
        stats,
        message: 'Import failed due to validation errors',
      }, { status: 400 });
    }

    // Optimized database import with batch operations
    const dbTracker = createPerformanceTracker('Database operations');
    await prisma.$transaction(async (tx) => {
      // Prepare all operations for parallel execution
      const operations: Promise<any>[] = [];

      // Import agent configs in parallel
      for (const { agentType, config } of validatedConfigs.agentConfigs) {
        operations.push(
          tx.component.upsert({
            where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: agentType } },
            update: {
              description: `Auto-Claude agent configuration for ${agentType}`,
              config: JSON.stringify(config),
              updatedAt: new Date(),
            },
            create: {
              type: 'AUTO_CLAUDE_AGENT_CONFIG',
              name: agentType,
              description: `Auto-Claude agent configuration for ${agentType}`,
              config: JSON.stringify(config),
              tags: 'auto-claude,agent-config,imported',
              enabled: true,
            },
          }).then(() => { stats.agentConfigsImported++; })
        );
      }

      // Import prompts in parallel
      for (const { agentType, data } of validatedConfigs.prompts) {
        operations.push(
          tx.component.upsert({
            where: { type_name: { type: 'AUTO_CLAUDE_PROMPT', name: agentType } },
            update: {
              description: `Auto-Claude prompt for ${agentType}`,
              config: JSON.stringify(data),
              updatedAt: new Date(),
            },
            create: {
              type: 'AUTO_CLAUDE_PROMPT',
              name: agentType,
              description: `Auto-Claude prompt for ${agentType}`,
              config: JSON.stringify(data),
              tags: 'auto-claude,prompt,imported',
              enabled: true,
            },
          }).then(() => { stats.promptsImported++; })
        );
      }

      // Import model profiles in parallel
      for (const { name, description, config } of validatedConfigs.modelProfiles) {
        operations.push(
          tx.component.upsert({
            where: { type_name: { type: 'AUTO_CLAUDE_MODEL_PROFILE', name } },
            update: {
              description,
              config: JSON.stringify(config),
              updatedAt: new Date(),
            },
            create: {
              type: 'AUTO_CLAUDE_MODEL_PROFILE',
              name,
              description,
              config: JSON.stringify(config),
              tags: 'auto-claude,model-profile,default',
              enabled: true,
            },
          }).then(() => { stats.modelProfilesImported++; })
        );
      }

      // Import project config if found
      if (validatedConfigs.projectConfig) {
        operations.push(
          tx.component.upsert({
            where: { type_name: { type: 'AUTO_CLAUDE_PROJECT_CONFIG', name: 'default' } },
            update: {
              description: 'Default Auto-Claude project configuration',
              config: JSON.stringify(validatedConfigs.projectConfig),
              updatedAt: new Date(),
            },
            create: {
              type: 'AUTO_CLAUDE_PROJECT_CONFIG',
              name: 'default',
              description: 'Default Auto-Claude project configuration',
              config: JSON.stringify(validatedConfigs.projectConfig),
              tags: 'auto-claude,project-config,imported',
              enabled: true,
            },
          }).then(() => { stats.projectConfigImported = 1; })
        );
      }

      // Execute all operations in parallel within the transaction
      await Promise.all(operations);
    });
    dbTracker.end();

    const totalDuration = totalTracker.end();

    // Log performance warning if import takes too long
    if (totalDuration > 10000) { // 10 seconds
      console.warn(`[PERF WARNING] Import took ${Math.round(totalDuration)}ms, exceeding 10s target`);
    }

    return NextResponse.json({
      success: true,
      stats,
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

    console.error('POST /api/auto-claude/import error:', error);
    return NextResponse.json(
      { error: 'Failed to import Auto-Claude configs' },
      { status: 500 }
    );
  }
}