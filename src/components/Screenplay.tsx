import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { RD } from '../tokens';
import { REVISION_COLORS } from '../data/revisions';
import { AGENTS } from '../data/agents';
import type { Scene, Line } from '../api/types';
import type { AgentReply, LineMenuContext } from '../types';
import { AgentMarginPin } from './AgentMarginPin';
import { hasChange, renderTextWithInlineDiff } from '../lib/diffRender';

const TOKEN_TO_AGENT: Record<string, string> = {
  D: 'dialogue',
  S: 'structure',
  C: 'character',
  H: 'horror',
  K: 'conflict',
  T: 'theme',
};

function renderInlineTags(text: string): ReactNode {
  if (!text || !text.includes('[[')) return text;
  const parts: ReactNode[] = [];
  const regex = /\[\[([A-Z])\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    const m = match;
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    const agent = AGENTS.find(a => a.id === TOKEN_TO_AGENT[m[1]]);
    if (agent) {
      parts.push(
        <span
          key={`agtag-${key++}`}
          data-tag={m[1]}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '6ch',
            borderBottom: `1.5px solid ${agent.color}`,
            verticalAlign: 'baseline',
          }}
        />,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// §2.1 — contentEditable round-trip serializer. The renderInlineTags above
// turns `[[D]]` source text into a colored underline span with NO text
// content. Calling `.textContent` on the contentEditable strips the tags
// silently and on blur we'd persist the line without them. This walker
// emits `[[X]]` for every `data-tag="X"` span and the textContent of every
// other node, preserving the round-trip.
export function serializeLineHtml(el: HTMLElement): string {
  const out: string[] = [];
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push(node.textContent ?? '');
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const e = node as HTMLElement;
      const tag = e.getAttribute('data-tag');
      if (tag) {
        out.push(`[[${tag}]]`);
        return;
      }
      if (e.tagName === 'BR') {
        out.push('\n');
        return;
      }
    }
    node.childNodes.forEach(walk);
  };
  el.childNodes.forEach(walk);
  return out.join('');
}

// Smart agent surfacing — which 3 agents matter most for this line type.
// Brief T2.1: dialogue → Dialogue/Character/Structure; action → Structure/Horror/Conflict.
const PRIMARY_BY_TYPE: Record<'action' | 'dialogue', string[]> = {
  dialogue: ['dialogue', 'character', 'structure'],
  action: ['structure', 'horror', 'conflict'],
};

type LineMenuState = { x: number; y: number; ctx: LineMenuContext } | null;

type ApiScene = Scene & { lines: Line[] };

interface ScreenplayProps {
  activeScene: string;
  linkedScenes?: string[];
  screenplay: ApiScene[];
  viewMode: 'script' | 'cards';
  characterFilter: string | null;
  revisionColor: string;
  onLineAction?: (action: string, ctx: LineMenuContext) => void;
  onLineEdit?: (id: string, patch: Partial<Line>) => void;
  onSceneEdit?: (id: string, patch: Partial<Scene>) => void;
  onAskScene?: (sceneId: string) => void;
  title?: string;
  author?: string;
  revisionTaggedLineIds?: ReadonlySet<string>;
  highlightLineId?: string | null;
  graduatedReplies?: AgentReply[];
  onBackToChat?: (replyId: string) => void;
  compareToBase?: boolean;
}

const btnStyle = (bg: string, fg: string): CSSProperties => ({
  padding: '4px 11px',
  fontFamily: RD.display,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  background: bg,
  color: fg,
  border: 'none',
  borderRadius: 1,
  cursor: 'pointer',
});

const btnOutline = (color: string, borderColor?: string): CSSProperties => ({
  padding: '4px 11px',
  fontFamily: RD.display,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  background: 'transparent',
  color,
  border: `1px solid ${borderColor || color}`,
  borderRadius: 1,
  cursor: 'pointer',
});

export function Screenplay({
  activeScene,
  linkedScenes = [],
  screenplay,
  viewMode,
  revisionColor,
  onLineAction,
  onLineEdit,
  onSceneEdit,
  onAskScene,
  title,
  author,
  revisionTaggedLineIds,
  highlightLineId,
  graduatedReplies,
  onBackToChat,
  compareToBase = false,
}: ScreenplayProps) {
  const sceneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const revColor =
    REVISION_COLORS.find(r => r.id === revisionColor) || REVISION_COLORS[0];

  const [lineMenu, setLineMenu] = useState<LineMenuState>(null);

  useEffect(() => {
    if (viewMode === 'script' && activeScene && sceneRefs.current[activeScene]) {
      const el = sceneRefs.current[activeScene]!;
      const container = el.closest('[data-scroll-root]') as HTMLElement | null;
      if (container) {
        const cRect = container.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        container.scrollTop += eRect.top - cRect.top - 40;
      }
    }
  }, [activeScene, viewMode]);

  useEffect(() => {
    if (!lineMenu) return;
    const close = () => setLineMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [lineMenu]);

  // Keyboard shortcuts — fire when there's an active selection inside a
  // line. Brief T2.1: ⌘D ⌘⇧C ⌘⇧S ⌘R ⌘⇧R ⌘F ⌘N ⌘T ⌘V ⌘L ⌘⌫.
  useEffect(() => {
    if (!onLineAction) return;
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.anchorNode) return;
      const anchorEl =
        sel.anchorNode.nodeType === Node.TEXT_NODE
          ? sel.anchorNode.parentElement
          : (sel.anchorNode as Element);
      const lineEl = anchorEl?.closest('[data-line-id]') as HTMLElement | null;
      if (!lineEl) return;
      const lineId = lineEl.dataset.lineId!;
      const sceneId = lineEl.dataset.sceneId!;
      const lineType = (lineEl.dataset.lineType as 'action' | 'dialogue') || 'action';
      const character = lineEl.dataset.lineCharacter || null;
      const ctx: LineMenuContext = {
        text: sel.toString(),
        lineId,
        sceneId,
        lineType,
        character,
      };
      const key = e.key.toLowerCase();
      let action: string | null = null;
      if (key === 'd' && !e.shiftKey) action = 'ask-dialogue';
      else if (key === 's' && e.shiftKey) action = 'ask-structure';
      else if (key === 'c' && e.shiftKey) action = 'ask-character';
      else if (key === 'r' && e.shiftKey) action = 'compress-expand';
      else if (key === 'r' && !e.shiftKey) action = 'rewrite';
      else if (key === 'f' && !e.shiftKey) action = 'find-similar';
      else if (key === 'n' && !e.shiftKey) action = 'note-this';
      else if (key === 't' && !e.shiftKey) action = 'tag-for-revision';
      else if (key === 'v' && !e.shiftKey) action = 'voice-exemplar';
      else if (key === 'l' && !e.shiftKey) action = 'read';
      else if (key === 'backspace') action = 'cut';
      if (!action) return;
      e.preventDefault();
      onLineAction(action, ctx);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onLineAction]);

  if (viewMode === 'cards') {
    return (
      <IndexCardsView
        screenplay={screenplay}
        activeScene={activeScene}
        revColor={revColor}
      />
    );
  }

  const linesPerPage = 55;
  let runningLines = 0;

  const openLineMenu = (e: React.MouseEvent, line: Line, sceneId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLineMenu({
      x: e.clientX,
      y: e.clientY,
      ctx: {
        text: line.text || '',
        lineId: line.id,
        sceneId,
        lineType: line.type,
        character: line.character,
      },
    });
  };

  const renderLine = (line: Line, key: string, sceneId: string) => {
    const isTagged = revisionTaggedLineIds?.has(line.id);
    const isHighlight = highlightLineId === line.id;
    const diffOn = compareToBase && hasChange(line.revision);
    const isReplaced = diffOn && line.revision?.deletedText !== undefined;
    const lineDataAttrs = {
      'data-line-id': line.id,
      'data-scene-id': sceneId,
      'data-line-type': line.type,
      ...(line.type === 'dialogue' && line.character
        ? { 'data-line-character': line.character }
        : {}),
    } as Record<string, string>;

    // T3.4 margin asterisk:
    // - revision-change (insertion or word-level) → revColor asterisk
    // - line-level deletion → ruby asterisk
    // - tag-for-revision (T2.1) → revColor asterisk
    // - none → blank
    const marginGlyph = isReplaced
      ? '*'
      : diffOn
      ? '*'
      : isTagged
      ? '*'
      : '';
    const marginColor = isReplaced
      ? RD.ruby
      : diffOn
      ? revColor.border
      : isTagged
      ? revColor.border
      : RD.ruby;

    // Pick the right text renderer: inline diff when comparing and line has
    // word-level changes; otherwise the agent-tag renderer (T1.1).
    const hasInlineDiff =
      diffOn &&
      ((line.revision?.insertions?.length ?? 0) > 0 ||
        (line.revision?.deletions?.length ?? 0) > 0);
    const renderText = (text: string): ReactNode =>
      hasInlineDiff
        ? renderTextWithInlineDiff(text, line.revision, revColor.border)
        : renderInlineTags(text);

    const wrap = (content: React.ReactNode) => (
      <div
        key={key}
        onContextMenu={e => openLineMenu(e, line, sceneId)}
        className={`rd-line${isHighlight ? ' rd-line-highlight' : ''}`}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 22px',
          alignItems: 'flex-start',
          gap: 0,
          position: 'relative',
          background: diffOn && !isReplaced ? `${revColor.border}1c` : undefined,
          borderLeft:
            diffOn && !isReplaced
              ? `2px solid ${revColor.border}`
              : '2px solid transparent',
          margin: diffOn && !isReplaced ? '0 0 0 -6px' : undefined,
          padding: diffOn && !isReplaced ? '2px 0 2px 4px' : undefined,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {isReplaced && line.revision?.deletedText && (
            <div
              style={{
                fontFamily: RD.script,
                fontSize: 13,
                color: RD.inkFade,
                textDecoration: `line-through ${RD.ruby}`,
                textDecorationThickness: 1.5,
                lineHeight: 1.85,
                padding: '2px 0',
              }}
              aria-hidden="true"
            >
              {line.revision.deletedText}
            </div>
          )}
          {content}
        </div>
        <div
          style={{
            fontFamily: RD.script,
            fontSize: 13,
            color: marginColor,
            fontWeight: 700,
            textAlign: 'right',
            lineHeight: 1.8,
            paddingTop: 3,
          }}
          aria-hidden="true"
        >
          {marginGlyph}
        </div>
      </div>
    );

    if (line.type === 'dialogue') {
      return wrap(
        <div
          style={{
            fontFamily: RD.script,
            fontSize: 13,
            textAlign: 'center',
            padding: '5px 80px',
            lineHeight: 1.7,
          }}
        >
          <div
            {...lineDataAttrs}
            style={{ fontWeight: 700, textTransform: 'uppercase', outline: 'none' }}
            contentEditable
            suppressContentEditableWarning
            onBlur={e => onLineEdit?.(line.id, { character: serializeLineHtml(e.currentTarget) })}
          >
            {line.character}
          </div>
          {line.parenthetical && (
            <div
              {...lineDataAttrs}
              style={{ fontSize: 12, color: RD.inkSoft, outline: 'none' }}
              contentEditable
              suppressContentEditableWarning
              onBlur={e => onLineEdit?.(line.id, { parenthetical: serializeLineHtml(e.currentTarget) })}
            >
              ({renderInlineTags(line.parenthetical)})
            </div>
          )}
          <div
            {...lineDataAttrs}
            style={{ outline: 'none' }}
            contentEditable
            suppressContentEditableWarning
            onBlur={e => onLineEdit?.(line.id, { text: serializeLineHtml(e.currentTarget) })}
          >
            {renderText(line.text)}
          </div>
        </div>,
      );
    }

    return wrap(
      <div
        {...lineDataAttrs}
        style={{
          fontFamily: RD.script,
          fontSize: 13,
          lineHeight: 1.85,
          padding: '2px 0',
          color: RD.ink,
          outline: 'none',
        }}
        contentEditable
        suppressContentEditableWarning
        onBlur={e => onLineEdit?.(line.id, { text: serializeLineHtml(e.currentTarget) })}
      >
        {renderText(line.text)}
      </div>,
    );
  };

  return (
    <Fragment>
      <div
        data-scroll-root
        style={{
          height: '100%',
          overflowY: 'auto',
          background: `radial-gradient(ellipse at top, ${RD.paperDeep} 0%, #d4c8a8 100%)`,
          padding: '24px 28px 60px',
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: '0 auto',
            background: '#fefcf2',
            border: `1px solid ${RD.line}`,
            boxShadow:
              '0 2px 8px rgba(40,28,16,0.08), 0 12px 40px rgba(40,28,16,0.12)',
            padding: '40px 60px 56px',
            position: 'relative',
            backgroundImage: RD.paperTexture,
            backgroundSize: '32px 32px',
          }}
        >
          {/* Revision stamp */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 28,
              padding: '4px 10px',
              fontFamily: RD.display,
              fontSize: 9,
              fontWeight: 700,
              color: revColor.border,
              letterSpacing: 2,
              textTransform: 'uppercase',
              border: `1.5px solid ${revColor.border}`,
              background: `${revColor.bg}40`,
              transform: 'rotate(2deg)',
            }}
          >
            {revColor.name}
          </div>

          {/* Title block */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div
              style={{
                fontFamily: RD.script,
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 3,
                color: RD.ink,
                marginBottom: 16,
              }}
            >
              {title ? title.toUpperCase() : 'UNTITLED'}
            </div>
            {author && (
              <div
                style={{
                  fontFamily: RD.display,
                  fontSize: 11,
                  fontStyle: 'italic',
                  color: RD.inkFade,
                  letterSpacing: 1,
                }}
              >
                written by {author}
              </div>
            )}
          </div>

          {screenplay.map((scene, si) => {
            const isActive = scene.id === activeScene;
            const isLinked = linkedScenes.includes(scene.id);
            const sceneStartPage = Math.floor(runningLines / linesPerPage) + 1;
            runningLines += scene.lines.length + 3;
            const pinsHere = (graduatedReplies ?? []).filter(
              r => r.sceneId === scene.id,
            );

            return (
              <div
                key={scene.id}
                ref={el => {
                  sceneRefs.current[scene.id] = el;
                }}
                style={{
                  position: 'relative',
                  marginBottom: 28,
                  paddingLeft: 12,
                  marginLeft: -16,
                  borderLeft: isActive
                    ? `3px solid ${RD.copper}`
                    : isLinked
                    ? `3px solid ${RD.copper}40`
                    : '3px solid transparent',
                  background:
                    isLinked && !isActive ? `${RD.copper}05` : 'transparent',
                }}
              >
                {/* Scene-header gutter: page number + any graduated agent
                    pins, stacked together so the pins are clearly anchored
                    to *this scene* not floating mid-body. */}
                <div
                  style={{
                    position: 'absolute',
                    right: -42,
                    top: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      fontFamily: RD.display,
                      fontStyle: 'italic',
                      fontSize: 11,
                      color: RD.inkFade,
                      lineHeight: 1,
                    }}
                  >
                    p. {sceneStartPage}
                  </div>
                  {pinsHere.map(pin => (
                    <AgentMarginPin
                      key={pin.id}
                      reply={pin}
                      onBackToChat={() => onBackToChat?.(pin.id)}
                    />
                  ))}
                </div>

                {/* Scene heading */}
                <div
                  style={{
                    fontFamily: RD.script,
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    paddingBottom: 4,
                    marginBottom: 12,
                    borderBottom: `1px solid ${RD.line}`,
                    color: isActive ? RD.copper : RD.ink,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <span style={{ color: RD.inkFade }}>{scene.position}.</span>
                  <span
                    style={{ flex: 1, outline: 'none' }}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => onSceneEdit?.(scene.id, { heading: serializeLineHtml(e.currentTarget) })}
                  >
                    {scene.heading}
                  </span>
                  {isLinked && (
                    <span
                      style={{
                        fontFamily: RD.display,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1.5,
                        color: RD.paper,
                        background: RD.copper,
                        padding: '2px 7px',
                        textTransform: 'uppercase',
                      }}
                    >
                      ← Linked
                    </span>
                  )}
                  {scene.eighths && (
                    <span
                      style={{
                        fontFamily: RD.display,
                        fontSize: 10,
                        fontStyle: 'italic',
                        color: RD.inkFade,
                        letterSpacing: 0.5,
                      }}
                    >
                      {scene.eighths} pgs
                    </span>
                  )}
                </div>

                {scene.lines.map((line, li) => (
                  <Fragment key={`${si}-${li}`}>
                    {renderLine(line, `${si}-${li}`, scene.id)}
                  </Fragment>
                ))}
              </div>
            );
          })}

          {/* "Add scene" affordance */}
          <div
            style={{
              marginTop: 32,
              padding: '14px 0',
              borderTop: `1px dashed ${RD.line}`,
              fontFamily: RD.script,
              fontSize: 12,
              color: RD.inkFade,
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            + INT./EXT. — type to add scene
          </div>
        </div>
      </div>

      {lineMenu && <LineContextMenu menu={lineMenu} onAction={onLineAction} />}
    </Fragment>
  );
}

interface LineContextMenuProps {
  menu: NonNullable<LineMenuState>;
  onAction?: (action: string, ctx: LineMenuContext) => void;
}

function LineContextMenu({ menu, onAction }: LineContextMenuProps) {
  // Per-session disclosure, no localStorage (brief T2.1).
  const [showMore, setShowMore] = useState(false);

  const { ctx } = menu;
  const primaryIds = PRIMARY_BY_TYPE[ctx.lineType] ?? ['dialogue', 'structure', 'character'];
  const primaryAgents = primaryIds
    .map(id => AGENTS.find(a => a.id === id))
    .filter((a): a is (typeof AGENTS)[number] => Boolean(a));
  const moreAgents = AGENTS.filter(a => !primaryIds.includes(a.id));

  const fire = (action: string) => () => onAction?.(action, ctx);

  return (
    <div
      style={{
        position: 'fixed',
        top: menu.y,
        left: menu.x,
        zIndex: 100,
        background: RD.card,
        border: `1px solid ${RD.lineDeep}`,
        boxShadow: '0 12px 32px rgba(40,28,16,0.18)',
        borderRadius: 2,
        padding: '4px 0',
        minWidth: 260,
        fontFamily: RD.sans,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Selection preview */}
      <div
        style={{
          padding: '8px 12px 6px',
          fontSize: 10,
          color: RD.inkFade,
          letterSpacing: 1.2,
          fontStyle: 'italic',
          fontFamily: RD.script,
          borderBottom: `1px solid ${RD.line}`,
          marginBottom: 4,
          maxWidth: 320,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        "{(ctx.text || '').slice(0, 50)}{(ctx.text || '').length > 50 ? '…' : ''}"
      </div>

      <SectionLabel>Ask</SectionLabel>
      {primaryAgents.map(a => (
        <AgentRow key={a.id} agent={a} shortcut={shortcutForAgent(a.id)} onClick={fire(`ask-${a.id}`)} />
      ))}
      {showMore && moreAgents.map(a => (
        <AgentRow key={a.id} agent={a} shortcut={null} onClick={fire(`ask-${a.id}`)} />
      ))}
      <DisclosureRow open={showMore} onClick={() => setShowMore(v => !v)} />

      <SectionLabel>Rewrite</SectionLabel>
      <ActionRow glyph="✎" label="Rewrite this line" shortcut="⌘R" onClick={fire('rewrite')} />
      <ActionRow glyph="↔" label="Compress / Expand" shortcut="⌘⇧R" onClick={fire('compress-expand')} />
      <ActionRow glyph="≋" label="Find similar" shortcut="⌘F" onClick={fire('find-similar')} />

      <SectionLabel>Capture</SectionLabel>
      <ActionRow glyph="▤" label="Note this" shortcut="⌘N" onClick={fire('note-this')} />
      <ActionRow glyph="★" label="Tag for revision" shortcut="⌘T" onClick={fire('tag-for-revision')} />
      <ActionRow
        glyph="👤"
        label="Voice exemplar →"
        shortcut="⌘V"
        onClick={fire('voice-exemplar')}
        disabled={ctx.lineType !== 'dialogue'}
      />

      <SectionLabel>Utilities</SectionLabel>
      <ActionRow glyph="♪" label="Read aloud" shortcut="⌘L" onClick={fire('read')} />
      <ActionRow
        glyph="✂"
        label="Cut from script"
        shortcut="⌘⌫"
        onClick={fire('cut')}
        destructive
      />
    </div>
  );
}

function shortcutForAgent(id: string): string | null {
  if (id === 'dialogue') return '⌘D';
  if (id === 'structure') return '⌘⇧S';
  if (id === 'character') return '⌘⇧C';
  return null;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '8px 12px 4px',
        fontFamily: RD.display,
        fontStyle: 'italic',
        fontSize: 9.5,
        fontWeight: 700,
        color: RD.inkFade,
        letterSpacing: 2,
        textTransform: 'uppercase',
        borderBottom: `1px solid ${RD.line}`,
        margin: '2px 8px 4px',
      }}
    >
      {children}
    </div>
  );
}

const rowBaseStyle: CSSProperties = {
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: 13,
  color: RD.ink,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  borderRadius: 2,
  margin: '0 4px',
  fontFamily: RD.sans,
};

function AgentRow({
  agent,
  shortcut,
  onClick,
}: {
  agent: (typeof AGENTS)[number];
  shortcut: string | null;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={rowBaseStyle}
      onMouseEnter={e => (e.currentTarget.style.background = RD.copperSoft)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: agent.color, width: 14, textAlign: 'center', fontWeight: 700 }}>
        {agent.glyph}
      </span>
      <span style={{ color: RD.inkFade }}>→</span>
      <span style={{ flex: 1 }}>{agent.name}</span>
      {shortcut && (
        <span
          style={{
            fontFamily: RD.script,
            fontSize: 10.5,
            color: RD.inkFade,
            letterSpacing: 0.5,
          }}
        >
          {shortcut}
        </span>
      )}
    </div>
  );
}

function ActionRow({
  glyph,
  label,
  shortcut,
  onClick,
  destructive,
  disabled,
}: {
  glyph: string;
  label: string;
  shortcut?: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const hoverBg = destructive ? `${RD.ruby}1f` : RD.copperSoft;
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        ...rowBaseStyle,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => {
        if (!disabled) e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: destructive ? RD.ruby : RD.copper, width: 14, textAlign: 'center' }}>
        {glyph}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span
          style={{
            fontFamily: RD.script,
            fontSize: 10.5,
            color: RD.inkFade,
            letterSpacing: 0.5,
          }}
        >
          {shortcut}
        </span>
      )}
    </div>
  );
}

function DisclosureRow({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...rowBaseStyle,
        fontStyle: 'italic',
        color: RD.inkFade,
        fontSize: 11.5,
        fontFamily: RD.display,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = RD.copperSoft)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ width: 14, textAlign: 'center' }}>{open ? '−' : '+'}</span>
      {open ? 'Fewer agents' : 'More agents…'}
    </div>
  );
}

interface IndexCardsProps {
  screenplay: ApiScene[];
  activeScene: string;
  revColor: { border: string };
}

function IndexCardsView({
  screenplay,
  activeScene,
  revColor,
}: IndexCardsProps) {
  const [order, setOrder] = useState<string[]>(
    screenplay.map(s => s.id),
  );
  const [whatIf, setWhatIf] = useState(false);
  const [hoverScene, setHoverScene] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const orderedScenes = order
    .map(id => screenplay.find(s => s.id === id))
    .filter((s): s is ApiScene => Boolean(s));
  const isReordered = order.some(
    (id, i) => screenplay[i] && screenplay[i].id !== id,
  );

  const onDragStart = (i: number) => setDragIdx(i);
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDropIdx(i);
  };
  const onDrop = (i: number) => {
    if (dragIdx === null || dragIdx === i) return;
    const next = [...order];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setOrder(next);
    setDragIdx(null);
    setDropIdx(null);
  };
  const resetOrder = () => setOrder(screenplay.map(s => s.id));

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: `linear-gradient(180deg, ${RD.paper} 0%, ${RD.paperDeep} 100%)`,
        padding: '24px 30px 60px',
        fontFamily: RD.sans,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: `1px solid ${RD.line}`,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 28,
              fontWeight: 600,
              color: RD.ink,
              fontStyle: 'italic',
              lineHeight: 1,
            }}
          >
            Index Cards
          </div>
          <div
            style={{
              fontSize: 10,
              color: RD.inkFade,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            {whatIf
              ? 'What-if mode · changes are not saved'
              : 'Drag to restructure'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isReordered && (
            <button onClick={resetOrder} style={btnOutline(RD.inkSoft, RD.line)}>
              ↶ Reset
            </button>
          )}
          <button
            onClick={() => setWhatIf(v => !v)}
            style={whatIf ? btnStyle(RD.copper, RD.paper) : btnOutline(RD.copper)}
          >
            {whatIf ? 'Exit What-If' : '◇ What-If Mode'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 18,
          position: 'relative',
        }}
      >
        {orderedScenes.map((scene, si) => {
          const isActive = scene.id === activeScene;
          const isHover = hoverScene === scene.id;
          const isDrop = dropIdx === si && dragIdx !== si;
          const dialogue = scene.lines.filter(l => l.type === 'dialogue');
          const action = scene.lines.filter(l => l.type === 'action');
          const rotation =
            isActive || isHover
              ? 0
              : [-0.8, 0.6, -0.4, 0.7, -0.5, 0.4][si % 6];
          const isDragging = dragIdx === si;

          return (
            <div
              key={scene.id}
              draggable
              onDragStart={() => onDragStart(si)}
              onDragOver={e => onDragOver(e, si)}
              onDrop={() => onDrop(si)}
              onDragEnd={() => {
                setDragIdx(null);
                setDropIdx(null);
              }}
              onMouseEnter={() => setHoverScene(scene.id)}
              onMouseLeave={() => setHoverScene(null)}
              style={{
                padding: '18px 18px 16px',
                background: '#fefdf6',
                border: `1px solid ${isDrop ? RD.copper : RD.lineDeep}`,
                borderTop: `4px solid ${revColor.border}`,
                boxShadow: isActive || isHover ? RD.shadowDeep : RD.shadowCard,
                transform: `rotate(${rotation}deg) ${
                  isHover ? 'scale(1.02)' : 'scale(1)'
                }`,
                position: 'relative',
                minHeight: 180,
                cursor: 'grab',
                opacity: isDragging ? 0.4 : 1,
                transition:
                  'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  fontSize: 11,
                  color: RD.inkFade,
                  letterSpacing: 1,
                }}
              >
                ⋮⋮
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 12,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: RD.paperDeep,
                  boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.15)',
                }}
              />

              <div
                style={{
                  fontFamily: RD.script,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: RD.ink,
                  marginBottom: 6,
                  paddingLeft: 18,
                  letterSpacing: 0.5,
                }}
              >
                <span style={{ color: RD.inkFade }}>{scene.position}.</span>{' '}
                {scene.heading}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: RD.inkFade,
                  marginBottom: 10,
                  letterSpacing: 1,
                  fontStyle: 'italic',
                  fontFamily: RD.display,
                }}
              >
                {scene.eighths || '1'} pgs · {dialogue.length} dialogue · {action.length} action
              </div>

              <div
                style={{
                  fontFamily: RD.script,
                  fontSize: 11,
                  color: RD.ink,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: isHover ? 8 : 3,
                  WebkitBoxOrient: 'vertical' as CSSProperties['WebkitBoxOrient'],
                  overflow: 'hidden',
                }}
              >
                {action.map(a => a.text).join(' ')}
              </div>

              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: `1px dashed ${RD.line}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: RD.display,
                  fontSize: 9,
                  fontStyle: 'italic',
                  color: RD.inkFade,
                  letterSpacing: 0.5,
                }}
              >
                <span>Position {si + 1}</span>
                {scene.id !== order[si] && (
                  <span style={{ color: RD.copper }}>
                    reordered
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {whatIf && isReordered && (
        <div
          style={{
            position: 'sticky',
            bottom: 16,
            marginTop: 24,
            padding: '10px 16px',
            background: RD.ink,
            color: RD.paper,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderLeft: `4px solid ${RD.copper}`,
          }}
        >
          <span
            style={{
              fontFamily: RD.display,
              fontSize: 13,
              fontStyle: 'italic',
            }}
          >
            You've restructured the script. Try reading it in the new order?
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btnOutline(RD.copperSoft, RD.copperSoft)}>
              Preview Read
            </button>
            <button style={btnStyle(RD.copper, RD.paper)}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}
