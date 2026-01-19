import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AutoClaudeAgentConfigSchema } from '../../../../../../../shared/src/schemas/auto-claude';
import type { AutoClaudeAgentConfig } from '../../../../../../../shared/src/types/auto-claude';

/**
 * Schema for updating agent configs (all fields optional for partial updates)
 */
const UpdateAgentConfigSchema = z.object({
  tools: z.array(z.string()).optional(),
  mcpServers: z.array(z.string()).optional(),
  mcpServersOptional: z.array(z.string()).optional(),
  autoClaudeTools: z.array(z.string()).optional(),
  thinkingDefault: z.enum(['none', 'low', 'medium', 'high', 'ultrathink']).optional(),
}).refine((data) => {
  // Validate tools if provided
  if (data.tools) {
    const knownTools = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Task', 'WebFetch', 'WebSearch'];
    return data.tools.every(tool => knownTools.includes(tool));
  }
  return true;
}, {
  message: 'All tools must be from the known tools list',
});

type RouteParams = { params: Promise<{ agentType: string }> };

/**
 * Get a specific Auto-Claude agent configuration
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentType } = await params;

    // Validate agentType format
    if (!/^[a-z_]+$/.test(agentType)) {
      return NextResponse.json(
        { error: 'Agent type must be lowercase with underscores only' },
        { status: 400 }
      );
    }

    const component = await prisma.component.findFirst({
      where: {
        type: 'AUTO_CLAUDE_AGENT_CONFIG',
        name: agentType,
      },
      select: {
        id: true,
        name: true,
        description: true,
        config: true,
        enabled: true,
        tags: true,
        version: true,
        sourceUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: `Agent configuration for '${agentType}' not found` },
        { status: 404 }
      );
    }

    try {
      const config = JSON.parse(component.config);
      const validatedConfig = AutoClaudeAgentConfigSchema.parse(config);

      return NextResponse.json({
        id: component.id,
        agentType: component.name,
        description: component.description,
        config: validatedConfig,
        enabled: component.enabled,
        tags: component.tags,
        version: component.version,
        sourceUrl: component.sourceUrl,
        createdAt: component.createdAt.toISOString(),
        updatedAt: component.updatedAt.toISOString(),
      });
    } catch (configError) {
      console.error(`Invalid config for agent ${agentType}:`, configError);
      return NextResponse.json(
        { error: 'Invalid agent configuration stored in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('GET /api/auto-claude/agents/[agentType] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent configuration' },
      { status: 500 }
    );
  }
}

/**
 * Update a specific Auto-Claude agent configuration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentType } = await params;
    const body = await request.json();

    // Validate agentType format
    if (!/^[a-z_]+$/.test(agentType)) {
      return NextResponse.json(
        { error: 'Agent type must be lowercase with underscores only' },
        { status: 400 }
      );
    }

    // Validate request body
    const validated = UpdateAgentConfigSchema.parse(body);

    // Find existing agent configuration
    const existing = await prisma.component.findFirst({
      where: {
        type: 'AUTO_CLAUDE_AGENT_CONFIG',
        name: agentType,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Agent configuration for '${agentType}' not found` },
        { status: 404 }
      );
    }

    // Parse existing configuration
    let existingConfig: AutoClaudeAgentConfig;
    try {
      existingConfig = JSON.parse(existing.config);
    } catch (error) {
      console.error(`Failed to parse existing config for ${agentType}:`, error);
      return NextResponse.json(
        { error: 'Invalid existing configuration' },
        { status: 500 }
      );
    }

    // Merge with updates
    const updatedConfig: AutoClaudeAgentConfig = {
      agentType: existingConfig.agentType,
      tools: validated.tools ?? existingConfig.tools,
      mcpServers: validated.mcpServers ?? existingConfig.mcpServers,
      mcpServersOptional: validated.mcpServersOptional ?? existingConfig.mcpServersOptional,
      autoClaudeTools: validated.autoClaudeTools ?? existingConfig.autoClaudeTools,
      thinkingDefault: validated.thinkingDefault ?? existingConfig.thinkingDefault,
    };

    // Validate the complete merged configuration
    const finalValidated = AutoClaudeAgentConfigSchema.parse(updatedConfig);

    // Update in database
    const component = await prisma.component.update({
      where: { id: existing.id },
      data: {
        config: JSON.stringify(finalValidated),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: component.id,
      agentType: component.name,
      description: component.description,
      config: finalValidated,
      enabled: component.enabled,
      tags: component.tags,
      version: component.version,
      sourceUrl: component.sourceUrl,
      createdAt: component.createdAt.toISOString(),
      updatedAt: component.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('PUT /api/auto-claude/agents/[agentType] error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent configuration' },
      { status: 500 }
    );
  }
}

/**
 * Delete a specific Auto-Claude agent configuration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentType } = await params;

    // Validate agentType format
    if (!/^[a-z_]+$/.test(agentType)) {
      return NextResponse.json(
        { error: 'Agent type must be lowercase with underscores only' },
        { status: 400 }
      );
    }

    const existing = await prisma.component.findFirst({
      where: {
        type: 'AUTO_CLAUDE_AGENT_CONFIG',
        name: agentType,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Agent configuration for '${agentType}' not found` },
        { status: 404 }
      );
    }

    await prisma.component.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: `Agent configuration for '${agentType}' deleted successfully`,
    });
  } catch (error) {
    console.error('DELETE /api/auto-claude/agents/[agentType] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent configuration' },
      { status: 500 }
    );
  }
}