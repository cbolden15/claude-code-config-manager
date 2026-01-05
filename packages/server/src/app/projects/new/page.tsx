'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Profile {
  id: string;
  name: string;
  description: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [machine, setMachine] = useState('');
  const [profileId, setProfileId] = useState<string>('');

  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    fetch('/api/profiles')
      .then((res) => res.json())
      .then((data) => setProfiles(data.profiles));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          path,
          machine,
          profileId: profileId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register project');
      }

      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        title="Register Project"
        description="Track a project for configuration management"
      />

      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-awesome-project"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="path">Project Path</Label>
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/Users/you/Projects/my-awesome-project"
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500">
                  Absolute path to the project directory on the target machine.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="machine">Machine</Label>
                <Input
                  id="machine"
                  value={machine}
                  onChange={(e) => setMachine(e.target.value)}
                  placeholder="macbook-pro"
                  required
                />
                <p className="text-xs text-gray-500">
                  Identifier for the machine where this project lives.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile">Profile (optional)</Label>
                <Select value={profileId} onValueChange={setProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a profile..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Assign a profile to automatically configure this project.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Registering...' : 'Register Project'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>CLI Alternative</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">
              You can also register projects using the CLI:
            </p>
            <code className="block p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono">
              ccm init my-project --profile general
            </code>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
