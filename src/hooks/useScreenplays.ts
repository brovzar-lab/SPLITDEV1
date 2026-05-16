import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Screenplay } from '../api/types';

export function useScreenplays() {
  const [list, setList] = useState<Array<Omit<Screenplay, 'source_text'>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { screenplays } = await api.listScreenplays();
      setList(screenplays);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { screenplays: list, loading, error, refresh };
}
