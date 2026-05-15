import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ChatMessage } from '../api/types';

export interface Greeting { text: string; done: boolean; error?: string; }

export function useSessionOpener(screenplayId: string | null) {
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const [history, setHistory] = useState<ChatMessage[] | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (!screenplayId) return;
    const gen = ++generation.current;
    const ac = new AbortController();

    (async () => {
      let messages: ChatMessage[] = [];
      try {
        const result = await api.getChatHistory(screenplayId, null);
        messages = result.messages;
      } catch {
        messages = [];
      }
      if (generation.current !== gen) return;
      setHistory(messages);
      if (messages.length > 0) return; // session already opened previously

      let res: Response;
      try {
        res = await fetch(`/api/screenplays/${screenplayId}/session/open`, {
          method: 'POST',
          signal: ac.signal,
        });
      } catch {
        return; // aborted or network fail
      }
      if (generation.current !== gen || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let text = '';
      setGreeting({ text: '', done: false });
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (generation.current !== gen) { reader.cancel(); break; }
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
      } catch {
        // stream interrupted — silent
      }
    })();

    return () => { ac.abort(); };
  }, [screenplayId]);

  return { greeting, history };
}
