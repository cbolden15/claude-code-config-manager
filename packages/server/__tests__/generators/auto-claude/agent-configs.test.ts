#!/usr/bin/env node
import assert from 'node:assert';
import {
  generateAgentConfigs,
  validateAgentConfigs,
  validateAgentConfigsExport,
  getDefaultAgentConfigs,
  mergeAgentConfigs,
  getStandardTools,
  getStandardMcpServers
} from '../../../src/lib/generators/auto-claude/agent-configs.js';

// Test utilities
function assertJsonContains(jsonStr: string, key: string, value: any, message?: string) {
  const obj = JSON.parse(jsonStr);
  const keys = key.split('.');
  let current = obj;
  for (const k of keys) {
    current = current[k];
  }
  assert.deepStrictEqual(current, value, message || `Expected ${key} to be ${JSON.stringify(value)}`);
}

function runTests() {
  console.log('🧪 Testing agent-configs generator...\n');

  // Test 1: Generate agent configs with single config
  (() => {
    console.log('Test 1: Generate agent configs with single config');
    const agentConfigs = [
      {
        agentType: 'coder',
        tools: ['Read', 'Write', 'Edit'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear'],
        autoClaudeTools: ['parallel_shell'],
        thinkingDefault: 'medium' as const
      }
    ];

    const result = generateAgentConfigs({ agentConfigs });

    // Should be valid JSON
    const parsed = JSON.parse(result);
    assert(parsed.coder, 'Should have coder configuration');

    assertJsonContains(result, 'coder.agentType', 'coder');
    assertJsonContains(result, 'coder.tools', ['Read', 'Write', 'Edit']);
    assertJsonContains(result, 'coder.mcpServers', ['context7']);
    assertJsonContains(result, 'coder.mcpServersOptional', ['linear']);
    assertJsonContains(result, 'coder.autoClaudeTools', ['parallel_shell']);
    assertJsonContains(result, 'coder.thinkingDefault', 'medium');

    console.log('✅ Single agent config generation test passed\n');
  })();

  // Test 2: Generate multiple agent configs
  (() => {
    console.log('Test 2: Generate multiple agent configs');
    const agentConfigs = [
      {
        agentType: 'coder',
        tools: ['Read', 'Write', 'Edit'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear'],
        autoClaudeTools: ['parallel_shell'],
        thinkingDefault: 'medium' as const
      },
      {
        agentType: 'planner',
        tools: ['Read', 'Glob'],
        mcpServers: [],
        mcpServersOptional: ['context7'],
        autoClaudeTools: [],
        thinkingDefault: 'high' as const
      },
      {
        agentType: 'qa_reviewer',
        tools: ['Read', 'Bash'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'low' as const
      }
    ];

    const result = generateAgentConfigs({ agentConfigs });

    const parsed = JSON.parse(result);
    assert(parsed.coder, 'Should have coder configuration');
    assert(parsed.planner, 'Should have planner configuration');
    assert(parsed.qa_reviewer, 'Should have qa_reviewer configuration');

    assertJsonContains(result, 'planner.tools', ['Read', 'Glob']);
    assertJsonContains(result, 'planner.thinkingDefault', 'high');
    assertJsonContains(result, 'qa_reviewer.mcpServersOptional', []);

    console.log('✅ Multiple agent configs generation test passed\n');
  })();

  // Test 3: Generate with empty array
  (() => {
    console.log('Test 3: Generate with empty array');
    const result = generateAgentConfigs({ agentConfigs: [] });

    const parsed = JSON.parse(result);
    assert.deepStrictEqual(parsed, {}, 'Should return empty object');

    console.log('✅ Empty array generation test passed\n');
  })();

  // Test 4: Validate valid agent configs
  (() => {
    console.log('Test 4: Validate valid agent configs');
    const agentConfigs = [
      {
        agentType: 'test_agent',
        tools: ['Read', 'Write'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear'],
        autoClaudeTools: ['parallel_shell'],
        thinkingDefault: 'medium' as const
      }
    ];

    const validation = validateAgentConfigs(agentConfigs);
    assert(validation.valid, `Expected valid configs but got errors: ${validation.errors.join(', ')}`);
    assert.strictEqual(validation.errors.length, 0);

    console.log('✅ Valid agent configs validation test passed\n');
  })();

  // Test 5: Validate invalid - missing agent type
  (() => {
    console.log('Test 5: Validate invalid - missing agent type');
    const agentConfigs = [
      {
        agentType: '',
        tools: ['Read'],
        mcpServers: [],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium' as const
      }
    ];

    const validation = validateAgentConfigs(agentConfigs);
    assert(!validation.valid, 'Expected invalid configs');
    assert(validation.errors.some(e => e.includes('Agent type is required')));

    console.log('✅ Missing agent type validation test passed\n');
  })();

  // Test 6: Validate invalid - invalid agent type format
  (() => {
    console.log('Test 6: Validate invalid - invalid agent type format');
    const agentConfigs = [
      {
        agentType: 'invalid-type!',
        tools: ['Read'],
        mcpServers: [],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium' as const
      }
    ];

    const validation = validateAgentConfigs(agentConfigs);
    assert(!validation.valid, 'Expected invalid configs');
    assert(validation.errors.some(e => e.includes('alphanumeric with underscores only')));

    console.log('✅ Invalid agent type format validation test passed\n');
  })();

  // Test 7: Validate invalid - duplicate agent types
  (() => {
    console.log('Test 7: Validate invalid - duplicate agent types');
    const agentConfigs = [
      {
        agentType: 'coder',
        tools: ['Read'],
        mcpServers: [],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium' as const
      },
      {
        agentType: 'coder',
        tools: ['Write'],
        mcpServers: [],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'high' as const
      }
    ];

    const validation = validateAgentConfigs(agentConfigs);
    assert(!validation.valid, 'Expected invalid configs');
    assert(validation.errors.some(e => e.includes('Duplicate agent type \'coder\'')));

    console.log('✅ Duplicate agent types validation test passed\n');
  })();

  // Test 8: Validate invalid - invalid thinking level
  (() => {
    console.log('Test 8: Validate invalid - invalid thinking level');
    const agentConfigs = [
      {
        agentType: 'test_agent',
        tools: ['Read'],
        mcpServers: [],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'invalid-level' as any
      }
    ];

    const validation = validateAgentConfigs(agentConfigs);
    assert(!validation.valid, 'Expected invalid configs');
    assert(validation.errors.some(e => e.includes('thinkingDefault must be one of')));

    console.log('✅ Invalid thinking level validation test passed\n');
  })();

  // Test 9: Validate invalid - overlapping MCP servers
  (() => {
    console.log('Test 9: Validate invalid - overlapping MCP servers');
    const agentConfigs = [
      {
        agentType: 'test_agent',
        tools: ['Read'],
        mcpServers: ['context7', 'linear'],
        mcpServersOptional: ['linear', 'graphiti'],
        autoClaudeTools: [],
        thinkingDefault: 'medium' as const
      }
    ];

    const validation = validateAgentConfigs(agentConfigs);
    assert(!validation.valid, 'Expected invalid configs');
    assert(validation.errors.some(e => e.includes('cannot be both required and optional')));

    console.log('✅ Overlapping MCP servers validation test passed\n');
  })();

  // Test 10: Validate invalid - non-array fields
  (() => {
    console.log('Test 10: Validate invalid - non-array fields');
    const agentConfigs = [
      {
        agentType: 'test_agent',
        tools: 'not-an-array' as any,
        mcpServers: [],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium' as const
      }
    ];

    const validation = validateAgentConfigs(agentConfigs);
    assert(!validation.valid, 'Expected invalid configs');
    assert(validation.errors.some(e => e.includes('tools must be an array')));

    console.log('✅ Non-array fields validation test passed\n');
  })();

  // Test 11: Validate agent configs export - valid JSON
  (() => {
    console.log('Test 11: Validate agent configs export - valid JSON');
    const agentConfigs = [
      {
        agentType: 'coder',
        tools: ['Read', 'Write'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear'],
        autoClaudeTools: [],
        thinkingDefault: 'medium' as const
      }
    ];

    const exportJson = generateAgentConfigs({ agentConfigs });
    const validation = validateAgentConfigsExport(exportJson);

    assert(validation.valid, `Expected valid export but got errors: ${validation.errors.join(', ')}`);
    assert.strictEqual(validation.errors.length, 0);

    console.log('✅ Valid export JSON validation test passed\n');
  })();

  // Test 12: Validate agent configs export - invalid JSON
  (() => {
    console.log('Test 12: Validate agent configs export - invalid JSON');
    const invalidJson = '{ "coder": { "agentType": "coder" } invalid }';
    const validation = validateAgentConfigsExport(invalidJson);

    assert(!validation.valid, 'Expected invalid export');
    assert(validation.errors.some(e => e.includes('Invalid JSON format')));

    console.log('✅ Invalid export JSON validation test passed\n');
  })();

  // Test 13: Validate agent configs export - mismatched agent type
  (() => {
    console.log('Test 13: Validate agent configs export - mismatched agent type');
    const mismatchedExport = JSON.stringify({
      coder: {
        agentType: 'planner',
        tools: [],
        mcpServers: [],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium'
      }
    });

    const validation = validateAgentConfigsExport(mismatchedExport);

    assert(!validation.valid, 'Expected invalid export');
    assert(validation.errors.some(e => e.includes('agentType field must match object key')));

    console.log('✅ Mismatched agent type validation test passed\n');
  })();

  // Test 14: Get default agent configs
  (() => {
    console.log('Test 14: Get default agent configs');
    const defaultConfigs = getDefaultAgentConfigs();

    assert(Array.isArray(defaultConfigs), 'Should return an array');
    assert(defaultConfigs.length > 0, 'Should have default configs');

    const coderConfig = defaultConfigs.find(c => c.agentType === 'coder');
    assert(coderConfig, 'Should have coder config');
    assert(coderConfig.tools.includes('Read'), 'Coder should have Read tool');
    assert(coderConfig.tools.includes('Write'), 'Coder should have Write tool');

    const plannerConfig = defaultConfigs.find(c => c.agentType === 'planner');
    assert(plannerConfig, 'Should have planner config');
    assert.strictEqual(plannerConfig.thinkingDefault, 'high');

    console.log('✅ Default agent configs test passed\n');
  })();

  // Test 15: Merge agent configs - user overrides
  (() => {
    console.log('Test 15: Merge agent configs - user overrides');
    const userConfigs = [
      {
        agentType: 'coder',
        tools: ['CustomTool'],
        mcpServers: ['custom-mcp'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'ultrathink' as const
      }
    ];

    const merged = mergeAgentConfigs(userConfigs);

    assert(merged.length > 1, 'Should have merged configs');

    const userCoderConfig = merged.find(c => c.agentType === 'coder');
    assert(userCoderConfig, 'Should have user coder config');
    assert.deepStrictEqual(userCoderConfig.tools, ['CustomTool']);
    assert.strictEqual(userCoderConfig.thinkingDefault, 'ultrathink');

    const defaultPlannerConfig = merged.find(c => c.agentType === 'planner');
    assert(defaultPlannerConfig, 'Should have default planner config');
    assert.strictEqual(defaultPlannerConfig.thinkingDefault, 'high');

    console.log('✅ Merge agent configs with user overrides test passed\n');
  })();

  // Test 16: Merge agent configs - no defaults
  (() => {
    console.log('Test 16: Merge agent configs - no defaults');
    const userConfigs = [
      {
        agentType: 'custom_agent',
        tools: ['CustomTool'],
        mcpServers: [],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium' as const
      }
    ];

    const merged = mergeAgentConfigs(userConfigs, []);

    assert.strictEqual(merged.length, 1, 'Should only have user configs');
    assert.strictEqual(merged[0].agentType, 'custom_agent');

    console.log('✅ Merge agent configs with no defaults test passed\n');
  })();

  // Test 17: Get standard tools
  (() => {
    console.log('Test 17: Get standard tools');
    const tools = getStandardTools();

    assert(Array.isArray(tools), 'Should return an array');
    assert(tools.length > 0, 'Should have tools');
    assert(tools.includes('Read'), 'Should include Read tool');
    assert(tools.includes('Write'), 'Should include Write tool');
    assert(tools.includes('Edit'), 'Should include Edit tool');
    assert(tools.includes('Bash'), 'Should include Bash tool');

    console.log('✅ Standard tools test passed\n');
  })();

  // Test 18: Get standard MCP servers
  (() => {
    console.log('Test 18: Get standard MCP servers');
    const servers = getStandardMcpServers();

    assert(Array.isArray(servers), 'Should return an array');
    assert(servers.length > 0, 'Should have servers');
    assert(servers.includes('context7'), 'Should include context7');
    assert(servers.includes('linear'), 'Should include linear');
    assert(servers.includes('graphiti'), 'Should include graphiti');

    console.log('✅ Standard MCP servers test passed\n');
  })();

  // Test 19: Complex validation - all field types invalid
  (() => {
    console.log('Test 19: Complex validation - all field types invalid');
    const agentConfigs = [
      {
        agentType: '123invalid',
        tools: ['', 'valid-tool'],
        mcpServers: [123 as any],
        mcpServersOptional: [''],
        autoClaudeTools: [null as any],
        thinkingDefault: '' as any
      }
    ];

    const validation = validateAgentConfigs(agentConfigs);
    assert(!validation.valid, 'Expected invalid configs');

    // Should have multiple validation errors
    assert(validation.errors.length > 1, 'Should have multiple errors');
    assert(validation.errors.some(e => e.includes('alphanumeric with underscores')));
    assert(validation.errors.some(e => e.includes('invalid tool name')));
    assert(validation.errors.some(e => e.includes('invalid MCP server name')));
    assert(validation.errors.some(e => e.includes('thinkingDefault must be one of')));

    console.log('✅ Complex validation test passed\n');
  })();

  // Test 20: JSON formatting validation
  (() => {
    console.log('Test 20: JSON formatting validation');
    const agentConfigs = [
      {
        agentType: 'test_agent',
        tools: ['Read'],
        mcpServers: [],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'medium' as const
      }
    ];

    const result = generateAgentConfigs({ agentConfigs });

    // Should be properly formatted with 2-space indentation
    assert(result.includes('  "test_agent": {'), 'Should have proper indentation');
    assert(result.includes('\n'), 'Should have newlines');

    // Should be parseable
    const parsed = JSON.parse(result);
    assert(typeof parsed === 'object', 'Should parse to object');
    assert(parsed.test_agent, 'Should have test_agent configuration');

    console.log('✅ JSON formatting validation test passed\n');
  })();

  console.log('🎉 All agent-configs generator tests passed!\n');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests as runAgentConfigsTests };