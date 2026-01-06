'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Eye,
  Code,
  Save
} from 'lucide-react';
import MonacoEditor from './MonacoEditor';
import MarkdownPreview from './MarkdownPreview';
import PromptEditDialog from './PromptEditDialog';
import type { AutoClaudePrompt } from '../../../../../../../packages/shared/src/types/auto-claude';

interface PromptData {
  id: string;
  agentType: string;
  description: string;
  config?: AutoClaudePrompt;
  enabled: boolean;
  tags: string | null;
  version: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  contentPreview?: string;
  stats?: {
    injectionPointsUsed: number;
    content: {
      length: number;
      lines: number;
      words: number;
      hasHeaders: boolean;
      hasCodeBlocks: boolean;
      hasInjectionPoints: boolean;
    };
  };
}

interface PromptsApiResponse {
  prompts: PromptData[];
  stats: {
    total: number;
    enabled: number;
    agentTypes: number;
    injectionStats?: {
      specDirectory: number;
      projectContext: number;
      mcpDocumentation: number;
    };
  };
  agentTypes: string[];
  errors?: string[];
}

function PromptCard({ prompt, onEdit, onDelete, onClick }: {
  prompt: PromptData;
  onEdit: (prompt: PromptData) => void;
  onDelete: (id: string) => void;
  onClick: (prompt: PromptData) => void;
}) {
  const getInjectionPointBadges = () => {
    if (!prompt.config?.injectionPoints) return null;

    const badges = [];
    const points = prompt.config.injectionPoints;

    if (points.specDirectory) badges.push({ label: 'Spec', color: 'bg-blue-100 text-blue-800' });
    if (points.projectContext) badges.push({ label: 'Context', color: 'bg-green-100 text-green-800' });
    if (points.mcpDocumentation) badges.push({ label: 'MCP', color: 'bg-purple-100 text-purple-800' });

    return badges;
  };

  const injectionBadges = getInjectionPointBadges();

  return (
    <Card className="hover:border-gray-300 transition-colors cursor-pointer" onClick={() => onClick(prompt)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">{prompt.agentType}</h3>
              {!prompt.enabled && (
                <Badge variant="outline" className="text-gray-400">Disabled</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">{prompt.description}</p>

            <div className="space-y-2">
              {prompt.contentPreview && (
                <div>
                  <span className="text-xs font-medium text-gray-700 block mb-1">Content Preview</span>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {prompt.contentPreview}
                  </p>
                </div>
              )}

              {prompt.stats && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Length:</span>
                    <span className="font-medium ml-1">{prompt.stats.content.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Lines:</span>
                    <span className="font-medium ml-1">{prompt.stats.content.lines}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Words:</span>
                    <span className="font-medium ml-1">{prompt.stats.content.words}</span>
                  </div>
                </div>
              )}

              {injectionBadges && injectionBadges.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-700 block mb-1">Injection Points</span>
                  <div className="flex flex-wrap gap-1">
                    {injectionBadges.map((badge, index) => (
                      <span key={index} className={`text-xs px-1.5 py-0.5 rounded ${badge.color}`}>
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Updated: {new Date(prompt.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(prompt)}
              className="h-7 px-2"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(prompt.id)}
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

export default function PromptsList() {
  const [data, setData] = useState<PromptsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptData | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PromptData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentContent, setCurrentContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgentType, setFilterAgentType] = useState('all');

  const fetchPrompts = async (includeContent = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/auto-claude/prompts?includeContent=${includeContent}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
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
    fetchPrompts(false); // Initial load without content
  }, []);

  const handlePromptClick = async (prompt: PromptData) => {
    // Fetch full content for this specific prompt
    try {
      const response = await fetch(`/api/auto-claude/prompts/${prompt.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prompt details');
      }
      const fullPrompt = await response.json();
      setSelectedPrompt(fullPrompt);
      setCurrentContent(fullPrompt.config.promptContent);
      setIsEditing(false);
    } catch (err) {
      alert(`Error loading prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleEdit = (prompt: PromptData) => {
    setEditingPrompt(prompt);
  };

  const handleDelete = async (id: string) => {
    const prompt = data?.prompts.find(p => p.id === id);
    if (!prompt || !confirm(`Are you sure you want to delete the prompt for ${prompt.agentType}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/auto-claude/prompts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete prompt');
      }

      await fetchPrompts(); // Refresh the list
      if (selectedPrompt?.id === id) {
        setSelectedPrompt(null);
      }
    } catch (err) {
      alert(`Error deleting prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;

    try {
      const response = await fetch(`/api/auto-claude/prompts/${selectedPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptContent: currentContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save prompt');
      }

      const updated = await response.json();
      setSelectedPrompt(updated);
      setIsEditing(false);
      await fetchPrompts(); // Refresh the list
    } catch (err) {
      alert(`Error saving prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSavePrompt = async (updatedConfig: AutoClaudePrompt) => {
    if (!editingPrompt) return;

    try {
      const response = await fetch(`/api/auto-claude/prompts/${editingPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to update prompt');
      }

      setEditingPrompt(null);
      await fetchPrompts(); // Refresh the list
    } catch (err) {
      alert(`Error updating prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const filteredPrompts = data?.prompts.filter(prompt => {
    const matchesSearch = searchTerm === '' ||
      prompt.agentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterAgentType === 'all' || prompt.agentType === filterAgentType;
    return matchesSearch && matchesFilter;
  }) || [];

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading prompts...</p>
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
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{data.stats.total}</div>
              <div className="text-sm text-gray-500">Total Prompts</div>
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
              <div className="text-2xl font-bold text-purple-600">{data.stats.agentTypes}</div>
              <div className="text-sm text-gray-500">Agent Types</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.stats.injectionStats ?
                  Object.values(data.stats.injectionStats).reduce((a, b) => a + b, 0) : 0}
              </div>
              <div className="text-sm text-gray-500">Injection Points</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterAgentType} onValueChange={setFilterAgentType}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agent Types</SelectItem>
              {data.agentTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Prompt List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Prompts ({filteredPrompts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {filteredPrompts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium">No prompts found.</p>
                  <p className="text-sm mt-1">Create your first prompt or adjust your filters.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredPrompts.map((prompt) => (
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onClick={handlePromptClick}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Editor/Preview */}
        <div className="space-y-4">
          {selectedPrompt ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {selectedPrompt.agentType}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                      {isEditing ? 'Preview' : 'Edit'}
                    </Button>
                    {isEditing && (
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 h-[600px]">
                {isEditing ? (
                  <MonacoEditor
                    value={currentContent}
                    onChange={setCurrentContent}
                    language="markdown"
                    theme="vs"
                    options={{
                      minimap: { enabled: false },
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                    }}
                  />
                ) : (
                  <MarkdownPreview content={currentContent} />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardContent className="p-8 h-[600px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium">Select a prompt to edit</p>
                  <p className="text-sm mt-1">Click on a prompt from the list to start editing.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {editingPrompt && (
        <PromptEditDialog
          prompt={editingPrompt}
          onSave={handleSavePrompt}
          onCancel={() => setEditingPrompt(null)}
        />
      )}
    </>
  );
}