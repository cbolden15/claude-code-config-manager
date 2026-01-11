/**
 * Global Environment Variables Types
 *
 * Types for managing environment variables in CCM v2.0
 */

/**
 * Environment Variable Scopes
 */
export type EnvScope = 'all' | 'claude-desktop' | 'claude-code' | 'cli';

/**
 * Environment Variable Categories
 */
export type EnvCategory = 'api_keys' | 'paths' | 'webhooks' | 'database' | 'credentials' | 'other';

/**
 * GlobalEnvVar - Centralized environment variable
 */
export interface GlobalEnvVar {
  id: string;
  key: string;
  value: string; // May be encrypted
  encrypted: boolean;
  sensitive: boolean; // Mask in UI even if not encrypted
  description: string | null;
  scope: EnvScope;
  category: EnvCategory | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GlobalEnvVarCreate - Payload for creating an environment variable
 */
export interface GlobalEnvVarCreate {
  key: string;
  value: string;
  encrypted?: boolean;
  sensitive?: boolean;
  description?: string;
  scope?: EnvScope;
  category?: EnvCategory;
}

/**
 * GlobalEnvVarUpdate - Payload for updating an environment variable
 */
export interface GlobalEnvVarUpdate {
  id: string;
  key?: string;
  value?: string;
  encrypted?: boolean;
  sensitive?: boolean;
  description?: string;
  scope?: EnvScope;
  category?: EnvCategory;
}

/**
 * GlobalEnvVarMasked - Environment variable with masked value for display
 */
export interface GlobalEnvVarMasked extends Omit<GlobalEnvVar, 'value'> {
  value: string; // Will be "********" if sensitive
  hasValue: boolean; // Indicates if a value exists
}

/**
 * EnvVarListResponse - Response from GET /api/settings/env
 */
export interface EnvVarListResponse {
  envVars: GlobalEnvVarMasked[];
  stats: {
    total: number;
    encrypted: number;
    sensitive: number;
    byScope: Record<EnvScope, number>;
    byCategory: Record<string, number>;
  };
}

/**
 * EnvVarFilters - Filters for listing environment variables
 */
export interface EnvVarFilters {
  scope?: EnvScope;
  category?: EnvCategory;
  encrypted?: boolean;
  sensitive?: boolean;
}

/**
 * EnvVarExportFormat - Format for exporting env vars
 */
export interface EnvVarExportFormat {
  [key: string]: string;
}
