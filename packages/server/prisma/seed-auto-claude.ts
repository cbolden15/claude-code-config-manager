import { PrismaClient } from '@prisma/client';
import type { AutoClaudeAgentConfig, AutoClaudePrompt, AutoClaudeModelProfile, AutoClaudeProjectConfig } from '../../shared/src/types/auto-claude';

const prisma = new PrismaClient();

/**
 * Seeds Auto-Claude components: agent configs, prompts, model profiles, and project configs
 */
export async function seedAutoClaudeComponents() {
  console.log('Seeding Auto-Claude components...');

  // ============================================================================
  // Agent Configurations (~15 agent configs from Auto-Claude AGENT_CONFIGS)
  // ============================================================================

  const agentCoder = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'coder' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'coder',
      description: 'Main coding agent for implementation, file editing, and development tasks',
      config: JSON.stringify({
        agentType: 'coder',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear', 'graphiti'],
        autoClaudeTools: ['parallel_shell'],
        thinkingDefault: 'medium'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'coding,development,implementation',
    },
  });

  const agentPlanner = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'planner' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'planner',
      description: 'Planning and architecture agent for task breakdown and system design',
      config: JSON.stringify({
        agentType: 'planner',
        tools: ['Read', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear'],
        autoClaudeTools: [],
        thinkingDefault: 'high'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'planning,architecture,design',
    },
  });

  const agentQaReviewer = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'qa_reviewer' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'qa_reviewer',
      description: 'Quality assurance agent for code review and testing validation',
      config: JSON.stringify({
        agentType: 'qa_reviewer',
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
        mcpServers: [],
        mcpServersOptional: ['context7'],
        autoClaudeTools: [],
        thinkingDefault: 'low'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'qa,testing,quality,review',
    },
  });

  const agentSpecGatherer = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'spec_gatherer' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'spec_gatherer',
      description: 'Requirements gathering agent for analyzing specifications and user needs',
      config: JSON.stringify({
        agentType: 'spec_gatherer',
        tools: ['Read', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear'],
        autoClaudeTools: [],
        thinkingDefault: 'medium'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'requirements,analysis,specification',
    },
  });

  const agentTestWriter = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'test_writer' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'test_writer',
      description: 'Testing specialist agent for writing unit tests, integration tests, and test suites',
      config: JSON.stringify({
        agentType: 'test_writer',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'testing,unit_tests,integration_tests',
    },
  });

  const agentDocumentationWriter = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'documentation_writer' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'documentation_writer',
      description: 'Documentation agent for creating and maintaining project documentation',
      config: JSON.stringify({
        agentType: 'documentation_writer',
        tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'low'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'documentation,writing,readme',
    },
  });

  const agentDebugSpecialist = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'debug_specialist' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'debug_specialist',
      description: 'Debugging specialist agent for troubleshooting and error analysis',
      config: JSON.stringify({
        agentType: 'debug_specialist',
        tools: ['Read', 'Edit', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'high'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'debugging,troubleshooting,errors',
    },
  });

  const agentPerformanceOptimizer = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'performance_optimizer' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'performance_optimizer',
      description: 'Performance optimization agent for analyzing and improving code efficiency',
      config: JSON.stringify({
        agentType: 'performance_optimizer',
        tools: ['Read', 'Edit', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'high'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'performance,optimization,efficiency',
    },
  });

  const agentSecurityAuditor = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'security_auditor' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'security_auditor',
      description: 'Security audit agent for identifying vulnerabilities and compliance issues',
      config: JSON.stringify({
        agentType: 'security_auditor',
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'high'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'security,audit,vulnerability,compliance',
    },
  });

  const agentUiUxDesigner = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'ui_ux_designer' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'ui_ux_designer',
      description: 'UI/UX design agent for frontend components and user experience improvements',
      config: JSON.stringify({
        agentType: 'ui_ux_designer',
        tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
        mcpServers: [],
        mcpServersOptional: ['context7'],
        autoClaudeTools: [],
        thinkingDefault: 'medium'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'ui,ux,design,frontend',
    },
  });

  const agentApiDeveloper = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'api_developer' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'api_developer',
      description: 'API development agent for designing and implementing REST APIs and services',
      config: JSON.stringify({
        agentType: 'api_developer',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'api,backend,rest,services',
    },
  });

  const agentDataAnalyst = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'data_analyst' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'data_analyst',
      description: 'Data analysis agent for processing data, creating reports, and insights',
      config: JSON.stringify({
        agentType: 'data_analyst',
        tools: ['Read', 'Write', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'data,analysis,reports,insights',
    },
  });

  const agentDevopsEngineer = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'devops_engineer' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'devops_engineer',
      description: 'DevOps agent for deployment, CI/CD, infrastructure, and automation',
      config: JSON.stringify({
        agentType: 'devops_engineer',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        mcpServers: [],
        mcpServersOptional: ['context7'],
        autoClaudeTools: [],
        thinkingDefault: 'medium'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'devops,deployment,cicd,infrastructure',
    },
  });

  const agentReviewer = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'reviewer' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'reviewer',
      description: 'General code review agent for comprehensive code analysis and feedback',
      config: JSON.stringify({
        agentType: 'reviewer',
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'review,analysis,feedback',
    },
  });

  const agentResearcher = await prisma.component.upsert({
    where: { type_name: { type: 'AUTO_CLAUDE_AGENT_CONFIG', name: 'researcher' } },
    update: {},
    create: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: 'researcher',
      description: 'Research agent for discovering solutions, best practices, and technical insights',
      config: JSON.stringify({
        agentType: 'researcher',
        tools: ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'high'
      } as AutoClaudeAgentConfig),
      sourceUrl: 'auto-claude-defaults',
      version: '1.0.0',
      tags: 'research,discovery,best_practices',
    },
  });

  console.log('Auto-Claude agent configurations seeded!');
  console.log({
    agentConfigs: 15,
  });

  return {
    agentCoder,
    agentPlanner,
    agentQaReviewer,
    agentSpecGatherer,
    agentTestWriter,
    agentDocumentationWriter,
    agentDebugSpecialist,
    agentPerformanceOptimizer,
    agentSecurityAuditor,
    agentUiUxDesigner,
    agentApiDeveloper,
    agentDataAnalyst,
    agentDevopsEngineer,
    agentReviewer,
    agentResearcher,
  };
}