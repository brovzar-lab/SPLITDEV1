import { RD } from '../tokens';
import type { RevisionEntry } from '../api/types';

interface Props {
  revisions: RevisionEntry[];
}

export function History({ revisions }: Props) {
  return (
    <div
      style={{
        padding: '8px 22px',
        background: RD.ink,
        color: RD.paper,
        borderTop: `2px solid ${RD.copper}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: RD.sans,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: RD.display,
          fontSize: 10,
          fontStyle: 'italic',
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: RD.copperSoft,
          flexShrink: 0,
        }}
      >
        Editor's log
      </span>
      <div
        className="rd-no-scrollbar"
        style={{
          display: 'flex',
          gap: 5,
          flex: 1,
          overflowX: 'auto',
        }}
      >
        {revisions.length === 0 ? (
          <span
            style={{
              fontSize: 10,
              color: RD.copperSoft,
              fontStyle: 'italic',
              fontFamily: RD.display,
              opacity: 0.6,
            }}
          >
            No history yet
          </span>
        ) : (
          revisions.map(h => {
            const c =
              h.action === 'Accepted'
                ? RD.forest
                : h.action === 'Rejected'
                ? RD.ruby
                : RD.gold;
            return (
              <div
                key={h.id}
                style={{
                  padding: '3px 9px',
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  background: c + '25',
                  color: c,
                  border: `1px solid ${c}50`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: RD.display,
                    fontStyle: 'italic',
                  }}
                >
                  {h.action}
                </span>
                <span style={{ opacity: 0.85 }}>{h.target}</span>
              </div>
            );
          })
        )}
      </div>
      <span
        style={{
          fontSize: 10,
          color: RD.copperSoft,
          cursor: 'pointer',
          fontFamily: RD.display,
          fontStyle: 'italic',
          letterSpacing: 1,
        }}
      >
        ↶ Undo
      </span>
    </div>
  );
}
