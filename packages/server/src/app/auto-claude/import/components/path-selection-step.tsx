'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Folder, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { WizardState } from '../page';

interface PathSelectionStepProps {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
}

interface PathValidation {
  isValid: boolean;
  hasModelsFile: boolean;
  hasPromptsDir: boolean;
  hasBackendDir: boolean;
  message: string;
}

export function PathSelectionStep({ wizardState, updateWizardState }: PathSelectionStepProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<PathValidation | null>(null);
  const [inputPath, setInputPath] = useState(wizardState.autoClaudeInstallPath);

  async function validatePath(pathToValidate: string) {
    if (!pathToValidate.trim()) {
      setValidation(null);
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch('/api/auto-claude/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoClaudeInstallPath: pathToValidate,
          dryRun: true, // Just validate, don't import
        }),
      });

      if (response.ok) {
        const result = await response.json();

        setValidation({
          isValid: true,
          hasModelsFile: result.agentConfigs?.length > 0,
          hasPromptsDir: result.prompts?.length > 0,
          hasBackendDir: true,
          message: `Valid Auto-Claude installation found. Detected ${result.agentConfigs?.length || 0} agent configs and ${result.prompts?.length || 0} prompts.`,
        });

        // Update wizard state with validated path
        updateWizardState({ autoClaudeInstallPath: pathToValidate });
      } else {
        const error = await response.json();
        setValidation({
          isValid: false,
          hasModelsFile: false,
          hasPromptsDir: false,
          hasBackendDir: false,
          message: error.error || 'Invalid Auto-Claude installation path',
        });
      }
    } catch (error) {
      setValidation({
        isValid: false,
        hasModelsFile: false,
        hasPromptsDir: false,
        hasBackendDir: false,
        message: 'Failed to validate path. Please check the directory and try again.',
      });
    } finally {
      setIsValidating(false);
    }
  }

  function handlePathChange(newPath: string) {
    setInputPath(newPath);
    // Clear validation when path changes
    if (validation) {
      setValidation(null);
    }
    // Clear wizard state path if it was previously validated
    if (wizardState.autoClaudeInstallPath !== newPath) {
      updateWizardState({ autoClaudeInstallPath: '' });
    }
  }

  function handleValidateClick() {
    validatePath(inputPath);
  }

  function handleUseDefaultPath() {
    const defaultPath = '~/Projects/Auto-Claude';
    setInputPath(defaultPath);
    validatePath(defaultPath);
  }

  return (
    <div className="space-y-6">
      {/* Path input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="installPath">Auto-Claude Installation Path</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="installPath"
                value={inputPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/Users/you/Projects/Auto-Claude"
                className="pl-10 font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleValidateClick}
              disabled={!inputPath.trim() || isValidating}
              variant="outline"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Enter the full path to your Auto-Claude installation directory.
          </p>
        </div>

        {/* Quick action */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUseDefaultPath}
            className="h-8 text-xs"
          >
            Use default path: ~/Projects/Auto-Claude
          </Button>
        </div>
      </div>

      {/* Validation results */}
      {validation && (
        <div className="space-y-3">
          <Alert className={validation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={validation.isValid ? 'text-green-700' : 'text-red-700'}>
                {validation.message}
              </AlertDescription>
            </div>
          </Alert>

          {/* Detailed validation info */}
          {validation.isValid && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className={`p-3 rounded-lg ${validation.hasBackendDir ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${validation.hasBackendDir ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="font-medium">Backend Directory</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">apps/backend/ found</p>
              </div>

              <div className={`p-3 rounded-lg ${validation.hasModelsFile ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${validation.hasModelsFile ? 'text-green-600' : 'text-yellow-600'}`} />
                  <span className="font-medium">Agent Configs</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {validation.hasModelsFile ? 'models.py found' : 'models.py not found'}
                </p>
              </div>

              <div className={`p-3 rounded-lg ${validation.hasPromptsDir ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${validation.hasPromptsDir ? 'text-green-600' : 'text-yellow-600'}`} />
                  <span className="font-medium">Prompts</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {validation.hasPromptsDir ? 'prompts/ directory found' : 'prompts/ directory not found'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expected structure info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Expected Auto-Claude directory structure:</strong>
          <pre className="mt-2 text-xs bg-gray-100 p-3 rounded font-mono">
{`Auto-Claude/
├── apps/
│   └── backend/
│       ├── models.py          # Agent configurations
│       └── prompts/           # Agent prompt files
│           ├── coder.md
│           ├── planner.md
│           └── ...
└── .auto-claude/
    └── .env                   # Project settings (optional)`}
          </pre>
        </AlertDescription>
      </Alert>

      {/* Status summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Import Status</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Installation path:</span>
            <span className={inputPath ? 'font-mono' : 'text-gray-400'}>
              {inputPath || 'Not specified'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Validation status:</span>
            <span className={`${
              validation === null ? 'text-gray-400' :
              validation.isValid ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
            }`}>
              {validation === null ? 'Not validated' :
               validation.isValid ? 'Valid installation' : 'Invalid path'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Ready to proceed:</span>
            <span className={validation?.isValid ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {validation?.isValid ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}