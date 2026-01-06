import { AutoClaudeModelProfile, ClaudeModel, ThinkingLevel } from '../../types/auto-claude';

interface ModelProfileOptions {
  modelProfile?: AutoClaudeModelProfile | null;
}

interface TaskMetadata {
  models: {
    spec: ClaudeModel;
    planning: ClaudeModel;
    coding: ClaudeModel;
    qa: ClaudeModel;
  };
  thinking: {
    spec: ThinkingLevel;
    planning: ThinkingLevel;
    coding: ThinkingLevel;
    qa: ThinkingLevel;
  };
}

/**
 * Generates task_metadata.json with phase models and thinking configurations
 */
export function generateTaskMetadata(options: ModelProfileOptions): string {
  const { modelProfile } = options;

  const taskMetadata: TaskMetadata = {
    models: {
      spec: modelProfile?.phaseModels.spec || 'sonnet',
      planning: modelProfile?.phaseModels.planning || 'sonnet',
      coding: modelProfile?.phaseModels.coding || 'sonnet',
      qa: modelProfile?.phaseModels.qa || 'haiku'
    },
    thinking: {
      spec: modelProfile?.phaseThinking.spec || 'medium',
      planning: modelProfile?.phaseThinking.planning || 'high',
      coding: modelProfile?.phaseThinking.coding || 'medium',
      qa: modelProfile?.phaseThinking.qa || 'low'
    }
  };

  return JSON.stringify(taskMetadata, null, 2);
}

/**
 * Helper function to validate task metadata configuration
 */
export function validateTaskMetadata(metadataContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const metadata = JSON.parse(metadataContent) as TaskMetadata;

    // Validate structure
    if (!metadata.models || !metadata.thinking) {
      errors.push('Task metadata must include both models and thinking configurations');
      return { valid: false, errors };
    }

    const phases = ['spec', 'planning', 'coding', 'qa'];
    const validModels = ['opus', 'sonnet', 'haiku'];
    const validThinkingLevels = ['none', 'low', 'medium', 'high', 'ultrathink'];

    // Validate models for each phase
    for (const phase of phases) {
      if (!metadata.models[phase as keyof typeof metadata.models]) {
        errors.push(`Missing model configuration for ${phase} phase`);
      } else {
        const model = metadata.models[phase as keyof typeof metadata.models];
        if (!validModels.includes(model)) {
          errors.push(`Invalid model '${model}' for ${phase} phase. Must be one of: ${validModels.join(', ')}`);
        }
      }

      if (!metadata.thinking[phase as keyof typeof metadata.thinking]) {
        errors.push(`Missing thinking configuration for ${phase} phase`);
      } else {
        const thinking = metadata.thinking[phase as keyof typeof metadata.thinking];
        if (!validThinkingLevels.includes(thinking)) {
          errors.push(`Invalid thinking level '${thinking}' for ${phase} phase. Must be one of: ${validThinkingLevels.join(', ')}`);
        }
      }
    }

  } catch (parseError) {
    errors.push('Invalid JSON format in task metadata');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to get default model profile for task metadata generation
 */
export function getDefaultModelProfile(): AutoClaudeModelProfile {
  return {
    name: 'balanced',
    description: 'Balanced profile optimizing for quality and cost',
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
}

/**
 * Helper function to get cost-optimized model profile
 */
export function getCostOptimizedModelProfile(): AutoClaudeModelProfile {
  return {
    name: 'cost-optimized',
    description: 'Cost-optimized profile using lighter models where possible',
    phaseModels: {
      spec: 'haiku',
      planning: 'sonnet',
      coding: 'sonnet',
      qa: 'haiku'
    },
    phaseThinking: {
      spec: 'low',
      planning: 'medium',
      coding: 'low',
      qa: 'none'
    }
  };
}

/**
 * Helper function to get quality-focused model profile
 */
export function getQualityFocusedModelProfile(): AutoClaudeModelProfile {
  return {
    name: 'quality-focused',
    description: 'Quality-focused profile using the best models for all phases',
    phaseModels: {
      spec: 'sonnet',
      planning: 'opus',
      coding: 'opus',
      qa: 'sonnet'
    },
    phaseThinking: {
      spec: 'high',
      planning: 'ultrathink',
      coding: 'high',
      qa: 'medium'
    }
  };
}