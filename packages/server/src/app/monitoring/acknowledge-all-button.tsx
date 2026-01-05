'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function AcknowledgeAllButton({ count }: { count: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAcknowledgeAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/monitoring/bulk/acknowledge', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to acknowledge all');
      }

      router.refresh();
    } catch (error) {
      console.error('Acknowledge all error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleAcknowledgeAll} disabled={loading}>
      {loading ? 'Marking...' : `Mark All Read (${count})`}
    </Button>
  );
}
