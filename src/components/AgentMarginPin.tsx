import { useState } from 'react';
import { RD } from '../tokens';
import { AGENTS } from '../data/agents';
import type { AgentReply } from '../types';

interface Props {
  reply: AgentReply;
  onBackToChat: () => void;
}

export function AgentMarginPin({ reply, onBackToChat }: Props) {
  const [hover, setHover] = useState(false);
  const agent = AGENTS.find(a => a.id === reply.agentId);
  if (!agent) return null;

  const rotation = -1.5;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <div
        aria-label={`${agent.name} reply`}
        title={`${agent.name} reply pinned to scene`}
        style={{
          width: 14,
          height: 14,
          background: agent.color,
          color: RD.paper,
          fontFamily: RD.display,
          fontSize: 9,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(60,40,20,0.18)',
          transform: `rotate(${rotation}deg)`,
          cursor: 'help',
          lineHeight: 1,
        }}
      >
        {agent.name[0]}
      </div>

      {hover && (
        <div
          style={{
            position: 'absolute',
            right: 22,
            top: -6,
            width: 280,
            background: RD.card,
            border: `1px solid ${agent.color}`,
            borderLeft: `4px solid ${agent.color}`,
            boxShadow: '0 10px 28px rgba(40,28,16,0.22)',
            padding: '10px 12px 12px',
            zIndex: 50,
            fontFamily: RD.sans,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: RD.display,
                fontSize: 12,
                fontStyle: 'italic',
                color: agent.color,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              {agent.name}
            </span>
            <span
              style={{
                fontFamily: RD.display,
                fontSize: 9,
                fontStyle: 'italic',
                color: RD.inkFade,
                letterSpacing: 0.5,
              }}
            >
              {relativeTime(reply.createdAt)}
            </span>
          </div>

          {reply.prompt && (
            <div
              style={{
                fontFamily: RD.script,
                fontSize: 10.5,
                color: RD.inkFade,
                fontStyle: 'italic',
                marginBottom: 6,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              "{reply.prompt}"
            </div>
          )}

          <div
            style={{
              fontSize: 13,
              color: RD.ink,
              lineHeight: 1.55,
              maxHeight: 200,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {reply.body}
          </div>

          <div
            onClick={onBackToChat}
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: `1px dashed ${RD.line}`,
              fontFamily: RD.display,
              fontSize: 11,
              fontStyle: 'italic',
              color: RD.copper,
              cursor: 'pointer',
              letterSpacing: 0.3,
            }}
          >
            ← back to chat
          </div>
        </div>
      )}
    </div>
  );
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}
