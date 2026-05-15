import type { SaveStatus } from '../../hooks/useAutosave';
import { RD } from '../../tokens';

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const label =
    status === 'pending' ? 'Saving…' :
    status === 'saved' ? 'Saved' :
    status === 'error' ? 'Save failed' :
    'Idle';
  const color =
    status === 'pending' ? RD.gold :
    status === 'saved' ? RD.forest :
    status === 'error' ? RD.ruby :
    'rgba(244,237,224,0.6)';
  return (
    <div style={{
      padding: '4px 10px', fontFamily: RD.script, fontSize: 11, fontWeight: 700,
      color, border: `1px solid ${color}50`, borderRadius: 3, letterSpacing: 1,
    }}>{label}</div>
  );
}
