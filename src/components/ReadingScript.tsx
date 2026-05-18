import { forwardRef } from 'react';
import { RD } from '../tokens';
import type { Scene, Line } from '../api/types';

interface Props {
  scenes: Array<Scene & { lines: Line[] }>;
  registerScene: (sceneId: string, el: HTMLDivElement | null) => void;
}

// Plain screenplay render — no asterisks, no revision tints, no margin
// numbers, no gutter pins, no inline-tag underlines. Just ink on paper.
export const ReadingScript = forwardRef<HTMLDivElement, Props>(function ReadingScript(
  { scenes, registerScene },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        fontFamily: RD.script,
        fontSize: 12,
        lineHeight: 1.85,
        color: RD.ink,
      }}
    >
      {scenes.map(s => (
        <div
          key={s.id}
          ref={el => registerScene(s.id, el)}
          className="rd-reading-scene"
          style={{ marginBottom: 24 }}
        >
          <div
            style={{
              textTransform: 'uppercase',
              fontWeight: 700,
              marginTop: 18,
              marginBottom: 12,
            }}
          >
            {s.heading}
          </div>
          {s.lines.map(l => renderLine(l))}
        </div>
      ))}
    </div>
  );
});

function renderLine(l: Line) {
  if (l.type === 'action') {
    return (
      <div key={l.id} style={{ marginBottom: 12 }}>
        {l.text}
      </div>
    );
  }
  // Dialogue: character centered uppercase, then optional parenthetical
  // indented italics, then dialogue indented.
  return (
    <div key={l.id} style={{ marginBottom: 12 }}>
      <div
        style={{
          textTransform: 'uppercase',
          textAlign: 'center',
          marginTop: 6,
        }}
      >
        {l.character}
      </div>
      {l.parenthetical && (
        <div
          style={{
            textAlign: 'center',
            fontStyle: 'italic',
            color: RD.inkSoft,
          }}
        >
          ({l.parenthetical})
        </div>
      )}
      <div style={{ paddingLeft: '14%', paddingRight: '14%' }}>{l.text}</div>
    </div>
  );
}
