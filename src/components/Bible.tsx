import { useState } from 'react';
import { RD } from '../tokens';
import { CHARACTER_BIBLE } from '../data/characters';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Bible({ open, onClose }: Props) {
  const [activeChar, setActiveChar] = useState('sarah');
  const c =
    CHARACTER_BIBLE.find(ch => ch.id === activeChar) || CHARACTER_BIBLE[0];

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        background: RD.card,
        borderLeft: `3px double ${RD.lineDeep}`,
        boxShadow: '-8px 0 32px rgba(40,28,16,0.18)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: RD.sans,
      }}
    >
      <div
        style={{
          padding: '18px 22px',
          borderBottom: `2px double ${RD.line}`,
          background: RD.paperDeep,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 22,
              fontWeight: 600,
              fontStyle: 'italic',
              color: RD.ink,
              lineHeight: 1,
            }}
          >
            The Cast Bible
          </div>
          <div
            style={{
              fontSize: 10,
              color: RD.inkFade,
              marginTop: 4,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Reference for AI agents
          </div>
        </div>
        <span
          onClick={onClose}
          style={{
            cursor: 'pointer',
            fontSize: 22,
            color: RD.inkSoft,
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </span>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${RD.line}`,
          padding: '0 14px',
          gap: 4,
          background: RD.paperDeep,
        }}
      >
        {CHARACTER_BIBLE.map(ch => (
          <div
            key={ch.id}
            onClick={() => setActiveChar(ch.id)}
            style={{
              padding: '10px 12px',
              fontFamily: RD.display,
              fontSize: 13,
              fontWeight: 600,
              fontStyle: 'italic',
              cursor: 'pointer',
              color: activeChar === ch.id ? ch.color : RD.inkFade,
              borderBottom:
                activeChar === ch.id
                  ? `3px solid ${ch.color}`
                  : '3px solid transparent',
              marginBottom: -1,
            }}
          >
            {ch.name}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
        <div
          style={{
            textAlign: 'center',
            marginBottom: 24,
            paddingBottom: 18,
            borderBottom: `1px solid ${RD.line}`,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              margin: '0 auto 12px',
              background: `linear-gradient(135deg, ${c.color}, ${c.color}aa)`,
              color: '#fff',
              fontFamily: RD.display,
              fontSize: 30,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            {c.name[0]}
          </div>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 26,
              fontWeight: 600,
              color: RD.ink,
              letterSpacing: 1,
            }}
          >
            {c.name}
          </div>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 12,
              fontStyle: 'italic',
              color: RD.inkFade,
              marginTop: 2,
            }}
          >
            {c.age ? `${c.age} · ` : ''}
            {c.role}
            <span style={{ margin: '0 6px' }}>·</span>
            {c.appearances} scenes
          </div>
        </div>

        {[
          { label: 'Want', text: c.want },
          { label: 'Need', text: c.need },
        ].map(item => (
          <div key={item.label} style={{ marginBottom: 18 }}>
            <div
              style={{
                fontFamily: RD.display,
                fontSize: 11,
                fontStyle: 'italic',
                color: c.color,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 4,
                fontWeight: 700,
              }}
            >
              {item.label}
            </div>
            <div style={{ fontSize: 13, color: RD.ink, lineHeight: 1.55 }}>
              {item.text}
            </div>
          </div>
        ))}

        <div>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 11,
              fontStyle: 'italic',
              color: c.color,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            Voice Rules
          </div>
          {c.voice.map((v, i) => (
            <div
              key={i}
              style={{
                padding: '9px 12px',
                marginBottom: 5,
                background: RD.paperDeep,
                border: `1px solid ${RD.line}`,
                borderLeft: `3px solid ${c.color}`,
                fontFamily: RD.script,
                fontSize: 11.5,
                color: RD.ink,
                lineHeight: 1.5,
              }}
            >
              {i + 1}. {v}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: '12px 22px',
          borderTop: `1px solid ${RD.line}`,
          background: RD.paperDeep,
          fontSize: 10,
          fontStyle: 'italic',
          color: RD.inkFade,
          fontFamily: RD.display,
        }}
      >
        The agents reference this when rewriting {c.name}'s dialogue.
      </div>
    </div>
  );
}
