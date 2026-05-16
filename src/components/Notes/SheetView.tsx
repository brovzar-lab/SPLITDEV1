import { Fragment, useEffect, useRef, useState } from 'react';
import { RD } from '../../tokens';
import { NOTE_ORIGINS } from '../../data/notes';
import type { Note, Scene } from '../../api/types';
import type { NoteOriginId, NoteStatus } from '../../types';
import { SceneChips } from '../SceneChips';
import { relativeTime } from '../../lib/relativeTime';

interface Props {
  notes: Note[];
  activeNote: string;
  setActiveNote: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  scenes: Scene[];
  activeStatusFilter: NoteStatus | null;
}

const STATUS_META: Record<NoteStatus, { label: string; color: string }> = {
  unread: { label: 'Open', color: RD.gold },
  discussing: { label: 'Discussing', color: RD.copper },
  applied: { label: 'Applied', color: RD.forest },
};

const STATUS_ORDER: NoteStatus[] = ['unread', 'discussing', 'applied'];

// Grid template — drives both header and rows so columns line up.
const COLS = '3px 30px 1fr 110px 90px 26px';
const COLS_NO_TOUCHED = '3px 30px 1fr 110px 26px';
const COLS_NO_SCENES = '3px 30px 1fr 26px';

function priorityRank(p: 'high' | 'medium' | 'low'): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
}

function priorityColor(p: 'high' | 'medium' | 'low'): string {
  return p === 'high' ? RD.ruby : p === 'medium' ? RD.gold : 'transparent';
}

export function SheetView({
  notes,
  activeNote,
  setActiveNote,
  onDelete,
  scenes,
  activeStatusFilter,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showTouched = width === 0 || width >= 420;
  const showScenes = width === 0 || width >= 320;
  const gridTemplate = !showScenes
    ? COLS_NO_SCENES
    : !showTouched
    ? COLS_NO_TOUCHED
    : COLS;

  const positionById = new Map(scenes.map(s => [s.id, s.position]));

  // Apply Distribution Strip filter, then group by status.
  const filtered = activeStatusFilter
    ? notes.filter(n => n.status === activeStatusFilter)
    : notes;

  const byStatus: Record<NoteStatus, Note[]> = {
    unread: [],
    discussing: [],
    applied: [],
  };
  for (const n of filtered) byStatus[n.status].push(n);

  // Within each band: priority desc, then created_at desc.
  for (const s of STATUS_ORDER) {
    byStatus[s].sort((a, b) => {
      const p = priorityRank(a.priority) - priorityRank(b.priority);
      if (p !== 0) return p;
      return (b.created_at ?? 0) - (a.created_at ?? 0);
    });
  }

  const handleHover = (id: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredId(id), 100);
  };

  const handleUnhover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredId(null), 100);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <SheetHeader showScenes={showScenes} showTouched={showTouched} gridTemplate={gridTemplate} />

      {STATUS_ORDER.map(status => {
        const items = byStatus[status];
        if (items.length === 0) return null;
        return (
          <Fragment key={status}>
            <StatusBand status={status} count={items.length} />
            {items.map(n => {
              const origin =
                NOTE_ORIGINS[n.origin as NoteOriginId] || NOTE_ORIGINS.self;
              const isActive = activeNote === n.id;
              const isApplied = n.status === 'applied';
              const sceneLabels = (n.scenes ?? [])
                .map(sid => positionById.get(sid))
                .filter((p): p is number => typeof p === 'number')
                .map(String);
              return (
                <Fragment key={n.id}>
                  <div
                    onClick={() => setActiveNote(n.id)}
                    onMouseEnter={() => handleHover(n.id)}
                    onMouseLeave={handleUnhover}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: gridTemplate,
                      alignItems: 'center',
                      gap: 0,
                      padding: '8px 12px 8px 0',
                      background: isActive ? `${RD.copperSoft}60` : 'transparent',
                      borderBottom: `1px solid ${RD.line}`,
                      cursor: 'pointer',
                      opacity: isApplied ? 0.55 : 1,
                      transition: 'background 120ms',
                    }}
                  >
                    {/* 3px priority rule */}
                    <div
                      style={{
                        height: '100%',
                        minHeight: 30,
                        background: priorityColor(n.priority),
                      }}
                      aria-hidden="true"
                    />

                    {/* 30px avatar slot — em-dash for self origin */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        paddingLeft: 8,
                      }}
                    >
                      {n.origin === 'self' ? (
                        <span
                          style={{
                            fontFamily: RD.display,
                            fontSize: 16,
                            color: RD.line,
                            lineHeight: 1,
                          }}
                          aria-label="Self-authored"
                        >
                          —
                        </span>
                      ) : (
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: origin.color,
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 800,
                            fontFamily: RD.display,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {origin.initial}
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div
                      style={{
                        paddingLeft: 8,
                        fontFamily: RD.display,
                        fontSize: 13,
                        fontWeight: 600,
                        color: RD.ink,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textDecoration: isApplied
                          ? `line-through 1px ${RD.inkFade}`
                          : 'none',
                      }}
                    >
                      {n.title}
                    </div>

                    {/* Scene chips */}
                    {showScenes && (
                      <div style={{ paddingLeft: 6 }}>
                        <SceneChips
                          labels={sceneLabels}
                          faded={isApplied}
                        />
                      </div>
                    )}

                    {/* Touched */}
                    {showTouched && (
                      <div
                        style={{
                          fontFamily: RD.display,
                          fontStyle: 'italic',
                          fontSize: 11,
                          color: RD.inkFade,
                          textAlign: 'right',
                          paddingRight: 6,
                        }}
                      >
                        {relativeTime(n.created_at)}
                      </div>
                    )}

                    {/* Delete */}
                    <div
                      onClick={e => onDelete(n.id, e)}
                      style={{
                        fontSize: 14,
                        color: RD.inkFade,
                        cursor: 'pointer',
                        textAlign: 'center',
                        padding: '0 4px',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = RD.ruby;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = RD.inkFade;
                      }}
                    >
                      ×
                    </div>
                  </div>

                  {hoveredId === n.id && n.body && (
                    <div
                      style={{
                        background: `${RD.copperSoft}30`,
                        padding: '8px 14px 12px 50px',
                        fontFamily: RD.display,
                        fontStyle: 'italic',
                        fontSize: 13,
                        color: RD.inkSoft,
                        lineHeight: 1.5,
                        borderBottom: `1px solid ${RD.line}`,
                      }}
                    >
                      “{n.body}”
                    </div>
                  )}
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}

      {filtered.length === 0 && (
        <div
          style={{
            fontFamily: RD.display,
            fontStyle: 'italic',
            fontSize: 13,
            color: RD.inkFade,
            textAlign: 'center',
            padding: '32px 16px',
          }}
        >
          {activeStatusFilter
            ? 'No notes match this filter.'
            : 'No notes yet.'}
        </div>
      )}
    </div>
  );
}

function SheetHeader({
  showScenes,
  showTouched,
  gridTemplate,
}: {
  showScenes: boolean;
  showTouched: boolean;
  gridTemplate: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        alignItems: 'center',
        padding: '8px 12px 8px 0',
        background: RD.paperDeep,
        borderBottom: `2px solid ${RD.line}`,
        position: 'sticky',
        top: 0,
        zIndex: 2,
        fontSize: 9,
        fontWeight: 700,
        color: RD.inkFade,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontFamily: RD.sans,
      }}
    >
      <span />
      <span />
      <span style={{ paddingLeft: 8 }}>Title</span>
      {showScenes && <span style={{ paddingLeft: 6 }}>Scenes</span>}
      {showTouched && (
        <span
          style={{
            color: RD.copper,
            textAlign: 'right',
            paddingRight: 6,
            cursor: 'pointer',
          }}
          title="Sort by recently touched (descending)"
        >
          Touched ↓
        </span>
      )}
      <span />
    </div>
  );
}

function StatusBand({ status, count }: { status: NoteStatus; count: number }) {
  const meta = STATUS_META[status];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px 6px',
        borderBottom: `1px dashed ${RD.line}`,
        background: RD.paper,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: meta.color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 11,
          fontWeight: 700,
          color: meta.color,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {meta.label}
      </span>
      <span
        style={{
          padding: '0 6px',
          fontFamily: RD.sans,
          fontSize: 9,
          fontWeight: 700,
          color: RD.inkFade,
          background: RD.card,
          border: `1px solid ${RD.line}`,
          letterSpacing: 1,
        }}
      >
        {count}
      </span>
      <span
        aria-hidden="true"
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(to right, ${meta.color}40, transparent)`,
        }}
      />
    </div>
  );
}
