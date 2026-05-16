import { Fragment, useState } from 'react';
import { RD } from '../tokens';
import type { Scene, Line, Beat, Note } from '../api/types';

interface Props {
  activeScene: string;
  setActiveScene: (id: string) => void;
  scenes: Array<Scene & { lines: Line[] }>;
  beats: Beat[];
  notes: Note[];
}

export function Sidebar({ activeScene, setActiveScene, scenes, beats, notes }: Props) {
  const [search, setSearch] = useState('');

  const sceneNoteCount: Record<string, number> = {};
  scenes.forEach(s => (sceneNoteCount[s.id] = 0));
  notes.forEach(n =>
    (n.scenes || []).forEach(sid => {
      sceneNoteCount[sid] = (sceneNoteCount[sid] || 0) + 1;
    }),
  );

  const filteredScenes = scenes.filter(s =>
    s.heading.toLowerCase().includes(search.toLowerCase()),
  );

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

      {/* Beats / Scenes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 14px' }}>
        {beats.length === 0 ? (
          // Flat scene list when no beats defined
          filteredScenes.map(s => {
            const isActive = s.id === activeScene;
            const noteCount = sceneNoteCount[s.id] || 0;
            return (
              <div
                key={s.id}
                onClick={() => setActiveScene(s.id)}
                style={{
                  padding: '5px 8px 5px 22px',
                  cursor: 'pointer',
                  fontSize: 11.5,
                  color: isActive ? RD.copper : RD.inkSoft,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'rgba(194,94,28,0.08)' : 'transparent',
                  borderLeft: isActive ? `2px solid ${RD.copper}` : '2px solid transparent',
                  marginLeft: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: RD.inkFade, marginRight: 6 }}>
                    {s.position}.
                  </span>
                  {s.heading.replace(/^(INT|EXT)\.\s+/, '')}
                </span>
                {noteCount > 0 && (
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', background: RD.gold, color: RD.ink,
                    fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', marginLeft: 6, flexShrink: 0,
                    boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.15)',
                  }}>
                    {noteCount}
                  </span>
                )}
              </div>
            );
          })
        ) : (
        beats.map((beat, bi) => {
          const beatScenes = filteredScenes.filter(s => beat.scenes.includes(s.id));
          if (beatScenes.length === 0) return null;

          const actLabel = bi < 2 ? 'I' : bi < 6 ? 'II' : 'III';
          const prevAct = bi === 0 ? null : bi - 1 < 2 ? 'I' : bi - 1 < 6 ? 'II' : 'III';
          const showActHeader = bi === 0 || prevAct !== actLabel;

          return (
            <Fragment key={beat.id}>
              {showActHeader && (
                <div
                  style={{
                    padding: '14px 18px 6px',
                    borderBottom: `1px solid ${RD.line}`,
                    margin: '4px 0 8px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: RD.display,
                      fontSize: 11,
                      fontWeight: 600,
                      color: RD.copper,
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                    }}
                  >
                    Act {actLabel}
                  </div>
                </div>
              )}
              <div style={{ padding: '4px 18px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: RD.display,
                      fontSize: 10,
                      fontWeight: 700,
                      color: RD.inkFade,
                      letterSpacing: 1,
                      fontVariantNumeric: 'tabular-nums',
                      width: 18,
                    }}
                  >
                    {String(bi + 1).padStart(2, '0')}.
                  </span>
                  <span
                    style={{
                      fontFamily: RD.display,
                      fontSize: 13,
                      fontWeight: 600,
                      color: RD.ink,
                      fontStyle: 'italic',
                    }}
                  >
                    {beat.name}
                  </span>
                </div>
                {beatScenes.map(s => {
                  const isActive = s.id === activeScene;
                  const noteCount = sceneNoteCount[s.id] || 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setActiveScene(s.id)}
                      style={{
                        padding: '5px 8px 5px 22px',
                        cursor: 'pointer',
                        fontSize: 11.5,
                        color: isActive ? RD.copper : RD.inkSoft,
                        fontWeight: isActive ? 600 : 400,
                        background: isActive
                          ? 'rgba(194,94,28,0.08)'
                          : 'transparent',
                        borderLeft: isActive
                          ? `2px solid ${RD.copper}`
                          : '2px solid transparent',
                        marginLeft: -2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            color: RD.inkFade,
                            marginRight: 6,
                          }}
                        >
                          {s.position}.
                        </span>
                        {s.heading.replace(/^(INT|EXT)\.\s+/, '')}
                      </span>
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
                            marginLeft: 6,
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
            </Fragment>
          );
        })
        )}
      </div>
    </div>
  );
}
