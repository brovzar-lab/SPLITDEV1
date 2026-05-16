import { useMemo } from 'react';
import { RD } from '../tokens';
import type { Scene, Line, Note, Beat } from '../api/types';
import { ACT_BOUNDS } from '../data/beats';
import { resolveBeats } from '../lib/inferBeats';

interface Props {
  scenes: Array<Scene & { lines: Line[] }>;
  beats: Beat[];
  notes: Note[];
  activeScene: string;
  setActiveScene: (id: string) => void;
}

const ACT_COLOR = {
  I:   RD.blue,
  II:  RD.copper,
  III: RD.forest,
};

const LINES_PER_PAGE = 55;

// Strip the slugline prefix and split into sub-location + time-of-day.
function parseHeading(h: string): { sub: string; time: string } {
  const stripped = h.replace(/^(INT|EXT|I\/E)\.?\s+/i, '');
  // Split on en-dash, em-dash, or ' - ' (last segment is the time of day)
  const parts = stripped.split(/\s+[–—-]\s+/);
  if (parts.length >= 2) {
    const time = parts[parts.length - 1];
    const rest = parts.slice(0, -1).join(' – ');
    // If rest itself has a "–" sub-location, use the trailing piece as the
    // sub-location label; otherwise the rest is the base location.
    const restParts = rest.split(/\s+[–—-]\s+/);
    const sub = restParts.length >= 2 ? restParts.slice(1).join(' – ') : rest;
    return { sub, time };
  }
  return { sub: stripped, time: '' };
}

export function OutlineDrawer({
  scenes,
  beats,
  notes,
  activeScene,
  setActiveScene,
}: Props) {
  const N = scenes.length;
  const inferred = useMemo(() => resolveBeats(beats, scenes), [beats, scenes]);

  // sceneId -> beat that anchors here
  const beatByScene = useMemo(() => {
    const m = new Map<string, { name: string; kind: 'major' | 'minor' }>();
    inferred.forEach(b => {
      b.scenes.forEach(sid => m.set(sid, { name: b.name, kind: b.kind }));
    });
    return m;
  }, [inferred]);

  // sceneId -> note count
  const noteCounts = useMemo(() => {
    const c: Record<string, number> = {};
    scenes.forEach(s => (c[s.id] = 0));
    notes.forEach(n => (n.scenes || []).forEach(sid => {
      c[sid] = (c[sid] || 0) + 1;
    }));
    return c;
  }, [scenes, notes]);

  // Page math (running line offset → page number).
  const pageBySceneId = useMemo(() => {
    const m = new Map<string, number>();
    let running = 0;
    scenes.forEach(s => {
      m.set(s.id, Math.max(1, Math.floor(running / LINES_PER_PAGE) + 1));
      running += s.lines.length + 3;
    });
    return m;
  }, [scenes]);

  // Bucket scenes by act using their index-percentile.
  const sceneAct = (i: number): 'I' | 'II' | 'III' => {
    if (N <= 1) return 'I';
    const pct = i / (N - 1);
    if (pct < ACT_BOUNDS[1].start) return 'I';
    if (pct < ACT_BOUNDS[2].start) return 'II';
    return 'III';
  };

  const buckets: Record<'I' | 'II' | 'III', Array<typeof scenes[number]>> = {
    I: [], II: [], III: [],
  };
  scenes.forEach((s, i) => buckets[sceneAct(i)].push(s));

  const colHeaderMeta = (act: 'I' | 'II' | 'III') => {
    const list = buckets[act];
    if (list.length === 0) return { count: 0, pages: '—' };
    const first = pageBySceneId.get(list[0].id) ?? 1;
    const last = pageBySceneId.get(list[list.length - 1].id) ?? first;
    return {
      count: list.length,
      pages: first === last ? `${first}` : `${first}–${last}`,
    };
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: 10,
        height: '100%',
        overflow: 'auto',
        background: RD.paperDeep,
        fontFamily: RD.sans,
      }}
    >
      {(['I', 'II', 'III'] as const).map(act => {
        const meta = colHeaderMeta(act);
        return (
          <div
            key={act}
            style={{
              flex: 1,
              minWidth: 0,
              background: RD.card,
              borderTop: `3px solid ${ACT_COLOR[act]}`,
              boxShadow: RD.shadowCard,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Column header */}
            <div style={{ padding: '10px 12px 8px' }}>
              <div
                style={{
                  fontFamily: RD.display,
                  fontStyle: 'italic',
                  fontWeight: 600,
                  fontSize: 16,
                  color: RD.ink,
                }}
              >
                Act {act}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: RD.inkFade,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  fontFamily: RD.sans,
                  marginTop: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {meta.count} scenes · pp. {meta.pages}
              </div>
              <div
                style={{
                  borderTop: `1px dashed ${RD.line}`,
                  marginTop: 6,
                }}
              />
            </div>

            {/* Scene slats */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {buckets[act].map(s => {
                const isActive = s.id === activeScene;
                const { sub, time } = parseHeading(s.heading);
                const label = [sub, time].filter(Boolean).join(' · ');
                const cnt = noteCounts[s.id] || 0;
                const beat = beatByScene.get(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveScene(s.id)}
                    style={{
                      padding: '5px 10px 5px 12px',
                      borderBottom: `1px solid ${RD.line}80`,
                      cursor: 'pointer',
                      background: isActive ? `${RD.copper}1c` : 'transparent',
                      borderLeft: isActive
                        ? `2px solid ${RD.copper}`
                        : '2px solid transparent',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '20px 1fr auto',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: RD.script,
                          fontSize: 9,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: isActive ? RD.copper : RD.inkFade,
                        }}
                      >
                        {s.position}
                      </span>
                      <span
                        style={{
                          fontFamily: RD.script,
                          fontSize: 10,
                          textTransform: 'uppercase',
                          color: isActive ? RD.ink : RD.inkSoft,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          letterSpacing: 0.3,
                        }}
                      >
                        {label}
                      </span>
                      {cnt > 0 && (
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: RD.gold,
                            color: RD.ink,
                            fontSize: 9,
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.15)',
                          }}
                        >
                          {cnt}
                        </span>
                      )}
                    </div>
                    {beat && (
                      <div
                        style={{
                          marginLeft: 28,
                          marginTop: 2,
                          fontFamily: RD.display,
                          fontStyle: 'italic',
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                          color: beat.kind === 'major' ? RD.copper : RD.inkFade,
                        }}
                      >
                        {beat.name}
                      </div>
                    )}
                  </div>
                );
              })}
              {buckets[act].length === 0 && (
                <div
                  style={{
                    padding: '20px 12px',
                    textAlign: 'center',
                    color: RD.inkFade,
                    fontStyle: 'italic',
                    fontFamily: RD.display,
                    fontSize: 11,
                  }}
                >
                  No scenes
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
