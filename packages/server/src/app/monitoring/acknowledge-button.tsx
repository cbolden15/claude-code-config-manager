'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function AcknowledgeButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAcknowledge() {
    setLoading(true);
    try {
      const res = await fetch(`/api/monitoring/${entryId}/acknowledge`, {
        method: 'PUT',
      });

      if (!res.ok) {
        throw new Error('Failed to acknowledge');
      }

      router.refresh();
    } catch (error) {
      console.error('Acknowledge error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAcknowledge}
      disabled={loading}
    >
      {loading ? '...' : 'Mark Read'}
    </Button>
  );
}
