import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RD } from '../tokens';
import { REVISION_COLORS } from '../data/revisions';
import type { CharacterBibleEntry } from '../api/types';
import { SaveIndicator } from './Editor/SaveIndicator';
import type { SaveStatus } from '../hooks/useAutosave';
import { api } from '../api/client';

interface TopBarProps {
  screenplayId: string;
  revisionColor: string;
  setRevisionColor: (id: string) => void;
  viewMode: 'script' | 'cards';
  setViewMode: (m: 'script' | 'cards') => void;
  characterFilter: string | null;
  setCharacterFilter: (c: string | null) => void;
  pageCount: number;
  totalPages: number;
  title?: string;
  author?: string | null;
  sceneCount?: number;
  characters: CharacterBibleEntry[];
  saveStatus: SaveStatus;
}

export function TopBar({
  screenplayId,
  revisionColor,
  setRevisionColor,
  viewMode,
  setViewMode,
  pageCount,
  totalPages,
  title,
  author,
  sceneCount,
  characters,
  saveStatus,
}: TopBarProps) {
  const [showRev, setShowRev] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const currentRev =
    REVISION_COLORS.find(r => r.id === revisionColor) || REVISION_COLORS[0];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: RD.ink,
        color: RD.paper,
        borderBottom: `3px solid ${RD.copper}`,
        position: 'relative',
        flexShrink: 0,
        fontFamily: RD.sans,
      }}
    >
      {/* Clapboard stripes — left */}
      <div
        style={{
          width: 40,
          flexShrink: 0,
          backgroundImage: `repeating-linear-gradient(135deg, ${RD.paper} 0 10px, ${RD.ink} 10px 20px)`,
          opacity: 0.85,
        }}
      />

      {/* Logo block with back link */}
      <div
        style={{
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderRight: `1px solid rgba(244,237,224,0.15)`,
        }}
      >
        {/* Back to Library */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: 'rgba(244,237,224,0.5)',
            textDecoration: 'none',
            borderRadius: 2,
            border: '1px solid rgba(244,237,224,0.15)',
            transition: 'color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = RD.copperSoft)}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(244,237,224,0.5)')}
        >
          ← Lib
        </Link>

        <div>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 1,
              lineHeight: 1,
              color: RD.paper,
              fontStyle: 'italic',
            }}
          >
            Splitdev
          </div>
          <div
            style={{
              fontSize: 9,
              color: RD.copperSoft,
              marginTop: 2,
              letterSpacing: 3,
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Writers Atelier
          </div>
        </div>
      </div>

      {/* Project banner */}
      <div
        style={{
          flex: 1,
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 22,
              fontWeight: 600,
              color: RD.paper,
              lineHeight: 1,
              letterSpacing: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title || 'Untitled'}
          </div>
          <div
            style={{
              fontFamily: RD.sans,
              fontSize: 10,
              marginTop: 3,
              color: 'rgba(244,237,224,0.6)',
              letterSpacing: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {author && (
              <>
                <em style={{ fontFamily: RD.display, fontStyle: 'italic' }}>
                  a screenplay by
                </em>{' '}
                {author}
                <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
              </>
            )}
            {sceneCount !== undefined && `${sceneCount} scene${sceneCount !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Revision draft stamp */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowRev(v => !v)}
              style={{
                padding: '4px 10px 4px 8px',
                cursor: 'pointer',
                border: `1.5px solid ${currentRev.border}`,
                background: `${currentRev.bg}25`,
                color: currentRev.bg,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transform: 'rotate(-1.5deg)',
                borderRadius: 2,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: currentRev.border,
                }}
              />
              {currentRev.name.replace(' Revision', '').replace(' Draft', '')} Draft
            </div>
            {showRev && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  marginTop: 4,
                  background: RD.card,
                  border: `1px solid ${RD.line}`,
                  borderRadius: 4,
                  boxShadow: RD.shadowDeep,
                  padding: 6,
                  zIndex: 30,
                  minWidth: 200,
                  fontFamily: RD.sans,
                }}
              >
                {REVISION_COLORS.map(r => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setRevisionColor(r.id);
                      setShowRev(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 8px',
                      cursor: 'pointer',
                      borderRadius: 3,
                      color: RD.ink,
                      fontSize: 11,
                      fontWeight: r.id === revisionColor ? 700 : 500,
                      background:
                        r.id === revisionColor ? RD.copperSoft : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        background: r.bg,
                        border: `1.5px solid ${r.border}`,
                      }}
                    />
                    {r.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Page counter */}
          <div
            style={{
              padding: '4px 10px',
              fontFamily: RD.script,
              fontSize: 11,
              fontWeight: 700,
              color: RD.paper,
              border: `1px solid rgba(244,237,224,0.25)`,
              borderRadius: 3,
              letterSpacing: 1,
            }}
          >
            p. {pageCount} <span style={{ opacity: 0.4 }}>/ {totalPages}</span>
          </div>

          {/* Save indicator */}
          <SaveIndicator status={saveStatus} />

          {/* View ribbon */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              alignItems: 'stretch',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            {(['script', 'cards'] as const).map((id, i) => (
              <div
                key={id}
                onClick={() => setViewMode(id)}
                style={{
                  padding: '5px 12px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background:
                    viewMode === id ? RD.copper : 'rgba(244,237,224,0.08)',
                  color:
                    viewMode === id ? RD.paper : 'rgba(244,237,224,0.6)',
                  borderRight:
                    i === 0 ? `1px solid rgba(244,237,224,0.15)` : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {id === 'script' ? 'Script' : 'Cards'}
              </div>
            ))}
          </div>

          <VoiceCast characters={characters} />

          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setExportOpen(o => !o)}
              style={{
                padding: '5px 12px', fontSize: 10, fontWeight: 700,
                letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer',
                background: exportOpen ? RD.copper : 'rgba(244,237,224,0.08)',
                color: exportOpen ? RD.paper : 'rgba(244,237,224,0.6)',
                borderRadius: 3,
              }}
            >
              Export ▾
            </div>
            {exportOpen && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, marginTop: 6,
                background: RD.card, border: `1px solid ${RD.line}`,
                boxShadow: RD.shadowDeep, padding: 6, zIndex: 30, minWidth: 200,
                fontFamily: RD.sans, borderRadius: 4,
              }}>
                {(['fountain', 'fdx'] as const).map(fmt => (
                  <a
                    key={fmt}
                    href={api.exportUrl(screenplayId, fmt)}
                    onClick={() => setExportOpen(false)}
                    style={{
                      display: 'block', padding: '6px 10px', cursor: 'pointer',
                      color: RD.ink, fontSize: 11.5, textDecoration: 'none', borderRadius: 2,
                    }}
                  >
                    {fmt === 'fountain' ? 'Fountain (.fountain)' : 'Final Draft (.fdx)'}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clapboard stripes — right */}
      <div
        style={{
          width: 40,
          flexShrink: 0,
          backgroundImage: `repeating-linear-gradient(135deg, ${RD.paper} 0 10px, ${RD.ink} 10px 20px)`,
          opacity: 0.85,
        }}
      />
    </div>
  );
}

function VoiceCast({ characters }: { characters: CharacterBibleEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '5px 12px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          cursor: 'pointer',
          background: open ? RD.gold : 'rgba(244,237,224,0.08)',
          color: open ? RD.ink : 'rgba(244,237,224,0.6)',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span style={{ fontSize: 11 }}>♪</span>
        Cast
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            marginTop: 6,
            width: 280,
            background: RD.card,
            border: `1px solid ${RD.line}`,
            boxShadow: RD.shadowDeep,
            padding: 14,
            zIndex: 30,
            fontFamily: RD.sans,
            borderRadius: 4,
          }}
        >
          <div
            style={{
              fontFamily: RD.display,
              fontSize: 18,
              fontWeight: 600,
              color: RD.ink,
              marginBottom: 2,
              fontStyle: 'italic',
            }}
          >
            The Cast
          </div>
          <div
            style={{
              fontSize: 10,
              color: RD.inkFade,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Assign voices for read-aloud
          </div>
          {characters.length === 0 ? (
            <div
              style={{
                fontSize: 11,
                color: RD.inkFade,
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '12px 0',
              }}
            >
              No characters yet
            </div>
          ) : (
            characters.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 0',
                  borderBottom: `1px solid ${RD.line}`,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: c.color,
                    color: '#fff',
                    fontFamily: RD.display,
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {c.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: RD.ink,
                      fontFamily: RD.display,
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: RD.inkFade,
                      letterSpacing: 0.5,
                    }}
                  >
                    {c.role}
                  </div>
                </div>
                <select
                  style={{
                    fontSize: 10,
                    fontFamily: RD.sans,
                    padding: '3px 6px',
                    border: `1px solid ${RD.line}`,
                    borderRadius: 3,
                    background: RD.paper,
                    color: RD.ink,
                    cursor: 'pointer',
                  }}
                >
                  <option>Aria</option>
                  <option>Brian</option>
                  <option>Maya</option>
                  <option>Cole</option>
                  <option>Whisper</option>
                </select>
              </div>
            ))
          )}
          <button
            style={{
              width: '100%',
              marginTop: 12,
              padding: '10px',
              background: RD.copper,
              color: RD.paper,
              border: 'none',
              borderRadius: 3,
              fontFamily: RD.display,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            ▶ Read Scene Aloud
          </button>
        </div>
      )}
    </div>
  );
}
