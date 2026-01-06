import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { AutoClaudePromptSchema } from '../../../../shared/src/schemas/auto-claude';
import type { AutoClaudePrompt } from '../../../../shared/src/types/auto-claude';

// Type inference from Zod schema
type ValidatedAutoClaudePrompt = z.infer<typeof AutoClaudePromptSchema>;

/**
 * Validation schema for parsed prompt
 */
const ParsedPromptSchema = z.object({
  agentType: z.string().min(1),
  prompt: AutoClaudePromptSchema,
});

export interface ParsedPrompt {
  agentType: string;
  prompt: AutoClaudePrompt;
}

/**
 * Result interface for prompts directory parsing
 */
export interface PromptsParseResult {
  prompts: ParsedPrompt[];
  errors: string[];
}

/**
 * Optimized injection point patterns - compiled once for better performance
 */
const INJECTION_PATTERNS = {
  specDirectory: /\{\{\s*specDirectory\s*\}\}/gi,
  projectContext: /\{\{\s*projectContext\s*\}\}/gi,
  mcpDocumentation: /\{\{\s*mcpDocumentation\s*\}\}/gi,
};

/**
 * Detect injection points in prompt content - optimized version
 */
function detectInjectionPoints(content: string): { specDirectory: boolean; projectContext: boolean; mcpDocumentation: boolean } {
  // Reset global regex states
  INJECTION_PATTERNS.specDirectory.lastIndex = 0;
  INJECTION_PATTERNS.projectContext.lastIndex = 0;
  INJECTION_PATTERNS.mcpDocumentation.lastIndex = 0;

  // Use more efficient approach - check all patterns in one pass
  const results = {
    specDirectory: false,
    projectContext: false,
    mcpDocumentation: false,
  };

  // If no injection patterns exist at all, return early
  if (!content.includes('{{')) {
    return results;
  }

  results.specDirectory = INJECTION_PATTERNS.specDirectory.test(content);
  results.projectContext = INJECTION_PATTERNS.projectContext.test(content);
  results.mcpDocumentation = INJECTION_PATTERNS.mcpDocumentation.test(content);

  return results;
}

/**
 * Extract agent type from filename
 * Examples: coder.md -> coder, spec_gatherer.md -> spec_gatherer
 */
function extractAgentTypeFromFilename(filename: string): string | null {
  const match = filename.match(/^([a-z_]+)\.md$/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Parse front matter from markdown content - optimized version
 */
function parseFrontMatter(content: string): { frontMatter?: Record<string, any>; content: string } {
  // Quick check if front matter exists to avoid unnecessary split
  if (!content.startsWith('---\n')) {
    return { content };
  }

  // Find the end marker more efficiently
  const frontMatterEnd = content.indexOf('\n---\n', 4);
  if (frontMatterEnd === -1) {
    return { content };
  }

  try {
    const frontMatterText = content.substring(4, frontMatterEnd);
    const actualContent = content.substring(frontMatterEnd + 5);

    // Simple YAML-like parsing for basic key-value pairs
    const frontMatter: Record<string, any> = {};
    const lines = frontMatterText.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        frontMatter[key] = value.replace(/^['"]|['"]$/g, ''); // Remove quotes
      }
    }

    return { frontMatter, content: actualContent };
  } catch (error) {
    // If front matter parsing fails, return original content
    return { content };
  }
}

/**
 * Convert parsed markdown to AutoClaudePrompt format
 */
function convertToAutoClaudePrompt(agentType: string, content: string): AutoClaudePrompt | null {
  try {
    const { frontMatter, content: cleanContent } = parseFrontMatter(content);
    const injectionPoints = detectInjectionPoints(cleanContent);

    // Only include injection points if any are detected
    const hasInjectionPoints = Object.values(injectionPoints).some(Boolean);

    // Build prompt object with required fields
    const promptData: Partial<AutoClaudePrompt> = {
      agentType,
      promptContent: cleanContent.trim(),
    };

    // Only include injection points if any are detected
    if (hasInjectionPoints) {
      promptData.injectionPoints = injectionPoints;
    }

    // Validate using Zod schema and return the parsed result
    const validatedPrompt: ValidatedAutoClaudePrompt = AutoClaudePromptSchema.parse(promptData);
    return validatedPrompt as AutoClaudePrompt;
  } catch (error) {
    // Silently return null on validation errors - errors will be tracked by caller
    return null;
  }
}

/**
 * Parse a single prompt file
 */
export async function parsePromptFile(filePath: string): Promise<{ prompt: ParsedPrompt | null; error: string | null }> {
  try {
    const filename = path.basename(filePath);
    const agentType = extractAgentTypeFromFilename(filename);

    if (!agentType) {
      return { prompt: null, error: `Invalid filename format: ${filename}. Expected format: agentType.md` };
    }

    const content = await fs.readFile(filePath, 'utf-8');

    if (content.trim().length === 0) {
      return { prompt: null, error: `Empty prompt file: ${filename}` };
    }

    const autoClaudePrompt = convertToAutoClaudePrompt(agentType, content);

    if (!autoClaudePrompt) {
      return { prompt: null, error: `Failed to parse prompt for '${agentType}': Invalid prompt structure or validation failed` };
    }

    return {
      prompt: { agentType, prompt: autoClaudePrompt },
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { prompt: null, error: `Failed to read prompt file ${filePath}: ${errorMessage}` };
  }
}

/**
 * Parse all .md files from prompts directory - optimized with parallel processing
 */
export async function parsePromptsDirectory(promptsPath: string): Promise<PromptsParseResult> {
  const result: PromptsParseResult = {
    prompts: [],
    errors: [],
  };

  try {
    // Check if directory exists
    const stat = await fs.stat(promptsPath);
    if (!stat.isDirectory()) {
      result.errors.push(`Prompts path is not a directory: ${promptsPath}`);
      return result;
    }

    // Read directory contents
    const files = await fs.readdir(promptsPath);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    if (markdownFiles.length === 0) {
      result.errors.push(`No .md files found in prompts directory: ${promptsPath}`);
      return result;
    }

    // Parse all files in parallel for better performance
    const filePaths = markdownFiles.map(file => path.join(promptsPath, file));
    const parseResults = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          return await parsePromptFile(filePath);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { prompt: null, error: `Failed to parse ${path.basename(filePath)}: ${errorMessage}` };
        }
      })
    );

    // Collect results
    for (const parseResult of parseResults) {
      if (parseResult.prompt) {
        result.prompts.push(parseResult.prompt);
      } else if (parseResult.error) {
        result.errors.push(parseResult.error);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Failed to read prompts directory ${promptsPath}: ${errorMessage}`);
  }

  return result;
}

/**
 * Validation function for the parsed results
 */
export function validateParsedPrompts(prompts: ParsedPrompt[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Check for duplicate agent types
    const agentTypes = prompts.map(p => p.agentType);
    const duplicates = agentTypes.filter((type, index) => agentTypes.indexOf(type) !== index);

    if (duplicates.length > 0) {
      errors.push(`Duplicate agent types found: ${Array.from(new Set(duplicates)).join(', ')}`);
    }

    // Validate each prompt
    for (const prompt of prompts) {
      ParsedPromptSchema.parse(prompt);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    } else {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default prompt configurations for testing or fallback
 */
export function getDefaultPrompts(): ParsedPrompt[] {
  return [
    {
      agentType: 'coder',
      prompt: {
        agentType: 'coder',
        promptContent: `You are a software engineer specialized in writing clean, maintainable code.

Your responsibilities:
- Implement features according to specifications
- Write comprehensive tests
- Follow coding best practices
- Provide clear documentation

You have access to the project context at {{projectContext}} and can reference specifications in {{specDirectory}}.`,
        injectionPoints: {
          specDirectory: true,
          projectContext: true,
          mcpDocumentation: false,
        },
      },
    },
    {
      agentType: 'planner',
      prompt: {
        agentType: 'planner',
        promptContent: `You are a technical architect responsible for planning software implementations.

Your responsibilities:
- Break down complex requirements into actionable tasks
- Design system architecture
- Identify dependencies and risks
- Create detailed implementation plans

Refer to project specifications in {{specDirectory}} and current project context at {{projectContext}}.`,
        injectionPoints: {
          specDirectory: true,
          projectContext: true,
          mcpDocumentation: false,
        },
      },
    },
    {
      agentType: 'qa_reviewer',
      prompt: {
        agentType: 'qa_reviewer',
        promptContent: `You are a quality assurance engineer focused on ensuring code quality and correctness.

Your responsibilities:
- Review code for bugs and issues
- Validate implementations against requirements
- Run and validate tests
- Ensure best practices are followed

Use project context from {{projectContext}} and specification details from {{specDirectory}}.`,
        injectionPoints: {
          specDirectory: true,
          projectContext: true,
          mcpDocumentation: false,
        },
      },
    },
    {
      agentType: 'spec_gatherer',
      prompt: {
        agentType: 'spec_gatherer',
        promptContent: `You are a business analyst specialized in gathering and documenting requirements.

Your responsibilities:
- Collect and clarify requirements from stakeholders
- Document specifications clearly and comprehensively
- Identify edge cases and constraints
- Create acceptance criteria

Store specifications in {{specDirectory}} and maintain project context at {{projectContext}}.`,
        injectionPoints: {
          specDirectory: true,
          projectContext: true,
          mcpDocumentation: false,
        },
      },
    },
  ];
}