import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { RD } from '../tokens';
import { REVISION_COLORS } from '../data/revisions';
import { VOICE_MATCHES } from '../data/notes';
import { SCENE_EIGHTHS } from '../data/screenplay';
import type {
  LineChangeStatus,
  ScreenplayLine,
  ScreenplayScene,
} from '../types';

type LineMenuState = { x: number; y: number; text: string } | null;
type ChangeMap = Record<string, LineChangeStatus>;

interface ScreenplayProps {
  activeScene: number;
  linkedScenes?: number[];
  changes: ChangeMap;
  setChanges: (updater: (prev: ChangeMap) => ChangeMap) => void;
  screenplay: ScreenplayScene[];
  viewMode: 'script' | 'cards';
  characterFilter: string | null;
  revisionColor: string;
  onLineAction?: (action: string, text: string) => void;
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
  changes,
  setChanges,
  screenplay,
  viewMode,
  revisionColor,
  onLineAction,
}: ScreenplayProps) {
  const sceneRefs = useRef<Record<number, HTMLDivElement | null>>({});
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

  const handleChange = (cid: string, action: LineChangeStatus) =>
    setChanges(prev => ({ ...prev, [cid]: action }));

  if (viewMode === 'cards') {
    return (
      <IndexCardsView
        screenplay={screenplay}
        activeScene={activeScene}
        changes={changes}
        revColor={revColor}
      />
    );
  }

  const linesPerPage = 55;
  let runningLines = 0;

  const openLineMenu = (e: React.MouseEvent, line: ScreenplayLine) => {
    e.preventDefault();
    e.stopPropagation();
    const text =
      line.type === 'action'
        ? line.text
        : line.line || (line.change ? line.change.inserted : '');
    setLineMenu({ x: e.clientX, y: e.clientY, text });
  };

  const renderLine = (line: ScreenplayLine, key: string) => {
    const status: LineChangeStatus | undefined = line.change
      ? changes[line.change.id] || line.change.status
      : undefined;
    const lineChanged = line.change && status !== 'rejected';

    const wrap = (content: React.ReactNode) => (
      <div
        key={key}
        onContextMenu={e => openLineMenu(e, line)}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 22px',
          alignItems: 'flex-start',
          gap: 0,
          position: 'relative',
        }}
        className="rd-line"
      >
        <div style={{ minWidth: 0 }}>{content}</div>
        <div
          style={{
            fontFamily: RD.script,
            fontSize: 13,
            color: RD.ruby,
            fontWeight: 700,
            textAlign: 'right',
            lineHeight: 1.8,
            paddingTop: 3,
          }}
        >
          {lineChanged ? '*' : ''}
        </div>
      </div>
    );

    if (line.change) {
      if (status === 'rejected') {
        return wrap(
          <div
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
          >
            {line.change.deleted}
          </div>,
        );
      }
      if (status === 'accepted') {
        return wrap(
          <div
            style={{
              fontFamily: RD.script,
              fontSize: 13,
              lineHeight: 1.85,
              padding: '2px 0 2px 8px',
              color: RD.ink,
              outline: 'none',
              borderLeft: `2px solid ${RD.forest}`,
            }}
            contentEditable
            suppressContentEditableWarning
          >
            {line.change.inserted}
          </div>,
        );
      }
      const confidence = VOICE_MATCHES[line.change.id] ?? 0.75;
      const matchPercent = Math.round(confidence * 100);
      const matchColor =
        confidence > 0.8 ? RD.forest : confidence > 0.65 ? RD.gold : RD.ruby;
      const change = line.change;

      return (
        <div key={key} style={{ margin: '12px 0', position: 'relative' }}>
          <div
            style={{
              fontFamily: RD.script,
              fontSize: 13,
              lineHeight: 1.85,
              color: RD.inkFade,
              textDecoration: 'line-through',
              textDecorationColor: RD.ruby,
              textDecorationThickness: 1.5,
            }}
          >
            {change.deleted}
          </div>
          <div
            style={{
              marginTop: 6,
              padding: '10px 12px 12px',
              background: RD.stickyYellow,
              border: `1px solid ${RD.gold}60`,
              borderRadius: '1px 1px 6px 1px',
              boxShadow: RD.shadowSticky,
              transform: 'rotate(-0.3deg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
                paddingBottom: 5,
                borderBottom: `1px dashed ${RD.gold}50`,
              }}
            >
              <span
                style={{
                  fontFamily: RD.display,
                  fontSize: 11,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  color: RD.copper,
                  letterSpacing: 0.5,
                }}
              >
                {change.agent}'s suggestion
              </span>
              <span
                style={{
                  fontFamily: RD.sans,
                  fontSize: 9,
                  fontWeight: 700,
                  color: matchColor,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: matchColor + '20',
                }}
              >
                voice {matchPercent}%
              </span>
            </div>
            <div
              style={{
                fontFamily: RD.script,
                fontSize: 13,
                lineHeight: 1.7,
                color: RD.ink,
                marginBottom: 10,
              }}
            >
              {change.inserted}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleChange(change.id, 'accepted')}
                style={btnStyle(RD.forest, RD.paper)}
              >
                Accept
              </button>
              <button
                onClick={() => handleChange(change.id, 'rejected')}
                style={btnOutline(RD.ruby)}
              >
                Reject
              </button>
              <button style={btnOutline(RD.inkSoft, RD.line)}>Edit</button>
            </div>
          </div>
        </div>
      );
    }

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
            style={{ fontWeight: 700, textTransform: 'uppercase', outline: 'none' }}
            contentEditable
            suppressContentEditableWarning
          >
            {line.character}
          </div>
          {line.parenthetical && (
            <div
              style={{ fontSize: 12, color: RD.inkSoft, outline: 'none' }}
              contentEditable
              suppressContentEditableWarning
            >
              ({line.parenthetical})
            </div>
          )}
          <div style={{ outline: 'none' }} contentEditable suppressContentEditableWarning>
            {line.line}
          </div>
        </div>,
      );
    }

    return wrap(
      <div
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
      >
        {line.text}
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
              THE CABIN
            </div>
            <div
              style={{
                fontFamily: RD.display,
                fontSize: 11,
                fontStyle: 'italic',
                color: RD.inkFade,
                letterSpacing: 1,
              }}
            >
              written by Maya Reeves
            </div>
          </div>

          {screenplay.map((scene, si) => {
            const isActive = scene.sceneId === activeScene;
            const isLinked = linkedScenes.includes(scene.sceneId);
            const sceneStartPage = Math.floor(runningLines / linesPerPage) + 1;
            const sceneStartLineIdx = runningLines % linesPerPage;
            runningLines += scene.lines.length + 3;

            const pageBreaksInScene: number[] = [];
            let lineCounter = sceneStartLineIdx + 3;
            scene.lines.forEach((_, li) => {
              if (lineCounter >= linesPerPage) {
                pageBreaksInScene.push(li);
                lineCounter = 0;
              }
              lineCounter++;
            });

            return (
              <div
                key={scene.sceneId}
                ref={el => {
                  sceneRefs.current[scene.sceneId] = el;
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
                {/* Page number */}
                <div
                  style={{
                    position: 'absolute',
                    right: -42,
                    top: 12,
                    fontFamily: RD.script,
                    fontSize: 11,
                    color: RD.inkFade,
                  }}
                >
                  {sceneStartPage}.
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
                  <span style={{ color: RD.inkFade }}>{scene.sceneId}.</span>
                  <span
                    style={{ flex: 1, outline: 'none' }}
                    contentEditable
                    suppressContentEditableWarning
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
                  <span
                    style={{
                      fontFamily: RD.display,
                      fontSize: 10,
                      fontStyle: 'italic',
                      color: RD.inkFade,
                      letterSpacing: 0.5,
                    }}
                  >
                    {SCENE_EIGHTHS[scene.sceneId] || '1'} pgs
                  </span>
                </div>

                {scene.lines.map((line, li) => (
                  <Fragment key={`${si}-${li}`}>
                    {renderLine(line, `${si}-${li}`)}
                    {pageBreaksInScene.includes(li) && (
                      <PageBreak
                        pageNum={
                          sceneStartPage + pageBreaksInScene.indexOf(li) + 1
                        }
                      />
                    )}
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

function PageBreak({ pageNum }: { pageNum: number }) {
  return (
    <div
      style={{
        margin: '20px -12px',
        padding: '12px 0',
        borderTop: `1px dashed ${RD.lineDeep}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: RD.script,
        fontSize: 10,
        color: RD.inkFade,
        letterSpacing: 2,
        textTransform: 'uppercase',
        position: 'relative',
      }}
    >
      <span
        style={{
          background: '#fefcf2',
          padding: '0 10px',
          color: RD.copper,
          fontWeight: 700,
        }}
      >
        — Page {pageNum} —
      </span>
    </div>
  );
}

interface LineContextMenuProps {
  menu: NonNullable<LineMenuState>;
  onAction?: (action: string, text: string) => void;
}

function LineContextMenu({ menu, onAction }: LineContextMenuProps) {
  const items: Array<
    | { divider: true }
    | { label: string; icon: string; action: string; divider?: false }
  > = [
    { label: 'Ask Dialogue agent…', icon: '◈', action: 'ask-dialogue' },
    { label: 'Ask Structure agent…', icon: '◇', action: 'ask-structure' },
    { label: 'Ask Character agent…', icon: '○', action: 'ask-character' },
    { divider: true },
    { label: 'Rewrite this line', icon: '✎', action: 'rewrite' },
    { label: 'Cut from script', icon: '✂', action: 'cut' },
    { divider: true },
    { label: 'Read aloud', icon: '♪', action: 'read' },
  ];

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
        padding: 4,
        minWidth: 220,
        fontFamily: RD.sans,
      }}
    >
      <div
        style={{
          padding: '6px 10px 4px',
          fontSize: 9,
          color: RD.inkFade,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          fontStyle: 'italic',
          fontFamily: RD.display,
          borderBottom: `1px solid ${RD.line}`,
          marginBottom: 3,
        }}
      >
        "{(menu.text || '').slice(0, 38)}…"
      </div>
      {items.map((item, i) =>
        'divider' in item && item.divider ? (
          <div
            key={i}
            style={{ height: 1, background: RD.line, margin: '3px 6px' }}
          />
        ) : (
          <div
            key={i}
            onClick={() =>
              onAction &&
              onAction((item as { action: string }).action, menu.text)
            }
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: 11.5,
              color: RD.ink,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              borderRadius: 2,
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.background = RD.copperSoft)
            }
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              style={{ color: RD.copper, width: 14, textAlign: 'center' }}
            >
              {(item as { icon: string }).icon}
            </span>
            {(item as { label: string }).label}
          </div>
        ),
      )}
    </div>
  );
}

interface IndexCardsProps {
  screenplay: ScreenplayScene[];
  activeScene: number;
  changes: ChangeMap;
  revColor: { border: string };
}

function IndexCardsView({
  screenplay,
  activeScene,
  changes,
  revColor,
}: IndexCardsProps) {
  const [order, setOrder] = useState<number[]>(
    screenplay.map(s => s.sceneId),
  );
  const [whatIf, setWhatIf] = useState(false);
  const [hoverScene, setHoverScene] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const orderedScenes = order
    .map(id => screenplay.find(s => s.sceneId === id))
    .filter((s): s is ScreenplayScene => Boolean(s));
  const isReordered = order.some(
    (id, i) => screenplay[i] && screenplay[i].sceneId !== id,
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
  const resetOrder = () => setOrder(screenplay.map(s => s.sceneId));

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
          const isActive = scene.sceneId === activeScene;
          const isHover = hoverScene === scene.sceneId;
          const isDrop = dropIdx === si && dragIdx !== si;
          const dialogue = scene.lines.filter(l => l.type === 'dialogue');
          const action = scene.lines.filter(l => l.type === 'action');
          const hasChange = scene.lines.some(
            l =>
              l.change &&
              (changes[l.change.id] || l.change.status) === 'pending',
          );
          const rotation =
            isActive || isHover
              ? 0
              : [-0.8, 0.6, -0.4, 0.7, -0.5, 0.4][si % 6];
          const isDragging = dragIdx === si;

          return (
            <div
              key={scene.sceneId}
              draggable
              onDragStart={() => onDragStart(si)}
              onDragOver={e => onDragOver(e, si)}
              onDrop={() => onDrop(si)}
              onDragEnd={() => {
                setDragIdx(null);
                setDropIdx(null);
              }}
              onMouseEnter={() => setHoverScene(scene.sceneId)}
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
              {hasChange && (
                <span
                  style={{
                    position: 'absolute',
                    top: 26,
                    right: 8,
                    fontFamily: RD.display,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: RD.copper,
                    background: RD.copperSoft,
                    padding: '1px 6px',
                    border: `1px solid ${RD.copper}`,
                    transform: 'rotate(2deg)',
                  }}
                >
                  NOTES
                </span>
              )}

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
                <span style={{ color: RD.inkFade }}>{scene.sceneId}.</span>{' '}
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
                {SCENE_EIGHTHS[scene.sceneId] || '1'} pgs · {dialogue.length}{' '}
                dialogue · {action.length} action
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
                {action
                  .map(a => (a.type === 'action' ? a.text : ''))
                  .join(' ')}
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
                {scene.sceneId !== order[si] && (
                  <span style={{ color: RD.copper }}>
                    was Sc.{scene.sceneId}
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
