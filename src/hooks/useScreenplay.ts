import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { FullScreenplay } from '../api/types';

export function useScreenplay(id: string | undefined) {
  const [data, setData] = useState<FullScreenplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api.getScreenplay(id)
      .then(d => { if (!cancelled) { setData(d); setError(null); } })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return { data, setData, loading, error };
}
