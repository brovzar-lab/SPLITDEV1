import { useEffect, useMemo, useRef, useState } from 'react';
import { RD } from '../tokens';
import type { Scene, Line, Beat, Note, CharacterBibleEntry } from '../api/types';
import { groupByLocation, parseLocation } from '../lib/groupByLocation';
import { deriveCharacterScenes } from '../lib/deriveCharacterScenes';

interface Props {
  activeScene: string;
  setActiveScene: (id: string) => void;
  scenes: Array<Scene & { lines: Line[] }>;
  beats: Beat[];
  notes: Note[];
  characters: CharacterBibleEntry[];
}

const MAX_BEADS = 3;

export function Sidebar({
  activeScene,
  setActiveScene,
  scenes,
  notes,
  characters,
}: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const sceneRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // T4.5 — when activeScene changes, expand its group (if collapsed) and
  // scroll its row into view. Triggered by both timeline-ribbon clicks
  // and Editor-driven scene switches.
  useEffect(() => {
    if (!activeScene) return;
    const scene = scenes.find(s => s.id === activeScene);
    if (!scene) return;
    const targetBase = parseLocation(scene.heading).base.toUpperCase();
    setCollapsed(prev => {
      if (!prev.has(targetBase)) return prev;
      const next = new Set(prev);
      next.delete(targetBase);
      return next;
    });
    // Defer so the DOM has time to expand the group before scrollIntoView.
    const t = setTimeout(() => {
      const el = sceneRowRefs.current.get(activeScene);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 40);
    return () => clearTimeout(t);
  }, [activeScene, scenes]);

  // Per-scene note counts.
  const sceneNoteCount = useMemo(() => {
    const c: Record<string, number> = {};
    scenes.forEach(s => (c[s.id] = 0));
    notes.forEach(n =>
      (n.scenes || []).forEach(sid => {
        c[sid] = (c[sid] || 0) + 1;
      }),
    );
    return c;
  }, [scenes, notes]);

  // characterId → ordered scene IDs
  const charScenes = useMemo(
    () => deriveCharacterScenes(characters, scenes),
    [characters, scenes],
  );

  // sceneId → characters present (in name order to keep stable beads)
  const sceneCharacters = useMemo(() => {
    const m = new Map<string, CharacterBibleEntry[]>();
    scenes.forEach(s => m.set(s.id, []));
    characters.forEach(c => {
      (charScenes.get(c.id) || []).forEach(sid => {
        m.get(sid)?.push(c);
      });
    });
    return m;
  }, [scenes, characters, charScenes]);

  const filteredScenes = scenes.filter(s =>
    s.heading.toLowerCase().includes(search.toLowerCase()),
  );
  const visibleIds = new Set(filteredScenes.map(s => s.id));

  const groups = useMemo(() => groupByLocation(scenes), [scenes]);

  const toggle = (base: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(base)) next.delete(base);
      else next.add(base);
      return next;
    });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: RD.paperDeep,
        color: RD.ink,
        fontFamily: RD.sans,
        userSelect: 'none',
        borderRight: `1px solid ${RD.lineDeep}`,
      }}
    >
      {/* Search */}
      <div style={{ padding: '14px 18px 10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: RD.card,
            border: `1px solid ${RD.line}`,
            borderRadius: 2,
            boxShadow: 'inset 0 1px 2px rgba(60,40,20,0.04)',
          }}
        >
          <span style={{ fontSize: 12, color: RD.inkFade }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search the script…"
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              flex: 1,
              fontSize: 12,
              color: RD.ink,
              fontFamily: RD.sans,
            }}
          />
        </div>
      </div>

      {/* Location-grouped tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 14px' }}>
        {groups.map(g => {
          const visibleScenes = g.scenes.filter(s => visibleIds.has(s.id));
          if (visibleScenes.length === 0) return null;
          const isCollapsed = collapsed.has(g.base);
          return (
            <div key={g.base} style={{ marginBottom: 2 }}>
              {/* Location header */}
              <div
                onClick={() => toggle(g.base)}
                style={{
                  padding: '6px 16px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontFamily: RD.script,
                    fontSize: 14,
                    color: RD.copper,
                    width: 12,
                    lineHeight: 1,
                  }}
                >
                  {isCollapsed ? '▸' : '▾'}
                </span>
                <span
                  style={{
                    fontFamily: RD.display,
                    fontStyle: 'italic',
                    fontWeight: 600,
                    fontSize: 13,
                    color: RD.ink,
                    letterSpacing: 0.5,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {g.base}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: RD.inkFade,
                    fontVariantNumeric: 'tabular-nums',
                    border: `1px solid ${RD.line}`,
                    padding: '0 6px',
                    borderRadius: 1,
                    fontFamily: RD.sans,
                  }}
                >
                  {visibleScenes.length}
                </span>
              </div>

              {/* Scene slats */}
              {!isCollapsed &&
                visibleScenes.map(s => {
                  const isActive = s.id === activeScene;
                  const noteCount = sceneNoteCount[s.id] || 0;
                  const present = sceneCharacters.get(s.id) || [];
                  const beads = present.slice(0, MAX_BEADS);
                  const overflow = Math.max(0, present.length - MAX_BEADS);
                  const label = [s.sub, s.time].filter(Boolean).join(' · ');
                  return (
                    <div
                      key={s.id}
                      ref={el => {
                        if (el) sceneRowRefs.current.set(s.id, el);
                        else sceneRowRefs.current.delete(s.id);
                      }}
                      onClick={() => setActiveScene(s.id)}
                      style={{
                        padding: '4px 16px 4px 36px',
                        cursor: 'pointer',
                        background: isActive
                          ? `${RD.copper}1c`
                          : 'transparent',
                        borderLeft: isActive
                          ? `2px solid ${RD.copper}`
                          : '2px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: RD.script,
                          fontSize: 10,
                          fontWeight: 700,
                          color: isActive ? RD.copper : RD.inkFade,
                          width: 22,
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                        }}
                      >
                        {s.position}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontFamily: RD.script,
                          fontSize: 10.5,
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                          color: isActive ? RD.ink : RD.inkSoft,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label || g.base}
                      </span>
                      {beads.length > 0 && (
                        <span
                          style={{
                            display: 'flex',
                            gap: 2,
                            alignItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {beads.map(c => (
                            <span
                              key={c.id}
                              title={c.name}
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 1,
                                background: c.color,
                                color: '#fff',
                                fontFamily: RD.display,
                                fontSize: 8,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.2)',
                              }}
                            >
                              {c.name.charAt(0)}
                            </span>
                          ))}
                          {overflow > 0 && (
                            <span
                              style={{
                                fontFamily: RD.display,
                                fontStyle: 'italic',
                                fontSize: 9,
                                color: RD.inkFade,
                                marginLeft: 2,
                              }}
                            >
                              +{overflow}
                            </span>
                          )}
                        </span>
                      )}
                      {noteCount > 0 && (
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
                          {noteCount}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
