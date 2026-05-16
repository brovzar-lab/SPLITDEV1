import { useState } from 'react';
import { RD } from '../tokens';
import type { CharacterBibleEntry } from '../api/types';

interface Props {
  open: boolean;
  onClose: () => void;
  characters: CharacterBibleEntry[];
}

export function Bible({ open, onClose, characters }: Props) {
  const [activeChar, setActiveChar] = useState<string | null>(
    characters.length > 0 ? characters[0].id : null,
  );
  const c = characters.find(ch => ch.id === activeChar) ?? characters[0] ?? null;

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

      {characters.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: '0 28px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 10,
              fontStyle: 'italic',
              fontVariant: 'small-caps',
              color: RD.inkFade,
              letterSpacing: 2,
              marginBottom: 18,
            }}
          >
            Reference for AI agents
          </div>
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ marginBottom: 16 }}
          >
            <rect x="22" y="14" width="76" height="92" fill={RD.paper} stroke={RD.line} strokeWidth="2" />
            <line x1="32" y1="14" x2="32" y2="106" stroke={RD.line} strokeWidth="1.5" />
            <rect x="40" y="34" width="50" height="22" fill="none" stroke={RD.line} strokeWidth="1" strokeDasharray="3 2" />
            <line x1="45" y1="44" x2="80" y2="44" stroke={RD.line} strokeWidth="1" />
            <line x1="45" y1="49" x2="70" y2="49" stroke={RD.line} strokeWidth="1" />
            <rect x="98" y="30" width="6" height="10" fill={RD.line} />
            <rect x="98" y="50" width="6" height="10" fill={RD.line} />
            <rect x="98" y="70" width="6" height="10" fill={RD.line} />
          </svg>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 22,
              fontStyle: 'italic',
              color: RD.ink,
              marginBottom: 12,
            }}
          >
            The bible is empty.
          </div>
          <div
            style={{
              fontFamily: RD.sans,
              fontSize: 13,
              color: RD.inkSoft,
              lineHeight: 1.5,
              maxWidth: 320,
              marginBottom: 22,
            }}
          >
            A character is added the third time the script names them.
            Press Parse to send the script through the reader.
          </div>
          <button
            onClick={() => {
              // TODO: wire to the parse pipeline
            }}
            style={{
              padding: '4px 11px',
              fontFamily: RD.display,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              background: RD.copper,
              color: RD.paper,
              border: 'none',
              borderRadius: 1,
              cursor: 'pointer',
            }}
          >
            Parse the script
          </button>
        </div>
      ) : (
        <>
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
            {characters.map(ch => (
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

          {c && (
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
                    {item.text || <em style={{ color: RD.inkFade }}>—</em>}
                  </div>
                </div>
              ))}

              {c.voice.length > 0 && (
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
              )}
            </div>
          )}

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
            The agents reference this when rewriting {c?.name}'s dialogue.
          </div>
        </>
      )}
    </div>
  );
}
