'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, TrendingUp, DollarSign, Brain, Zap } from 'lucide-react';
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

interface ProfileCardProps {
  profile: ModelProfileData;
  onEdit: (profile: ModelProfileData) => void;
  onDelete: (profileName: string) => void;
}

function PhaseMatrix({ config }: { config: AutoClaudeModelProfile }) {
  const phases = [
    { key: 'spec' as const, label: 'Spec' },
    { key: 'planning' as const, label: 'Plan' },
    { key: 'coding' as const, label: 'Code' },
    { key: 'qa' as const, label: 'QA' },
  ];

  const getModelColor = (model: string) => {
    switch (model) {
      case 'opus': return 'bg-red-100 text-red-800 border-red-200';
      case 'sonnet': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'haiku': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getThinkingColor = (level: string) => {
    switch (level) {
      case 'ultrathink': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'none': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
          <Brain className="h-3 w-3" />
          Models by Phase
        </h4>
        <div className="grid grid-cols-4 gap-1">
          {phases.map((phase) => (
            <div key={phase.key} className="text-center">
              <div className="text-xs text-gray-500 mb-1">{phase.label}</div>
              <div className={`text-xs px-2 py-1 rounded border text-center ${getModelColor(config.phaseModels[phase.key])}`}>
                {config.phaseModels[phase.key]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Thinking Levels
        </h4>
        <div className="grid grid-cols-4 gap-1">
          {phases.map((phase) => (
            <div key={phase.key} className="text-center">
              <div className={`text-xs px-2 py-1 rounded border text-center ${getThinkingColor(config.phaseThinking[phase.key])}`}>
                {config.phaseThinking[phase.key]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CostEstimationBadge({ costEstimate }: { costEstimate?: string }) {
  if (!costEstimate) return null;

  const getCostConfig = (cost: string) => {
    switch (cost) {
      case 'high':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: DollarSign, label: 'High Cost' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: DollarSign, label: 'Medium Cost' };
      case 'low':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: DollarSign, label: 'Low Cost' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: DollarSign, label: 'Unknown Cost' };
    }
  };

  const config = getCostConfig(costEstimate);
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  );
}

function QualityLevelBadge({ qualityLevel }: { qualityLevel?: string }) {
  if (!qualityLevel) return null;

  const getQualityConfig = (quality: string) => {
    switch (quality) {
      case 'premium':
        return { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: TrendingUp, label: 'Premium' };
      case 'high':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: TrendingUp, label: 'High Quality' };
      case 'balanced':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: TrendingUp, label: 'Balanced' };
      case 'basic':
        return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: TrendingUp, label: 'Basic' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: TrendingUp, label: 'Unknown' };
    }
  };

  const config = getQualityConfig(qualityLevel);
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  );
}

export default function ProfileCard({ profile, onEdit, onDelete }: ProfileCardProps) {
  const { config, phaseAnalysis } = profile;

  return (
    <Card className="hover:border-gray-300 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900">{profile.name}</h3>
              {!profile.enabled && (
                <Badge variant="outline" className="text-gray-400">Disabled</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">{profile.description}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <PhaseMatrix config={config} />

        {phaseAnalysis && (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Cost & Quality Analysis</h4>
              <div className="flex gap-2">
                <CostEstimationBadge costEstimate={phaseAnalysis.costEstimate} />
                <QualityLevelBadge qualityLevel={phaseAnalysis.qualityLevel} />
              </div>
            </div>

            {phaseAnalysis.modelDistribution && Object.keys(phaseAnalysis.modelDistribution).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Model Distribution</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(phaseAnalysis.modelDistribution).map(([model, count]) => (
                    <span key={model} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {model}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Updated: {new Date(profile.updatedAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(profile)}
              className="h-7 px-2"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(profile.name)}
              className="h-7 px-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}