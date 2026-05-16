import { useEffect, useState } from 'react';
import { api } from '../api/client';

export type TriageStatus = 'pending' | 'running' | 'done' | 'failed';

export function useTriageStatus(id: string | null) {
  const [status, setStatus] = useState<TriageStatus>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await api.getTriageStatus(id);
        if (cancelled) return;
        setStatus(res.status);
        setError(res.error);
        if (res.status === 'pending' || res.status === 'running') {
          setTimeout(poll, 1000);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [id]);

  return { status, error };
}
