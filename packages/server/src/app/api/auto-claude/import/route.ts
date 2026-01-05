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
 * Parse models.py file to extract AGENT_CONFIGS
 */
async function parseModelsFile(modelsPath: string): Promise<Array<{ agentType: string; config: any }>> {
  try {
    const content = await fs.readFile(modelsPath, 'utf-8');
    const agentConfigs: Array<{ agentType: string; config: any }> = [];

    // Look for AGENT_CONFIGS dictionary definition
    const agentConfigsMatch = content.match(/AGENT_CONFIGS\s*=\s*\{([\s\S]*?)\n\}/);
    if (!agentConfigsMatch) {
      throw new Error('AGENT_CONFIGS dictionary not found in models.py');
    }

    // Extract agent config entries - this is a simplified parser
    // In a real implementation, you might want to use a Python AST parser
    const configContent = agentConfigsMatch[1];

    // Match individual agent entries like "coder": { ... },
    const agentMatches = configContent.matchAll(/"([^"]+)":\s*\{([^}]+)\}/g);

    for (const match of agentMatches) {
      const agentType = match[1];
      const configText = `{${match[2]}}`;

      try {
        // Parse basic agent config structure
        // This is simplified - a real parser would be more robust
        const tools: string[] = [];
        const mcpServers: string[] = [];
        const mcpServersOptional: string[] = [];
        const autoClaudeTools: string[] = [];
        let thinkingDefault = 'medium';

        // Extract tools
        const toolsMatch = configText.match(/"tools":\s*\[([^\]]+)\]/);
        if (toolsMatch) {
          const toolsList = toolsMatch[1].match(/"([^"]+)"/g);
          if (toolsList) {
            tools.push(...toolsList.map(t => t.replace(/"/g, '')));
          }
        }

        // Extract MCP servers
        const mcpMatch = configText.match(/"mcp_servers":\s*\[([^\]]+)\]/);
        if (mcpMatch) {
          const mcpList = mcpMatch[1].match(/"([^"]+)"/g);
          if (mcpList) {
            mcpServers.push(...mcpList.map(m => m.replace(/"/g, '')));
          }
        }

        // Extract thinking default
        const thinkingMatch = configText.match(/"thinking_default":\s*"([^"]+)"/);
        if (thinkingMatch) {
          thinkingDefault = thinkingMatch[1];
        }

        const config = {
          agentType,
          tools,
          mcpServers,
          mcpServersOptional,
          autoClaudeTools,
          thinkingDefault,
        };

        agentConfigs.push({ agentType, config });
      } catch (error) {
        console.warn(`Failed to parse agent config for ${agentType}:`, error);
      }
    }

    return agentConfigs;
  } catch (error) {
    console.error('Error parsing models.py:', error);
    throw new Error(`Failed to parse models.py: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse prompts directory to extract all .md files
 */
async function parsePromptsDirectory(promptsPath: string): Promise<Array<{ agentType: string; content: string }>> {
  try {
    const files = await fs.readdir(promptsPath);
    const prompts: Array<{ agentType: string; content: string }> = [];

    for (const file of files) {
      if (path.extname(file) === '.md') {
        const agentType = path.basename(file, '.md');
        const filePath = path.join(promptsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Detect injection points in the content
        const hasSpecDirectory = content.includes('{{specDirectory}}');
        const hasProjectContext = content.includes('{{projectContext}}');
        const hasMcpDocumentation = content.includes('{{mcpDocumentation}}');

        const promptData = {
          agentType,
          promptContent: content,
          injectionPoints: {
            specDirectory: hasSpecDirectory,
            projectContext: hasProjectContext,
            mcpDocumentation: hasMcpDocumentation,
          },
        };

        prompts.push({ agentType, content: JSON.stringify(promptData) });
      }
    }

    return prompts;
  } catch (error) {
    console.error('Error parsing prompts directory:', error);
    throw new Error(`Failed to parse prompts directory: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse .auto-claude/.env file for project configuration
 */
async function parseProjectConfig(envPath: string): Promise<any | null> {
  try {
    const content = await fs.readFile(envPath, 'utf-8');
    const config: any = {
      context7Enabled: false,
      linearMcpEnabled: false,
      electronMcpEnabled: false,
      puppeteerMcpEnabled: false,
      graphitiEnabled: false,
      customMcpServers: [],
    };

    // Parse environment variables
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes

      switch (key.trim()) {
        case 'CONTEXT7_ENABLED':
          config.context7Enabled = value.toLowerCase() === 'true';
          break;
        case 'LINEAR_MCP_ENABLED':
          config.linearMcpEnabled = value.toLowerCase() === 'true';
          break;
        case 'ELECTRON_MCP_ENABLED':
          config.electronMcpEnabled = value.toLowerCase() === 'true';
          break;
        case 'PUPPETEER_MCP_ENABLED':
          config.puppeteerMcpEnabled = value.toLowerCase() === 'true';
          break;
        case 'GRAPHITI_ENABLED':
          config.graphitiEnabled = value.toLowerCase() === 'true';
          break;
        case 'LINEAR_API_KEY':
          if (value && value !== '') config.linearApiKey = value;
          break;
        case 'LINEAR_TEAM_ID':
          if (value && value !== '') config.linearTeamId = value;
          break;
        case 'GITHUB_TOKEN':
          if (value && value !== '') config.githubToken = value;
          break;
        case 'GITHUB_REPO':
          if (value && value !== '') config.githubRepo = value;
          break;
      }
    }

    return config;
  } catch (error) {
    console.warn('Could not parse project config from .env:', error);
    return null;
  }
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
 * Parse Auto-Claude installation directory
 */
async function parseAutoClaudeConfigs(installPath: string): Promise<ParsedAutoClaudeConfigs> {
  const configs: ParsedAutoClaudeConfigs = {
    agentConfigs: [],
    prompts: [],
    modelProfiles: [],
  };

  // Parse models.py for agent configs
  const modelsPath = path.join(installPath, 'apps', 'backend', 'models.py');
  try {
    await fs.access(modelsPath);
    configs.agentConfigs = await parseModelsFile(modelsPath);
  } catch (error) {
    console.warn('Could not find or parse models.py:', error);
  }

  // Parse prompts directory
  const promptsPath = path.join(installPath, 'apps', 'backend', 'prompts');
  try {
    await fs.access(promptsPath);
    configs.prompts = await parsePromptsDirectory(promptsPath);
  } catch (error) {
    console.warn('Could not find or parse prompts directory:', error);
  }

  // Look for project config in common locations
  const envPaths = [
    path.join(installPath, '.auto-claude', '.env'),
    path.join(installPath, '.env'),
  ];

  for (const envPath of envPaths) {
    try {
      await fs.access(envPath);
      configs.projectConfig = await parseProjectConfig(envPath);
      break;
    } catch {
      // Try next path
    }
  }

  // Add default model profiles
  configs.modelProfiles = getDefaultModelProfiles();

  return configs;
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Failed to parse Auto-Claude configs', details: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      );
    }

    if (validated.dryRun) {
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

    // Import in a transaction
    await prisma.$transaction(async (tx) => {
      // Import agent configs
      for (const { agentType, config } of configs.agentConfigs) {
        try {
          // Validate against schema
          const validatedConfig = AutoClaudeAgentConfigSchema.parse(config);

          await tx.component.upsert({
            where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: agentType } },
            update: {
              description: `Auto-Claude agent configuration for ${agentType}`,
              config: JSON.stringify(validatedConfig),
            },
            create: {
              type: 'AUTO_CLAUDE_AGENT_CONFIG',
              name: agentType,
              description: `Auto-Claude agent configuration for ${agentType}`,
              config: JSON.stringify(validatedConfig),
              tags: 'auto-claude,agent-config,imported',
              enabled: true,
            },
          });
          stats.agentConfigsImported++;
        } catch (error) {
          stats.errors.push(`Failed to import agent config ${agentType}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Import prompts
      for (const { agentType, content } of configs.prompts) {
        try {
          const promptData = JSON.parse(content);
          const validatedPrompt = AutoClaudePromptSchema.parse(promptData);

          await tx.component.upsert({
            where: { type_name: { type: 'AUTO_CLAUDE_PROMPT', name: agentType } },
            update: {
              description: `Auto-Claude prompt for ${agentType}`,
              config: JSON.stringify(validatedPrompt),
            },
            create: {
              type: 'AUTO_CLAUDE_PROMPT',
              name: agentType,
              description: `Auto-Claude prompt for ${agentType}`,
              config: JSON.stringify(validatedPrompt),
              tags: 'auto-claude,prompt,imported',
              enabled: true,
            },
          });
          stats.promptsImported++;
        } catch (error) {
          stats.errors.push(`Failed to import prompt ${agentType}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Import model profiles
      for (const profile of configs.modelProfiles) {
        try {
          const validatedProfile = AutoClaudeModelProfileSchema.parse(profile);

          await tx.component.upsert({
            where: { type_name: { type: 'AUTO_CLAUDE_MODEL_PROFILE', name: profile.name } },
            update: {
              description: profile.description,
              config: JSON.stringify(validatedProfile),
            },
            create: {
              type: 'AUTO_CLAUDE_MODEL_PROFILE',
              name: profile.name,
              description: profile.description,
              config: JSON.stringify(validatedProfile),
              tags: 'auto-claude,model-profile,default',
              enabled: true,
            },
          });
          stats.modelProfilesImported++;
        } catch (error) {
          stats.errors.push(`Failed to import model profile ${profile.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Import project config if found
      if (configs.projectConfig) {
        try {
          const validatedConfig = AutoClaudeProjectConfigSchema.parse(configs.projectConfig);

          await tx.component.upsert({
            where: { type_name: { type: 'AUTO_CLAUDE_PROJECT_CONFIG', name: 'default' } },
            update: {
              description: 'Default Auto-Claude project configuration',
              config: JSON.stringify(validatedConfig),
            },
            create: {
              type: 'AUTO_CLAUDE_PROJECT_CONFIG',
              name: 'default',
              description: 'Default Auto-Claude project configuration',
              config: JSON.stringify(validatedConfig),
              tags: 'auto-claude,project-config,imported',
              enabled: true,
            },
          });
          stats.projectConfigImported = 1;
        } catch (error) {
          stats.errors.push(`Failed to import project config: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
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