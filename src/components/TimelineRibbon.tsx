import { useEffect, useMemo, useRef, useState } from 'react';
import { RD } from '../tokens';
import type { Scene, Line, Note, Beat } from '../api/types';
import { ACT_BOUNDS } from '../data/beats';
import { resolveBeats, type InferredBeat } from '../lib/inferBeats';

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

// 12px keep-clear from the rail edges so first/last beat labels don't
// bleed off-screen.
const EDGE_PAD_PX = 12;
// Cheap-but-stable per-character width estimate at the ribbon's font sizes
// (Cormorant italic uppercase + letter-spacing 1.2). Empirical; doesn't
// need to be pixel-perfect, just close enough to predict collisions.
const CHAR_PX_MAJOR = 6.2;  // 9.5px font
const CHAR_PX_MINOR = 5.4;  // 8.5px font
// Minimum visual gap between two adjacent beat label boxes.
const MIN_LABEL_GAP_PX = 8;

interface PlacedBeat {
  beat: InferredBeat;
  leftPct: number;
  widthPx: number;
}

// Run collision math: drop minor beats first, then minimal-priority majors
// (closest to higher-priority neighbors), until every visible label fits
// at the ribbon's current pixel width.
function selectVisibleBeats(beats: InferredBeat[], ribbonPx: number): InferredBeat[] {
  if (ribbonPx < 80 || beats.length === 0) return beats;
  const place = (b: InferredBeat): PlacedBeat => {
    const ch = b.kind === 'major' ? CHAR_PX_MAJOR : CHAR_PX_MINOR;
    return { beat: b, leftPct: b.pct, widthPx: b.name.length * ch };
  };
  const sorted = [...beats].sort((a, b) => a.pct - b.pct);
  const visible = sorted.map(place);

  const overlaps = (placed: PlacedBeat[]): number => {
    for (let i = 0; i < placed.length - 1; i++) {
      const a = placed[i];
      const b = placed[i + 1];
      const aCenter = a.leftPct * ribbonPx;
      const bCenter = b.leftPct * ribbonPx;
      const gap = bCenter - aCenter - (a.widthPx + b.widthPx) / 2;
      if (gap < MIN_LABEL_GAP_PX) return i;
    }
    return -1;
  };

  // Pass 1: drop minors that overlap a neighbor
  let current = visible.slice();
  let collision = overlaps(current);
  while (collision !== -1) {
    const a = current[collision];
    const b = current[collision + 1];
    // Drop whichever is minor; if both minor, drop the closer-to-edge one
    // (further from center 0.5); if both major, drop the second one to keep
    // the earlier-anchor anchor visible.
    let dropIdx: number;
    if (a.beat.kind === 'minor' && b.beat.kind === 'major') dropIdx = collision;
    else if (a.beat.kind === 'major' && b.beat.kind === 'minor') dropIdx = collision + 1;
    else if (a.beat.kind === 'minor' && b.beat.kind === 'minor') {
      const aDist = Math.abs(a.leftPct - 0.5);
      const bDist = Math.abs(b.leftPct - 0.5);
      dropIdx = aDist > bDist ? collision : collision + 1;
    } else {
      dropIdx = collision + 1;
    }
    current.splice(dropIdx, 1);
    collision = overlaps(current);
  }
  return current.map(p => p.beat);
}

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

  // Track ribbon width in px so we can collide-test label boxes against
  // the actual rendered space, not against the scene-count proxy.
  const containerRef = useRef<HTMLDivElement>(null);
  const [ribbonPx, setRibbonPx] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      setRibbonPx(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleBeats = useMemo(
    () => selectVisibleBeats(inferred, ribbonPx),
    [inferred, ribbonPx],
  );

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
      ref={containerRef}
      className="rd-timeline-ribbon"
      style={{
        height: 76,
        flexShrink: 0,
        background: RD.ink,
        borderBottom: `1px solid ${RD.lineDeep}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 5,
        overflow: 'hidden',
        userSelect: 'none',
        // Solid drop-shadow under the ribbon — pure cosmetic, but it also
        // visually anchors the rail above the scrolling script.
        boxShadow: '0 1px 0 rgba(26,22,18,0.4)',
      }}
    >
      {/* Row 1 — beat names (28px) */}
      <div style={{ height: 28, position: 'relative' }}>
        {visibleBeats.map(b => {
          const leftPct = b.pct * 100;
          const isMajor = b.kind === 'major';
          // Edge-aware: when the label center sits within EDGE_PAD_PX of
          // the rail edge, switch the transform-origin so the label stays
          // inside instead of bleeding off-screen.
          const centerPx = b.pct * ribbonPx;
          const charPx = isMajor ? CHAR_PX_MAJOR : CHAR_PX_MINOR;
          const halfWidth = (b.name.length * charPx) / 2;
          let transform = 'translateX(-50%)';
          let leftValue: string = `${leftPct}%`;
          if (centerPx - halfWidth < EDGE_PAD_PX) {
            transform = 'translateX(0)';
            leftValue = `${EDGE_PAD_PX}px`;
          } else if (centerPx + halfWidth > ribbonPx - EDGE_PAD_PX) {
            transform = 'translateX(-100%)';
            leftValue = `${ribbonPx - EDGE_PAD_PX}px`;
          }
          return (
            <div
              key={b.id}
              style={{
                position: 'absolute',
                left: leftValue,
                top: 4,
                transform,
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
