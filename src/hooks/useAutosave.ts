import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

export function useAutosave<T>(mutationFn: (value: T) => Promise<unknown>, debounceMs = 600) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<T | null>(null);

  const trigger = useCallback((value: T) => {
    latest.current = value;
    setStatus('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await mutationFn(latest.current as T);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, debounceMs);
  }, [mutationFn, debounceMs]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { trigger, status };
}
