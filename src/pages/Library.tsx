import { useScreenplays } from '../hooks/useScreenplays';
import { RD } from '../tokens';
import { UploadCard } from '../components/Library/UploadCard';
import { ScreenplayRow } from '../components/Library/ScreenplayRow';

export default function Library() {
  const { screenplays, loading, refresh } = useScreenplays();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: RD.sans, background: RD.paper, overflow: 'auto' }}>
      <header style={{ padding: '40px 56px 24px', borderBottom: `1px solid ${RD.line}` }}>
        <div style={{ fontFamily: RD.display, fontSize: 36, fontStyle: 'italic', color: RD.ink }}>Splitdev</div>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: RD.copper, marginTop: 6 }}>Writers Atelier</div>
      </header>
      <main style={{ padding: '32px 56px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <UploadCard onUploaded={refresh} />
        {loading ? (
          <div style={{ color: RD.inkFade, fontStyle: 'italic' }}>Loading library…</div>
        ) : screenplays.length === 0 ? (
          <div style={{ color: RD.inkFade, fontStyle: 'italic' }}>No screenplays yet. Upload one above.</div>
        ) : (
          screenplays.map(s => <ScreenplayRow key={s.id} screenplay={s} onDeleted={refresh} />)
        )}
      </main>
    </div>
  );
}
