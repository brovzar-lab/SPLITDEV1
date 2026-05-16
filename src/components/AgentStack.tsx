import type { CSSProperties } from 'react';
import { RD } from '../tokens';
import { AGENTS } from '../data/agents';
import type { Agent, AgentReply } from '../types';

interface Props {
  activeAgentId: string;
  onPickAgent: (id: string) => void;
  streamingAgentId: string | null;
  streamingText: string;
  streamingPrompt: string;
  repliesByAgent: Map<string, AgentReply>;
  onStop: () => void;
  onGraduate: (replyId: string) => void;
}

export function AgentStack({
  activeAgentId,
  onPickAgent,
  streamingAgentId,
  streamingText,
  streamingPrompt,
  repliesByAgent,
  onStop,
  onGraduate,
}: Props) {
  return (
    <div
      style={{
        padding: '14px 14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {AGENTS.map(agent => {
        const isStreaming = streamingAgentId === agent.id;
        const reply = repliesByAgent.get(agent.id);
        const isActive = activeAgentId === agent.id;
        const inFlight = isStreaming;
        const isDone = !inFlight && reply && reply.status === 'done';

        if (inFlight || isDone) {
          return (
            <ExpandedCard
              key={agent.id}
              agent={agent}
              isActive={isActive}
              isStreaming={isStreaming}
              prompt={isStreaming ? streamingPrompt : reply!.prompt}
              body={isStreaming ? streamingText : reply!.body}
              onStop={onStop}
              onGraduate={isDone ? () => onGraduate(reply!.id) : undefined}
              onSelect={() => onPickAgent(agent.id)}
            />
          );
        }

        return (
          <RestCard
            key={agent.id}
            agent={agent}
            isActive={isActive}
            onSelect={() => onPickAgent(agent.id)}
          />
        );
      })}
    </div>
  );
}

function RestCard({
  agent,
  isActive,
  onSelect,
}: {
  agent: Agent;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
        height: 36,
        background: isActive ? RD.card : 'transparent',
        border: `1px solid ${isActive ? agent.color + '60' : 'transparent'}`,
        borderLeft: isActive ? `3px solid ${agent.color}` : '3px solid transparent',
        cursor: 'pointer',
        transition: 'background 120ms, border-color 120ms',
        borderRadius: 1,
      }}
      onMouseEnter={e => {
        if (!isActive) e.currentTarget.style.background = `${RD.card}80`;
      }}
      onMouseLeave={e => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Sigil agent={agent} size={24} />
      <div
        style={{
          fontFamily: RD.display,
          fontSize: 15,
          fontStyle: 'italic',
          color: RD.ink,
          fontWeight: 600,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {agent.name}
      </div>
      <div
        style={{
          fontFamily: RD.sans,
          fontSize: 8.5,
          color: RD.inkFade,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          fontWeight: 700,
          textAlign: 'right',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 160,
        }}
      >
        {agent.desc}
      </div>
    </div>
  );
}

function ExpandedCard({
  agent,
  isActive,
  isStreaming,
  prompt,
  body,
  onStop,
  onGraduate,
  onSelect,
}: {
  agent: Agent;
  isActive: boolean;
  isStreaming: boolean;
  prompt: string;
  body: string;
  onStop: () => void;
  onGraduate?: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: RD.card,
        border: `1px solid ${agent.color}50`,
        borderLeft: `3px solid ${agent.color}`,
        borderRadius: 1,
        padding: '10px 14px 12px',
        boxShadow: isActive ? '0 2px 10px rgba(40,28,16,0.08)' : 'none',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <Sigil agent={agent} size={24} />
        <div
          style={{
            fontFamily: RD.display,
            fontSize: 15,
            fontStyle: 'italic',
            color: RD.ink,
            fontWeight: 600,
            flex: 1,
          }}
        >
          {agent.name}
        </div>
        {isStreaming && (
          <button
            onClick={e => {
              e.stopPropagation();
              onStop();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 6px',
              fontFamily: RD.sans,
              fontSize: 10,
              fontWeight: 700,
              color: RD.ruby,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        )}
        {onGraduate && (
          <button
            onClick={e => {
              e.stopPropagation();
              onGraduate();
            }}
            title="Graduate to gutter"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 8px',
              fontFamily: RD.display,
              fontSize: 16,
              color: RD.copper,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            →
          </button>
        )}
      </div>

      {prompt && (
        <div
          style={{
            fontFamily: RD.display,
            fontStyle: 'italic',
            fontSize: 12,
            color: RD.inkFade,
            lineHeight: 1.4,
            marginBottom: 8,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as CSSProperties['WebkitBoxOrient'],
            overflow: 'hidden',
          }}
        >
          "{prompt}"
        </div>
      )}

      {isStreaming && !body && <ComposingDots color={agent.color} />}

      {body && (
        <div
          style={{
            fontFamily: RD.sans,
            fontSize: 13,
            color: RD.ink,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
}

function Sigil({ agent, size }: { agent: Agent; size: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: agent.color,
        color: RD.paper,
        fontFamily: RD.display,
        fontSize: size * 0.46,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow:
          'inset 0 -1px 0 rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.1)',
      }}
    >
      {agent.name[0]}
    </div>
  );
}

function ComposingDots({ color }: { color: string }) {
  return (
    <div
      aria-label="composing"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 0 2px',
      }}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: color,
            animation: 'pulse 1.2s infinite',
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  );
}
