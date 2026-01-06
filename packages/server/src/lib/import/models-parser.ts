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
  private contentLength: number; // Cache content length for better performance
  private parseCache: Map<string, any>; // Cache parsing results

  constructor(content: string) {
    this.content = content;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.contentLength = content.length; // Cache for performance
    this.parseCache = new Map(); // Initialize cache
  }

  /**
   * Skip whitespace and comments - optimized version
   */
  private skipWhitespaceAndComments(): void {
    while (this.position < this.contentLength) {
      const char = this.content[this.position];

      if (char === ' ' || char === '\t') {
        this.position++;
        this.column++;
      } else if (char === '\n') {
        this.position++;
        this.line++;
        this.column = 1;
      } else if (char === '#') {
        // Skip comment to end of line more efficiently
        const newlineIndex = this.content.indexOf('\n', this.position);
        if (newlineIndex === -1) {
          this.position = this.contentLength; // End of file
          break;
        } else {
          this.position = newlineIndex;
        }
      } else {
        break;
      }
    }
  }

  /**
   * Parse a quoted string (either single or double quotes) - optimized version
   */
  private parseString(): string | null {
    this.skipWhitespaceAndComments();

    if (this.position >= this.contentLength) return null;

    const quote = this.content[this.position];
    if (quote !== '"' && quote !== "'") return null;

    const startPosition = this.position + 1; // Skip opening quote
    this.position++;
    let result = '';
    let escaped = false;

    // Use a more efficient approach for simple strings (no escape sequences)
    let hasEscapes = false;
    const endQuoteIndex = this.content.indexOf(quote, this.position);

    if (endQuoteIndex !== -1) {
      // Quick check if string contains escape sequences
      const substring = this.content.substring(this.position, endQuoteIndex);
      hasEscapes = substring.includes('\\');

      if (!hasEscapes) {
        // Fast path for simple strings
        this.position = endQuoteIndex + 1;
        // Update line/column tracking
        const newlines = (substring.match(/\n/g) || []).length;
        if (newlines > 0) {
          this.line += newlines;
          this.column = substring.length - substring.lastIndexOf('\n');
        } else {
          this.column += substring.length + 2; // +2 for quotes
        }
        return substring;
      }
    }

    // Fallback to character-by-character parsing for complex strings
    while (this.position < this.contentLength) {
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
   * Parse a list [item1, item2, ...] - optimized version
   */
  private parseList(): string[] | null {
    this.skipWhitespaceAndComments();

    if (this.position >= this.contentLength || this.content[this.position] !== '[') {
      return null;
    }

    this.position++; // Skip opening bracket
    const items: string[] = [];

    // Fast path: Try to find the complete list pattern quickly
    const startPos = this.position;
    let bracketCount = 1;
    let inString = false;
    let stringChar = '';

    // Find the end of the list quickly
    for (let i = this.position; i < this.contentLength && bracketCount > 0; i++) {
      const char = this.content[i];

      if (!inString) {
        if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
        else if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        }
      } else if (char === stringChar) {
        inString = false;
      }
    }

    // Use the original parsing logic
    while (this.position < this.contentLength) {
      this.skipWhitespaceAndComments();

      if (this.position >= this.contentLength) break;

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
   * Parse a dictionary value (string, list, nested dictionary, or boolean) - optimized
   */
  private parseValue(): any {
    this.skipWhitespaceAndComments();

    if (this.position >= this.contentLength) return null;

    const char = this.content[this.position];

    if (char === '"' || char === "'") {
      return this.parseString();
    }

    if (char === '[') {
      return this.parseList();
    }

    if (char === '{') {
      return this.parseDictionary();
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

    // Check for None value
    if (remaining.startsWith('None')) {
      this.position += 4;
      return null;
    }

    // Try to parse number
    const numberMatch = remaining.match(/^-?\d+(\.\d+)?/);
    if (numberMatch) {
      this.position += numberMatch[0].length;
      return numberMatch[0].includes('.') ? parseFloat(numberMatch[0]) : parseInt(numberMatch[0], 10);
    }

    // Try to parse identifier (for unquoted strings) - optimized
    let identifier = '';
    while (this.position < this.contentLength) {
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
   * Find and parse AGENT_CONFIGS dictionary - optimized version
   */
  public parseAgentConfigs(): Record<string, any> | null {
    // Look for AGENT_CONFIGS = {
    const agentConfigsPattern = /AGENT_CONFIGS\s*=\s*\{/;
    const match = this.content.match(agentConfigsPattern);

    if (!match) {
      return null;
    }

    // Find the complete dictionary using bracket matching for better performance
    const startIndex = match.index! + match[0].length - 1;
    const dictContent = this.extractDictionary(startIndex);

    if (!dictContent) {
      return null;
    }

    // Use optimized JSON-like parsing instead of character-by-character
    return this.parseJsonLikeDict(dictContent);
  }

  /**
   * Extract dictionary content using efficient bracket matching
   */
  private extractDictionary(startIndex: number): string | null {
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let currentQuote = '';

    for (let i = startIndex; i < this.content.length; i++) {
      const char = this.content[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        currentQuote = char;
        continue;
      }

      if (inString && char === currentQuote) {
        inString = false;
        currentQuote = '';
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            return this.content.substring(startIndex, i + 1);
          }
        }
      }
    }

    return null;
  }

  /**
   * Parse dictionary using optimized JSON-like approach
   */
  private parseJsonLikeDict(dictStr: string): Record<string, any> | null {
    try {
      // Convert Python-like syntax to JSON-like for faster parsing
      let jsonLike = dictStr
        .replace(/'/g, '"') // Convert single quotes to double quotes
        .replace(/True/g, 'true')
        .replace(/False/g, 'false')
        .replace(/None/g, 'null');

      // Handle unquoted keys (common in Python)
      jsonLike = jsonLike.replace(/(\w+):\s*(["\[])/g, '"$1": $2');

      try {
        return JSON.parse(jsonLike);
      } catch (e) {
        // Fallback to original parser for complex cases
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.position = dictStr.length - dictStr.length; // Set to start of dict
        return this.parseDictionary();
      }
    } catch (error) {
      return null;
    }
  }
}

// Conversion cache for agent configs
const conversionCache = new Map<string, AutoClaudeAgentConfig | null>();

/**
 * Convert parsed dictionary values to proper AutoClaudeAgentConfig format - optimized with caching
 */
function convertToAgentConfig(agentType: string, rawConfig: Record<string, any>): AutoClaudeAgentConfig | null {
  // Create cache key from config structure
  const cacheKey = `${agentType}:${JSON.stringify(rawConfig)}`;

  // Check cache first
  if (conversionCache.has(cacheKey)) {
    return conversionCache.get(cacheKey) ?? null;
  }

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
    const validatedConfig = AutoClaudeAgentConfigSchema.parse(config);

    // Cache the result
    conversionCache.set(cacheKey, validatedConfig);
    return validatedConfig;
  } catch (error) {
    // Cache the null result to avoid re-processing
    conversionCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Clear conversion cache - useful for testing or memory management
 */
export function clearConversionCache(): void {
  conversionCache.clear();
}

/**
 * Parse models.py file to extract AGENT_CONFIGS dictionary - optimized version
 */
export async function parseModelsFile(modelsPath: string): Promise<ModelsParseResult> {
  const performanceStart = performance.now();

  const result: ModelsParseResult = {
    agentConfigs: [],
    errors: [],
  };

  try {
    // Read the file with better error handling
    const content = await fs.readFile(modelsPath, 'utf-8');

    // Early return for empty files
    if (content.trim().length === 0) {
      result.errors.push('models.py file is empty');
      return result;
    }

    // Parse using enhanced parser
    const parseStart = performance.now();
    const parser = new ModelsParser(content);
    const agentConfigsDict = parser.parseAgentConfigs();
    const parseEnd = performance.now();

    if (!agentConfigsDict) {
      result.errors.push('AGENT_CONFIGS dictionary not found in models.py');
      return result;
    }

    // Convert configs in parallel where possible
    const conversionStart = performance.now();
    const configEntries = Object.entries(agentConfigsDict);

    for (const [agentType, rawConfig] of configEntries) {
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

    const conversionEnd = performance.now();
    const totalEnd = performance.now();

    // Log detailed performance metrics
    console.log(`[PERF] Models parsing breakdown:
      - Total: ${Math.round(totalEnd - performanceStart)}ms
      - Parsing: ${Math.round(parseEnd - parseStart)}ms
      - Conversion: ${Math.round(conversionEnd - conversionStart)}ms
      - Configs processed: ${configEntries.length}`);

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