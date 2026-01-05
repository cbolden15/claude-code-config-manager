import * as fs from 'fs/promises';
import { z } from 'zod';
import { AutoClaudeAgentConfigSchema } from '../../../../shared/src/schemas/auto-claude';
import type { AutoClaudeAgentConfig } from '../../../../shared/src/types/auto-claude';

/**
 * Validation schema for parsed agent config
 */
const ParsedAgentConfigSchema = z.object({
  agentType: z.string().min(1),
  config: AutoClaudeAgentConfigSchema,
});

export interface ParsedAgentConfig {
  agentType: string;
  config: AutoClaudeAgentConfig;
}

/**
 * Result interface for models.py parsing
 */
export interface ModelsParseResult {
  agentConfigs: ParsedAgentConfig[];
  errors: string[];
}

/**
 * Enhanced Python AST-like parser for extracting AGENT_CONFIGS dictionary
 * This parser handles more complex Python dictionary structures than simple regex
 */
export class ModelsParser {
  private content: string;
  private position: number;
  private line: number;
  private column: number;

  constructor(content: string) {
    this.content = content;
    this.position = 0;
    this.line = 1;
    this.column = 1;
  }

  /**
   * Skip whitespace and comments
   */
  private skipWhitespaceAndComments(): void {
    while (this.position < this.content.length) {
      const char = this.content[this.position];

      if (char === ' ' || char === '\t') {
        this.position++;
        this.column++;
      } else if (char === '\n') {
        this.position++;
        this.line++;
        this.column = 1;
      } else if (char === '#') {
        // Skip comment to end of line
        while (this.position < this.content.length && this.content[this.position] !== '\n') {
          this.position++;
        }
      } else {
        break;
      }
    }
  }

  /**
   * Parse a quoted string (either single or double quotes)
   */
  private parseString(): string | null {
    this.skipWhitespaceAndComments();

    if (this.position >= this.content.length) return null;

    const quote = this.content[this.position];
    if (quote !== '"' && quote !== "'") return null;

    this.position++; // Skip opening quote
    let result = '';
    let escaped = false;

    while (this.position < this.content.length) {
      const char = this.content[this.position];

      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        this.position++; // Skip closing quote
        return result;
      } else {
        result += char;
      }

      this.position++;
      if (char === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }

    return null; // Unterminated string
  }

  /**
   * Parse a list [item1, item2, ...]
   */
  private parseList(): string[] | null {
    this.skipWhitespaceAndComments();

    if (this.position >= this.content.length || this.content[this.position] !== '[') {
      return null;
    }

    this.position++; // Skip opening bracket
    const items: string[] = [];

    while (this.position < this.content.length) {
      this.skipWhitespaceAndComments();

      if (this.position >= this.content.length) break;

      if (this.content[this.position] === ']') {
        this.position++; // Skip closing bracket
        return items;
      }

      if (this.content[this.position] === ',') {
        this.position++; // Skip comma
        continue;
      }

      const item = this.parseString();
      if (item !== null) {
        items.push(item);
      } else {
        // Skip unknown token
        this.position++;
      }
    }

    return items;
  }

  /**
   * Parse a simple dictionary value (string, list, or boolean)
   */
  private parseValue(): any {
    this.skipWhitespaceAndComments();

    if (this.position >= this.content.length) return null;

    const char = this.content[this.position];

    if (char === '"' || char === "'") {
      return this.parseString();
    }

    if (char === '[') {
      return this.parseList();
    }

    // Check for boolean values
    const remaining = this.content.substring(this.position);
    if (remaining.startsWith('True')) {
      this.position += 4;
      return true;
    }
    if (remaining.startsWith('False')) {
      this.position += 5;
      return false;
    }

    // Try to parse identifier (for unquoted strings)
    let identifier = '';
    while (this.position < this.content.length) {
      const char = this.content[this.position];
      if (/[a-zA-Z0-9_]/.test(char)) {
        identifier += char;
        this.position++;
      } else {
        break;
      }
    }

    return identifier || null;
  }

  /**
   * Parse a dictionary {key: value, ...}
   */
  private parseDictionary(): Record<string, any> | null {
    this.skipWhitespaceAndComments();

    if (this.position >= this.content.length || this.content[this.position] !== '{') {
      return null;
    }

    this.position++; // Skip opening brace
    const dict: Record<string, any> = {};

    while (this.position < this.content.length) {
      this.skipWhitespaceAndComments();

      if (this.position >= this.content.length) break;

      if (this.content[this.position] === '}') {
        this.position++; // Skip closing brace
        return dict;
      }

      if (this.content[this.position] === ',') {
        this.position++; // Skip comma
        continue;
      }

      // Parse key
      const key = this.parseString();
      if (key === null) {
        // Skip until next comma or closing brace
        while (this.position < this.content.length &&
               this.content[this.position] !== ',' &&
               this.content[this.position] !== '}') {
          this.position++;
        }
        continue;
      }

      this.skipWhitespaceAndComments();

      // Expect colon
      if (this.position >= this.content.length || this.content[this.position] !== ':') {
        // Skip until next comma or closing brace
        while (this.position < this.content.length &&
               this.content[this.position] !== ',' &&
               this.content[this.position] !== '}') {
          this.position++;
        }
        continue;
      }

      this.position++; // Skip colon

      // Parse value
      const value = this.parseValue();
      if (value !== null) {
        dict[key] = value;
      }
    }

    return dict;
  }

  /**
   * Find and parse AGENT_CONFIGS dictionary
   */
  public parseAgentConfigs(): Record<string, any> | null {
    // Reset position to start
    this.position = 0;
    this.line = 1;
    this.column = 1;

    // Look for AGENT_CONFIGS = {
    const agentConfigsPattern = /AGENT_CONFIGS\s*=\s*\{/;
    const match = this.content.match(agentConfigsPattern);

    if (!match) {
      return null;
    }

    // Move position to start of dictionary
    this.position = match.index! + match[0].length - 1; // Position at the opening brace

    return this.parseDictionary();
  }
}

/**
 * Convert parsed dictionary values to proper AutoClaudeAgentConfig format
 */
function convertToAgentConfig(agentType: string, rawConfig: Record<string, any>): AutoClaudeAgentConfig | null {
  try {
    const config: AutoClaudeAgentConfig = {
      agentType,
      tools: Array.isArray(rawConfig.tools) ? rawConfig.tools : [],
      mcpServers: Array.isArray(rawConfig.mcp_servers) ? rawConfig.mcp_servers : [],
      mcpServersOptional: Array.isArray(rawConfig.mcp_servers_optional) ? rawConfig.mcp_servers_optional : [],
      autoClaudeTools: Array.isArray(rawConfig.auto_claude_tools) ? rawConfig.auto_claude_tools : [],
      thinkingDefault: rawConfig.thinking_default || 'medium',
    };

    // Validate the config using Zod schema
    return AutoClaudeAgentConfigSchema.parse(config);
  } catch (error) {
    console.warn(`Failed to convert agent config for ${agentType}:`, error);
    return null;
  }
}

/**
 * Parse models.py file to extract AGENT_CONFIGS dictionary
 */
export async function parseModelsFile(modelsPath: string): Promise<ModelsParseResult> {
  const result: ModelsParseResult = {
    agentConfigs: [],
    errors: [],
  };

  try {
    // Read the file
    const content = await fs.readFile(modelsPath, 'utf-8');

    // Parse using enhanced parser
    const parser = new ModelsParser(content);
    const agentConfigsDict = parser.parseAgentConfigs();

    if (!agentConfigsDict) {
      result.errors.push('AGENT_CONFIGS dictionary not found in models.py');
      return result;
    }

    // Convert each agent config
    for (const [agentType, rawConfig] of Object.entries(agentConfigsDict)) {
      if (typeof rawConfig === 'object' && rawConfig !== null) {
        const config = convertToAgentConfig(agentType, rawConfig);

        if (config) {
          result.agentConfigs.push({ agentType, config });
        } else {
          result.errors.push(`Failed to parse agent config for '${agentType}': Invalid configuration structure`);
        }
      } else {
        result.errors.push(`Failed to parse agent config for '${agentType}': Expected object, got ${typeof rawConfig}`);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Failed to read or parse models.py: ${errorMessage}`);
  }

  return result;
}

/**
 * Validation function for the parsed results
 */
export function validateParsedAgentConfigs(configs: ParsedAgentConfig[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    for (const config of configs) {
      ParsedAgentConfigSchema.parse(config);
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
 * Get default agent configurations for testing or fallback
 */
export function getDefaultAgentConfigs(): ParsedAgentConfig[] {
  return [
    {
      agentType: 'coder',
      config: {
        agentType: 'coder',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear', 'electron'],
        autoClaudeTools: [],
        thinkingDefault: 'medium',
      },
    },
    {
      agentType: 'planner',
      config: {
        agentType: 'planner',
        tools: ['Read', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear'],
        autoClaudeTools: [],
        thinkingDefault: 'high',
      },
    },
    {
      agentType: 'qa_reviewer',
      config: {
        agentType: 'qa_reviewer',
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
        mcpServers: ['context7'],
        mcpServersOptional: [],
        autoClaudeTools: [],
        thinkingDefault: 'high',
      },
    },
    {
      agentType: 'spec_gatherer',
      config: {
        agentType: 'spec_gatherer',
        tools: ['Read', 'Write', 'Glob', 'Grep', 'WebSearch'],
        mcpServers: ['context7'],
        mcpServersOptional: ['linear'],
        autoClaudeTools: [],
        thinkingDefault: 'medium',
      },
    },
  ];
}