import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ChatMessage as ApiChatMessage } from '../api/types';

export interface Greeting { text: string; done: boolean; error?: string; }

export function useSessionOpener(screenplayId: string | null) {
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const [history, setHistory] = useState<ApiChatMessage[] | null>(null);
  const fired = useRef<string | null>(null);  // tracks which screenplay we've fired for

  useEffect(() => {
    if (!screenplayId || fired.current === screenplayId) return;
    fired.current = screenplayId;
    let cancelled = false;

    (async () => {
      try {
        const { messages } = await api.getChatHistory(screenplayId, null);
        if (cancelled) return;
        setHistory(messages);
        if (messages.length > 0) return; // session already opened previously
      } catch {
        if (cancelled) return;
        setHistory([]);
      }

      const res = await fetch(`/api/screenplays/${screenplayId}/session/open`, { method: 'POST' });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let text = '';
      setGreeting({ text: '', done: false });
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (cancelled) { reader.cancel(); break; }
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const block of events) {
          const lines = block.split('\n');
          const ev = lines.find(l => l.startsWith('event: '))?.slice(7).trim();
          const data = lines.find(l => l.startsWith('data: '))?.slice(6);
          if (!ev || !data) continue;
          if (ev === 'token') {
            text += JSON.parse(data) as string;
            setGreeting({ text, done: false });
          } else if (ev === 'done') {
            setGreeting({ text, done: true });
          } else if (ev === 'error') {
            const e = JSON.parse(data) as { error: string };
            setGreeting({ text, done: true, error: e.error });
          }
        }
      }
    })();

    return () => { cancelled = true; };
  }, [screenplayId]);

  return { greeting, history };
}
