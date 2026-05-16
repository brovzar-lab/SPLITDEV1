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
  currentPage: number;
}

const ACT_FILL = {
  I:   `${RD.blue}30`,
  II:  `${RD.copper}30`,
  III: `${RD.forest}30`,
};

// Density-aware: hide minor beats when more than this many scenes are visible.
const MINOR_HIDE_THRESHOLD = 60;

export function TimelineRibbon({
  scenes,
  beats,
  notes,
  activeScene,
  setActiveScene,
  currentPage,
}: Props) {
  const N = scenes.length;
  const inferred = useMemo(() => resolveBeats(beats, scenes), [beats, scenes]);
  const hideMinor = N > MINOR_HIDE_THRESHOLD;

  // Per-scene note counts for the density layer.
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scenes.forEach(s => (counts[s.id] = 0));
    notes.forEach(n =>
      (n.scenes || []).forEach(sid => {
        counts[sid] = (counts[sid] || 0) + 1;
      }),
    );
    return counts;
  }, [scenes, notes]);
  const maxNotes = Math.max(...Object.values(noteCounts), 1);

  const activeIdx = scenes.findIndex(s => s.id === activeScene);
  const activeNum = activeIdx >= 0 ? scenes[activeIdx].position : null;

  if (N === 0) return null;

  return (
    <div
      className="rd-timeline-ribbon"
      style={{
        height: 76,
        flexShrink: 0,
        background: RD.ink,
        borderBottom: `1px solid ${RD.lineDeep}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Row 1 — beat names (28px) */}
      <div style={{ height: 28, position: 'relative' }}>
        {inferred
          .filter(b => !hideMinor || b.kind === 'major')
          .map(b => {
            const leftPct = b.pct * 100;
            const isMajor = b.kind === 'major';
            return (
              <div
                key={b.id}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: 4,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  pointerEvents: 'none',
                }}
                title={b.name}
              >
                <div
                  style={{
                    fontFamily: RD.display,
                    fontStyle: 'italic',
                    fontWeight: isMajor ? 700 : 500,
                    fontSize: isMajor ? 9.5 : 8.5,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    color: isMajor ? RD.copperSoft : 'rgba(244,237,224,0.55)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {b.name}
                </div>
                <div
                  style={{
                    width: 1,
                    height: 4,
                    background: isMajor ? RD.copperSoft : 'rgba(244,237,224,0.45)',
                  }}
                />
              </div>
            );
          })}
      </div>

      {/* Row 2 — act zones (18px) */}
      <div style={{ height: 18, position: 'relative', display: 'flex' }}>
        {ACT_BOUNDS.map(({ act, start, end }) => (
          <div
            key={act}
            style={{
              position: 'absolute',
              left: `${start * 100}%`,
              width: `${(end - start) * 100}%`,
              top: 0,
              bottom: 0,
              background: ACT_FILL[act],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: act === 'I' ? 'none' : `1px dashed rgba(244,237,224,0.18)`,
            }}
          >
            <div
              style={{
                fontFamily: RD.display,
                fontStyle: 'italic',
                fontWeight: 700,
                fontSize: 9,
                letterSpacing: 3,
                color: 'rgba(244,237,224,0.65)',
              }}
            >
              ACT {act}
            </div>
          </div>
        ))}
      </div>

      {/* Row 3 — tick + density layer (24px) */}
      <div
        style={{
          height: 24,
          position: 'relative',
          cursor: 'crosshair',
        }}
        onClick={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const idx = Math.max(
            0,
            Math.min(N - 1, Math.round((x / rect.width) * (N - 1))),
          );
          setActiveScene(scenes[idx].id);
        }}
      >
        {scenes.map((s, i) => {
          const leftPct = N === 1 ? 50 : (i / (N - 1)) * 100;
          const isActive = s.id === activeScene;
          const cnt = noteCounts[s.id] || 0;
          const barH = cnt === 0 ? 0 : 2 + (cnt / maxNotes) * 12;
          return (
            <div
              key={s.id}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: 0,
                bottom: 0,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pointerEvents: 'none',
              }}
            >
              {barH > 0 && (
                <div
                  style={{
                    width: 2,
                    height: barH,
                    background: RD.gold,
                    opacity: 0.8,
                    marginBottom: 2,
                  }}
                />
              )}
              <div
                style={{
                  width: 1,
                  height: isActive ? 18 : 8,
                  background: isActive ? RD.copper : 'rgba(244,237,224,0.4)',
                }}
              />
            </div>
          );
        })}

        {/* Active scene number pill */}
        {activeIdx >= 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${N === 1 ? 50 : (activeIdx / (N - 1)) * 100}%`,
              bottom: 20,
              transform: 'translateX(-50%)',
              padding: '1px 5px',
              background: RD.copper,
              color: RD.paper,
              fontFamily: RD.script,
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: 0.4,
              borderRadius: 2,
              fontVariantNumeric: 'tabular-nums',
              pointerEvents: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            SC {activeNum}
          </div>
        )}
      </div>

      {/* Row 4 — bottom readout (~6px height left of 76) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          fontFamily: RD.script,
          fontSize: 9,
          color: 'rgba(244,237,224,0.5)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 0.4,
        }}
      >
        <span>SC 1</span>
        {activeNum !== null && (
          <span style={{ color: RD.copperSoft, fontWeight: 700 }}>
            SC {activeNum} · p. {currentPage}
          </span>
        )}
        <span>SC {scenes[N - 1].position}</span>
      </div>
    </div>
  );
}
