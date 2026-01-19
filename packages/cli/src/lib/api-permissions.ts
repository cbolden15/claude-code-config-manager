/**
 * Permissions API Client
 *
 * Handles communication with permissions API endpoints
 */

import type {
  GlobalPermission,
  GlobalPermissionCreate,
  PermissionsListResponse,
  ClaudeSettingsPermissions,
  PermissionsImportResult,
} from '@ccm/shared';
import { loadConfig } from './config.js';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class PermissionsApiClient {
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

      const data = (await response.json()) as T & { error?: string };

      if (!response.ok) {
        return {
          error: (data as { error?: string }).error || `HTTP ${response.status}`,
        };
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
   * GET /api/settings/permissions
   * List all permissions with statistics
   */
  async list(): Promise<ApiResponse<PermissionsListResponse>> {
    return this.request<PermissionsListResponse>('/api/settings/permissions', {
      method: 'GET',
    });
  }

  /**
   * GET /api/settings/permissions/[id]
   * Get a single permission by ID
   */
  async get(id: string): Promise<ApiResponse<GlobalPermission>> {
    return this.request<GlobalPermission>(`/api/settings/permissions/${id}`, {
      method: 'GET',
    });
  }

  /**
   * POST /api/settings/permissions
   * Create a new permission
   */
  async create(
    data: GlobalPermissionCreate
  ): Promise<ApiResponse<GlobalPermission>> {
    return this.request<GlobalPermission>('/api/settings/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT /api/settings/permissions/[id]
   * Update an existing permission
   */
  async update(
    id: string,
    data: Partial<GlobalPermissionCreate>
  ): Promise<ApiResponse<GlobalPermission>> {
    return this.request<GlobalPermission>(`/api/settings/permissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /api/settings/permissions/[id]
   * Delete a permission
   */
  async delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(
      `/api/settings/permissions/${id}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * POST /api/settings/permissions/import
   * Import permissions from Claude settings format
   */
  async import(
    settings: ClaudeSettingsPermissions
  ): Promise<ApiResponse<PermissionsImportResult>> {
    return this.request<PermissionsImportResult>(
      '/api/settings/permissions/import',
      {
        method: 'POST',
        body: JSON.stringify(settings),
      }
    );
  }

  /**
   * GET /api/settings/permissions/export
   * Export permissions to Claude settings format
   */
  async export(filters?: {
    enabled?: boolean;
    category?: string;
  }): Promise<ApiResponse<ClaudeSettingsPermissions>> {
    const params = new URLSearchParams();

    if (filters?.enabled !== undefined) {
      params.set('enabled', String(filters.enabled));
    }

    if (filters?.category) {
      params.set('category', filters.category);
    }

    const query = params.toString() ? `?${params.toString()}` : '';

    return this.request<ClaudeSettingsPermissions>(
      `/api/settings/permissions/export${query}`,
      {
        method: 'GET',
      }
    );
  }
}

export const permissionsApi = new PermissionsApiClient();
