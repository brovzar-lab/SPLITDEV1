import { useEffect } from 'react';
import { RD } from '../tokens';

export type ToastTone = 'info' | 'success' | 'error';

interface Props {
  text: string;
  tone?: ToastTone;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ text, tone = 'info', onDismiss, duration = 2400 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [text, tone, duration, onDismiss]);

  const accent =
    tone === 'success' ? RD.forest : tone === 'error' ? RD.ruby : RD.copper;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 18px 11px',
        background: RD.ink,
        color: RD.paper,
        borderLeft: `4px solid ${accent}`,
        fontFamily: RD.display,
        fontStyle: 'italic',
        fontSize: 13,
        letterSpacing: 0.4,
        boxShadow: '0 8px 24px rgba(40,28,16,0.32)',
        zIndex: 1200,
        maxWidth: 480,
        lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  );
}
