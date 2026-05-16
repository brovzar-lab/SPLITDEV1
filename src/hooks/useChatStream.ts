import { useCallback, useState } from 'react';

export interface ChatStreamArgs {
  screenplayId: string;
  noteId?: string | null;
  target: { kind: 'agent' | 'character'; id: string };
  message: string;
}

export interface StreamedReply {
  text: string;
  voiceMatch: number | null;
  done: boolean;
  error?: string;
}

export function useChatStream() {
  const [reply, setReply] = useState<StreamedReply>({ text: '', voiceMatch: null, done: false });
  const [streaming, setStreaming] = useState(false);

  const send = useCallback(async (args: ChatStreamArgs) => {
    setStreaming(true);
    setReply({ text: '', voiceMatch: null, done: false });
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args),
    });
    if (!res.body) { setStreaming(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split('\n\n');
      buf = events.pop() ?? '';
      for (const block of events) {
        const lines = block.split('\n');
        const ev = lines.find(l => l.startsWith('event: '))?.slice(7).trim();
        const data = lines.find(l => l.startsWith('data: '))?.slice(6);
        if (!ev || !data) continue;
        if (ev === 'token') {
          const token = JSON.parse(data) as string;
          setReply(prev => ({ ...prev, text: prev.text + token }));
        } else if (ev === 'meta') {
          const meta = JSON.parse(data) as { voiceMatch?: number };
          if (meta.voiceMatch !== undefined) setReply(prev => ({ ...prev, voiceMatch: meta.voiceMatch! }));
        } else if (ev === 'done') {
          setReply(prev => ({ ...prev, done: true }));
          setStreaming(false);
        } else if (ev === 'error') {
          const e = JSON.parse(data) as { error: string };
          setReply(prev => ({ ...prev, error: e.error, done: true }));
          setStreaming(false);
        }
      }
    }
  }, []);

  return { reply, streaming, send };
}
