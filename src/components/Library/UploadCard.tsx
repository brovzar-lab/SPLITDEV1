import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { RD } from '../../tokens';

export function UploadCard({ onUploaded }: { onUploaded: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'reading'>('idle');
  const [error, setError] = useState<string | null>(null);

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
          // Triage polling failure is non-fatal — just navigate
          break;
        }
        await new Promise(r => setTimeout(r, 800));
      }
      onUploaded();
      navigate(`/screenplays/${screenplay.id}`);
    } catch (e) {
      setError((e as Error).message);
      setStage('idle');
    }
  }

  const uploading = stage !== 'idle';
  const label =
    stage === 'reading' ? 'Reading your screenplay…'
    : stage === 'uploading' ? 'Uploading…'
    : error ? null
    : 'Drop a .fountain or .fdx file here, or click to choose';

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
