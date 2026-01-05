import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AutoClaudeAgentConfigSchema } from '../../../../../../shared/src/schemas/auto-claude';
import type { AutoClaudeAgentConfig } from '../../../../../../shared/src/types/auto-claude';

/**
 * Schema for creating agent configs
 */
const CreateAgentConfigSchema = AutoClaudeAgentConfigSchema;

/**
 * Get all Auto-Claude agent configurations
 * Returns agent types with tool/MCP matrix
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get('agentType');

    const where: Record<string, unknown> = {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
    };

    // Filter by specific agent type if provided
    if (agentType) {
      where.name = agentType;
    }

    const components = await prisma.component.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        config: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Parse and validate configurations
    const agentConfigs: Array<{
      id: string;
      agentType: string;
      description: string;
      config: AutoClaudeAgentConfig;
      enabled: boolean;
      createdAt: string;
      updatedAt: string;
    }> = [];

    const errors: string[] = [];

    for (const component of components) {
      try {
        const config = JSON.parse(component.config);
        const validatedConfig = AutoClaudeAgentConfigSchema.parse(config);

        agentConfigs.push({
          id: component.id,
          agentType: component.name,
          description: component.description,
          config: validatedConfig,
          enabled: component.enabled,
          createdAt: component.createdAt.toISOString(),
          updatedAt: component.updatedAt.toISOString(),
        });
      } catch (error) {
        errors.push(`Invalid configuration for agent ${component.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Build tool/MCP matrix for visualization
    const toolMatrix: Record<string, string[]> = {};
    const mcpMatrix: Record<string, { required: string[]; optional: string[] }> = {};
    const agentTypes = agentConfigs.map(ac => ac.agentType);

    // Collect all unique tools and MCP servers
    const allTools = new Set<string>();
    const allMcpServers = new Set<string>();

    for (const { config } of agentConfigs) {
      config.tools.forEach(tool => allTools.add(tool));
      config.mcpServers.forEach(server => allMcpServers.add(server));
      config.mcpServersOptional.forEach(server => allMcpServers.add(server));
    }

    // Build matrices
    for (const { agentType, config } of agentConfigs) {
      toolMatrix[agentType] = config.tools;
      mcpMatrix[agentType] = {
        required: config.mcpServers,
        optional: config.mcpServersOptional,
      };
    }

    return NextResponse.json({
      agentConfigs,
      matrices: {
        tools: {
          agents: agentTypes,
          tools: Array.from(allTools).sort(),
          matrix: toolMatrix,
        },
        mcp: {
          agents: agentTypes,
          servers: Array.from(allMcpServers).sort(),
          matrix: mcpMatrix,
        },
      },
      stats: {
        total: agentConfigs.length,
        enabled: agentConfigs.filter(ac => ac.enabled).length,
        uniqueTools: allTools.size,
        uniqueMcpServers: allMcpServers.size,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('GET /api/auto-claude/agents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent configurations' },
      { status: 500 }
    );
  }
}

/**
 * Create a new Auto-Claude agent configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateAgentConfigSchema.parse(body);

    // Check if agent config already exists
    const existing = await prisma.component.findFirst({
      where: {
        type: 'AUTO_CLAUDE_AGENT_CONFIG',
        name: validated.agentType,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Agent configuration for '${validated.agentType}' already exists` },
        { status: 409 }
      );
    }

    // Create new agent configuration
    const component = await prisma.component.create({
      data: {
        type: 'AUTO_CLAUDE_AGENT_CONFIG',
        name: validated.agentType,
        description: `Auto-Claude agent configuration for ${validated.agentType}`,
        config: JSON.stringify(validated),
        enabled: true,
        tags: 'auto-claude,agent-config',
      },
    });

    return NextResponse.json(
      {
        id: component.id,
        agentType: component.name,
        description: component.description,
        config: validated,
        enabled: component.enabled,
        createdAt: component.createdAt.toISOString(),
        updatedAt: component.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/auto-claude/agents error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent configuration' },
      { status: 500 }
    );
  }
}