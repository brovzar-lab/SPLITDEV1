import { Fragment, type ReactNode } from 'react';
import { RD } from '../tokens';
import type { LineRevisionState } from '../api/types';

// Render the visible text for a line with inline word-level diff spans, when
// the current view is comparing to a base draft. Returns either a plain string
// (no inline changes) or interleaved <span>s with strike-through deletions and
// tinted insertions.
export function renderTextWithInlineDiff(
  text: string,
  rev: LineRevisionState | undefined,
  revColor: string,
): ReactNode {
  if (!rev) return text;
  const ins = rev.insertions ?? [];
  const del = rev.deletions ?? [];
  if (ins.length === 0 && del.length === 0) return text;

  type Marker =
    | { kind: 'ins'; from: number; to: number; text: string }
    | { kind: 'del'; from: number; to: number; text: string };
  const markers: Marker[] = [
    ...ins.map(s => ({ kind: 'ins' as const, ...s })),
    ...del.map(s => ({ kind: 'del' as const, ...s })),
  ].sort((a, b) => a.from - b.from);

  const out: ReactNode[] = [];
  let cursor = 0;
  markers.forEach((m, i) => {
    if (m.from > cursor) out.push(text.slice(cursor, m.from));
    if (m.kind === 'ins') {
      out.push(
        <span
          key={`ins-${i}`}
          style={{
            background: `${revColor}1c`,
            borderBottom: `1.5px solid ${revColor}`,
            padding: '0 1px',
          }}
        >
          {m.text}
        </span>,
      );
    } else {
      out.push(
        <span
          key={`del-${i}`}
          style={{
            color: RD.inkFade,
            textDecoration: `line-through ${RD.ruby}`,
            textDecorationThickness: 1.5,
          }}
        >
          {m.text}
        </span>,
      );
    }
    cursor = m.to;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return <Fragment>{out}</Fragment>;
}

// What asterisk goes in the right-side margin column? deletion → ruby,
// insertion → revColor, otherwise blank.
export function marginGlyph(rev: LineRevisionState | undefined): {
  glyph: string;
  color: string | null;
} {
  if (!rev) return { glyph: '', color: null };
  const hasInsertion =
    (rev.insertions && rev.insertions.length > 0) || rev.deletedText !== undefined;
  if (rev.deletedText !== undefined) return { glyph: '*', color: RD.ruby };
  if (hasInsertion) return { glyph: '*', color: null /* caller fills */ };
  return { glyph: '', color: null };
}

// True if the line has any visible change vs the base draft.
export function hasChange(rev: LineRevisionState | undefined): boolean {
  if (!rev) return false;
  return !!(
    rev.deletedText !== undefined ||
    (rev.insertions && rev.insertions.length > 0) ||
    (rev.deletions && rev.deletions.length > 0)
  );
}
