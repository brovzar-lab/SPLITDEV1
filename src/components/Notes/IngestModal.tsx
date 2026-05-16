import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { RD } from '../../tokens';
import type { Note } from '../../api/types';

interface Props {
  screenplayId: string;
  onClose: () => void;
  onIngested: (notes: Note[]) => void;
}

export function IngestModal({ screenplayId, onClose, onIngested }: Props) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleSubmitText = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { notes } = await api.ingestNotesText(screenplayId, text.trim());
      onIngested(notes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFile = async (file: File) => {
    setSubmitting(true);
    setError(null);
    try {
      const { notes } = await api.ingestNotesFile(screenplayId, file);
      onIngested(notes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(40,28,16,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, fontFamily: RD.sans,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '92vw',
          background: RD.card, border: `1px solid ${RD.line}`,
          borderRadius: 4, boxShadow: RD.shadowDeep,
          padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <div>
          <div style={{
            fontFamily: RD.display, fontSize: 22, fontStyle: 'italic',
            color: RD.ink, letterSpacing: 0.5,
          }}>Ingest notes</div>
          <div style={{
            fontSize: 11, color: RD.inkFade, letterSpacing: 1,
            textTransform: 'uppercase', marginTop: 2,
          }}>Paste producer/development notes or upload a file</div>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste notes here — emails from a producer, reader coverage, table-read feedback…"
          rows={10}
          disabled={submitting}
          style={{
            padding: '12px 14px',
            border: `1px solid ${RD.line}`,
            background: RD.paper, color: RD.ink,
            fontFamily: RD.sans, fontSize: 13, lineHeight: 1.5,
            outline: 'none', borderRadius: 2,
            resize: 'vertical', minHeight: 180,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,.docx,.pdf"
            style={{ display: 'none' }}
            disabled={submitting}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={submitting}
            style={{
              padding: '6px 12px', fontFamily: RD.display, fontSize: 11,
              fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
              background: 'transparent', color: RD.inkSoft,
              border: `1px solid ${RD.line}`, borderRadius: 2, cursor: 'pointer',
            }}
          >📎 Or upload .txt / .md / .docx / .pdf</button>
          <div style={{ flex: 1 }} />
          {error && (
            <span style={{ color: RD.ruby, fontSize: 11, fontStyle: 'italic' }}>
              {error.length > 80 ? `${error.slice(0, 80)}…` : error}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '8px 16px', fontFamily: RD.display, fontSize: 12,
              background: 'transparent', color: RD.inkSoft,
              border: `1px solid ${RD.line}`, borderRadius: 2, cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleSubmitText}
            disabled={!text.trim() || submitting}
            style={{
              padding: '8px 18px', fontFamily: RD.display, fontSize: 12,
              fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              background: text.trim() && !submitting ? RD.copper : RD.lineDeep,
              color: RD.paper, border: 'none', borderRadius: 2,
              cursor: text.trim() && !submitting ? 'pointer' : 'default',
            }}
          >{submitting ? 'Extracting…' : 'Extract notes'}</button>
        </div>
      </div>
    </div>
  );
}
