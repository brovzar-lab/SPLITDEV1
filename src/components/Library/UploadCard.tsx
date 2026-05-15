import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { RD } from '../../tokens';

export function UploadCard({ onUploaded }: { onUploaded: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { screenplay } = await api.uploadScreenplay(file);
      onUploaded();
      navigate(`/screenplays/${screenplay.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      style={{
        padding: '32px 24px',
        background: dragging ? RD.copperSoft : RD.card,
        border: `2px dashed ${dragging ? RD.copper : RD.lineDeep}`,
        borderRadius: 4,
        cursor: 'pointer',
        textAlign: 'center',
        fontFamily: RD.display,
        color: RD.inkSoft,
        fontStyle: 'italic',
        fontSize: 15,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".fountain,.txt,.fdx"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {uploading
        ? 'Uploading…'
        : error
        ? <span style={{ color: RD.ruby }}>{error}</span>
        : 'Drop a .fountain or .fdx file here, or click to choose'}
    </div>
  );
}
