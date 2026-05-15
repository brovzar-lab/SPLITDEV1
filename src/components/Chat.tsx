import { useEffect, useRef, useState } from 'react';
import { RD } from '../tokens';
import { AGENTS } from '../data/agents';
import { CHARACTER_BIBLE } from '../data/characters';
import { NOTE_ORIGINS } from '../data/notes';
import { AI_RESPONSES, CHARACTER_LINES } from '../data/responses';
import type {
  ChatMessage,
  ChatTarget,
  Note,
  PatternNote,
  PinnedMessage,
} from '../types';

interface Props {
  activeNote: string;
  activeAgent: string;
  setActiveAgent: (id: string) => void;
  chatTarget: ChatTarget;
  setChatTarget: (t: ChatTarget) => void;
  notes: Note[];
  patternNotes: PatternNote[];
  openBible: () => void;
}

export function Chat({
  activeNote,
  activeAgent,
  setActiveAgent,
  chatTarget,
  setChatTarget,
  notes,
  patternNotes,
  openBible,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [typing, setTyping] = useState(false);
  const [pinned, setPinned] = useState<PinnedMessage[]>([
    {
      id: 'p1',
      text: 'Start mid-action: Sarah on a phone call, not arriving. Hook first.',
      agent: 'Dialogue',
      sceneId: 1,
      color: '#c25e1c',
    },
    {
      id: 'p2',
      text: 'Sarah deflects with dry humor when scared—lean into that voice rule.',
      agent: 'Character',
      sceneId: 7,
      color: '#3e6e3e',
    },
  ]);
  const [showPinned, setShowPinned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevNoteRef = useRef<string | null>(null);

  const allNotes: Array<Note | PatternNote> = [...notes, ...patternNotes];
  const note = allNotes.find(n => n.id === activeNote);
  const target: ChatTarget = chatTarget || { kind: 'agent', id: activeAgent };
  const agent =
    AGENTS.find(
      a => a.id === (target.kind === 'agent' ? target.id : activeAgent),
    ) || AGENTS[1];
  const character =
    target.kind === 'character'
      ? CHARACTER_BIBLE.find(c => c.id === target.id) || null
      : null;

  useEffect(() => {
    if (activeNote !== prevNoteRef.current) {
      prevNoteRef.current = activeNote;
      setMessages([]);
    }
  }, [activeNote]);

  useEffect(() => {
    setMessages([]);
  }, [target.kind, target.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const respondent = character ? character.name : `${agent.name} Agent`;
  const respondentColor = character ? character.color : agent.color;

  const previousThreads = note
    ? [
        {
          id: 'pt1',
          date: 'Yesterday',
          summary: 'Discussed pacing with Structure',
          agent: 'Structure',
          color: '#2563eb',
        },
        {
          id: 'pt2',
          date: '3 days ago',
          summary: "Sarah's voice in Scene 7",
          agent: 'Character',
          color: '#3e6e3e',
        },
      ]
    : [];

  const pinMessage = (msg: ChatMessage) => {
    const sceneId = note && 'sceneId' in note ? note.sceneId : null;
    setPinned(prev => [
      ...prev,
      {
        id: 'p' + Date.now(),
        text: msg.text,
        agent: (msg.respondent || '').replace(' Agent', ''),
        sceneId,
        color: msg.respondentColor || RD.copper,
      },
    ]);
  };
  const unpinMessage = (id: string) =>
    setPinned(prev => prev.filter(p => p.id !== id));

  const getReply = (): string => {
    if (character) {
      const pool = CHARACTER_LINES[character.id] || ['...'];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const pool = AI_RESPONSES[target.id] || AI_RESPONSES['dialogue'];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const send = () => {
    const text = inputVal.trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInputVal('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: getReply(),
          respondent,
          respondentColor,
          inCharacter: !!character,
          showApply: !character && Math.random() > 0.4,
          voiceMatch: !character ? 0.7 + Math.random() * 0.25 : null,
        },
      ]);
    }, 800 + Math.random() * 1000);
  };

  const noteOrigin =
    note && 'origin' in note
      ? NOTE_ORIGINS[note.origin] || NOTE_ORIGINS.self
      : NOTE_ORIGINS.self;

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
          padding: '12px 18px',
          borderBottom: `2px double ${RD.line}`,
          background: RD.paperDeep,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${respondentColor}, ${respondentColor}cc)`,
            color: '#fff',
            fontFamily: RD.display,
            fontSize: 18,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow:
              'inset 0 -1px 0 rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          {respondent[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 16,
              fontWeight: 600,
              color: RD.ink,
              lineHeight: 1,
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {respondent}
          </div>
          <div
            style={{
              fontSize: 10,
              color: RD.inkFade,
              marginTop: 3,
              letterSpacing: 1,
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {typing
              ? 'composing reply…'
              : character
              ? `in character · ${character.role.toLowerCase()}`
              : `${agent.desc.toLowerCase()}`}
          </div>
        </div>
        <div
          onClick={openBible}
          style={{
            padding: '5px 10px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: RD.blue,
            background: RD.blueSoft,
            border: `1px solid ${RD.blue}50`,
            borderRadius: 2,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Bible
        </div>
        <div
          onClick={() => setShowPinned(v => !v)}
          style={{
            padding: '5px 10px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: showPinned ? RD.paper : RD.gold,
            background: showPinned ? RD.gold : RD.goldSoft,
            border: `1px solid ${RD.gold}`,
            borderRadius: 2,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ★ {pinned.length}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          padding: '16px 18px',
          overflowY: 'auto',
          minHeight: 0,
          background: RD.paper,
          backgroundImage: RD.paperGrain,
        }}
      >
        {!note && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: RD.inkFade,
              fontFamily: RD.display,
              fontStyle: 'italic',
            }}
          >
            <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 10 }}>✒</div>
            <div style={{ fontSize: 14 }}>
              Select a note to begin correspondence
            </div>
          </div>
        )}

        {showPinned && (
          <div
            style={{
              padding: '12px 14px',
              background: RD.goldSoft,
              border: `1px solid ${RD.gold}40`,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: RD.display,
                fontSize: 10,
                fontStyle: 'italic',
                color: RD.gold,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 8,
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>★ Pinned Suggestions · {pinned.length}</span>
              <span
                onClick={() => setShowPinned(false)}
                style={{ cursor: 'pointer', fontSize: 11, color: RD.inkFade }}
              >
                ✕
              </span>
            </div>
            {pinned.length === 0 ? (
              <div
                style={{
                  fontSize: 11,
                  color: RD.inkFade,
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: 8,
                }}
              >
                No pinned messages yet. Pin AI responses you want to keep.
              </div>
            ) : (
              pinned.map(p => (
                <div
                  key={p.id}
                  style={{
                    padding: '8px 10px',
                    marginBottom: 6,
                    background: RD.paper,
                    borderLeft: `3px solid ${p.color}`,
                    fontSize: 11,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: RD.display,
                        fontSize: 9,
                        fontStyle: 'italic',
                        color: p.color,
                        letterSpacing: 0.5,
                        marginBottom: 2,
                      }}
                    >
                      {p.agent}
                      {p.sceneId ? ` · Sc. ${p.sceneId}` : ''}
                    </div>
                    <div style={{ color: RD.ink, lineHeight: 1.45 }}>{p.text}</div>
                  </div>
                  <span
                    onClick={() => unpinMessage(p.id)}
                    style={{
                      cursor: 'pointer',
                      fontSize: 12,
                      color: RD.inkFade,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {note && messages.length === 0 && previousThreads.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: RD.display,
                fontSize: 10,
                fontStyle: 'italic',
                color: RD.inkFade,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              Previously discussed
            </div>
            {previousThreads.map(pt => (
              <div
                key={pt.id}
                style={{
                  padding: '6px 10px',
                  marginBottom: 4,
                  background: RD.paperDeep,
                  borderLeft: `2px solid ${pt.color}`,
                  fontSize: 11,
                  color: RD.inkSoft,
                  lineHeight: 1.4,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span style={{ flex: 1 }}>
                  <span
                    style={{
                      fontFamily: RD.display,
                      fontStyle: 'italic',
                      color: pt.color,
                      fontWeight: 700,
                      marginRight: 6,
                    }}
                  >
                    {pt.agent}:
                  </span>
                  {pt.summary}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: RD.inkFade,
                    fontStyle: 'italic',
                    flexShrink: 0,
                  }}
                >
                  {pt.date}
                </span>
              </div>
            ))}
          </div>
        )}

        {note && messages.length === 0 && (
          <div
            style={{
              padding: '12px 16px 14px',
              borderLeft: `3px solid ${RD.copper}`,
              background: RD.copperSoft + '50',
              marginBottom: 18,
              position: 'relative',
            }}
          >
            <div
              style={{
                fontFamily: RD.display,
                fontStyle: 'italic',
                fontSize: 11,
                color: RD.copper,
                marginBottom: 4,
                letterSpacing: 0.5,
              }}
            >
              On the matter of:
            </div>
            <div
              style={{
                fontFamily: RD.display,
                fontSize: 17,
                fontWeight: 600,
                color: RD.ink,
                fontStyle: 'italic',
                lineHeight: 1.2,
                marginBottom: 6,
              }}
            >
              "{note.title}"
            </div>
            <div style={{ fontSize: 11.5, color: RD.inkSoft, lineHeight: 1.55 }}>
              {note.body}
            </div>
            <div
              style={{
                fontSize: 9,
                color: RD.inkFade,
                marginTop: 8,
                fontStyle: 'italic',
                textAlign: 'right',
              }}
            >
              — {noteOrigin.label}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: RD.display,
                fontSize: 11,
                fontStyle: 'italic',
                color: msg.role === 'ai' ? msg.respondentColor : RD.inkFade,
                marginBottom: 3,
                letterSpacing: 0.5,
              }}
            >
              {msg.role === 'ai' ? msg.respondent : 'You'}
              {msg.role === 'ai' && (
                <span
                  onClick={() => pinMessage(msg)}
                  title="Pin this response"
                  style={{
                    marginLeft: 10,
                    fontSize: 9,
                    color: RD.gold,
                    cursor: 'pointer',
                    fontFamily: RD.sans,
                    fontWeight: 700,
                    fontStyle: 'normal',
                    letterSpacing: 0.5,
                  }}
                >
                  ☆ PIN
                </span>
              )}
              {msg.voiceMatch && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 9,
                    fontWeight: 700,
                    fontStyle: 'normal',
                    fontFamily: RD.sans,
                    padding: '1px 6px',
                    borderRadius: 8,
                    background:
                      (msg.voiceMatch > 0.8
                        ? RD.forest
                        : msg.voiceMatch > 0.65
                        ? RD.gold
                        : RD.ruby) + '20',
                    color:
                      msg.voiceMatch > 0.8
                        ? RD.forest
                        : msg.voiceMatch > 0.65
                        ? RD.gold
                        : RD.ruby,
                    letterSpacing: 0.3,
                  }}
                >
                  voice {Math.round(msg.voiceMatch * 100)}%
                </span>
              )}
            </div>
            <div
              style={{
                padding: msg.inCharacter ? '14px 18px' : '10px 14px',
                background:
                  msg.role === 'user'
                    ? RD.paperDeep
                    : msg.inCharacter
                    ? '#fff'
                    : RD.card,
                border: `1px solid ${RD.line}`,
                borderLeft:
                  msg.role === 'ai'
                    ? `3px solid ${msg.respondentColor}`
                    : `3px solid ${RD.inkFade}`,
                borderRadius: 1,
                lineHeight: 1.55,
                fontSize: 13,
                color: RD.ink,
                fontFamily: msg.inCharacter ? RD.script : RD.sans,
                fontStyle: 'normal',
                textAlign: 'left',
              }}
            >
              {msg.inCharacter && (
                <div
                  style={{
                    fontFamily: RD.script,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    letterSpacing: 1.5,
                    marginBottom: 6,
                    color: RD.ink,
                  }}
                >
                  {(msg.respondent || '').toUpperCase()}
                </div>
              )}
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  textAlign: msg.inCharacter ? 'center' : 'left',
                  padding: msg.inCharacter ? '0 30px' : 0,
                }}
              >
                {msg.text}
              </div>

              {msg.showApply && (
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    style={{
                      padding: '5px 14px',
                      fontFamily: RD.display,
                      fontSize: 11,
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
                    Apply ▸
                  </button>
                  <button
                    style={{
                      padding: '5px 14px',
                      fontFamily: RD.display,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      background: 'transparent',
                      color: RD.inkSoft,
                      border: `1px solid ${RD.line}`,
                      borderRadius: 1,
                      cursor: 'pointer',
                    }}
                  >
                    Preview
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div
            style={{
              fontSize: 11,
              color: RD.inkFade,
              fontStyle: 'italic',
              fontFamily: RD.display,
            }}
          >
            {respondent} is writing…
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          background: RD.paperDeep,
          borderTop: `1px solid ${RD.line}`,
        }}
      >
        <div style={{ padding: '8px 14px 6px' }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: RD.inkFade,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 5,
            }}
          >
            Address your message to:
          </div>
          <div
            className="rd-no-scrollbar"
            style={{
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
            }}
          >
            {AGENTS.map(a => {
              const isActive = target.kind === 'agent' && target.id === a.id;
              return (
                <div
                  key={`a-${a.id}`}
                  onClick={() => {
                    setActiveAgent(a.id);
                    setChatTarget({ kind: 'agent', id: a.id });
                  }}
                  style={{
                    padding: '4px 10px',
                    fontFamily: RD.display,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    fontStyle: 'italic',
                    color: isActive ? RD.paper : a.color,
                    background: isActive ? a.color : RD.card,
                    border: `1px solid ${a.color}`,
                    borderRadius: 1,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {a.name}
                </div>
              );
            })}
            <div
              style={{
                width: 1,
                background: RD.line,
                margin: '0 4px',
                flexShrink: 0,
              }}
            />
            {CHARACTER_BIBLE.map(c => {
              const isActive =
                target.kind === 'character' && target.id === c.id;
              return (
                <div
                  key={`c-${c.id}`}
                  onClick={() => setChatTarget({ kind: 'character', id: c.id })}
                  style={{
                    padding: '4px 10px 4px 6px',
                    fontFamily: RD.display,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    fontStyle: 'italic',
                    color: isActive ? RD.paper : c.color,
                    background: isActive ? c.color : RD.card,
                    border: `1px solid ${c.color}`,
                    borderRadius: 1,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: isActive
                        ? 'rgba(255,255,255,0.25)'
                        : c.color,
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {c.name[0]}
                  </span>
                  {c.name}
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            padding: '8px 14px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          <textarea
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              note
                ? character
                  ? `Speak to ${character.name}…`
                  : `Compose to ${agent.name}…`
                : 'Select a note first…'
            }
            disabled={!note}
            rows={1}
            style={{
              flex: 1,
              padding: '10px 14px',
              minHeight: 38,
              maxHeight: 100,
              resize: 'none',
              border: `1px solid ${RD.line}`,
              background: RD.card,
              fontFamily: RD.script,
              fontSize: 13,
              color: RD.ink,
              outline: 'none',
              borderRadius: 1,
              boxShadow: 'inset 0 1px 2px rgba(60,40,20,0.04)',
            }}
          />
          <button
            onClick={send}
            disabled={!inputVal.trim() || !note}
            style={{
              padding: '10px 18px',
              fontFamily: RD.display,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              background: inputVal.trim() && note ? RD.copper : RD.lineDeep,
              color: RD.paper,
              border: 'none',
              borderRadius: 1,
              cursor: inputVal.trim() && note ? 'pointer' : 'default',
            }}
          >
            Send ▸
          </button>
        </div>
      </div>
    </div>
  );
}
