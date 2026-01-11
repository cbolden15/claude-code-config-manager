import { api } from './api.js';
import type { GlobalHook, GlobalHookCreate } from '@ccm/shared';

export interface HooksListResponse {
  hooks: GlobalHook[];
  grouped: Record<string, GlobalHook[]>;
  stats: {
    total: number;
    enabled: number;
    byType: Record<string, number>;
  };
}

export async function listHooks(filters?: {
  hookType?: string;
  category?: string;
  enabled?: boolean;
}): Promise<{ data?: HooksListResponse; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (filters?.hookType) params.set('hookType', filters.hookType);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.enabled !== undefined) params.set('enabled', String(filters.enabled));

    const response = await api.get<HooksListResponse>(`/api/settings/hooks?${params}`);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createHook(hook: GlobalHookCreate): Promise<{ data?: { hook: GlobalHook }; error?: string }> {
  try {
    const response = await api.post<{ hook: GlobalHook }>('/api/settings/hooks', hook);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateHook(id: string, updates: Partial<GlobalHook>): Promise<{ data?: { hook: GlobalHook }; error?: string }> {
  try {
    const response = await api.put<{ hook: GlobalHook }>(`/api/settings/hooks/${id}`, updates);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteHook(id: string): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const response = await api.delete<{ success: boolean }>(`/api/settings/hooks/${id}`);
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function importHooks(
  hooks: Record<string, any[]>,
  options: { replace?: boolean; dryRun?: boolean }
): Promise<{ data?: any; error?: string }> {
  try {
    const response = await api.post<any>('/api/settings/hooks/import', {
      hooks,
      ...options
    });
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function exportHooks(): Promise<{ data?: { hooks: Record<string, any[]>; count: number }; error?: string }> {
  try {
    const response = await api.get<{ hooks: Record<string, any[]>; count: number }>('/api/settings/hooks/export');
    return response;
  } catch (error: any) {
    return { error: error.message };
  }
}
