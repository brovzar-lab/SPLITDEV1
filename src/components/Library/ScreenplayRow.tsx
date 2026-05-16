import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { RD } from '../../tokens';
import type { Screenplay } from '../../api/types';

export function ScreenplayRow({
  screenplay,
  onDeleted,
}: {
  screenplay: Omit<Screenplay, 'source_text'>;
  onDeleted: () => void;
}) {
  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`Delete "${screenplay.title}"? This cannot be undone.`)) return;
    await api.deleteScreenplay(screenplay.id);
    onDeleted();
  };
  return (
    <Link
      to={`/screenplays/${screenplay.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 18px',
        background: RD.card, border: `1px solid ${RD.line}`,
        borderLeft: `4px solid ${RD.copper}`,
        textDecoration: 'none', color: RD.ink, borderRadius: 2,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: RD.display, fontSize: 18, fontStyle: 'italic', color: RD.ink }}>
          {screenplay.title}
        </div>
        <div style={{ fontSize: 11, color: RD.inkFade, marginTop: 2 }}>
          {screenplay.author ? `by ${screenplay.author} · ` : ''}
          {screenplay.source_format.toUpperCase()}
          <span style={{ margin: '0 6px' }}>·</span>
          last edited {new Date(screenplay.updated_at).toLocaleString()}
        </div>
      </div>
      <button
        onClick={onDelete}
        style={{
          padding: '6px 12px', fontFamily: RD.display, fontSize: 11,
          fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          background: 'transparent', color: RD.ruby, border: `1px solid ${RD.ruby}50`,
          borderRadius: 1, cursor: 'pointer',
        }}
      >
        Delete
      </button>
    </Link>
  );
}
