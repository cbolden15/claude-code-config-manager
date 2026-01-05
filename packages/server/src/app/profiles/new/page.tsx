'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Component {
  id: string;
  type: string;
  name: string;
  description: string;
}

const typeLabels: Record<string, string> = {
  MCP_SERVER: 'MCP',
  SUBAGENT: 'Agent',
  SKILL: 'Skill',
  COMMAND: 'Cmd',
  HOOK: 'Hook',
  CLAUDE_MD_TEMPLATE: 'Template',
};

export default function NewProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [claudeMdTemplate, setClaudeMdTemplate] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

  const [components, setComponents] = useState<Component[]>([]);

  useEffect(() => {
    fetch('/api/components')
      .then((res) => res.json())
      .then((data) => setComponents(data.components));
  }, []);

  function toggleComponent(id: string) {
    setSelectedComponents((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          claudeMdTemplate: claudeMdTemplate || null,
          componentIds: selectedComponents,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create profile');
      }

      const profile = await res.json();
      router.push(`/profiles/${profile.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const groupedComponents = components.reduce((acc, c) => {
    if (!acc[c.type]) acc[c.type] = [];
    acc[c.type].push(c);
    return acc;
  }, {} as Record<string, Component[]>);

  return (
    <>
      <Header
        title="New Profile"
        description="Create a bundle of components for a project type"
      />

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Profile Details */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="my-profile"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What type of projects is this profile for?"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template">CLAUDE.md Template (optional)</Label>
                    <Textarea
                      id="template"
                      value={claudeMdTemplate}
                      onChange={(e) => setClaudeMdTemplate(e.target.value)}
                      placeholder="# Project: {{projectName}}&#10;&#10;{{projectDescription}}"
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Use &#123;&#123;projectName&#125;&#125; and &#123;&#123;projectDescription&#125;&#125; as placeholders.
                    </p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Profile'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Component Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Components ({selectedComponents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {Object.entries(groupedComponents).map(([type, items]) => (
                      <div key={type}>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">
                          {typeLabels[type] || type}
                        </h4>
                        <div className="space-y-2">
                          {items.map((component) => (
                            <div
                              key={component.id}
                              onClick={() => toggleComponent(component.id)}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedComponents.includes(component.id)
                                  ? 'border-violet-500 bg-violet-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{component.name}</span>
                                {selectedComponents.includes(component.id) && (
                                  <Badge variant="default" className="text-xs">Selected</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {component.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </>
  );
}
