'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const componentTypes = [
  { value: 'MCP_SERVER', label: 'MCP Server', description: 'External tool integration via Model Context Protocol' },
  { value: 'SUBAGENT', label: 'Subagent', description: 'Specialized AI agent with isolated context' },
  { value: 'SKILL', label: 'Skill', description: 'Auto-triggered capability extension' },
  { value: 'COMMAND', label: 'Command', description: 'User-triggered workflow shortcut' },
  { value: 'HOOK', label: 'Hook', description: 'Automated lifecycle trigger' },
  { value: 'CLAUDE_MD_TEMPLATE', label: 'Template', description: 'CLAUDE.md template for projects' },
];

export default function NewComponentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState('MCP_SERVER');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [version, setVersion] = useState('');

  // MCP Server fields
  const [mcpCommand, setMcpCommand] = useState('npx');
  const [mcpArgs, setMcpArgs] = useState('');
  const [mcpEnv, setMcpEnv] = useState('');

  // Subagent/Skill/Command fields
  const [instructions, setInstructions] = useState('');
  const [tools, setTools] = useState('Read, Edit, Grep, Glob, Bash');
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [triggers, setTriggers] = useState('');

  // Hook fields
  const [hookType, setHookType] = useState('PostToolUse');
  const [matcher, setMatcher] = useState('');
  const [hookCommand, setHookCommand] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let config: Record<string, unknown> = {};

      switch (type) {
        case 'MCP_SERVER':
          const envObj: Record<string, string> = {};
          mcpEnv.split('\n').filter(Boolean).forEach((line) => {
            const [key, ...valueParts] = line.split('=');
            if (key) envObj[key.trim()] = valueParts.join('=').trim();
          });
          config = {
            command: mcpCommand,
            args: mcpArgs.split(',').map((a) => a.trim()).filter(Boolean),
            env: envObj,
            requiredSecrets: Object.keys(envObj).filter((k) => envObj[k].includes('${')),
          };
          break;

        case 'SUBAGENT':
          config = {
            name: name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description,
            tools: tools.split(',').map((t) => t.trim()).filter(Boolean),
            model,
            instructions,
          };
          break;

        case 'SKILL':
          config = {
            name: name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description,
            triggers: triggers.split('\n').map((t) => t.trim()).filter(Boolean),
            instructions,
          };
          break;

        case 'COMMAND':
          config = {
            name,
            description,
            prompt: instructions,
          };
          break;

        case 'HOOK':
          config = {
            hookType,
            matcher: matcher || undefined,
            command: hookCommand,
            description,
          };
          break;

        case 'CLAUDE_MD_TEMPLATE':
          config = {
            name: name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description,
            content: instructions,
            placeholders: [
              { name: 'projectName', description: 'Name of the project' },
              { name: 'projectDescription', description: 'Brief description', default: 'A new project' },
            ],
          };
          break;
      }

      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          description,
          config,
          tags,
          sourceUrl: sourceUrl || null,
          version: version || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create component');
      }

      const component = await res.json();
      router.push(`/components/${component.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        title="New Component"
        description="Create a new configuration component"
      />

      <div className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Component Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {componentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <div className="font-medium">{t.label}</div>
                          <div className="text-xs text-gray-500">{t.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="my-component"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="automation, workflow"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this component do?"
                  required
                />
              </div>

              {/* Type-specific fields */}
              {type === 'MCP_SERVER' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mcpCommand">Command</Label>
                      <Input
                        id="mcpCommand"
                        value={mcpCommand}
                        onChange={(e) => setMcpCommand(e.target.value)}
                        placeholder="npx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mcpArgs">Arguments (comma-separated)</Label>
                      <Input
                        id="mcpArgs"
                        value={mcpArgs}
                        onChange={(e) => setMcpArgs(e.target.value)}
                        placeholder="-y, @modelcontextprotocol/server-github"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mcpEnv">Environment Variables (KEY=value, one per line)</Label>
                    <Textarea
                      id="mcpEnv"
                      value={mcpEnv}
                      onChange={(e) => setMcpEnv(e.target.value)}
                      placeholder="GITHUB_TOKEN=${GITHUB_TOKEN}"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {(type === 'SUBAGENT' || type === 'SKILL' || type === 'COMMAND' || type === 'CLAUDE_MD_TEMPLATE') && (
                <div className="space-y-2">
                  <Label htmlFor="instructions">
                    {type === 'COMMAND' ? 'Prompt' : type === 'CLAUDE_MD_TEMPLATE' ? 'Template Content' : 'Instructions'}
                  </Label>
                  <Textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={type === 'CLAUDE_MD_TEMPLATE' ? '# Project: {{projectName}}\n\n{{projectDescription}}' : 'Enter instructions...'}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              )}

              {type === 'SUBAGENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tools">Tools (comma-separated)</Label>
                    <Input
                      id="tools"
                      value={tools}
                      onChange={(e) => setTools(e.target.value)}
                      placeholder="Read, Edit, Grep"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="claude-sonnet-4-20250514"
                    />
                  </div>
                </div>
              )}

              {type === 'SKILL' && (
                <div className="space-y-2">
                  <Label htmlFor="triggers">Trigger Phrases (one per line)</Label>
                  <Textarea
                    id="triggers"
                    value={triggers}
                    onChange={(e) => setTriggers(e.target.value)}
                    placeholder="generate api docs\ndocument this api"
                    rows={3}
                  />
                </div>
              )}

              {type === 'HOOK' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hook Type</Label>
                      <Select value={hookType} onValueChange={setHookType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SessionStart">Session Start</SelectItem>
                          <SelectItem value="PreToolUse">Pre Tool Use</SelectItem>
                          <SelectItem value="PostToolUse">Post Tool Use</SelectItem>
                          <SelectItem value="Stop">Stop</SelectItem>
                          <SelectItem value="TaskComplete">Task Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matcher">Matcher (regex, optional)</Label>
                      <Input
                        id="matcher"
                        value={matcher}
                        onChange={(e) => setMatcher(e.target.value)}
                        placeholder="Edit|Write"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hookCommand">Command</Label>
                    <Input
                      id="hookCommand"
                      value={hookCommand}
                      onChange={(e) => setHookCommand(e.target.value)}
                      placeholder='npx prettier --write "$FILE"'
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL (optional)</Label>
                  <Input
                    id="sourceUrl"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version">Version (optional)</Label>
                  <Input
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Component'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </>
  );
}
