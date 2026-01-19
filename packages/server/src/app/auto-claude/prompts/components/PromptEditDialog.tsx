'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, X, AlertTriangle, Info } from 'lucide-react';
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
}

interface PromptEditDialogProps {
  prompt: PromptData;
  onSave: (config: AutoClaudePrompt) => void;
  onCancel: () => void;
}

export default function PromptEditDialog({ prompt, onSave, onCancel }: PromptEditDialogProps) {
  const [config, setConfig] = useState<AutoClaudePrompt>({
    agentType: prompt.agentType,
    promptContent: prompt.config?.promptContent || '',
    injectionPoints: prompt.config?.injectionPoints || {
      specDirectory: false,
      projectContext: false,
      mcpDocumentation: false,
    },
  });

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (prompt.config) {
      setConfig({
        agentType: prompt.agentType,
        promptContent: prompt.config.promptContent || '',
        injectionPoints: prompt.config.injectionPoints || {
          specDirectory: false,
          projectContext: false,
          mcpDocumentation: false,
        },
      });
    }
  }, [prompt]);

  const validateConfig = (): string[] => {
    const validationErrors: string[] = [];

    if (!config.promptContent.trim()) {
      validationErrors.push('Prompt content cannot be empty');
    }

    if (config.promptContent.length < 10) {
      validationErrors.push('Prompt content must be at least 10 characters');
    }

    if (config.promptContent.length > 50000) {
      validationErrors.push('Prompt content cannot exceed 50,000 characters');
    }

    // Check for valid injection points in content
    const injectionMatches = config.promptContent.match(/\{\{([^}]+)\}\}/g) || [];
    const validInjectionPoints = ['specDirectory', 'projectContext', 'mcpDocumentation'];

    for (const match of injectionMatches) {
      const point = match.slice(2, -2).trim();
      if (!validInjectionPoints.includes(point)) {
        validationErrors.push(`Invalid injection point: {{${point}}}. Valid points are: {{specDirectory}}, {{projectContext}}, {{mcpDocumentation}}`);
      }
    }

    return validationErrors;
  };

  const handleSave = () => {
    const validationErrors = validateConfig();

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSave(config);
  };

  const handleContentChange = (content: string) => {
    setConfig(prev => ({
      ...prev,
      promptContent: content,
    }));

    // Auto-detect injection points
    const injectionMatches = content.match(/\{\{([^}]+)\}\}/g) || [];
    const detectedPoints = {
      specDirectory: injectionMatches.some(match => match.includes('specDirectory')),
      projectContext: injectionMatches.some(match => match.includes('projectContext')),
      mcpDocumentation: injectionMatches.some(match => match.includes('mcpDocumentation')),
    };

    setConfig(prev => ({
      ...prev,
      injectionPoints: detectedPoints,
    }));
  };

  const handleInjectionPointChange = (point: keyof NonNullable<AutoClaudePrompt['injectionPoints']>, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      injectionPoints: {
        specDirectory: false,
        projectContext: false,
        mcpDocumentation: false,
        ...prev.injectionPoints,
        [point]: checked,
      },
    }));
  };

  const insertInjectionPoint = (point: string) => {
    const insertText = `{{${point}}}`;
    const textarea = document.getElementById('prompt-content') as HTMLTextAreaElement;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = config.promptContent;

      const newContent = currentContent.substring(0, start) + insertText + currentContent.substring(end);
      handleContentChange(newContent);

      // Set cursor position after the inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + insertText.length, start + insertText.length);
      }, 0);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Edit Prompt: {prompt.agentType}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Errors */}
          {errors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="font-medium">Validation Errors:</div>
                <ul className="mt-1 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm">• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Agent Type (read-only) */}
          <div className="space-y-2">
            <Label>Agent Type</Label>
            <Input value={config.agentType} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500">Agent type cannot be changed</p>
          </div>

          {/* Injection Points Helper */}
          <div className="space-y-4">
            <Label>Injection Point Helpers</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertInjectionPoint('specDirectory')}
                className="text-xs"
              >
                Insert {'{'}{'{'} specDirectory {'}'}{'}'}

              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertInjectionPoint('projectContext')}
                className="text-xs"
              >
                Insert {'{'}{'{'} projectContext {'}'}{'}'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertInjectionPoint('mcpDocumentation')}
                className="text-xs"
              >
                Insert {'{'}{'{'} mcpDocumentation {'}'}{'}'}
              </Button>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Injection points will be automatically replaced with dynamic content when generating prompts.
                Click the buttons above to insert them at your cursor position.
              </AlertDescription>
            </Alert>
          </div>

          {/* Prompt Content */}
          <div className="space-y-2">
            <Label htmlFor="prompt-content">Prompt Content *</Label>
            <Textarea
              id="prompt-content"
              value={config.promptContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Enter the prompt content in markdown format..."
            />
            <p className="text-xs text-gray-500">
              Length: {config.promptContent.length} / 50,000 characters
            </p>
          </div>

          {/* Injection Points Status */}
          <div className="space-y-4">
            <Label>Injection Points Status</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="spec-directory"
                  checked={config.injectionPoints?.specDirectory || false}
                  onCheckedChange={(checked) => handleInjectionPointChange('specDirectory', checked as boolean)}
                />
                <Label htmlFor="spec-directory" className="text-sm">
                  Spec Directory
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="project-context"
                  checked={config.injectionPoints?.projectContext || false}
                  onCheckedChange={(checked) => handleInjectionPointChange('projectContext', checked as boolean)}
                />
                <Label htmlFor="project-context" className="text-sm">
                  Project Context
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mcp-documentation"
                  checked={config.injectionPoints?.mcpDocumentation || false}
                  onCheckedChange={(checked) => handleInjectionPointChange('mcpDocumentation', checked as boolean)}
                />
                <Label htmlFor="mcp-documentation" className="text-sm">
                  MCP Documentation
                </Label>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              These are auto-detected from your content but can be manually adjusted if needed.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}