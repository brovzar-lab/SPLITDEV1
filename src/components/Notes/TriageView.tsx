import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { RD } from '../../tokens';
import { NOTE_ORIGINS } from '../../data/notes';
import type { Note } from '../../api/types';
import type { NoteOriginId, NoteStatus } from '../../types';
import { groupByRecency } from '../../lib/groupByRecency';

interface Props {
  notes: Note[];
  activeNote: string;
  activeScene: string;
  setActiveNote: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  drawerExpanded: boolean;
  setDrawerExpanded: (v: boolean | ((p: boolean) => boolean)) => void;
  activeStatusFilter: NoteStatus | null;
  setActiveStatusFilter: (v: NoteStatus | null) => void;
}

const PRIORITY_RULE: Record<'high' | 'medium' | 'low', string> = {
  high: `3px solid ${RD.ruby}`,
  medium: `3px solid ${RD.gold}`,
  low: '3px solid transparent',
};

const STATUS_META: Record<NoteStatus, { label: string; color: string }> = {
  unread: { label: 'Open', color: RD.gold },
  discussing: { label: 'Discussing', color: RD.copper },
  applied: { label: 'Applied', color: RD.forest },
};

export function TriageView({
  notes,
  activeNote,
  activeScene,
  setActiveNote,
  onDelete,
  drawerExpanded,
  setDrawerExpanded,
  activeStatusFilter,
  setActiveStatusFilter,
}: Props) {
  const pinnedHere = notes.filter(n => (n.scenes ?? []).includes(activeScene));

  // Pile = everything (filter applies in the drawer below)
  const pileFiltered = activeStatusFilter
    ? notes.filter(n => n.status === activeStatusFilter)
    : notes;

  const sortedPile = [...pileFiltered].sort((a, b) => {
    const p = priorityRank(a.priority) - priorityRank(b.priority);
    if (p !== 0) return p;
    return (b.created_at ?? 0) - (a.created_at ?? 0);
  });

  const groups = groupByRecency(sortedPile, n => n.created_at);

  const counts: Record<NoteStatus, number> = {
    unread: notes.filter(n => n.status === 'unread').length,
    discussing: notes.filter(n => n.status === 'discussing').length,
    applied: notes.filter(n => n.status === 'applied').length,
  };

  const drawerHeaderLabel = activeStatusFilter
    ? `filter: ${STATUS_META[activeStatusFilter].label.toLowerCase()}`
    : 'showing everything';

  const drawerCount = pileFiltered.length;

  return (
    <div style={{ padding: '14px 12px 20px' }}>
      <SectionHeader label="On this scene" />

      {pinnedHere.length === 0 ? (
        <EmptyPinSlot />
      ) : (
        pinnedHere.map(n => (
          <PinnedCard
            key={n.id}
            note={n}
            isActive={activeNote === n.id}
            onClick={() => setActiveNote(n.id)}
            onDelete={e => onDelete(n.id, e)}
          />
        ))
      )}

      <div style={{ height: 14 }} />

      <DistributionStrip
        counts={counts}
        active={activeStatusFilter}
        onToggle={s =>
          setActiveStatusFilter(activeStatusFilter === s ? null : s)
        }
      />

      <div style={{ height: 12 }} />

      <DrawerHeader
        expanded={drawerExpanded}
        onToggle={() => setDrawerExpanded(v => !v)}
        count={drawerCount}
        label={drawerHeaderLabel}
      />

      {drawerExpanded && (
        <div style={{ padding: '10px 4px 0' }}>
          {drawerCount === 0 ? (
            <div
              style={{
                fontFamily: RD.display,
                fontStyle: 'italic',
                fontSize: 12,
                color: RD.inkFade,
                textAlign: 'center',
                padding: '14px 8px',
              }}
            >
              No notes match this filter.
            </div>
          ) : (
            <Fragment>
              <RecencyGroup label="Today" notes={groups.today} activeNote={activeNote} setActiveNote={setActiveNote} onDelete={onDelete} />
              <RecencyGroup label="This week" notes={groups.week} activeNote={activeNote} setActiveNote={setActiveNote} onDelete={onDelete} />
              <RecencyGroup label="Older" notes={groups.older} activeNote={activeNote} setActiveNote={setActiveNote} onDelete={onDelete} />
            </Fragment>
          )}
        </div>
      )}
    </div>
  );
}

function priorityRank(p: 'high' | 'medium' | 'low'): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        fontFamily: RD.display,
        fontStyle: 'italic',
        fontSize: 10,
        fontWeight: 700,
        color: RD.copper,
        letterSpacing: 2,
        textTransform: 'uppercase',
        borderBottom: `1px solid ${RD.copper}40`,
        paddingBottom: 5,
        marginBottom: 12,
      }}
    >
      — {label} —
    </div>
  );
}

function Paperclip() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      style={{
        position: 'absolute',
        top: -8,
        left: -4,
        transform: 'rotate(-12deg)',
        zIndex: 2,
      }}
      aria-hidden="true"
    >
      <path
        d="M16.5 5 L9 12.5 a3 3 0 0 0 4.2 4.2 L19.7 10.4 a5 5 0 0 0 -7.1 -7.1 L5 11"
        fill="none"
        stroke={RD.inkFade}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyPinSlot() {
  return (
    <div
      style={{
        padding: '18px 18px 22px',
        textAlign: 'center',
        color: RD.inkFade,
      }}
    >
      <svg
        width="52"
        height="36"
        viewBox="0 0 52 36"
        style={{ margin: '0 auto 10px', display: 'block' }}
        aria-hidden="true"
      >
        <rect
          x="1.5"
          y="1.5"
          width="49"
          height="33"
          fill="none"
          stroke={RD.line}
          strokeDasharray="3 3"
        />
        <circle cx="26" cy="18" r="3" fill="none" stroke={RD.line} strokeWidth="1.2" />
      </svg>
      <div
        style={{
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 14,
          color: RD.inkSoft,
          marginBottom: 4,
        }}
      >
        Nothing pinned here yet.
      </div>
      <div
        style={{
          fontFamily: RD.sans,
          fontSize: 11,
          color: RD.inkFade,
          lineHeight: 1.45,
        }}
      >
        Right-click a line →{' '}
        <span style={{ color: RD.copper, fontWeight: 600 }}>Note this</span>
      </div>
    </div>
  );
}

function PinnedCard({
  note,
  isActive,
  onClick,
  onDelete,
}: {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const origin = NOTE_ORIGINS[note.origin as NoteOriginId] || NOTE_ORIGINS.self;
  const statusMeta = STATUS_META[note.status];
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '14px 16px 14px 28px',
        marginBottom: 10,
        background: RD.stickyYellow,
        boxShadow: isActive
          ? '0 2px 4px rgba(60,40,20,0.14), 0 14px 28px rgba(60,40,20,0.18)'
          : '0 2px 4px rgba(60,40,20,0.12), 0 10px 22px rgba(60,40,20,0.14)',
        borderLeft: PRIORITY_RULE[note.priority],
        cursor: 'pointer',
        transform: 'rotate(-0.3deg)',
        transition: 'transform 0.18s, box-shadow 0.18s',
        borderRadius: '1px 1px 8px 1px',
      }}
    >
      <Paperclip />

      <span
        onClick={onDelete}
        style={{
          position: 'absolute',
          top: 6,
          right: 8,
          fontSize: 14,
          color: RD.inkFade,
          cursor: 'pointer',
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
      </span>

      <div
        style={{
          fontFamily: RD.display,
          fontSize: 16,
          fontWeight: 600,
          color: RD.ink,
          lineHeight: 1.2,
          marginBottom: 6,
        }}
      >
        {note.title}
      </div>
      <div
        style={{
          fontFamily: RD.sans,
          fontSize: 12,
          color: RD.ink,
          lineHeight: 1.55,
          marginBottom: 10,
          display: '-webkit-box',
          WebkitLineClamp: isActive ? 'unset' : 3,
          WebkitBoxOrient: 'vertical' as CSSProperties['WebkitBoxOrient'],
          overflow: 'hidden',
        }}
      >
        {note.body}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingTop: 8,
          borderTop: '1px dashed rgba(0,0,0,0.12)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '1px 6px',
            border: `1.5px solid ${statusMeta.color}`,
            color: statusMeta.color,
            fontFamily: RD.display,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            transform: 'rotate(-1deg)',
          }}
        >
          {statusMeta.label}
        </span>
        <span
          style={{
            fontFamily: RD.display,
            fontStyle: 'italic',
            fontSize: 10,
            color: RD.inkFade,
            marginLeft: 'auto',
          }}
        >
          — {origin.label}
        </span>
      </div>
    </div>
  );
}

function PileCard({
  note,
  isActive,
  onClick,
  onDelete,
}: {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const statusMeta = STATUS_META[note.status];
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '8px 30px 9px 10px',
        marginBottom: 6,
        background: RD.stickyYellow,
        opacity: isActive ? 1 : 0.92,
        boxShadow: '0 1px 1px rgba(60,40,20,0.06)',
        borderLeft: PRIORITY_RULE[note.priority],
        cursor: 'pointer',
        borderRadius: '1px 1px 4px 1px',
        outline: isActive ? `1px solid ${RD.copper}80` : 'none',
      }}
    >
      <span
        onClick={onDelete}
        style={{
          position: 'absolute',
          top: 4,
          right: 6,
          fontSize: 12,
          color: RD.inkFade,
          cursor: 'pointer',
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
      </span>

      <div
        style={{
          fontFamily: RD.display,
          fontSize: 13,
          fontWeight: 600,
          color: RD.ink,
          lineHeight: 1.25,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 3,
        }}
      >
        {note.title}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 10,
          color: RD.inkFade,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: statusMeta.color,
            flexShrink: 0,
          }}
        />
        <span style={{ color: statusMeta.color, fontWeight: 700 }}>
          {statusMeta.label.toLowerCase()}
        </span>
        <span style={{ margin: '0 2px' }}>·</span>
        <span>{note.scenes.length || 0} scenes</span>
        <span style={{ marginLeft: 'auto' }}>{relativeTime(note.created_at)}</span>
      </div>
    </div>
  );
}

function DistributionStrip({
  counts,
  active,
  onToggle,
}: {
  counts: Record<NoteStatus, number>;
  active: NoteStatus | null;
  onToggle: (s: NoteStatus) => void;
}) {
  const cells: Array<{ id: NoteStatus; label: string; color: string }> = [
    { id: 'unread', label: 'Open', color: RD.gold },
    { id: 'discussing', label: 'Discussing', color: RD.copper },
    { id: 'applied', label: 'Applied', color: RD.forest },
  ];
  return (
    <div
      role="group"
      aria-label="Filter notes by status"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        background: RD.card,
        border: `1px solid ${RD.line}`,
      }}
    >
      {cells.map((c, i) => {
        const isActive = active === c.id;
        return (
          <div
            key={c.id}
            onClick={() => onToggle(c.id)}
            style={{
              padding: '8px 10px 7px',
              cursor: 'pointer',
              borderLeft: i > 0 ? `1px solid ${RD.line}` : 'none',
              borderTop: isActive ? `2px solid ${c.color}` : '2px solid transparent',
              background: isActive ? `${c.color}1c` : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              transition: 'background 120ms, border-color 120ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: c.color,
                }}
              />
              <span
                style={{
                  fontFamily: RD.display,
                  fontSize: 18,
                  fontWeight: 700,
                  color: RD.ink,
                  lineHeight: 1,
                }}
              >
                {counts[c.id]}
              </span>
            </div>
            <div
              style={{
                fontFamily: RD.sans,
                fontSize: 8.5,
                fontWeight: 700,
                color: isActive ? c.color : RD.inkFade,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {c.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DrawerHeader({
  expanded,
  onToggle,
  count,
  label,
}: {
  expanded: boolean;
  onToggle: () => void;
  count: number;
  label: string;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: '8px 12px',
        background: expanded ? RD.ink : RD.paperDeep,
        color: expanded ? RD.paper : RD.ink,
        borderTop: `1px solid ${RD.line}`,
        borderBottom: `1px solid ${expanded ? RD.ink : RD.line}`,
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 10,
        transition: 'background 120ms, color 120ms',
      }}
    >
      <span
        style={{
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        {expanded ? '▾' : '▸'}{' '}
        <span style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: 10, fontWeight: 700 }}>
          All notes
        </span>{' '}
        <span style={{ color: expanded ? 'rgba(244,237,224,0.55)' : RD.inkFade, fontStyle: 'normal' }}>
          ({count})
        </span>
      </span>
      <span
        style={{
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 11,
          color: expanded ? 'rgba(244,237,224,0.55)' : RD.inkFade,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function RecencyGroup({
  label,
  notes,
  activeNote,
  setActiveNote,
  onDelete,
}: {
  label: string;
  notes: Note[];
  activeNote: string;
  setActiveNote: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  if (notes.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 11,
          fontWeight: 700,
          color: RD.inkFade,
          letterSpacing: 2,
          textTransform: 'uppercase',
          borderBottom: `1px dashed ${RD.line}`,
          paddingBottom: 3,
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>— {label} —</span>
        <span style={{ fontFamily: RD.sans, fontStyle: 'normal' }}>{notes.length}</span>
      </div>
      {notes.map(n => (
        <PileCard
          key={n.id}
          note={n}
          isActive={activeNote === n.id}
          onClick={() => setActiveNote(n.id)}
          onDelete={e => onDelete(n.id, e)}
        />
      ))}
    </div>
  );
}

function relativeTime(ms: number | null | undefined): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}
