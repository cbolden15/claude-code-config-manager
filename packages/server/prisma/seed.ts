import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================================================
  // MCP Servers
  // ============================================================================

  const mcpGithub = await prisma.component.upsert({
    where: { type_name: { type: 'MCP_SERVER', name: 'github' } },
    update: {},
    create: {
      type: 'MCP_SERVER',
      name: 'github',
      description: 'GitHub integration for repository operations, issues, PRs, and actions',
      config: JSON.stringify({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: {
          GITHUB_TOKEN: '${GITHUB_TOKEN}',
        },
        requiredSecrets: ['GITHUB_TOKEN'],
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
      }),
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      version: '1.0.0',
      tags: 'git,vcs,collaboration,github',
    },
  });

  const mcpPostgres = await prisma.component.upsert({
    where: { type_name: { type: 'MCP_SERVER', name: 'postgres' } },
    update: {},
    create: {
      type: 'MCP_SERVER',
      name: 'postgres',
      description: 'PostgreSQL database integration for queries and schema inspection',
      config: JSON.stringify({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-postgres'],
        env: {
          DATABASE_URL: '${DATABASE_URL}',
        },
        requiredSecrets: ['DATABASE_URL'],
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
      }),
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      version: '1.0.0',
      tags: 'database,sql,postgres',
    },
  });

  const mcpFilesystem = await prisma.component.upsert({
    where: { type_name: { type: 'MCP_SERVER', name: 'filesystem' } },
    update: {},
    create: {
      type: 'MCP_SERVER',
      name: 'filesystem',
      description: 'Secure file system access with configurable permissions',
      config: JSON.stringify({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/dir'],
        env: {},
        requiredSecrets: [],
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
      }),
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      version: '1.0.0',
      tags: 'files,filesystem,local',
    },
  });

  const mcpN8n = await prisma.component.upsert({
    where: { type_name: { type: 'MCP_SERVER', name: 'n8n' } },
    update: {},
    create: {
      type: 'MCP_SERVER',
      name: 'n8n',
      description: 'n8n workflow automation integration',
      config: JSON.stringify({
        type: 'streamable-http',
        url: '${N8N_MCP_URL}',
        requiredSecrets: ['N8N_MCP_URL'],
        documentation: 'https://docs.n8n.io/integrations/mcp/',
      }),
      sourceUrl: 'https://n8n.io',
      version: '1.0.0',
      tags: 'automation,workflows,n8n',
    },
  });

  // ============================================================================
  // Subagents
  // ============================================================================

  const subagentSecurityReviewer = await prisma.component.upsert({
    where: { type_name: { type: 'SUBAGENT', name: 'security-reviewer' } },
    update: {},
    create: {
      type: 'SUBAGENT',
      name: 'security-reviewer',
      description: 'Reviews code for security vulnerabilities and best practices',
      config: JSON.stringify({
        name: 'Security Reviewer',
        description: 'Reviews code for security vulnerabilities',
        tools: ['Read', 'Grep', 'Glob'],
        model: 'claude-sonnet-4-20250514',
        instructions: `You are a security-focused code reviewer. Your job is to:

1. Identify potential security vulnerabilities
2. Check for common issues (SQL injection, XSS, CSRF, etc.)
3. Review authentication and authorization logic
4. Flag any hardcoded secrets or credentials

When reviewing, be thorough but prioritize high-severity issues.
Always explain WHY something is a vulnerability, not just WHAT.`,
      }),
      tags: 'security,review,audit',
    },
  });

  const subagentCodeReviewer = await prisma.component.upsert({
    where: { type_name: { type: 'SUBAGENT', name: 'code-reviewer' } },
    update: {},
    create: {
      type: 'SUBAGENT',
      name: 'code-reviewer',
      description: 'Reviews code for quality, maintainability, and best practices',
      config: JSON.stringify({
        name: 'Code Reviewer',
        description: 'Reviews code for quality and best practices',
        tools: ['Read', 'Grep', 'Glob'],
        model: 'claude-sonnet-4-20250514',
        instructions: `You are a code quality reviewer. Focus on:

1. Code readability and maintainability
2. Design patterns and architecture
3. Performance considerations
4. Test coverage suggestions
5. Documentation needs

Provide constructive feedback with specific improvement suggestions.`,
      }),
      tags: 'review,quality,code',
    },
  });

  const subagentBlockchainExpert = await prisma.component.upsert({
    where: { type_name: { type: 'SUBAGENT', name: 'blockchain-expert' } },
    update: {},
    create: {
      type: 'SUBAGENT',
      name: 'blockchain-expert',
      description: 'Specializes in Solidity, smart contracts, and Web3 development',
      config: JSON.stringify({
        name: 'Blockchain Expert',
        description: 'Expert in Solidity and Web3 development',
        tools: ['Read', 'Edit', 'Grep', 'Glob', 'Bash'],
        model: 'claude-sonnet-4-20250514',
        instructions: `You are a blockchain development expert. Your expertise includes:

1. Solidity smart contract development
2. Gas optimization techniques
3. Security patterns (reentrancy guards, access control)
4. ERC standards (ERC20, ERC721, ERC1155)
5. Testing with Hardhat/Foundry
6. DeFi protocols and patterns

Always prioritize security and gas efficiency in your recommendations.`,
      }),
      tags: 'blockchain,solidity,web3,ethereum',
    },
  });

  // ============================================================================
  // Skills
  // ============================================================================

  const skillApiDocs = await prisma.component.upsert({
    where: { type_name: { type: 'SKILL', name: 'api-documentation' } },
    update: {},
    create: {
      type: 'SKILL',
      name: 'api-documentation',
      description: 'Generates OpenAPI documentation from code',
      config: JSON.stringify({
        name: 'API Documentation Generator',
        description: 'Generates OpenAPI documentation from code',
        triggers: ['generate api docs', 'document this api', 'create openapi spec'],
        instructions: `# API Documentation Generator

When asked to generate API documentation, follow these steps:

1. Scan for route definitions in the codebase
2. Extract request/response types from TypeScript interfaces
3. Generate OpenAPI 3.0 spec
4. Output as YAML

## Output Format

Always generate valid OpenAPI 3.0 YAML with:
- Info section with title and version
- Paths for each endpoint
- Schemas for all request/response types
- Examples where available`,
      }),
      tags: 'documentation,api,openapi',
    },
  });

  // ============================================================================
  // Commands
  // ============================================================================

  const commandDeploy = await prisma.component.upsert({
    where: { type_name: { type: 'COMMAND', name: 'deploy' } },
    update: {},
    create: {
      type: 'COMMAND',
      name: 'deploy',
      description: 'Guided deployment workflow',
      config: JSON.stringify({
        name: 'deploy',
        description: 'Deploy the application to production',
        prompt: `Please help me deploy the application:

1. Run the test suite and ensure all tests pass
2. Build the production bundle
3. Run database migrations if any are pending
4. Deploy to the production server
5. Verify the deployment is healthy

If any step fails, stop and report the issue.`,
      }),
      tags: 'deployment,ci,workflow',
    },
  });

  const commandReview = await prisma.component.upsert({
    where: { type_name: { type: 'COMMAND', name: 'review' } },
    update: {},
    create: {
      type: 'COMMAND',
      name: 'review',
      description: 'Comprehensive code review workflow',
      config: JSON.stringify({
        name: 'review',
        description: 'Run a comprehensive code review',
        prompt: `Please perform a comprehensive code review:

1. Check for security vulnerabilities
2. Review code quality and maintainability
3. Verify test coverage
4. Check for performance issues
5. Ensure documentation is up to date

Provide a summary with prioritized action items.`,
      }),
      tags: 'review,quality,workflow',
    },
  });

  // ============================================================================
  // Hooks
  // ============================================================================

  const hookAutoFormat = await prisma.component.upsert({
    where: { type_name: { type: 'HOOK', name: 'auto-format' } },
    update: {},
    create: {
      type: 'HOOK',
      name: 'auto-format',
      description: 'Auto-format files after edits',
      config: JSON.stringify({
        hookType: 'PostToolUse',
        matcher: 'Edit|Write',
        command: 'npx prettier --write "$FILE"',
        description: 'Auto-format after file changes',
      }),
      tags: 'formatting,prettier,automation',
    },
  });

  // ============================================================================
  // CLAUDE.md Templates
  // ============================================================================

  const templateGeneral = await prisma.component.upsert({
    where: { type_name: { type: 'CLAUDE_MD_TEMPLATE', name: 'general' } },
    update: {},
    create: {
      type: 'CLAUDE_MD_TEMPLATE',
      name: 'general',
      description: 'General purpose project template',
      config: JSON.stringify({
        name: 'General Project',
        description: 'A general purpose CLAUDE.md template',
        content: `# Project: {{projectName}}

## Overview
{{projectDescription}}

## Tech Stack
- Add your technologies here

## Conventions
- Use consistent code formatting
- Write clear commit messages
- Document public APIs

## Commands
- \`npm run dev\` - Start development server
- \`npm run build\` - Production build
- \`npm run test\` - Run tests`,
        placeholders: [
          { name: 'projectName', description: 'Name of the project' },
          { name: 'projectDescription', description: 'Brief description of the project', default: 'A new project' },
        ],
      }),
      tags: 'template,general',
    },
  });

  const templateBlockchain = await prisma.component.upsert({
    where: { type_name: { type: 'CLAUDE_MD_TEMPLATE', name: 'blockchain' } },
    update: {},
    create: {
      type: 'CLAUDE_MD_TEMPLATE',
      name: 'blockchain',
      description: 'Blockchain/Web3 project template',
      config: JSON.stringify({
        name: 'Blockchain Project',
        description: 'Template for Solidity and Web3 projects',
        content: `# Project: {{projectName}}

## Overview
{{projectDescription}}

## Tech Stack
- Solidity / Ethereum
- TypeScript
- Hardhat / Foundry

## Conventions
- Use OpenZeppelin contracts where possible
- All amounts in wei unless otherwise noted
- Test coverage must be >90%

## Security
- Never commit private keys
- Use environment variables for RPC URLs
- All external calls must be checked for reentrancy

## Commands
- \`npx hardhat compile\` - Compile contracts
- \`npx hardhat test\` - Run tests
- \`npx hardhat deploy\` - Deploy contracts`,
        placeholders: [
          { name: 'projectName', description: 'Name of the project' },
          { name: 'projectDescription', description: 'Brief description of the project', default: 'A Web3 project' },
        ],
      }),
      tags: 'template,blockchain,web3',
    },
  });

  // ============================================================================
  // Profiles
  // ============================================================================

  const profileGeneral = await prisma.profile.upsert({
    where: { name: 'general' },
    update: {},
    create: {
      name: 'general',
      description: 'General purpose development profile with essential tools',
      claudeMdTemplate: templateGeneral.config,
    },
  });

  const profileBlockchain = await prisma.profile.upsert({
    where: { name: 'blockchain' },
    update: {},
    create: {
      name: 'blockchain',
      description: 'Profile for blockchain and Web3 development projects',
      claudeMdTemplate: templateBlockchain.config,
    },
  });

  const profileAutomation = await prisma.profile.upsert({
    where: { name: 'automation' },
    update: {},
    create: {
      name: 'automation',
      description: 'Profile for automation and workflow projects with n8n integration',
      claudeMdTemplate: templateGeneral.config,
    },
  });

  // ============================================================================
  // Profile-Component Relationships
  // ============================================================================

  // General profile: github, filesystem, code-reviewer, security-reviewer
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileGeneral.id, componentId: mcpGithub.id } },
    update: {},
    create: { profileId: profileGeneral.id, componentId: mcpGithub.id, order: 0 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileGeneral.id, componentId: mcpFilesystem.id } },
    update: {},
    create: { profileId: profileGeneral.id, componentId: mcpFilesystem.id, order: 1 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileGeneral.id, componentId: subagentCodeReviewer.id } },
    update: {},
    create: { profileId: profileGeneral.id, componentId: subagentCodeReviewer.id, order: 2 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileGeneral.id, componentId: subagentSecurityReviewer.id } },
    update: {},
    create: { profileId: profileGeneral.id, componentId: subagentSecurityReviewer.id, order: 3 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileGeneral.id, componentId: commandReview.id } },
    update: {},
    create: { profileId: profileGeneral.id, componentId: commandReview.id, order: 4 },
  });

  // Blockchain profile: github, postgres, security-reviewer, blockchain-expert, deploy
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileBlockchain.id, componentId: mcpGithub.id } },
    update: {},
    create: { profileId: profileBlockchain.id, componentId: mcpGithub.id, order: 0 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileBlockchain.id, componentId: mcpPostgres.id } },
    update: {},
    create: { profileId: profileBlockchain.id, componentId: mcpPostgres.id, order: 1 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileBlockchain.id, componentId: subagentSecurityReviewer.id } },
    update: {},
    create: { profileId: profileBlockchain.id, componentId: subagentSecurityReviewer.id, order: 2 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileBlockchain.id, componentId: subagentBlockchainExpert.id } },
    update: {},
    create: { profileId: profileBlockchain.id, componentId: subagentBlockchainExpert.id, order: 3 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileBlockchain.id, componentId: commandDeploy.id } },
    update: {},
    create: { profileId: profileBlockchain.id, componentId: commandDeploy.id, order: 4 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileBlockchain.id, componentId: skillApiDocs.id } },
    update: {},
    create: { profileId: profileBlockchain.id, componentId: skillApiDocs.id, order: 5 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileBlockchain.id, componentId: hookAutoFormat.id } },
    update: {},
    create: { profileId: profileBlockchain.id, componentId: hookAutoFormat.id, order: 6 },
  });

  // Automation profile: github, n8n, filesystem, code-reviewer
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileAutomation.id, componentId: mcpGithub.id } },
    update: {},
    create: { profileId: profileAutomation.id, componentId: mcpGithub.id, order: 0 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileAutomation.id, componentId: mcpN8n.id } },
    update: {},
    create: { profileId: profileAutomation.id, componentId: mcpN8n.id, order: 1 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileAutomation.id, componentId: mcpFilesystem.id } },
    update: {},
    create: { profileId: profileAutomation.id, componentId: mcpFilesystem.id, order: 2 },
  });
  await prisma.profileComponent.upsert({
    where: { profileId_componentId: { profileId: profileAutomation.id, componentId: subagentCodeReviewer.id } },
    update: {},
    create: { profileId: profileAutomation.id, componentId: subagentCodeReviewer.id, order: 3 },
  });

  // ============================================================================
  // Default Settings
  // ============================================================================

  await prisma.setting.upsert({
    where: { key: 'defaultProfile' },
    update: {},
    create: {
      key: 'defaultProfile',
      value: JSON.stringify('general'),
    },
  });

  await prisma.setting.upsert({
    where: { key: 'serverInfo' },
    update: {},
    create: {
      key: 'serverInfo',
      value: JSON.stringify({
        name: 'CCM Server',
        version: '0.1.0',
        setupComplete: true,
      }),
    },
  });

  console.log('Seeding complete!');
  console.log({
    components: await prisma.component.count(),
    profiles: await prisma.profile.count(),
    profileComponents: await prisma.profileComponent.count(),
    settings: await prisma.setting.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
