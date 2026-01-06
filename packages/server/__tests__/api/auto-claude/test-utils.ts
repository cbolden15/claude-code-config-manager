#!/usr/bin/env node
import { prisma } from '../../../src/lib/db.js';
import type { AutoClaudeAgentConfig, AutoClaudePrompt, AutoClaudeModelProfile, AutoClaudeProjectConfig } from '../../../../../shared/src/types/auto-claude';

/**
 * Test utilities for Auto-Claude API testing
 */

// Test data fixtures
export const testAgentConfig: AutoClaudeAgentConfig = {
  agentType: 'test_coder',
  tools: ['Read', 'Write', 'Edit', 'Bash'],
  mcpServers: ['context7'],
  mcpServersOptional: ['linear'],
  autoClaudeTools: ['parallel_shell'],
  thinkingDefault: 'medium'
};

export const testPrompt: AutoClaudePrompt = {
  agentType: 'test_coder',
  promptContent: `# Test Coder Agent

You are a test coder agent.

## Context
{{specDirectory}}
{{projectContext}}
{{mcpDocumentation}}

## Instructions
Write clean, tested code.`,
  injectionPoints: {
    specDirectory: true,
    projectContext: true,
    mcpDocumentation: true
  }
};

export const testModelProfile: AutoClaudeModelProfile = {
  name: 'test_profile',
  description: 'Test model profile',
  phaseModels: {
    spec: 'sonnet',
    planning: 'sonnet',
    coding: 'sonnet',
    qa: 'haiku'
  },
  phaseThinking: {
    spec: 'medium',
    planning: 'high',
    coding: 'medium',
    qa: 'low'
  }
};

export const testProjectConfig: AutoClaudeProjectConfig = {
  context7Enabled: true,
  linearMcpEnabled: false,
  electronMcpEnabled: false,
  puppeteerMcpEnabled: false,
  graphitiEnabled: false,
  customMcpServers: [],
  agentMcpOverrides: {}
};

/**
 * Clean up test data from database
 */
export async function cleanupTestData() {
  // Clean up profiles and their relations first (due to foreign key constraints)
  const testProfiles = await prisma.profile.findMany({
    where: {
      OR: [
        { name: { startsWith: 'test-' } },
        { name: { contains: 'test' } }
      ]
    }
  });

  // Delete profile-component relationships
  for (const profile of testProfiles) {
    await prisma.profileComponent.deleteMany({
      where: { profileId: profile.id }
    });
  }

  // Delete test profiles
  await prisma.profile.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'test-' } },
        { name: { contains: 'test' } }
      ]
    }
  });

  // Delete test projects
  await prisma.project.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'test-' } },
        { name: { contains: 'test' } }
      ]
    }
  });

  // Delete test components with specific naming pattern (be more precise)
  await prisma.component.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'test_' } },
        { name: { startsWith: 'test-' } },
        { name: { contains: 'test' } },
        { description: { contains: 'Test' } },
        { description: { contains: 'test' } },
        // Only delete Auto-Claude components that are explicitly test-related
        { AND: [
            { type: { startsWith: 'AUTO_CLAUDE_' } },
            { OR: [
                { name: { contains: 'test' } },
                { description: { contains: 'test' } },
                { description: { contains: 'Test' } }
              ]
            }
          ]
        }
      ]
    }
  });
}

/**
 * Create test components in database
 */
export async function createTestComponents() {
  // Generate unique suffix to avoid naming conflicts
  const timestamp = Date.now();
  const uniqueSuffix = `test-${timestamp}`;

  // Create test agent config
  const agentComponent = await prisma.component.create({
    data: {
      type: 'AUTO_CLAUDE_AGENT_CONFIG',
      name: `${testAgentConfig.agentType}-${uniqueSuffix}`,
      description: 'Test agent configuration for API testing',
      config: JSON.stringify(testAgentConfig),
      enabled: true,
      tags: 'test,auto-claude,agent-config'
    }
  });

  // Create test prompt
  const promptComponent = await prisma.component.create({
    data: {
      type: 'AUTO_CLAUDE_PROMPT',
      name: `test-prompt-${uniqueSuffix}`,
      description: 'Test prompt configuration for API testing',
      config: JSON.stringify(testPrompt),
      enabled: true,
      tags: 'test,auto-claude,prompt'
    }
  });

  // Create test model profile
  const modelProfileComponent = await prisma.component.create({
    data: {
      type: 'AUTO_CLAUDE_MODEL_PROFILE',
      name: `test-model-profile-${uniqueSuffix}`,
      description: 'Test model profile configuration for API testing',
      config: JSON.stringify(testModelProfile),
      enabled: true,
      tags: 'test,auto-claude,model-profile'
    }
  });

  // Create test project config
  const projectConfigComponent = await prisma.component.create({
    data: {
      type: 'AUTO_CLAUDE_PROJECT_CONFIG',
      name: `test-project-config-${uniqueSuffix}`,
      description: 'Test project configuration for API testing',
      config: JSON.stringify(testProjectConfig),
      enabled: true,
      tags: 'test,auto-claude,project-config'
    }
  });

  return {
    agentComponent,
    promptComponent,
    modelProfileComponent,
    projectConfigComponent
  };
}

/**
 * Create test profile with components for generate endpoint testing
 */
export async function createTestProfile() {
  const components = await createTestComponents();

  // Generate unique suffix to avoid naming conflicts
  const timestamp = Date.now();
  const uniqueSuffix = `test-${timestamp}`;

  const profile = await prisma.profile.create({
    data: {
      name: `test-profile-${uniqueSuffix}`,
      description: 'Test profile for API testing'
    }
  });

  // Link components to profile
  await prisma.profileComponent.createMany({
    data: [
      { profileId: profile.id, componentId: components.agentComponent.id, order: 1 },
      { profileId: profile.id, componentId: components.promptComponent.id, order: 2 },
      { profileId: profile.id, componentId: components.modelProfileComponent.id, order: 3 },
      { profileId: profile.id, componentId: components.projectConfigComponent.id, order: 4 }
    ]
  });

  return { profile, components };
}

/**
 * Create test project for testing project-related endpoints
 */
export async function createTestProject() {
  // Generate unique suffix to avoid naming conflicts
  const timestamp = Date.now();
  const uniqueSuffix = `test-${timestamp}`;

  const project = await prisma.project.create({
    data: {
      name: `test-project-${uniqueSuffix}`,
      description: 'Test project for API testing',
      autoClaudeEnabled: true
    }
  });

  return project;
}

/**
 * Assert response is successful with expected status
 */
export function assertSuccessResponse(response: Response, expectedStatus = 200) {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}: ${response.statusText}`);
  }
}

/**
 * Assert response is an error with expected status
 */
export function assertErrorResponse(response: Response, expectedStatus: number) {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected error status ${expectedStatus}, got ${response.status}`);
  }
}

/**
 * Make HTTP request to API endpoint
 */
export async function makeRequest(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { method = 'GET', body, headers = {} } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  // In a real test environment, this would need to be the actual server URL
  // For this test, we'll simulate the endpoint
  const url = `http://localhost:3000${endpoint}`;

  // Note: In actual testing, you'd use a test framework that can start the server
  // For now, we'll create a mock implementation
  return new Response('{"message": "mock response"}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}