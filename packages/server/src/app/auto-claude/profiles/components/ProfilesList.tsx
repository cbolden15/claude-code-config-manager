'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Eye, Edit, Trash2, Settings } from 'lucide-react';
import ProfileCard from './ProfileCard';
import type { AutoClaudeModelProfile } from '../../../../../../../packages/shared/src/types/auto-claude';

interface ModelProfileData {
  id: string;
  name: string;
  description: string;
  config: AutoClaudeModelProfile;
  enabled: boolean;
  tags: string | null;
  version: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  phaseAnalysis?: {
    modelDistribution: Record<string, number>;
    thinkingDistribution: Record<string, number>;
    costEstimate: string;
    qualityLevel: string;
  };
}

interface ProfilesApiResponse {
  modelProfiles: ModelProfileData[];
  matrices: {
    phases: string[];
    profiles: string[];
    models: string[];
    thinkingLevels: string[];
    matrix: Record<string, {
      models: { spec: string; planning: string; coding: string; qa: string };
      thinking: { spec: string; planning: string; coding: string; qa: string };
    }>;
  };
  stats: {
    total: number;
    enabled: number;
    uniqueModels: number;
    uniqueThinkingLevels: number;
    phases: number;
  };
  errors?: string[];
}

export default function ProfilesList() {
  const [data, setData] = useState<ProfilesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<ModelProfileData | null>(null);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auto-claude/model-profiles?includePhaseDetails=true');
      if (!response.ok) {
        throw new Error('Failed to fetch model profiles');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleEdit = (profile: ModelProfileData) => {
    setEditingProfile(profile);
  };

  const handleDelete = async (profileName: string) => {
    if (!confirm(`Are you sure you want to delete the model profile '${profileName}'?`)) {
      return;
    }

    try {
      const profile = data?.modelProfiles.find(p => p.name === profileName);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const response = await fetch(`/api/auto-claude/model-profiles/${profile.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete model profile');
      }

      await fetchProfiles(); // Refresh the list
    } catch (err) {
      alert(`Error deleting profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading model profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{data.stats.total}</div>
              <div className="text-sm text-gray-500">Total Profiles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{data.stats.enabled}</div>
              <div className="text-sm text-gray-500">Enabled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{data.stats.uniqueModels}</div>
              <div className="text-sm text-gray-500">Model Types</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{data.stats.phases}</div>
              <div className="text-sm text-gray-500">Phases</div>
            </CardContent>
          </Card>
        </div>

        {data.errors && data.errors.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="font-medium">Configuration Warnings:</div>
              <ul className="mt-1 space-y-1">
                {data.errors.map((error, index) => (
                  <li key={index} className="text-sm">• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-6">
        {data.modelProfiles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Settings className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium">No model profiles found.</p>
            <p className="text-sm mt-1">Create your first model profile to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.modelProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}