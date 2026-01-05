'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  Shield,
  Info
} from 'lucide-react';
import { WizardState } from '../page';

interface ValidationStepProps {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
}

export function ValidationStep({ wizardState, updateWizardState }: ValidationStepProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [confirmations, setConfirmations] = useState({
    overwriteExisting: false,
    backupRecommended: false,
    ccmAuthoritative: false,
  });

  const allConfirmed = Object.values(confirmations).every(Boolean);

  async function performImport() {
    if (!wizardState.autoClaudeInstallPath || !allConfirmed) return;

    setIsImporting(true);
    setProgress(0);
    setCurrentStep('Validating configurations...');

    try {
      // Step 1: Final validation
      setProgress(25);
      setCurrentStep('Performing final validation...');

      const response = await fetch('/api/auto-claude/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoClaudeInstallPath: wizardState.autoClaudeInstallPath,
          dryRun: false, // Actual import
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      // Step 2: Processing import
      setProgress(50);
      setCurrentStep('Importing agent configurations...');

      // Simulate processing time for user feedback
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress(75);
      setCurrentStep('Importing prompts and model profiles...');

      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress(90);
      setCurrentStep('Finalizing import...');

      const result = await response.json();

      setProgress(100);
      setCurrentStep('Import completed successfully!');

      // Update wizard state with import results
      updateWizardState({
        importResults: {
          agentConfigsImported: result.agentConfigsImported || 0,
          promptsImported: result.promptsImported || 0,
          modelProfilesImported: result.modelProfilesImported || 0,
          projectConfigImported: result.projectConfigImported || 0,
          errors: result.errors || [],
        },
      });

      // Wait a moment before finishing
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      setCurrentStep('Import failed');
      updateWizardState({
        importResults: {
          agentConfigsImported: 0,
          promptsImported: 0,
          modelProfilesImported: 0,
          projectConfigImported: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        },
      });
    } finally {
      setIsImporting(false);
    }
  }

  function updateConfirmation(key: keyof typeof confirmations, value: boolean) {
    setConfirmations(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  if (isImporting) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Importing Auto-Claude Configurations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please do not close this page while the import is in progress.
                This process may take a few moments depending on the size of your Auto-Claude installation.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!wizardState.detectedConfigs) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please go back and complete the configuration detection step.
      </div>
    );
  }

  const { agentConfigs, prompts, modelProfiles, projectConfig } = wizardState.detectedConfigs;

  return (
    <div className="space-y-6">
      {/* Import Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Configurations to Import</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Agent Configurations:</span>
                  <span className="font-medium">{agentConfigs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agent Prompts:</span>
                  <span className="font-medium">{prompts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Model Profiles:</span>
                  <span className="font-medium">{modelProfiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Project Configuration:</span>
                  <span className="font-medium">{projectConfig ? 1 : 0}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Component Types</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>AUTO_CLAUDE_AGENT_CONFIG:</span>
                  <span className="font-medium">{agentConfigs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>AUTO_CLAUDE_PROMPT:</span>
                  <span className="font-medium">{prompts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>AUTO_CLAUDE_MODEL_PROFILE:</span>
                  <span className="font-medium">{modelProfiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>AUTO_CLAUDE_PROJECT_CONFIG:</span>
                  <span className="font-medium">{projectConfig ? 1 : 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Import Confirmations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="overwrite"
                checked={confirmations.overwriteExisting}
                onCheckedChange={(checked) =>
                  updateConfirmation('overwriteExisting', checked as boolean)
                }
              />
              <div className="space-y-1">
                <label htmlFor="overwrite" className="text-sm font-medium leading-none cursor-pointer">
                  I understand that existing Auto-Claude component types may be overwritten
                </label>
                <p className="text-xs text-gray-500">
                  Any existing AUTO_CLAUDE_* components with the same names will be replaced.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="backup"
                checked={confirmations.backupRecommended}
                onCheckedChange={(checked) =>
                  updateConfirmation('backupRecommended', checked as boolean)
                }
              />
              <div className="space-y-1">
                <label htmlFor="backup" className="text-sm font-medium leading-none cursor-pointer">
                  I have backed up my existing CCM database (recommended)
                </label>
                <p className="text-xs text-gray-500">
                  While the import process is safe, it's always good practice to backup first.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="authoritative"
                checked={confirmations.ccmAuthoritative}
                onCheckedChange={(checked) =>
                  updateConfirmation('ccmAuthoritative', checked as boolean)
                }
              />
              <div className="space-y-1">
                <label htmlFor="authoritative" className="text-sm font-medium leading-none cursor-pointer">
                  I understand that CCM will become the authoritative source for these configurations
                </label>
                <p className="text-xs text-gray-500">
                  After import, direct edits to Auto-Claude files will be overwritten during sync operations.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Warnings */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          <strong>Important:</strong> This is a one-time import process. After completion:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>CCM becomes the single source of truth for Auto-Claude configurations</li>
            <li>Use CCM's web UI or CLI to edit agent configs and prompts</li>
            <li>Run <code>ccm auto-claude sync</code> to update your Auto-Claude installation</li>
            <li>Direct edits to Auto-Claude files will be overwritten during sync</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Import Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <Button
              onClick={performImport}
              disabled={!allConfirmed}
              className="flex items-center gap-2 px-8 py-3"
              size="lg"
            >
              <Download className="h-5 w-5" />
              Import Auto-Claude Configurations
            </Button>
          </div>
          {!allConfirmed && (
            <p className="text-center text-sm text-gray-500 mt-3">
              Please confirm all checkboxes above to proceed with the import.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Next Steps Preview */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>After import:</strong> You'll be able to manage your Auto-Claude configurations
          through CCM's web interface and sync them to your Auto-Claude installation using the CLI.
        </AlertDescription>
      </Alert>
    </div>
  );
}