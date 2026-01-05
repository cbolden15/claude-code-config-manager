'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Database, CheckCircle, Settings } from 'lucide-react';

// Import wizard step components
import { PathSelectionStep } from './components/path-selection-step';
import { PreviewStep } from './components/preview-step';
import { ValidationStep } from './components/validation-step';
import { ResultsStep } from './components/results-step';

export interface WizardState {
  autoClaudeInstallPath: string;
  detectedConfigs?: {
    agentConfigs: Array<{
      agentType: string;
      tools: string[];
      mcpServers: string[];
      thinkingDefault: string;
    }>;
    prompts: Array<{
      agentType: string;
      fileName: string;
      contentPreview: string;
      injectionPoints: string[];
    }>;
    projectConfig?: {
      context7Enabled: boolean;
      linearMcpEnabled: boolean;
      electronMcpEnabled: boolean;
      customMcpServers: any[];
      apiKeys: string[];
    };
    modelProfiles: Array<{
      name: string;
      description: string;
      phaseModels: Record<string, string>;
      phaseThinking: Record<string, string>;
    }>;
  };
  importResults?: {
    agentConfigsImported: number;
    promptsImported: number;
    modelProfilesImported: number;
    projectConfigImported: number;
    errors: string[];
  };
}

const WIZARD_STEPS = [
  {
    id: 'path',
    title: 'Select Installation',
    description: 'Choose your Auto-Claude installation directory',
    icon: Settings,
  },
  {
    id: 'preview',
    title: 'Preview Configurations',
    description: 'Review detected agent configs, prompts, and settings',
    icon: FileText,
  },
  {
    id: 'validation',
    title: 'Validate & Import',
    description: 'Validate configurations and perform import',
    icon: Database,
  },
  {
    id: 'results',
    title: 'Import Results',
    description: 'Review import status and next steps',
    icon: CheckCircle,
  },
];

export default function AutoClaudeImportPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<WizardState>({
    autoClaudeInstallPath: '',
  });

  function updateWizardState(updates: Partial<WizardState>) {
    setWizardState(prev => ({ ...prev, ...updates }));
  }

  function canProceedToNextStep(): boolean {
    switch (currentStep) {
      case 0: // Path selection
        return wizardState.autoClaudeInstallPath.length > 0;
      case 1: // Preview
        return wizardState.detectedConfigs !== undefined;
      case 2: // Validation
        return wizardState.importResults !== undefined;
      case 3: // Results
        return false; // Final step
      default:
        return false;
    }
  }

  function handleNext() {
    if (canProceedToNextStep() && currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }

  function handlePrevious() {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }

  function renderCurrentStep() {
    switch (currentStep) {
      case 0:
        return (
          <PathSelectionStep
            wizardState={wizardState}
            updateWizardState={updateWizardState}
          />
        );
      case 1:
        return (
          <PreviewStep
            wizardState={wizardState}
            updateWizardState={updateWizardState}
          />
        );
      case 2:
        return (
          <ValidationStep
            wizardState={wizardState}
            updateWizardState={updateWizardState}
          />
        );
      case 3:
        return (
          <ResultsStep
            wizardState={wizardState}
            updateWizardState={updateWizardState}
          />
        );
      default:
        return null;
    }
  }

  const currentStepInfo = WIZARD_STEPS[currentStep];

  return (
    <>
      <Header
        title="Auto-Claude Import"
        description="Import existing Auto-Claude configurations into CCM"
      />

      <div className="p-6 max-w-5xl">
        {/* Progress indicator */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Import Wizard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              {WIZARD_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const isAccessible = index <= currentStep;

                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center space-y-2 flex-1 ${
                      isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                    onClick={() => {
                      if (isAccessible) {
                        setCurrentStep(index);
                      }
                    }}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-100 text-green-600'
                          : isActive
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Current step content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <currentStepInfo.icon className="w-5 h-5" />
              {currentStepInfo.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[400px]">
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceedToNextStep() || currentStep === WIZARD_STEPS.length - 1}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Help section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                This wizard will import your existing Auto-Claude configurations into CCM, making CCM the
                single source of truth for both Claude Code and Auto-Claude settings.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Agent configurations will be extracted from your <code>models.py</code> file</li>
                <li>Prompts will be imported from your <code>prompts/</code> directory</li>
                <li>Project settings will be parsed from your <code>.auto-claude/.env</code> files</li>
                <li>Default model profiles will be created for different use cases</li>
              </ul>
              <p className="pt-2 font-medium">
                After import, CCM becomes authoritative - direct edits to Auto-Claude files will be overwritten
                during sync.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}