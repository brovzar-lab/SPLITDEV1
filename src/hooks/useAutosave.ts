import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 9000];

interface Pending<T> {
  value: T;
  timer: ReturnType<typeof setTimeout>;
}

export function useAutosave<T>(
  mutationFn: (value: T) => Promise<unknown>,
  options: { debounceMs?: number; getKey?: (value: T) => string } = {},
) {
  const { debounceMs = 600, getKey = () => '__default__' } = options;
  const [status, setStatus] = useState<SaveStatus>('idle');
  const pending = useRef<Map<string, Pending<T>>>(new Map());
  const inFlight = useRef<Set<string>>(new Set());

  const flush = useCallback(async (key: string, value: T, attempt = 0) => {
    pending.current.delete(key);
    inFlight.current.add(key);
    setStatus('pending');
    try {
      await mutationFn(value);
      inFlight.current.delete(key);
      if (pending.current.size === 0 && inFlight.current.size === 0) {
        setStatus('saved');
      }
    } catch {
      inFlight.current.delete(key);
      if (attempt < MAX_RETRIES) {
        setTimeout(() => flush(key, value, attempt + 1), RETRY_DELAYS[attempt]);
      } else {
        setStatus('error');
      }
    }
  }, [mutationFn]);

  const trigger = useCallback((value: T) => {
    const key = getKey(value);
    setStatus('pending');
    const existing = pending.current.get(key);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => flush(key, value), debounceMs);
    pending.current.set(key, { value, timer });
  }, [debounceMs, flush, getKey]);

  useEffect(() => () => {
    for (const { timer } of pending.current.values()) clearTimeout(timer);
    pending.current.clear();
  }, []);

  return { trigger, status };
}
