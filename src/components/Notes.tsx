import { useState } from 'react';
import { RD } from '../tokens';
import { NOTE_ORIGINS } from '../data/notes';
import type { Note, Scene } from '../api/types';
import { api } from '../api/client';
import type { NoteOriginId, NoteStatus, PatternNote } from '../types';
import { IngestModal } from './Notes/IngestModal';
import { TriageView } from './Notes/TriageView';
import { SheetView } from './Notes/SheetView';

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
  triageStatus?: 'pending' | 'running' | 'done' | 'failed';
  triageError?: string | null;
  activeSceneLabel?: string;
  scenes?: Scene[];
}

type Density = 'sticky' | 'list' | 'sheet';
type View = 'scene' | 'pattern';

// Sticky-origin palette, board rotations, and StatusStamp moved to
// Notes/TriageView.tsx (T2.3). List/Sheet branches use inline styles.

// Audit §1.5 — single source of truth for the notes-column toolbar.
// Rendered identically in both the empty-state header and the populated
// header. Same JSX, same styling, just lifted from two inline copies.
function NotesToolbar({ onIngest }: { onIngest: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={onIngest}
        style={{
          padding: '4px 10px',
          fontSize: 10,
          fontFamily: RD.display,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          background: 'transparent',
          color: RD.copper,
          border: `1px solid ${RD.copper}50`,
          borderRadius: 2,
          cursor: 'pointer',
        }}
      >📋 Ingest notes</button>
    </div>
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
  triageStatus,
  triageError,
  activeSceneLabel,
  scenes = [],
}: Props) {
  const [view, setView] = useState<View>('scene');
  const [showAll, setShowAll] = useState(false);
  const [density, setDensity] = useState<Density>('sticky');

  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [creating, setCreating] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);

  // Audit §1.5 — single JSX definition for the IngestModal so both view
  // branches mount the same element (still one runtime mount per render,
  // but no source duplication).
  const ingestModalJsx = ingestOpen ? (
    <IngestModal
      screenplayId={screenplayId}
      onClose={() => setIngestOpen(false)}
      onIngested={(notes) => {
        notes.forEach(n => onNoteCreated(n));
        setIngestOpen(false);
      }}
    />
  ) : null;

  // T2.3 — Triage view state. Drawer is collapsed by default; Distribution
  // Strip toggles a single-status filter that applies to the pile (and to
  // the T2.4 table view once it lands).
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState<NoteStatus | null>(null);

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

  // T2.3 — the drawer/pinned layout now handles the >8-notes case natively,
  // so don't force-switch density to 'list' anymore.

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
          <NotesToolbar onIngest={() => setIngestOpen(true)} />
        </div>

        {triageStatus && triageStatus !== 'done' && (
          <div style={{
            padding: '8px 14px',
            background: triageStatus === 'failed' ? RD.rubySoft : RD.copperSoft,
            color: triageStatus === 'failed' ? RD.ruby : RD.copper,
            fontFamily: RD.display,
            fontStyle: 'italic',
            fontSize: 12,
            borderBottom: `1px solid ${triageStatus === 'failed' ? RD.ruby + '40' : RD.copper + '40'}`,
          }}>
            {triageStatus === 'pending' || triageStatus === 'running'
              ? 'Reading your screenplay… AI is taking a closer look.'
              : triageError
              ? `AI triage couldn't run: ${triageError}`
              : "AI triage couldn't run."}
          </div>
        )}

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

        {ingestModalJsx}
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
              {density === 'sticky' && view === 'scene' && activeScene
                ? `${activeSceneLabel ? `Scene ${activeSceneLabel}` : 'Active scene'} · ${notes.filter(n => (n.scenes ?? []).includes(activeScene)).length} pinned`
                : 'From the desk'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeScene && view === 'scene' && !noSceneNotes && !showAll && density !== 'sticky' && (
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
            <NotesToolbar onIngest={() => setIngestOpen(true)} />
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

      {triageStatus && triageStatus !== 'done' && (
        <div style={{
          padding: '8px 14px',
          background: triageStatus === 'failed' ? RD.rubySoft : RD.copperSoft,
          color: triageStatus === 'failed' ? RD.ruby : RD.copper,
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 12,
          borderBottom: `1px solid ${triageStatus === 'failed' ? RD.ruby + '40' : RD.copper + '40'}`,
          flexShrink: 0,
        }}>
          {triageStatus === 'pending' || triageStatus === 'running'
            ? 'Reading your screenplay… AI is taking a closer look.'
            : triageError
            ? `AI triage couldn't run: ${triageError}`
            : "AI triage couldn't run."}
        </div>
      )}

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

      {noSceneNotes && !showAll && view === 'scene' && density !== 'sticky' && (
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
          padding: 0,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {view === 'scene' && density === 'sheet' && (
          <SheetView
            notes={notes}
            activeNote={activeNote}
            setActiveNote={setActiveNote}
            onDelete={handleDelete}
            scenes={scenes}
            activeStatusFilter={activeStatusFilter}
          />
        )}

        {view === 'scene' && density === 'sticky' && (
          <TriageView
            notes={notes}
            activeNote={activeNote}
            activeScene={activeScene}
            setActiveNote={setActiveNote}
            onDelete={handleDelete}
            drawerExpanded={drawerExpanded}
            setDrawerExpanded={setDrawerExpanded}
            activeStatusFilter={activeStatusFilter}
            setActiveStatusFilter={setActiveStatusFilter}
          />
        )}

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
                {n.origin !== 'self' && (
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
                )}
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

      {ingestModalJsx}
    </div>
  );
}
