import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { RD } from '../../tokens';

export function UploadCard({ onUploaded }: { onUploaded: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'reading' | 'naming'>('idle');
  const [error, setError] = useState<string | null>(null);
  // T4.10 — pending screenplay awaiting a title before navigation
  const [pending, setPending] = useState<{ id: string; suggested: string } | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  // Autofocus the title field when the name prompt appears.
  useEffect(() => {
    if (stage === 'naming') {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [stage]);

  async function finalize(id: string) {
    onUploaded();
    navigate(`/screenplays/${id}`);
  }

  async function handleFile(file: File) {
    setError(null);
    setStage('uploading');
    try {
      const { screenplay } = await api.uploadScreenplay(file);
      setStage('reading');
      const start = Date.now();
      while (Date.now() - start < 8000) {
        try {
          const s = await api.getTriageStatus(screenplay.id);
          if (s.status === 'done' || s.status === 'failed') break;
        } catch {
          break;
        }
        await new Promise(r => setTimeout(r, 800));
      }
      // T4.10 — if the parser couldn't recover a real title, ask before
      // navigating. The Untitled state shouldn't persist past first ingest.
      const placeholder = !screenplay.title || /^untitled$/i.test(screenplay.title);
      if (placeholder) {
        const suggested = file.name.replace(/\.(fountain|fdx|txt)$/i, '').trim();
        setPending({ id: screenplay.id, suggested });
        setTitleDraft(suggested);
        setStage('naming');
        return;
      }
      finalize(screenplay.id);
    } catch (e) {
      setError((e as Error).message);
      setStage('idle');
    }
  }

  async function saveTitle() {
    if (!pending) return;
    const title = titleDraft.trim() || pending.suggested || 'Untitled';
    try {
      await api.patchScreenplay(pending.id, { title });
    } catch {
      // Save failure is non-fatal — user can rename later
    }
    finalize(pending.id);
  }

  async function skipTitle() {
    if (!pending) return;
    finalize(pending.id);
  }

  const uploading = stage !== 'idle' && stage !== 'naming';
  const label =
    stage === 'reading' ? 'Reading your screenplay…'
    : stage === 'uploading' ? 'Uploading…'
    : error ? null
    : 'Drop a .fountain or .fdx file here, or click to choose';

  if (stage === 'naming' && pending) {
    return (
      <div
        style={{
          padding: '24px',
          background: RD.card,
          border: `2px solid ${RD.copper}`,
          borderRadius: 4,
          fontFamily: RD.display,
        }}
      >
        <div
          style={{
            fontStyle: 'italic',
            fontSize: 15,
            color: RD.ink,
            marginBottom: 4,
          }}
        >
          What's this screenplay called?
        </div>
        <div
          style={{
            fontSize: 11,
            color: RD.inkFade,
            fontFamily: RD.sans,
            marginBottom: 14,
            letterSpacing: 0.3,
          }}
        >
          The file didn't include a Title field — give it a name now and you
          can always rename later.
        </div>
        <input
          ref={titleInputRef}
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveTitle();
            if (e.key === 'Escape') skipTitle();
          }}
          placeholder={pending.suggested || 'The Cabin'}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontFamily: RD.display,
            fontSize: 18,
            fontStyle: 'italic',
            color: RD.ink,
            background: RD.paper,
            border: `1px solid ${RD.line}`,
            borderRadius: 2,
            outline: 'none',
            marginBottom: 12,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={skipTitle}
            style={{
              padding: '6px 14px',
              fontFamily: RD.sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: RD.inkFade,
              background: 'transparent',
              border: `1px solid ${RD.line}`,
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            Skip
          </button>
          <button
            onClick={saveTitle}
            disabled={!titleDraft.trim()}
            style={{
              padding: '6px 14px',
              fontFamily: RD.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: RD.paper,
              background: titleDraft.trim() ? RD.copper : RD.inkFade,
              border: 'none',
              borderRadius: 2,
              cursor: titleDraft.trim() ? 'pointer' : 'not-allowed',
              boxShadow:
                titleDraft.trim()
                  ? '0 2px 0 #8c2828, 0 3px 4px rgba(60,40,20,0.18)'
                  : 'none',
            }}
          >
            Save title
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        if (uploading) return;
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => { if (!uploading) inputRef.current?.click(); }}
      style={{
        padding: '32px 24px',
        background: dragging ? RD.copperSoft : RD.card,
        border: `2px dashed ${dragging ? RD.copper : RD.lineDeep}`,
        borderRadius: 4,
        cursor: uploading ? 'progress' : 'pointer',
        textAlign: 'center',
        fontFamily: RD.display,
        color: RD.inkSoft,
        fontStyle: 'italic',
        fontSize: 15,
        transition: 'background 0.15s, border-color 0.15s',
        opacity: uploading ? 0.85 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".fountain,.txt,.fdx"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {label}
      {error && <span style={{ color: RD.ruby }}>{error}</span>}
    </div>
  );
}
