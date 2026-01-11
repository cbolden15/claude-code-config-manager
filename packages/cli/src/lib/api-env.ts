/**
 * API Client for Environment Variables
 *
 * Provides functions for interacting with the environment variables API
 */

import { loadConfig } from './config.js';
import type {
  GlobalEnvVar,
  GlobalEnvVarCreate,
  GlobalEnvVarUpdate,
  GlobalEnvVarMasked,
  EnvVarListResponse,
  EnvVarFilters,
  EnvScope,
} from '@ccm/shared';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class EnvApiClient {
  private baseUrl: string;

  constructor() {
    const config = loadConfig();
    this.baseUrl = config.serverUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json() as T & { error?: string };

      if (!response.ok) {
        return { error: (data as { error?: string }).error || `HTTP ${response.status}` };
      }

      return { data: data as T };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          return { error: `Cannot connect to server at ${this.baseUrl}` };
        }
        return { error: error.message };
      }
      return { error: 'Unknown error occurred' };
    }
  }

  /**
   * List all environment variables
   */
  async list(filters?: EnvVarFilters): Promise<ApiResponse<EnvVarListResponse>> {
    const query = new URLSearchParams();

    if (filters?.scope) {
      query.set('scope', filters.scope);
    }
    if (filters?.category) {
      query.set('category', filters.category);
    }
    if (filters?.encrypted !== undefined) {
      query.set('encrypted', String(filters.encrypted));
    }
    if (filters?.sensitive !== undefined) {
      query.set('sensitive', String(filters.sensitive));
    }

    const queryString = query.toString();
    return this.request<EnvVarListResponse>(
      `/api/settings/env${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get a single environment variable
   */
  async get(
    id: string,
    includeSensitive: boolean = false
  ): Promise<ApiResponse<{ envVar: GlobalEnvVar | GlobalEnvVarMasked }>> {
    const query = includeSensitive ? '?includeSensitive=true' : '';
    return this.request<{ envVar: GlobalEnvVar | GlobalEnvVarMasked }>(
      `/api/settings/env/${id}${query}`
    );
  }

  /**
   * Create a new environment variable
   */
  async create(
    data: GlobalEnvVarCreate
  ): Promise<ApiResponse<{ envVar: GlobalEnvVar; message: string }>> {
    return this.request<{ envVar: GlobalEnvVar; message: string }>(
      '/api/settings/env',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Update an existing environment variable
   */
  async update(
    data: GlobalEnvVarUpdate
  ): Promise<ApiResponse<{ envVar: GlobalEnvVarMasked; message: string }>> {
    return this.request<{ envVar: GlobalEnvVarMasked; message: string }>(
      `/api/settings/env/${data.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Delete an environment variable
   */
  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(
      `/api/settings/env/${id}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Export environment variables
   */
  async export(options: {
    filters?: EnvVarFilters;
    decrypt?: boolean;
    format?: 'json' | 'dotenv';
    scope?: EnvScope;
  }): Promise<ApiResponse<{ envVars: Record<string, string> }>> {
    const query = new URLSearchParams();

    if (options.scope) {
      query.set('scope', options.scope);
    }
    if (options.filters?.category) {
      query.set('category', options.filters.category);
    }
    if (options.decrypt) {
      query.set('decrypt', 'true');
    }
    if (options.format) {
      query.set('format', options.format);
    }

    const queryString = query.toString();
    return this.request<{ envVars: Record<string, string> }>(
      `/api/settings/env/export${queryString ? `?${queryString}` : ''}`
    );
  }
}

export const envApi = new EnvApiClient();
export type { ApiResponse };
