import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { generateProjectFiles, generateSummary } from '@/lib/generators';

const GenerateSchema = z.object({
  profileId: z.string(),
  projectName: z.string().min(1),
  projectDescription: z.string().optional(),
  autoClaudeEnabled: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = GenerateSchema.parse(body);

    // Fetch profile with components
    const profile = await prisma.profile.findUnique({
      where: { id: validated.profileId },
      include: {
        components: {
          include: { component: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse component configs
    let components = profile.components.map((pc) => ({
      type: pc.component.type,
      name: pc.component.name,
      config: JSON.parse(pc.component.config),
    }));

    // If autoClaudeEnabled is true and no Auto-Claude components exist, add comprehensive defaults
    if (validated.autoClaudeEnabled) {
      const hasAutoClaudeComponents = components.some(c =>
        c.type.startsWith('AUTO_CLAUDE_')
      );

      if (!hasAutoClaudeComponents) {
        // Add default Auto-Claude project config
        components.push({
          type: 'AUTO_CLAUDE_PROJECT_CONFIG',
          name: 'default-config',
          config: {
            context7Enabled: true,
            linearMcpEnabled: false,
            electronMcpEnabled: false,
            puppeteerMcpEnabled: false,
            graphitiEnabled: false,
          },
        });

        // Add default model profile for balanced configuration
        components.push({
          type: 'AUTO_CLAUDE_MODEL_PROFILE',
          name: 'default-profile',
          config: {
            name: 'balanced',
            description: 'Default balanced configuration',
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
        });

        // Add default agent configs for common agent types
        const defaultAgentConfigs = [
          {
            name: 'coder',
            config: {
              agentType: 'coder',
              tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
              mcpServers: ['context7'],
              mcpServersOptional: ['linear', 'graphiti'],
              autoClaudeTools: ['parallel_shell'],
              thinkingDefault: 'medium'
            }
          },
          {
            name: 'planner',
            config: {
              agentType: 'planner',
              tools: ['Read', 'Glob', 'Grep'],
              mcpServers: ['context7'],
              mcpServersOptional: ['linear'],
              autoClaudeTools: [],
              thinkingDefault: 'high'
            }
          },
          {
            name: 'qa_reviewer',
            config: {
              agentType: 'qa_reviewer',
              tools: ['Read', 'Bash', 'Glob', 'Grep'],
              mcpServers: [],
              mcpServersOptional: ['context7'],
              autoClaudeTools: [],
              thinkingDefault: 'low'
            }
          },
          {
            name: 'spec_gatherer',
            config: {
              agentType: 'spec_gatherer',
              tools: ['Read', 'Glob', 'Grep'],
              mcpServers: ['context7'],
              mcpServersOptional: ['linear'],
              autoClaudeTools: [],
              thinkingDefault: 'medium'
            }
          }
        ];

        for (const agentConfig of defaultAgentConfigs) {
          components.push({
            type: 'AUTO_CLAUDE_AGENT_CONFIG',
            name: agentConfig.name,
            config: agentConfig.config,
          });
        }

        // Add basic prompts for each agent type
        const defaultPrompts = [
          {
            name: 'coder',
            promptContent: '# Coder Agent\n\nYou are the implementation specialist. Your role is to write clean, efficient, and well-tested code based on specifications and plans.\n\n## Responsibilities\n- Implement features according to specifications\n- Write clean, maintainable code\n- Add appropriate tests\n- Follow existing code patterns\n- Handle edge cases and errors gracefully\n\n## Context\n{{specDirectory}} - Current spec directory\n{{projectContext}} - Project analysis results'
          },
          {
            name: 'planner',
            promptContent: '# Planner Agent\n\nYou are the planning specialist. Your role is to analyze requirements and create detailed implementation plans.\n\n## Responsibilities\n- Analyze requirements and specifications\n- Break down complex tasks into manageable steps\n- Identify dependencies and risks\n- Create actionable implementation plans\n- Consider architectural implications\n\n## Context\n{{specDirectory}} - Current spec directory\n{{projectContext}} - Project analysis results'
          },
          {
            name: 'qa_reviewer',
            promptContent: '# QA Reviewer Agent\n\nYou are the quality assurance specialist. Your role is to review code, test implementations, and ensure quality standards.\n\n## Responsibilities\n- Review code for quality and correctness\n- Test implementations thoroughly\n- Identify bugs and potential issues\n- Verify requirements are met\n- Suggest improvements\n\n## Context\n{{specDirectory}} - Current spec directory\n{{projectContext}} - Project analysis results'
          },
          {
            name: 'spec_gatherer',
            promptContent: '# Spec Gatherer Agent\n\nYou are the requirements specialist. Your role is to gather, analyze, and document requirements and specifications.\n\n## Responsibilities\n- Gather and document requirements\n- Analyze existing code and documentation\n- Identify missing requirements\n- Create comprehensive specifications\n- Ensure clarity and completeness\n\n## Context\n{{specDirectory}} - Current spec directory\n{{projectContext}} - Project analysis results'
          }
        ];

        for (const prompt of defaultPrompts) {
          components.push({
            type: 'AUTO_CLAUDE_PROMPT',
            name: prompt.name,
            config: {
              agentType: prompt.name,
              promptContent: prompt.promptContent,
              injectionPoints: {
                specDirectory: true,
                projectContext: true,
                mcpDocumentation: false,
              },
            },
          });
        }
      }
    }

    // Generate files
    const files = generateProjectFiles({
      projectName: validated.projectName,
      projectDescription: validated.projectDescription,
      claudeMdTemplate: profile.claudeMdTemplate,
      components,
    });

    // Generate summary
    const summary = generateSummary(components);

    return NextResponse.json({
      files,
      summary,
      profile: {
        id: profile.id,
        name: profile.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate files' },
      { status: 500 }
    );
  }
}
