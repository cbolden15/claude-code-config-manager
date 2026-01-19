'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function SyncButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sync`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sync');
      }

      router.refresh();
    } catch (error) {
      console.error('Sync error:', error);
      alert(error instanceof Error ? error.message : 'Failed to sync project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleSync} disabled={loading}>
      {loading ? 'Syncing...' : 'Sync Now'}
    </Button>
  );
}
