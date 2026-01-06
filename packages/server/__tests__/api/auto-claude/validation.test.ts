#!/usr/bin/env node
import assert from 'node:assert';
import { prisma } from '../../../src/lib/db.ts';
import { cleanupTestData } from './test-utils.ts';
import { POST as AgentsPOST } from '../../../src/app/api/auto-claude/agents/route.ts';
import { POST as PromptsPOST } from '../../../src/app/api/auto-claude/prompts/route.ts';
import { POST as ProfilesPOST } from '../../../src/app/api/auto-claude/model-profiles/route.ts';

/**
 * Helper to create mock NextRequest
 */
function createMockRequest(url: string, options: {
  method?: string;
  body?: unknown;
} = {}) {
  const { method = 'GET', body } = options;
  const mockUrl = new URL(url, 'http://localhost:3000');

  return {
    method,
    url: mockUrl.toString(),
    nextUrl: mockUrl,
    json: async () => body || {},
    headers: new Headers({ 'Content-Type': 'application/json' })
  } as any;
}

/**
 * Helper to get response JSON
 */
async function getResponseJSON(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

/**
 * Test validation and error handling for all Auto-Claude endpoints
 */
async function runValidationTests() {
  console.log('🧪 Testing Auto-Claude API validation and error handling...\n');

  // Setup: Clean database before tests
  await cleanupTestData();

  try {
    // Test Agent Config Validation
    await testAgentConfigValidation();

    // Test Prompt Validation
    await testPromptValidation();

    // Test Model Profile Validation
    await testModelProfileValidation();

    // Test Database Constraint Validation
    await testDatabaseConstraints();

    console.log('🎉 All validation and error handling tests passed!\n');

  } finally {
    // Cleanup: Clean database after tests
    await cleanupTestData();
  }
}

/**
 * Test Agent Config validation scenarios
 */
async function testAgentConfigValidation() {
  console.log('Test Group 1: Agent Config validation');

  // Test 1.1: Missing required fields
  console.log('  Test 1.1: Missing required agentType');
  const missingAgentTypeRequest = createMockRequest('/api/auto-claude/agents', {
    method: 'POST',
    body: {
      tools: ['Read', 'Write'],
      mcpServers: ['context7'],
      mcpServersOptional: [],
      autoClaudeTools: [],
      thinkingDefault: 'medium'
    }
  });

  const missingAgentTypeResponse = await AgentsPOST(missingAgentTypeRequest);
  assert.strictEqual(missingAgentTypeResponse.status, 400);

  const errorData = await getResponseJSON(missingAgentTypeResponse);
  assert(errorData.error === 'Validation failed');
  console.log('    ✅ Missing agentType properly rejected');

  // Test 1.2: Invalid agentType (empty string)
  console.log('  Test 1.2: Invalid agentType (empty string)');
  const emptyAgentTypeRequest = createMockRequest('/api/auto-claude/agents', {
    method: 'POST',
    body: {
      agentType: '',
      tools: ['Read'],
      mcpServers: ['context7'],
      mcpServersOptional: [],
      autoClaudeTools: [],
      thinkingDefault: 'medium'
    }
  });

  const emptyAgentTypeResponse = await AgentsPOST(emptyAgentTypeRequest);
  assert.strictEqual(emptyAgentTypeResponse.status, 400);
  console.log('    ✅ Empty agentType properly rejected');

  // Test 1.3: Invalid tools array (not strings)
  console.log('  Test 1.3: Invalid tools array');
  const invalidToolsRequest = createMockRequest('/api/auto-claude/agents', {
    method: 'POST',
    body: {
      agentType: 'test_agent',
      tools: ['Read', 123, null], // Mixed types
      mcpServers: ['context7'],
      mcpServersOptional: [],
      autoClaudeTools: [],
      thinkingDefault: 'medium'
    }
  });

  const invalidToolsResponse = await AgentsPOST(invalidToolsRequest);
  assert.strictEqual(invalidToolsResponse.status, 400);
  console.log('    ✅ Invalid tools array properly rejected');

  // Test 1.4: Invalid thinkingDefault value
  console.log('  Test 1.4: Invalid thinkingDefault value');
  const invalidThinkingRequest = createMockRequest('/api/auto-claude/agents', {
    method: 'POST',
    body: {
      agentType: 'test_agent',
      tools: ['Read'],
      mcpServers: ['context7'],
      mcpServersOptional: [],
      autoClaudeTools: [],
      thinkingDefault: 'invalid' // Not in enum
    }
  });

  const invalidThinkingResponse = await AgentsPOST(invalidThinkingRequest);
  assert.strictEqual(invalidThinkingResponse.status, 400);
  console.log('    ✅ Invalid thinkingDefault properly rejected');

  // Test 1.5: Extra unknown fields (should be filtered out)
  console.log('  Test 1.5: Extra unknown fields');
  const extraFieldsRequest = createMockRequest('/api/auto-claude/agents', {
    method: 'POST',
    body: {
      agentType: 'test_agent_extra',
      tools: ['Read'],
      mcpServers: ['context7'],
      mcpServersOptional: [],
      autoClaudeTools: [],
      thinkingDefault: 'medium',
      unknownField: 'should-be-ignored',
      anotherField: 123
    }
  });

  const extraFieldsResponse = await AgentsPOST(extraFieldsRequest);
  assert.strictEqual(extraFieldsResponse.status, 201); // Should succeed but ignore extra fields

  const extraFieldsData = await getResponseJSON(extraFieldsResponse);
  assert(extraFieldsData.config.unknownField === undefined);
  console.log('    ✅ Extra unknown fields properly filtered');

  console.log('  ✅ Agent Config validation tests completed\n');
}

/**
 * Test Prompt validation scenarios
 */
async function testPromptValidation() {
  console.log('Test Group 2: Prompt validation');

  // Test 2.1: Missing required fields
  console.log('  Test 2.1: Missing required agentType');
  const missingAgentTypeRequest = createMockRequest('/api/auto-claude/prompts', {
    method: 'POST',
    body: {
      promptContent: 'Test prompt content',
      injectionPoints: {}
    }
  });

  const missingAgentTypeResponse = await PromptsPOST(missingAgentTypeRequest);
  assert.strictEqual(missingAgentTypeResponse.status, 400);
  console.log('    ✅ Missing agentType properly rejected');

  // Test 2.2: Missing promptContent
  console.log('  Test 2.2: Missing promptContent');
  const missingContentRequest = createMockRequest('/api/auto-claude/prompts', {
    method: 'POST',
    body: {
      agentType: 'test_agent',
      injectionPoints: {}
    }
  });

  const missingContentResponse = await PromptsPOST(missingContentRequest);
  assert.strictEqual(missingContentResponse.status, 400);
  console.log('    ✅ Missing promptContent properly rejected');

  // Test 2.3: Empty promptContent
  console.log('  Test 2.3: Empty promptContent');
  const emptyContentRequest = createMockRequest('/api/auto-claude/prompts', {
    method: 'POST',
    body: {
      agentType: 'test_agent',
      promptContent: '',
      injectionPoints: {}
    }
  });

  const emptyContentResponse = await PromptsPOST(emptyContentRequest);
  assert.strictEqual(emptyContentResponse.status, 400);
  console.log('    ✅ Empty promptContent properly rejected');

  // Test 2.4: Invalid injection points (wrong structure)
  console.log('  Test 2.4: Invalid injection points');
  const invalidInjectionPointsRequest = createMockRequest('/api/auto-claude/prompts', {
    method: 'POST',
    body: {
      agentType: 'test_agent',
      promptContent: 'Test content with {{specDirectory}}',
      injectionPoints: ['specDirectory', 123, null] // Should be object, not array
    }
  });

  const invalidInjectionPointsResponse = await PromptsPOST(invalidInjectionPointsRequest);
  assert.strictEqual(invalidInjectionPointsResponse.status, 400);
  console.log('    ✅ Invalid injection points properly rejected');

  // Test 2.5: Valid prompt with injection points
  console.log('  Test 2.5: Valid prompt with injection points');
  const validPromptRequest = createMockRequest('/api/auto-claude/prompts', {
    method: 'POST',
    body: {
      agentType: 'test_valid_agent',
      promptContent: `# Test Agent

      Content with {{specDirectory}} and {{projectContext}}.`,
      injectionPoints: {
        specDirectory: true,
        projectContext: true,
        mcpDocumentation: false
      }
    }
  });

  const validPromptResponse = await PromptsPOST(validPromptRequest);
  assert.strictEqual(validPromptResponse.status, 201);

  const validPromptData = await getResponseJSON(validPromptResponse);
  assert.strictEqual(validPromptData.agentType, 'test_valid_agent');
  assert.deepStrictEqual(validPromptData.config.injectionPoints, {
    specDirectory: true,
    projectContext: true,
    mcpDocumentation: false
  });
  console.log('    ✅ Valid prompt created successfully');

  console.log('  ✅ Prompt validation tests completed\n');
}

/**
 * Test Model Profile validation scenarios
 */
async function testModelProfileValidation() {
  console.log('Test Group 3: Model Profile validation');

  // Test 3.1: Missing required fields
  console.log('  Test 3.1: Missing required name');
  const missingNameRequest = createMockRequest('/api/auto-claude/model-profiles', {
    method: 'POST',
    body: {
      description: 'Test profile',
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
    }
  });

  const missingNameResponse = await ProfilesPOST(missingNameRequest);
  assert.strictEqual(missingNameResponse.status, 400);
  console.log('    ✅ Missing name properly rejected');

  // Test 3.2: Invalid model in phaseModels
  console.log('  Test 3.2: Invalid model in phaseModels');
  const invalidModelRequest = createMockRequest('/api/auto-claude/model-profiles', {
    method: 'POST',
    body: {
      name: 'test-profile',
      description: 'Test profile',
      phaseModels: {
        spec: 'invalid-model', // Not in ClaudeModel enum
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
    }
  });

  const invalidModelResponse = await ProfilesPOST(invalidModelRequest);
  assert.strictEqual(invalidModelResponse.status, 400);
  console.log('    ✅ Invalid model properly rejected');

  // Test 3.3: Invalid thinking level
  console.log('  Test 3.3: Invalid thinking level');
  const invalidThinkingRequest = createMockRequest('/api/auto-claude/model-profiles', {
    method: 'POST',
    body: {
      name: 'test-profile',
      description: 'Test profile',
      phaseModels: {
        spec: 'sonnet',
        planning: 'sonnet',
        coding: 'sonnet',
        qa: 'haiku'
      },
      phaseThinking: {
        spec: 'invalid-thinking', // Not in ThinkingLevel enum
        planning: 'high',
        coding: 'medium',
        qa: 'low'
      }
    }
  });

  const invalidThinkingResponse = await ProfilesPOST(invalidThinkingRequest);
  assert.strictEqual(invalidThinkingResponse.status, 400);
  console.log('    ✅ Invalid thinking level properly rejected');

  // Test 3.4: Missing phase in phaseModels
  console.log('  Test 3.4: Missing phase in phaseModels');
  const missingPhaseRequest = createMockRequest('/api/auto-claude/model-profiles', {
    method: 'POST',
    body: {
      name: 'test-profile',
      description: 'Test profile',
      phaseModels: {
        spec: 'sonnet',
        planning: 'sonnet',
        coding: 'sonnet'
        // Missing qa phase
      },
      phaseThinking: {
        spec: 'medium',
        planning: 'high',
        coding: 'medium',
        qa: 'low'
      }
    }
  });

  const missingPhaseResponse = await ProfilesPOST(missingPhaseRequest);
  assert.strictEqual(missingPhaseResponse.status, 400);
  console.log('    ✅ Missing phase properly rejected');

  // Test 3.5: Valid model profile
  console.log('  Test 3.5: Valid model profile');
  const validProfileRequest = createMockRequest('/api/auto-claude/model-profiles', {
    method: 'POST',
    body: {
      name: 'test-valid-profile',
      description: 'Test valid profile',
      phaseModels: {
        spec: 'sonnet',
        planning: 'opus',
        coding: 'sonnet',
        qa: 'haiku'
      },
      phaseThinking: {
        spec: 'medium',
        planning: 'high',
        coding: 'medium',
        qa: 'low'
      }
    }
  });

  const validProfileResponse = await ProfilesPOST(validProfileRequest);
  assert.strictEqual(validProfileResponse.status, 201);

  const validProfileData = await getResponseJSON(validProfileResponse);
  assert.strictEqual(validProfileData.name, 'test-valid-profile');
  assert.strictEqual(validProfileData.config.phaseModels.planning, 'opus');
  console.log('    ✅ Valid model profile created successfully');

  console.log('  ✅ Model Profile validation tests completed\n');
}

/**
 * Test database constraint validation
 */
async function testDatabaseConstraints() {
  console.log('Test Group 4: Database constraint validation');

  // Test 4.1: Component name uniqueness within type
  console.log('  Test 4.1: Component name uniqueness');

  // First create a valid agent
  const firstAgentRequest = createMockRequest('/api/auto-claude/agents', {
    method: 'POST',
    body: {
      agentType: 'unique_test_agent',
      tools: ['Read'],
      mcpServers: ['context7'],
      mcpServersOptional: [],
      autoClaudeTools: [],
      thinkingDefault: 'medium'
    }
  });

  const firstAgentResponse = await AgentsPOST(firstAgentRequest);
  assert.strictEqual(firstAgentResponse.status, 201);
  console.log('    - First agent created successfully');

  // Try to create duplicate
  const duplicateAgentRequest = createMockRequest('/api/auto-claude/agents', {
    method: 'POST',
    body: {
      agentType: 'unique_test_agent', // Same name
      tools: ['Write'],
      mcpServers: ['linear'],
      mcpServersOptional: [],
      autoClaudeTools: [],
      thinkingDefault: 'high'
    }
  });

  const duplicateAgentResponse = await AgentsPOST(duplicateAgentRequest);
  assert.strictEqual(duplicateAgentResponse.status, 409); // Conflict

  const duplicateData = await getResponseJSON(duplicateAgentResponse);
  assert(duplicateData.error.includes('already exists'));
  console.log('    ✅ Duplicate agent name properly rejected');

  // Test 4.2: Verify database consistency
  console.log('  Test 4.2: Database consistency');

  const components = await prisma.component.findMany({
    where: {
      type: { startsWith: 'AUTO_CLAUDE_' }
    }
  });

  // Verify all configs are valid JSON
  let validConfigs = 0;
  for (const component of components) {
    try {
      JSON.parse(component.config);
      validConfigs++;
    } catch {
      // Invalid JSON
    }
  }

  assert.strictEqual(validConfigs, components.length);
  console.log(`    ✅ All ${components.length} component configs are valid JSON`);

  // Test 4.3: Verify component type constraints
  console.log('  Test 4.3: Component type constraints');

  const autoClaudeComponents = await prisma.component.findMany({
    where: {
      type: { startsWith: 'AUTO_CLAUDE_' }
    },
    select: { type: true }
  });

  const validTypes = [
    'AUTO_CLAUDE_AGENT_CONFIG',
    'AUTO_CLAUDE_PROMPT',
    'AUTO_CLAUDE_MODEL_PROFILE',
    'AUTO_CLAUDE_PROJECT_CONFIG'
  ];

  const allTypesValid = autoClaudeComponents.every(c => validTypes.includes(c.type));
  assert(allTypesValid);
  console.log('    ✅ All component types are valid Auto-Claude types');

  console.log('  ✅ Database constraint validation tests completed\n');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidationTests().catch((error) => {
    console.error('❌ Validation test failed:', error);
    process.exit(1);
  });
}

export { runValidationTests };