import { Fragment, useEffect, useMemo, useState } from 'react';
import { RD } from '../tokens';
import type { Scene, Line, Note, CharacterBibleEntry } from '../api/types';
import { deriveCharacterScenes } from '../lib/deriveCharacterScenes';
import { ACT_BOUNDS } from '../data/beats';

interface Props {
  open: boolean;
  onClose: () => void;
  scenes: Array<Scene & { lines: Line[] }>;
  characters: CharacterBibleEntry[];
  notes: Note[];
  activeScene: string;
  setActiveScene: (id: string) => void;
}

type FocusMode = 'scene' | 'character';

const ACT_FILL = {
  I:   `${RD.blue}55`,
  II:  `${RD.copper}55`,
  III: `${RD.forest}55`,
};

const COL_MIN = 14;
const NAME_COL = 90;
const ROW_H = 18;

export function PresenceGrid({
  open,
  onClose,
  scenes,
  characters,
  notes,
  activeScene,
  setActiveScene,
}: Props) {
  const [focusMode, setFocusMode] = useState<FocusMode>('scene');
  const [focusedChar, setFocusedChar] = useState<string | null>(null);

  const charScenes = useMemo(
    () => deriveCharacterScenes(characters, scenes),
    [characters, scenes],
  );

  const inScene = useMemo(() => {
    const m = new Map<string, Set<string>>();
    characters.forEach(c => m.set(c.id, new Set(charScenes.get(c.id) || [])));
    return m;
  }, [characters, charScenes]);

  // Per-scene note counts
  const noteCounts = useMemo(() => {
    const c: Record<string, number> = {};
    scenes.forEach(s => (c[s.id] = 0));
    notes.forEach(n =>
      (n.scenes || []).forEach(sid => {
        c[sid] = (c[sid] || 0) + 1;
      }),
    );
    return c;
  }, [scenes, notes]);
  const maxNotes = Math.max(...Object.values(noteCounts), 1);

  // Only show characters with at least one appearance (keeps grid readable).
  const presentCharacters = useMemo(
    () => characters.filter(c => (charScenes.get(c.id) || []).length > 0),
    [characters, charScenes],
  );

  // Keyboard handling
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusMode(m => (m === 'scene' ? 'character' : 'scene'));
        if (focusMode === 'scene' && presentCharacters.length > 0) {
          setFocusedChar(presentCharacters[0].id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, focusMode, presentCharacters]);

  if (!open) return null;

  const N = scenes.length;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,22,18,0.7)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(96vw, 1400px)',
          maxHeight: '88vh',
          background: RD.card,
          boxShadow: RD.shadowDeep,
          borderRadius: 2,
          border: `1px solid ${RD.lineDeep}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px 12px',
            borderBottom: `1px solid ${RD.line}`,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: RD.display,
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: 16,
                color: RD.ink,
              }}
            >
              Presence Grid
            </div>
            <div
              style={{
                fontSize: 9,
                color: RD.inkFade,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginTop: 1,
                fontFamily: RD.sans,
              }}
            >
              Who's in which scene · {presentCharacters.length} characters ·{' '}
              {N} scenes
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 9,
              fontFamily: RD.sans,
              color: RD.inkFade,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            <span>{focusMode === 'scene' ? 'Scene focus' : 'Character focus'}</span>
            <span style={{ color: RD.line }}>·</span>
            <span>← / → flip · esc close</span>
          </div>
        </div>

        {/* Grid scroller */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px 20px 20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `${NAME_COL}px repeat(${N}, minmax(${COL_MIN}px, 1fr))`,
              minWidth: NAME_COL + N * COL_MIN,
              alignItems: 'stretch',
            }}
          >
            {/* Row 1: scene-number labels */}
            <div />
            {scenes.map(s => {
              const isActive = s.id === activeScene;
              return (
                <div
                  key={`hdr-${s.id}`}
                  onClick={() => setActiveScene(s.id)}
                  style={{
                    fontFamily: RD.script,
                    fontSize: 7.5,
                    fontWeight: 700,
                    color: isActive ? RD.copper : RD.inkFade,
                    textAlign: 'center',
                    paddingBottom: 4,
                    borderBottom: isActive
                      ? `2px solid ${RD.copper}`
                      : '2px solid transparent',
                    fontVariantNumeric: 'tabular-nums',
                    cursor: 'pointer',
                  }}
                >
                  {s.position}
                </div>
              );
            })}

            {/* Row 2: act-zone strip (4px) */}
            <div />
            {scenes.map((s, i) => {
              const pct = N <= 1 ? 0 : i / (N - 1);
              const act =
                pct < ACT_BOUNDS[1].start
                  ? 'I'
                  : pct < ACT_BOUNDS[2].start
                  ? 'II'
                  : 'III';
              return (
                <div
                  key={`act-${s.id}`}
                  style={{
                    height: 4,
                    background: ACT_FILL[act],
                    marginBottom: 4,
                  }}
                />
              );
            })}

            {/* Character rows */}
            {presentCharacters.map(c => {
              const isFocused = focusMode === 'character' && c.id === focusedChar;
              return (
                <Fragment key={c.id}>
                  <div
                    onClick={() => {
                      setFocusedChar(c.id);
                      setFocusMode('character');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      paddingRight: 8,
                      height: ROW_H,
                      cursor: 'pointer',
                      opacity: focusMode === 'character' && !isFocused ? 0.4 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        background: c.color,
                        borderRadius: 1,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: RD.script,
                        fontSize: 9.5,
                        color: RD.ink,
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.name}
                    </span>
                  </div>
                  {scenes.map(s => {
                    const present = inScene.get(c.id)?.has(s.id);
                    const isActiveCol = s.id === activeScene;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setActiveScene(s.id)}
                        title={
                          present
                            ? `${c.name} in scene ${s.position}`
                            : `${c.name} not in scene ${s.position}`
                        }
                        style={{
                          height: ROW_H,
                          background: present ? c.color : 'transparent',
                          opacity: present
                            ? isActiveCol
                              ? 1
                              : focusMode === 'character' && !isFocused
                              ? 0.35
                              : 0.75
                            : 1,
                          outline:
                            present && isActiveCol
                              ? `1px solid ${RD.ink}`
                              : 'none',
                          outlineOffset: -1,
                          cursor: 'pointer',
                          borderBottom: `1px solid ${RD.paperDeep}`,
                          borderRight: `1px solid ${RD.paperDeep}`,
                        }}
                      />
                    );
                  })}
                </Fragment>
              );
            })}

            {/* Notes density row */}
            <div
              style={{
                paddingTop: 6,
                borderTop: `1px dashed ${RD.line}`,
                marginTop: 4,
                fontFamily: RD.display,
                fontStyle: 'italic',
                fontSize: 9.5,
                color: RD.inkFade,
                display: 'flex',
                alignItems: 'flex-end',
                paddingRight: 8,
                height: 24,
              }}
            >
              Notes
            </div>
            {scenes.map(s => {
              const cnt = noteCounts[s.id] || 0;
              const barH = cnt === 0 ? 0 : 4 + (cnt / maxNotes) * 14;
              return (
                <div
                  key={`notes-${s.id}`}
                  style={{
                    paddingTop: 6,
                    borderTop: `1px dashed ${RD.line}`,
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    height: 24,
                  }}
                >
                  {barH > 0 && (
                    <div
                      style={{
                        width: 4,
                        height: barH,
                        background: RD.gold,
                        opacity: 0.85,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {presentCharacters.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: RD.inkFade,
                fontFamily: RD.display,
                fontStyle: 'italic',
                fontSize: 14,
              }}
            >
              No dialogue characters yet — add them to the Cast Bible first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
