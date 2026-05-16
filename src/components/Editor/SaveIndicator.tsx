import type { SaveStatus } from '../../hooks/useAutosave';
import { RD } from '../../tokens';

const PILL_MIN_WIDTH = 64;

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') {
    return (
      <span
        aria-hidden="true"
        style={{ display: 'inline-block', minWidth: PILL_MIN_WIDTH }}
      />
    );
  }
  const label =
    status === 'pending' ? 'Saving…' :
    status === 'saved' ? 'Saved' :
    'Save failed';
  const color =
    status === 'pending' ? RD.gold :
    status === 'saved' ? RD.forest :
    RD.ruby;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        fontFamily: RD.script,
        fontSize: 11,
        fontWeight: 700,
        color,
        border: `1px solid ${color}50`,
        borderRadius: 3,
        letterSpacing: 1,
        minWidth: PILL_MIN_WIDTH,
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      {label}
    </span>
  );
}
