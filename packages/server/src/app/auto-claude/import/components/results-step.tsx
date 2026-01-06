'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  Terminal,
  Globe,
  ArrowRight,
  Copy
} from 'lucide-react';
import { WizardState } from '../page';

interface ResultsStepProps {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
}

export function ResultsStep({ wizardState, updateWizardState }: ResultsStepProps) {
  const router = useRouter();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  if (!wizardState.importResults) {
    return (
      <div className="text-center py-8 text-gray-500">
        Import results not available. Please complete the import process.
      </div>
    );
  }

  const { importResults } = wizardState;
  const hasErrors = importResults.errors.length > 0;
  const totalImported = importResults.agentConfigsImported +
                       importResults.promptsImported +
                       importResults.modelProfilesImported +
                       importResults.projectConfigImported;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedCommand(label);
    setTimeout(() => setCopiedCommand(null), 2000);
  }

  function handleStartOver() {
    // Reset wizard state
    updateWizardState({
      autoClaudeInstallPath: '',
      detectedConfigs: undefined,
      importResults: undefined,
    });
    router.push('/auto-claude/import');
  }

  return (
    <div className="space-y-6">
      {/* Import Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasErrors ? (
              <XCircle className="h-6 w-6 text-red-600" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-600" />
            )}
            Import {hasErrors ? 'Completed with Errors' : 'Successful'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Success Statistics */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Successfully Imported</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Agent Configurations:</span>
                  <Badge variant={importResults.agentConfigsImported > 0 ? 'default' : 'secondary'}>
                    {importResults.agentConfigsImported}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Prompts:</span>
                  <Badge variant={importResults.promptsImported > 0 ? 'default' : 'secondary'}>
                    {importResults.promptsImported}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Model Profiles:</span>
                  <Badge variant={importResults.modelProfilesImported > 0 ? 'default' : 'secondary'}>
                    {importResults.modelProfilesImported}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Project Configurations:</span>
                  <Badge variant={importResults.projectConfigImported > 0 ? 'default' : 'secondary'}>
                    {importResults.projectConfigImported}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Import Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Items Imported:</span>
                  <Badge variant="default" className="font-bold">
                    {totalImported}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Errors Encountered:</span>
                  <Badge variant={hasErrors ? 'destructive' : 'secondary'}>
                    {importResults.errors.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  <Badge variant={hasErrors ? 'destructive' : 'default'}>
                    {hasErrors ? 'Partial Success' : 'Complete'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors (if any) */}
      {hasErrors && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Import Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {importResults.errors.map((error, index) => (
                <div key={index} className="bg-red-100 p-3 rounded border border-red-200">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ))}
            </div>
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Some configurations could not be imported. You can manually create these components
                or retry the import after fixing the source files.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => router.push('/auto-claude')}
              className="flex items-center gap-2 justify-start h-auto p-4"
              variant="outline"
            >
              <Globe className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">View Auto-Claude Dashboard</div>
                <div className="text-xs text-gray-500">Manage configurations in the web UI</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>

            <Button
              onClick={() => router.push('/components')}
              className="flex items-center gap-2 justify-start h-auto p-4"
              variant="outline"
            >
              <CheckCircle className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">View Imported Components</div>
                <div className="text-xs text-gray-500">Browse all CCM components</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>

          <Separator />

          {/* CLI Commands */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              CLI Commands
            </h4>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Sync configurations to Auto-Claude:</p>
                <div className="flex items-center gap-2 p-3 bg-gray-900 text-gray-100 rounded font-mono text-sm">
                  <code className="flex-1">ccm auto-claude sync --backend {wizardState.autoClaudeInstallPath}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(
                      `ccm auto-claude sync --backend ${wizardState.autoClaudeInstallPath}`,
                      'sync'
                    )}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {copiedCommand === 'sync' && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">View agent configurations:</p>
                <div className="flex items-center gap-2 p-3 bg-gray-900 text-gray-100 rounded font-mono text-sm">
                  <code className="flex-1">ccm auto-claude agents list</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('ccm auto-claude agents list', 'agents')}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {copiedCommand === 'agents' && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">View model profiles:</p>
                <div className="flex items-center gap-2 p-3 bg-gray-900 text-gray-100 rounded font-mono text-sm">
                  <code className="flex-1">ccm auto-claude profiles list</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('ccm auto-claude profiles list', 'profiles')}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {copiedCommand === 'profiles' && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Again */}
      <Card>
        <CardHeader>
          <CardTitle>Import Another Installation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Need to import configurations from another Auto-Claude installation?
              </p>
              <p className="text-xs text-gray-500">
                You can run the import wizard again to add more configurations.
              </p>
            </div>
            <Button onClick={handleStartOver} variant="outline" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Start New Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Final Success Message */}
      {!hasErrors && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <strong>Import completed successfully!</strong> CCM is now the authoritative source for your
            Auto-Claude configurations. You can edit them through the web UI and sync to your
            Auto-Claude installation using the CLI commands above.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}