#!/usr/bin/env node
import assert from 'node:assert';
import {
  generateTaskMetadata,
  validateTaskMetadata,
  getDefaultModelProfile,
  getCostOptimizedModelProfile,
  getQualityFocusedModelProfile
} from '../../../src/lib/generators/auto-claude/model-profile.js';

// Test utilities
function assertJsonContains(jsonStr: string, key: string, value: any, message?: string) {
  const obj = JSON.parse(jsonStr);
  const keys = key.split('.');
  let current = obj;
  for (const k of keys) {
    current = current[k];
  }
  assert.strictEqual(current, value, message || `Expected ${key} to be ${value}`);
}

function runTests() {
  console.log('🧪 Testing model-profile generator...\n');

  // Test 1: Generate task metadata with default profile
  (() => {
    console.log('Test 1: Generate task metadata with default profile');
    const defaultProfile = getDefaultModelProfile();
    const result = generateTaskMetadata({ modelProfile: defaultProfile });

    // Should be valid JSON
    const parsed = JSON.parse(result);
    assert(parsed.models, 'Should have models section');
    assert(parsed.thinking, 'Should have thinking section');

    assertJsonContains(result, 'models.spec', 'sonnet');
    assertJsonContains(result, 'models.planning', 'sonnet');
    assertJsonContains(result, 'models.coding', 'sonnet');
    assertJsonContains(result, 'models.qa', 'haiku');
    assertJsonContains(result, 'thinking.spec', 'medium');
    assertJsonContains(result, 'thinking.planning', 'high');
    assertJsonContains(result, 'thinking.coding', 'medium');
    assertJsonContains(result, 'thinking.qa', 'low');

    console.log('✅ Default profile generation test passed\n');
  })();

  // Test 2: Generate task metadata with cost-optimized profile
  (() => {
    console.log('Test 2: Generate task metadata with cost-optimized profile');
    const costProfile = getCostOptimizedModelProfile();
    const result = generateTaskMetadata({ modelProfile: costProfile });

    assertJsonContains(result, 'models.spec', 'haiku');
    assertJsonContains(result, 'models.planning', 'sonnet');
    assertJsonContains(result, 'models.coding', 'sonnet');
    assertJsonContains(result, 'models.qa', 'haiku');
    assertJsonContains(result, 'thinking.spec', 'low');
    assertJsonContains(result, 'thinking.planning', 'medium');
    assertJsonContains(result, 'thinking.coding', 'low');
    assertJsonContains(result, 'thinking.qa', 'none');

    console.log('✅ Cost-optimized profile generation test passed\n');
  })();

  // Test 3: Generate task metadata with quality-focused profile
  (() => {
    console.log('Test 3: Generate task metadata with quality-focused profile');
    const qualityProfile = getQualityFocusedModelProfile();
    const result = generateTaskMetadata({ modelProfile: qualityProfile });

    assertJsonContains(result, 'models.spec', 'sonnet');
    assertJsonContains(result, 'models.planning', 'opus');
    assertJsonContains(result, 'models.coding', 'opus');
    assertJsonContains(result, 'models.qa', 'sonnet');
    assertJsonContains(result, 'thinking.spec', 'high');
    assertJsonContains(result, 'thinking.planning', 'ultrathink');
    assertJsonContains(result, 'thinking.coding', 'high');
    assertJsonContains(result, 'thinking.qa', 'medium');

    console.log('✅ Quality-focused profile generation test passed\n');
  })();

  // Test 4: Generate task metadata with null profile (should use defaults)
  (() => {
    console.log('Test 4: Generate task metadata with null profile');
    const result = generateTaskMetadata({ modelProfile: null });

    assertJsonContains(result, 'models.spec', 'sonnet');
    assertJsonContains(result, 'models.planning', 'sonnet');
    assertJsonContains(result, 'models.coding', 'sonnet');
    assertJsonContains(result, 'models.qa', 'haiku');
    assertJsonContains(result, 'thinking.spec', 'medium');
    assertJsonContains(result, 'thinking.planning', 'high');
    assertJsonContains(result, 'thinking.coding', 'medium');
    assertJsonContains(result, 'thinking.qa', 'low');

    console.log('✅ Null profile generation test passed\n');
  })();

  // Test 5: Generate task metadata with no options
  (() => {
    console.log('Test 5: Generate task metadata with no options');
    const result = generateTaskMetadata({});

    assertJsonContains(result, 'models.spec', 'sonnet');
    assertJsonContains(result, 'models.planning', 'sonnet');
    assertJsonContains(result, 'models.coding', 'sonnet');
    assertJsonContains(result, 'models.qa', 'haiku');
    assertJsonContains(result, 'thinking.spec', 'medium');
    assertJsonContains(result, 'thinking.planning', 'high');
    assertJsonContains(result, 'thinking.coding', 'medium');
    assertJsonContains(result, 'thinking.qa', 'low');

    console.log('✅ No options generation test passed\n');
  })();

  // Test 6: Generate task metadata with custom profile
  (() => {
    console.log('Test 6: Generate task metadata with custom profile');
    const customProfile = {
      name: 'custom',
      description: 'Custom test profile',
      phaseModels: {
        spec: 'opus' as const,
        planning: 'haiku' as const,
        coding: 'sonnet' as const,
        qa: 'opus' as const
      },
      phaseThinking: {
        spec: 'ultrathink' as const,
        planning: 'none' as const,
        coding: 'high' as const,
        qa: 'ultrathink' as const
      }
    };

    const result = generateTaskMetadata({ modelProfile: customProfile });

    assertJsonContains(result, 'models.spec', 'opus');
    assertJsonContains(result, 'models.planning', 'haiku');
    assertJsonContains(result, 'models.coding', 'sonnet');
    assertJsonContains(result, 'models.qa', 'opus');
    assertJsonContains(result, 'thinking.spec', 'ultrathink');
    assertJsonContains(result, 'thinking.planning', 'none');
    assertJsonContains(result, 'thinking.coding', 'high');
    assertJsonContains(result, 'thinking.qa', 'ultrathink');

    console.log('✅ Custom profile generation test passed\n');
  })();

  // Test 7: Validate valid task metadata
  (() => {
    console.log('Test 7: Validate valid task metadata');
    const validMetadata = generateTaskMetadata({ modelProfile: getDefaultModelProfile() });
    const validation = validateTaskMetadata(validMetadata);

    assert(validation.valid, `Expected valid metadata but got errors: ${validation.errors.join(', ')}`);
    assert.strictEqual(validation.errors.length, 0);

    console.log('✅ Valid metadata validation test passed\n');
  })();

  // Test 8: Validate invalid JSON
  (() => {
    console.log('Test 8: Validate invalid JSON');
    const invalidJson = '{ "models": { "spec": "sonnet" } invalid json }';
    const validation = validateTaskMetadata(invalidJson);

    assert(!validation.valid, 'Expected invalid metadata');
    assert(validation.errors.some(e => e.includes('Invalid JSON format')));

    console.log('✅ Invalid JSON validation test passed\n');
  })();

  // Test 9: Validate missing structure
  (() => {
    console.log('Test 9: Validate missing structure');
    const invalidStructure = '{ "models": { "spec": "sonnet" } }';
    const validation = validateTaskMetadata(invalidStructure);

    assert(!validation.valid, 'Expected invalid metadata');
    assert(validation.errors.some(e => e.includes('models and thinking configurations')));

    console.log('✅ Missing structure validation test passed\n');
  })();

  // Test 10: Validate invalid model names
  (() => {
    console.log('Test 10: Validate invalid model names');
    const invalidModels = JSON.stringify({
      models: {
        spec: 'invalid-model',
        planning: 'sonnet',
        coding: 'sonnet',
        qa: 'haiku'
      },
      thinking: {
        spec: 'medium',
        planning: 'high',
        coding: 'medium',
        qa: 'low'
      }
    });

    const validation = validateTaskMetadata(invalidModels);

    assert(!validation.valid, 'Expected invalid metadata');
    assert(validation.errors.some(e => e.includes('Invalid model \'invalid-model\'')));

    console.log('✅ Invalid model validation test passed\n');
  })();

  // Test 11: Validate invalid thinking levels
  (() => {
    console.log('Test 11: Validate invalid thinking levels');
    const invalidThinking = JSON.stringify({
      models: {
        spec: 'sonnet',
        planning: 'sonnet',
        coding: 'sonnet',
        qa: 'haiku'
      },
      thinking: {
        spec: 'medium',
        planning: 'invalid-thinking',
        coding: 'medium',
        qa: 'low'
      }
    });

    const validation = validateTaskMetadata(invalidThinking);

    assert(!validation.valid, 'Expected invalid metadata');
    assert(validation.errors.some(e => e.includes('Invalid thinking level \'invalid-thinking\'')));

    console.log('✅ Invalid thinking validation test passed\n');
  })();

  // Test 12: Validate missing phases
  (() => {
    console.log('Test 12: Validate missing phases');
    const missingPhases = JSON.stringify({
      models: {
        spec: 'sonnet',
        planning: 'sonnet'
        // missing coding and qa
      },
      thinking: {
        spec: 'medium',
        planning: 'high',
        coding: 'medium',
        qa: 'low'
      }
    });

    const validation = validateTaskMetadata(missingPhases);

    assert(!validation.valid, 'Expected invalid metadata');
    assert(validation.errors.some(e => e.includes('Missing model configuration for coding')));
    assert(validation.errors.some(e => e.includes('Missing model configuration for qa')));

    console.log('✅ Missing phases validation test passed\n');
  })();

  // Test 13: Test helper function properties
  (() => {
    console.log('Test 13: Test helper function properties');

    const defaultProfile = getDefaultModelProfile();
    assert.strictEqual(defaultProfile.name, 'balanced');
    assert(defaultProfile.description.includes('Balanced'));

    const costProfile = getCostOptimizedModelProfile();
    assert.strictEqual(costProfile.name, 'cost-optimized');
    assert(costProfile.description.includes('Cost-optimized'));

    const qualityProfile = getQualityFocusedModelProfile();
    assert.strictEqual(qualityProfile.name, 'quality-focused');
    assert(qualityProfile.description.includes('Quality-focused'));

    console.log('✅ Helper function properties test passed\n');
  })();

  // Test 14: Validate proper JSON formatting
  (() => {
    console.log('Test 14: Validate proper JSON formatting');
    const result = generateTaskMetadata({ modelProfile: getDefaultModelProfile() });

    // Should be properly formatted with 2-space indentation
    assert(result.includes('  "models": {'), 'Should have proper indentation');
    assert(result.includes('\n'), 'Should have newlines');

    // Should be parseable
    const parsed = JSON.parse(result);
    assert(typeof parsed === 'object', 'Should parse to object');

    console.log('✅ JSON formatting test passed\n');
  })();

  console.log('🎉 All model-profile generator tests passed!\n');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests as runModelProfileTests };