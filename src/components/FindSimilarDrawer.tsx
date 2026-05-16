import { useMemo } from 'react';
import { RD } from '../tokens';
import type { Line, Scene } from '../api/types';
import type { LineMenuContext } from '../types';
import { findSimilarLines } from '../lib/findSimilarLines';

interface Props {
  ctx: LineMenuContext;
  scenes: Array<Scene & { lines: Line[] }>;
  onClose: () => void;
  onJump: (sceneId: string, lineId: string) => void;
}

export function FindSimilarDrawer({ ctx, scenes, onClose, onJump }: Props) {
  const matches = useMemo(
    () => findSimilarLines(ctx.text, ctx.lineId, scenes),
    [ctx.text, ctx.lineId, scenes],
  );

  return (
    <div
      role="dialog"
      aria-label="Find similar lines"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 280,
        background: RD.paper,
        borderLeft: `1px solid ${RD.lineDeep}`,
        boxShadow: '-8px 0 24px rgba(40,28,16,0.18)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 30,
        fontFamily: RD.sans,
        animation: 'rd-slide-in-right 220ms ease-out',
      }}
    >
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: `1px solid ${RD.line}`,
          background: RD.paperDeep,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 18,
              fontWeight: 600,
              fontStyle: 'italic',
              color: RD.ink,
              lineHeight: 1,
            }}
          >
            Find similar
          </div>
          <button
            onClick={onClose}
            aria-label="Close find similar"
            style={{
              background: 'transparent',
              border: 'none',
              color: RD.inkFade,
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
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
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </div>
        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            background: RD.card,
            border: `1px solid ${RD.line}`,
            fontFamily: RD.script,
            fontSize: 11,
            color: RD.inkSoft,
            lineHeight: 1.45,
            fontStyle: 'italic',
            maxHeight: 64,
            overflow: 'hidden',
          }}
        >
          "{ctx.text.slice(0, 220)}{ctx.text.length > 220 ? '…' : ''}"
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 16px' }}>
        {matches.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 16px',
              color: RD.inkFade,
              fontFamily: RD.display,
              fontStyle: 'italic',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            No close matches across the script.
          </div>
        ) : (
          matches.map(m => (
            <div
              key={m.lineId}
              onClick={() => onJump(m.sceneId, m.lineId)}
              style={{
                padding: '10px 12px',
                marginBottom: 8,
                background: RD.card,
                border: `1px solid ${RD.line}`,
                borderLeft: `3px solid ${RD.copper}`,
                cursor: 'pointer',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = RD.copperSoft + '60';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = RD.card;
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    fontFamily: RD.display,
                    fontSize: 10,
                    fontStyle: 'italic',
                    color: RD.copper,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  Sc. {m.scenePosition} · {m.sceneHeading}
                </span>
                <span
                  style={{
                    fontFamily: RD.script,
                    fontSize: 10,
                    color: RD.inkFade,
                    fontWeight: 700,
                  }}
                >
                  {Math.round(m.score * 100)}%
                </span>
              </div>
              <div
                style={{
                  fontFamily: RD.script,
                  fontSize: 11.5,
                  color: RD.ink,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
