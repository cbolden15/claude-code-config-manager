import { loadConfig } from './config.js';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
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

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // Health check
  async health(): Promise<ApiResponse<{ status: string; stats: Record<string, number> }>> {
    return this.get('/api/health');
  }

  // Components
  async listComponents(type?: string): Promise<ApiResponse<{ components: Component[]; total: number }>> {
    const query = type ? `?type=${type}` : '';
    return this.get(`/api/components${query}`);
  }

  // Profiles
  async listProfiles(): Promise<ApiResponse<{ profiles: Profile[]; total: number }>> {
    return this.get('/api/profiles');
  }

  async getProfile(id: string): Promise<ApiResponse<ProfileDetail>> {
    return this.get(`/api/profiles/${id}`);
  }

  async getProfileByName(name: string): Promise<ApiResponse<ProfileDetail | null>> {
    const result = await this.listProfiles();
    if (result.error) return { error: result.error };

    const profile = result.data?.profiles.find((p) => p.name === name);
    if (!profile) return { data: null };

    return this.getProfile(profile.id);
  }

  // Projects
  async listProjects(machine?: string): Promise<ApiResponse<{ projects: Project[]; total: number }>> {
    const query = machine ? `?machine=${machine}` : '';
    return this.get(`/api/projects${query}`);
  }

  async createProject(data: CreateProjectData): Promise<ApiResponse<Project>> {
    return this.post('/api/projects', data);
  }

  async syncProject(id: string): Promise<ApiResponse<Project>> {
    return this.post(`/api/projects/${id}/sync`);
  }

  // Generate
  async generate(data: GenerateRequest): Promise<ApiResponse<GenerateResponse>> {
    return this.post('/api/generate', data);
  }

  // Settings
  async getSetting(key: string): Promise<ApiResponse<{ value: string }>> {
    return this.get(`/api/settings/${key}`);
  }

  async setSetting(key: string, value: string): Promise<ApiResponse<{ key: string; value: string }>> {
    return this.put(`/api/settings/${key}`, { value });
  }

  async getSettings(options: { includeSensitive?: boolean; keysOnly?: boolean; pattern?: string } = {}): Promise<ApiResponse<{ settings: Array<{ key: string; value: string; encrypted: boolean }> }>> {
    const query = new URLSearchParams();
    if (options.includeSensitive) query.set('includeSensitive', 'true');
    if (options.keysOnly) query.set('keysOnly', 'true');
    if (options.pattern) query.set('pattern', options.pattern);

    const queryString = query.toString();
    return this.get(`/api/settings${queryString ? `?${queryString}` : ''}`);
  }

  // Auto-Claude
  async autoClaudeImport(data: AutoClaudeImportRequest): Promise<ApiResponse<AutoClaudeImportResponse>> {
    return this.post('/api/auto-claude/import', data);
  }

  async autoClaudeSync(data: AutoClaudeSyncRequest): Promise<ApiResponse<AutoClaudeSyncResponse>> {
    return this.post('/api/auto-claude/sync', data);
  }
}

// Types
interface Component {
  id: string;
  type: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface Profile {
  id: string;
  name: string;
  description: string;
  _count?: { projects: number };
  components?: Array<{ component: { type: string } }>;
}

interface ProfileDetail extends Profile {
  claudeMdTemplate?: string | null;
  components: Array<{
    component: {
      id: string;
      type: string;
      name: string;
      description: string;
      config: string;
    };
    order: number;
  }>;
}

interface Project {
  id: string;
  name: string;
  path: string;
  machine: string;
  profileId?: string | null;
  lastSyncedAt?: string | null;
  profile?: { id: string; name: string } | null;
}

interface CreateProjectData {
  name: string;
  path: string;
  machine: string;
  profileId?: string | null;
}

interface GenerateRequest {
  profileId?: string;
  profileName?: string;
  projectName: string;
  projectDescription?: string;
}

interface GenerateResponse {
  files: Array<{ path: string; content: string }>;
  summary: Record<string, number>;
}

interface AutoClaudeImportRequest {
  autoClaudeInstallPath: string;
  dryRun?: boolean;
}

interface AutoClaudeImportResponse {
  success: boolean;
  dryRun?: boolean;
  preview?: {
    agentConfigs: number;
    prompts: number;
    modelProfiles: number;
    projectConfig: number;
  };
  stats?: {
    agentConfigsImported: number;
    promptsImported: number;
    modelProfilesImported: number;
    projectConfigImported: number;
    errors: string[];
  };
  configs?: any; // For dry-run preview
}

interface AutoClaudeSyncRequest {
  backendPath?: string; // Override backend path if provided
  projectId?: string;   // Specific project to sync (optional)
  dryRun?: boolean;     // Preview without writing files
}

interface AutoClaudeSyncResponse {
  success: boolean;
  stats: {
    promptsWritten: number;
    agentConfigsWritten: number;
    filesWritten: string[];
    errors: string[];
  };
  backendPath: string;
  dryRun?: boolean;
}

export const api = new ApiClient();
export type { Component, Profile, ProfileDetail, Project, GenerateRequest, GenerateResponse, AutoClaudeImportRequest, AutoClaudeImportResponse, AutoClaudeSyncRequest, AutoClaudeSyncResponse };
