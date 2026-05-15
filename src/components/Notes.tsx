import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { RD } from '../tokens';
import { NOTE_ORIGINS } from '../data/notes';
import type { Note } from '../api/types';
import { api } from '../api/client';
import type { NoteOriginId, NoteStatus, PatternNote } from '../types';

interface Props {
  notes: Note[];
  patternNotes: PatternNote[];
  activeNote: string;
  setActiveNote: (id: string) => void;
  activeScene: string;
  // NEW:
  screenplayId: string;
  onNoteCreated: (note: Note) => void;
  onNoteDeleted: (id: string) => void;
}

type Density = 'sticky' | 'list' | 'sheet';
type View = 'scene' | 'pattern';

const stickyByOrigin: Record<NoteOriginId, string> = {
  exec: RD.stickyPink,
  producer: RD.stickyBlue,
  director: RD.stickyBlue,
  reader: RD.stickyGreen,
  table: RD.stickyYellow,
  self: RD.stickyYellow,
};

const rotations = [-0.6, 0.4, -0.3, 0.7, -0.5, 0.5];

function StatusStamp({ status }: { status: NoteStatus }) {
  const map: Record<NoteStatus, { c: string; label: string }> = {
    discussing: { c: RD.copper, label: 'In discussion' },
    unread: { c: RD.gold, label: 'Awaiting' },
    applied: { c: RD.forest, label: 'Applied' },
  };
  const s = map[status] || map.unread;
  return (
    <span
      style={{
        fontFamily: RD.display,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: s.c,
        border: `1.5px solid ${s.c}`,
        padding: '1px 6px',
        borderRadius: 1,
        transform: 'rotate(-1deg)',
        display: 'inline-block',
      }}
    >
      {s.label}
    </span>
  );
}

export function Notes({
  notes,
  patternNotes,
  activeNote,
  setActiveNote,
  activeScene,
  screenplayId,
  onNoteCreated,
  onNoteDeleted,
}: Props) {
  const [view, setView] = useState<View>('scene');
  const [showAll, setShowAll] = useState(false);
  const [density, setDensity] = useState<Density>('sticky');

  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { note } = await api.createNote(screenplayId, {
        title: newTitle.trim(),
        body: newBody.trim(),
        scenes: activeScene ? [activeScene] : [],
        priority: newPriority,
        status: 'unread',
        origin: 'self',
        confidence: null,
      });
      onNoteCreated(note);
      setNewTitle('');
      setNewBody('');
      setNewOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this note?')) return;
    try {
      await api.deleteNote(id);
      onNoteDeleted(id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (notes.length > 8 && density === 'sticky') setDensity('list');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Empty state — no notes at all
  if (notes.length === 0 && patternNotes.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: RD.paper,
          fontFamily: RD.sans,
        }}
      >
        {/* Empty state header with create button */}
        <div
          style={{
            padding: '14px 16px 10px',
            borderBottom: `1px solid ${RD.line}`,
            background: RD.paperDeep,
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 22,
              fontWeight: 600,
              color: RD.ink,
              fontStyle: 'italic',
              lineHeight: 1,
            }}
          >
            Notes
          </div>
          <button
            onClick={() => setNewOpen(o => !o)}
            style={{
              padding: '4px 10px',
              fontSize: 10,
              fontFamily: RD.display,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              background: RD.copper,
              color: RD.paper,
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            + New note
          </button>
        </div>

        {newOpen && (
          <div
            style={{
              padding: '12px 14px',
              background: RD.card,
              borderBottom: `1px solid ${RD.line}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Note title…"
              style={{
                padding: '8px 12px',
                border: `1px solid ${RD.line}`,
                background: RD.paper,
                fontSize: 13,
                fontFamily: RD.display,
                fontStyle: 'italic',
                color: RD.ink,
                outline: 'none',
              }}
            />
            <textarea
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              placeholder="What's the note?"
              rows={3}
              style={{
                padding: '8px 12px',
                border: `1px solid ${RD.line}`,
                background: RD.paper,
                fontSize: 12,
                fontFamily: RD.sans,
                color: RD.ink,
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  fontFamily: RD.sans,
                  border: `1px solid ${RD.line}`,
                  background: RD.paper,
                  color: RD.ink,
                }}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => { setNewOpen(false); setNewTitle(''); setNewBody(''); }}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontFamily: RD.display,
                  background: 'transparent',
                  border: `1px solid ${RD.line}`,
                  color: RD.inkSoft,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || creating}
                style={{
                  padding: '4px 12px',
                  fontSize: 11,
                  fontFamily: RD.display,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  background: newTitle.trim() && !creating ? RD.copper : RD.lineDeep,
                  color: RD.paper,
                  border: 'none',
                  cursor: newTitle.trim() && !creating ? 'pointer' : 'default',
                }}
              >
                {creating ? 'Adding…' : 'Add note'}
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: RD.inkFade,
          }}
        >
          <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 10 }}>✉</div>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 16,
              fontStyle: 'italic',
              marginBottom: 6,
            }}
          >
            Notes
          </div>
          <div style={{ fontSize: 11 }}>No notes yet for this screenplay</div>
        </div>
      </div>
    );
  }

  // Filter by active scene (scenes is string[])
  const filteredNotes = activeScene
    ? notes.filter(n => (n.scenes || []).includes(activeScene))
    : notes;
  const noSceneNotes = filteredNotes.length === 0 && Boolean(activeScene);
  const displayNotes = showAll || noSceneNotes ? notes : filteredNotes;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: RD.paper,
        fontFamily: RD.sans,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px 6px',
          borderBottom: `1px solid ${RD.line}`,
          background: RD.paperDeep,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: RD.display,
                fontSize: 22,
                fontWeight: 600,
                color: RD.ink,
                fontStyle: 'italic',
                lineHeight: 1,
              }}
            >
              Notes
            </div>
            <div
              style={{
                fontSize: 9,
                color: RD.inkFade,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              From the desk
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeScene && view === 'scene' && !noSceneNotes && !showAll && (
              <span
                onClick={() => setShowAll(true)}
                style={{
                  fontSize: 10,
                  color: RD.copper,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 7px',
                  borderRadius: 2,
                  border: `1px solid ${RD.copper}40`,
                  background: `${RD.copper}15`,
                }}
              >
                Scene filtered ✕
              </span>
            )}
            <button
              onClick={() => setNewOpen(o => !o)}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                fontFamily: RD.display,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                background: RD.copper,
                color: RD.paper,
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              + New note
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: 8,
            borderBottom: 'none',
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            {(
              [
                { id: 'scene', label: 'Notes', count: notes.length },
                { id: 'pattern', label: 'Patterns', count: patternNotes.length },
              ] as const
            ).map(t => (
              <div
                key={t.id}
                onClick={() => setView(t.id)}
                style={{
                  fontFamily: RD.display,
                  fontSize: 13,
                  fontWeight: 600,
                  color: view === t.id ? RD.ink : RD.inkFade,
                  borderBottom:
                    view === t.id
                      ? `2px solid ${RD.copper}`
                      : '2px solid transparent',
                  paddingBottom: 4,
                  cursor: 'pointer',
                  marginBottom: -1,
                  fontStyle: 'italic',
                }}
              >
                {t.label}{' '}
                <span
                  style={{
                    color: RD.inkFade,
                    fontStyle: 'normal',
                    fontWeight: 500,
                    fontFamily: RD.sans,
                    fontSize: 11,
                  }}
                >
                  {t.count}
                </span>
              </div>
            ))}
          </div>

          {/* Density toggle */}
          <div
            style={{
              display: 'flex',
              border: `1px solid ${RD.lineDeep}`,
              borderRadius: 1,
              overflow: 'hidden',
              background: RD.card,
            }}
          >
            {(
              [
                { id: 'sticky', label: '■■', title: 'Sticky' },
                { id: 'list', label: '≡', title: 'List' },
                { id: 'sheet', label: '⊞', title: 'Sheet' },
              ] as const
            ).map(d => (
              <div
                key={d.id}
                onClick={() => setDensity(d.id)}
                title={d.title}
                style={{
                  padding: '2px 7px',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  background: density === d.id ? RD.copper : 'transparent',
                  color: density === d.id ? RD.paper : RD.inkSoft,
                }}
              >
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {newOpen && (
        <div
          style={{
            padding: '12px 14px',
            background: RD.card,
            borderBottom: `1px solid ${RD.line}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Note title…"
            style={{
              padding: '8px 12px',
              border: `1px solid ${RD.line}`,
              background: RD.paper,
              fontSize: 13,
              fontFamily: RD.display,
              fontStyle: 'italic',
              color: RD.ink,
              outline: 'none',
            }}
          />
          <textarea
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            placeholder="What's the note?"
            rows={3}
            style={{
              padding: '8px 12px',
              border: `1px solid ${RD.line}`,
              background: RD.paper,
              fontSize: 12,
              fontFamily: RD.sans,
              color: RD.ink,
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                fontFamily: RD.sans,
                border: `1px solid ${RD.line}`,
                background: RD.paper,
                color: RD.ink,
              }}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => { setNewOpen(false); setNewTitle(''); setNewBody(''); }}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontFamily: RD.display,
                background: 'transparent',
                border: `1px solid ${RD.line}`,
                color: RD.inkSoft,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || creating}
              style={{
                padding: '4px 12px',
                fontSize: 11,
                fontFamily: RD.display,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                background: newTitle.trim() && !creating ? RD.copper : RD.lineDeep,
                color: RD.paper,
                border: 'none',
                cursor: newTitle.trim() && !creating ? 'pointer' : 'default',
              }}
            >
              {creating ? 'Adding…' : 'Add note'}
            </button>
          </div>
        </div>
      )}

      {noSceneNotes && !showAll && view === 'scene' && (
        <div
          style={{
            padding: '8px 16px',
            background: RD.goldSoft,
            fontSize: 11,
            color: RD.gold,
            borderBottom: `1px solid ${RD.line}`,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>No notes pinned to this scene</span>
          <span
            onClick={() => setShowAll(true)}
            style={{
              cursor: 'pointer',
              fontWeight: 700,
              textDecoration: 'underline',
            }}
          >
            Show all
          </span>
        </div>
      )}

      <div
        style={{
          flex: 1,
          padding: density === 'sticky' ? '14px 12px' : '0',
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {/* Sheet header */}
        {view === 'scene' && density === 'sheet' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 60px 70px 80px 24px',
              gap: 8,
              padding: '8px 12px',
              fontSize: 9,
              fontWeight: 700,
              color: RD.inkFade,
              letterSpacing: 1,
              textTransform: 'uppercase',
              borderBottom: `2px solid ${RD.line}`,
              background: RD.paperDeep,
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}
          >
            <span></span>
            <span>Title</span>
            <span>Scenes</span>
            <span>Priority</span>
            <span>Status</span>
            <span></span>
          </div>
        )}

        {view === 'scene' &&
          density === 'sticky' &&
          displayNotes.map((n, i) => {
            const isActive = activeNote === n.id;
            const isMulti = n.scenes && n.scenes.length > 1;
            const origin = NOTE_ORIGINS[n.origin as NoteOriginId] || NOTE_ORIGINS.self;
            const stickyBg = stickyByOrigin[n.origin as NoteOriginId] || RD.stickyYellow;
            const rotation = isActive ? 0 : rotations[i % rotations.length];

            return (
              <div
                key={n.id}
                onClick={() => setActiveNote(n.id)}
                style={{
                  position: 'relative',
                  padding: '12px 14px 14px',
                  marginBottom: 14,
                  background: stickyBg,
                  boxShadow: isActive ? RD.shadowDeep : RD.shadowSticky,
                  cursor: 'pointer',
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  borderRadius: '1px 1px 8px 1px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -6,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-2deg)',
                    width: 50,
                    height: 14,
                    background: 'rgba(255,255,255,0.5)',
                    border: `0.5px solid rgba(180,160,120,0.3)`,
                    boxShadow: '0 1px 2px rgba(60,40,20,0.06)',
                  }}
                />

                <span
                  onClick={(e) => handleDelete(n.id, e)}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    fontSize: 14,
                    color: RD.inkFade,
                    cursor: 'pointer',
                    padding: '0 4px',
                    borderRadius: 2,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = RD.ruby; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = RD.inkFade; }}
                >
                  ×
                </span>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: origin.color,
                      color: '#fff',
                      fontFamily: RD.display,
                      fontSize: 13,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow:
                        'inset 0 -1px 0 rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)',
                      transform: 'rotate(-3deg)',
                    }}
                  >
                    {origin.initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: RD.display,
                        fontSize: 16,
                        fontWeight: 600,
                        color: RD.ink,
                        lineHeight: 1.2,
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: RD.inkSoft,
                        marginTop: 2,
                        letterSpacing: 0.5,
                        fontStyle: 'italic',
                      }}
                    >
                      — {origin.label}
                      {isMulti
                        ? `, affecting ${n.scenes!.length} scenes`
                        : n.scenes.length > 0
                        ? `, on a scene`
                        : ''}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: RD.sans,
                    fontSize: 12,
                    color: RD.ink,
                    lineHeight: 1.55,
                    marginTop: 4,
                    display: '-webkit-box',
                    WebkitLineClamp: isActive ? 'unset' : 2,
                    WebkitBoxOrient:
                      'vertical' as CSSProperties['WebkitBoxOrient'],
                    overflow: 'hidden',
                  }}
                >
                  {n.body}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: `1px dashed rgba(0,0,0,0.12)`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <StatusStamp status={n.status} />
                  <span
                    style={{
                      fontFamily: RD.display,
                      fontSize: 10,
                      fontWeight: 600,
                      fontStyle: 'italic',
                      color:
                        n.priority === 'high'
                          ? RD.ruby
                          : n.priority === 'medium'
                          ? RD.gold
                          : RD.inkFade,
                      letterSpacing: 0.5,
                    }}
                  >
                    {n.priority === 'high'
                      ? '★★★'
                      : n.priority === 'medium'
                      ? '★★'
                      : '★'}{' '}
                    {n.priority}
                  </span>
                </div>
              </div>
            );
          })}

        {/* List density */}
        {view === 'scene' &&
          density === 'list' &&
          displayNotes.map(n => {
            const isActive = activeNote === n.id;
            const isMulti = n.scenes && n.scenes.length > 1;
            const origin = NOTE_ORIGINS[n.origin as NoteOriginId] || NOTE_ORIGINS.self;
            const statusColor =
              n.status === 'applied'
                ? RD.forest
                : n.status === 'discussing'
                ? RD.copper
                : RD.gold;
            return (
              <div
                key={n.id}
                onClick={() => setActiveNote(n.id)}
                style={{
                  position: 'relative',
                  padding: '10px 36px 10px 14px',
                  cursor: 'pointer',
                  background: isActive ? RD.copperSoft + '60' : 'transparent',
                  borderBottom: `1px solid ${RD.line}`,
                  borderLeft: isActive
                    ? `3px solid ${RD.copper}`
                    : '3px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    flexShrink: 0,
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontFamily: RD.display,
                        fontSize: 13,
                        fontWeight: 600,
                        color: RD.ink,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {n.title}
                    </span>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: statusColor,
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: RD.inkFade,
                      marginTop: 1,
                      fontStyle: 'italic',
                    }}
                  >
                    {isMulti
                      ? `${n.scenes!.length} scenes`
                      : n.scenes.length > 0
                      ? `1 scene`
                      : 'No scene'}
                    <span style={{ margin: '0 5px' }}>·</span>
                    <span
                      style={{
                        color:
                          n.priority === 'high'
                            ? RD.ruby
                            : n.priority === 'medium'
                            ? RD.gold
                            : RD.inkFade,
                      }}
                    >
                      {n.priority}
                    </span>
                  </div>
                </div>
                <span
                  onClick={(e) => handleDelete(n.id, e)}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    fontSize: 14,
                    color: RD.inkFade,
                    cursor: 'pointer',
                    padding: '0 4px',
                    borderRadius: 2,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = RD.ruby; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = RD.inkFade; }}
                >
                  ×
                </span>
              </div>
            );
          })}

        {/* Sheet density */}
        {view === 'scene' &&
          density === 'sheet' &&
          displayNotes.map(n => {
            const isActive = activeNote === n.id;
            const isMulti = n.scenes && n.scenes.length > 1;
            const origin = NOTE_ORIGINS[n.origin as NoteOriginId] || NOTE_ORIGINS.self;
            const statusColor =
              n.status === 'applied'
                ? RD.forest
                : n.status === 'discussing'
                ? RD.copper
                : RD.gold;
            return (
              <div
                key={n.id}
                onClick={() => setActiveNote(n.id)}
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr 60px 70px 80px 24px',
                  gap: 8,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  background: isActive ? RD.copperSoft + '60' : 'transparent',
                  borderBottom: `1px solid ${RD.line}`,
                  fontSize: 11,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: origin.color,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 800,
                    fontFamily: RD.display,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {origin.initial}
                </div>
                <span
                  style={{
                    fontFamily: RD.display,
                    fontWeight: 600,
                    color: RD.ink,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {n.title}
                </span>
                <span
                  style={{
                    fontFamily: RD.script,
                    color: RD.inkSoft,
                    fontSize: 10,
                  }}
                >
                  {isMulti ? `${n.scenes!.length} scns` : `1 scn`}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color:
                      n.priority === 'high'
                        ? RD.ruby
                        : n.priority === 'medium'
                        ? RD.gold
                        : RD.inkFade,
                  }}
                >
                  {n.priority}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: statusColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: statusColor,
                    }}
                  />
                  {n.status}
                </span>
                <span
                  onClick={(e) => handleDelete(n.id, e)}
                  style={{
                    fontSize: 14,
                    color: RD.inkFade,
                    cursor: 'pointer',
                    padding: '0 4px',
                    borderRadius: 2,
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = RD.ruby; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = RD.inkFade; }}
                >
                  ×
                </span>
              </div>
            );
          })}

        {/* Patterns view — passed in from parent (empty for MVP-1) */}
        {view === 'pattern' &&
          patternNotes.map(pn => {
            const isActive = activeNote === pn.id;
            return (
              <div
                key={pn.id}
                onClick={() => setActiveNote(pn.id)}
                style={{
                  padding: '14px 16px',
                  marginBottom: 12,
                  cursor: 'pointer',
                  background: RD.card,
                  border: `1px solid ${isActive ? RD.copper : RD.line}`,
                  borderLeft: `4px solid ${RD.copper}`,
                  boxShadow: isActive ? RD.shadowDeep : RD.shadowCard,
                  borderRadius: 1,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: RD.copper,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Pattern · {pn.instances.length} instances
                </div>
                <div
                  style={{
                    fontFamily: RD.display,
                    fontSize: 18,
                    fontWeight: 600,
                    color: RD.ink,
                    lineHeight: 1.2,
                    marginBottom: 6,
                    fontStyle: 'italic',
                  }}
                >
                  {pn.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: RD.inkSoft,
                    lineHeight: 1.55,
                    marginBottom: 8,
                  }}
                >
                  {pn.body}
                </div>
                {isActive && (
                  <div
                    style={{
                      borderTop: `1px solid ${RD.line}`,
                      paddingTop: 8,
                      marginTop: 6,
                    }}
                  >
                    {pn.instances.map((inst, j) => (
                      <div
                        key={j}
                        style={{
                          padding: '5px 8px',
                          marginBottom: 4,
                          background: RD.paperDeep,
                          borderRadius: 1,
                          fontSize: 10,
                          lineHeight: 1.5,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: RD.copper,
                            fontFamily: RD.display,
                          }}
                        >
                          Sc. {inst.sceneId}
                        </span>
                        <span style={{ color: RD.inkFade, margin: '0 6px' }}>
                          ·
                        </span>
                        <span style={{ fontFamily: RD.script, color: RD.ink }}>
                          "{inst.line}"
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {view === 'pattern' && patternNotes.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: RD.inkFade,
              fontFamily: RD.display,
              fontStyle: 'italic',
              fontSize: 12,
            }}
          >
            No pattern analysis yet
          </div>
        )}
      </div>
    </div>
  );
}
