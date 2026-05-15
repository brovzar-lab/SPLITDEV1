import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RD } from '../tokens';
import { TopBar } from '../components/TopBar';
import { Sidebar } from '../components/Sidebar';
import { Screenplay } from '../components/Screenplay';
import { Notes } from '../components/Notes';
import { Chat } from '../components/Chat';
import { Bible } from '../components/Bible';
import { History } from '../components/History';
import { Divider } from '../components/Divider';
import { useScreenplay } from '../hooks/useScreenplay';
import type { ChatTarget } from '../types';

function getNoteScenes(note: { scenes?: string[] } | undefined): string[] {
  if (!note) return [];
  return note.scenes || [];
}

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useScreenplay(id);

  const [activeScene, setActiveScene] = useState<string>('');
  const [activeNote, setActiveNote] = useState('');
  const [activeAgent, setActiveAgent] = useState('dialogue');
  const [chatTarget, setChatTarget] = useState<ChatTarget>({
    kind: 'agent',
    id: 'dialogue',
  });
  const [sidebarW, setSidebarW] = useState(230);
  const [middleW, setMiddleW] = useState(380);
  const [notesSplit, setNotesSplit] = useState(0.48);
  const [revisionColor, setRevisionColor] = useState('blue');
  const [viewMode, setViewMode] = useState<'script' | 'cards'>('script');
  const [characterFilter, setCharacterFilter] = useState<string | null>(null);
  const [bibleOpen, setBibleOpen] = useState(false);

  const middleRef = useRef<HTMLDivElement>(null);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          fontFamily: RD.display,
          fontStyle: 'italic',
          color: RD.inkFade,
          fontSize: 18,
          background: RD.paper,
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.2 }}>✒</div>
        <div>Loading screenplay…</div>
      </div>
    );
  }

  // ── Error / not found state ────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          fontFamily: RD.display,
          fontStyle: 'italic',
          color: RD.inkFade,
          fontSize: 16,
          background: RD.paper,
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.2 }}>✗</div>
        <div>Could not load screenplay</div>
        {error && (
          <div style={{ fontSize: 12, fontFamily: RD.sans, fontStyle: 'normal', color: RD.ruby }}>
            {error}
          </div>
        )}
        <a
          href="/"
          style={{
            marginTop: 8,
            fontSize: 12,
            color: RD.copper,
            fontFamily: RD.sans,
            fontStyle: 'normal',
          }}
        >
          ← Back to library
        </a>
      </div>
    );
  }

  const { screenplay, scenes, notes, characterBible, beats } = data;

  // Set default active scene to first scene on first load
  const effectiveActiveScene =
    activeScene || (scenes.length > 0 ? scenes[0].id : '');

  const handleNoteSelect = (noteId: string) => {
    setActiveNote(noteId);
    const n = notes.find(x => x.id === noteId);
    const linkedSceneIds = getNoteScenes(n);
    if (linkedSceneIds.length) setActiveScene(linkedSceneIds[0]);
  };

  const activeNoteData = notes.find(n => n.id === activeNote);
  const linkedScenes = getNoteScenes(activeNoteData);

  const handleLineAction = (action: string) => {
    if (action === 'ask-dialogue') {
      setActiveAgent('dialogue');
      setChatTarget({ kind: 'agent', id: 'dialogue' });
    } else if (action === 'ask-structure') {
      setActiveAgent('structure');
      setChatTarget({ kind: 'agent', id: 'structure' });
    } else if (action === 'ask-character') {
      setActiveAgent('character');
      setChatTarget({ kind: 'agent', id: 'character' });
    }
  };

  // Page math — approximate using line counts
  const linesPerPage = 55;
  const totalLines = scenes.reduce((sum, s) => sum + s.lines.length + 3, 0);
  const totalPages = Math.max(1, Math.ceil(totalLines / linesPerPage));
  const activeIdx = scenes.findIndex(s => s.id === effectiveActiveScene);
  const currentPage = Math.max(
    1,
    Math.ceil(
      activeIdx > 0
        ? scenes.slice(0, activeIdx).reduce(
            (sum, s) => sum + s.lines.length + 3,
            0,
          ) / linesPerPage
        : 0,
    ) + 1,
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: RD.sans,
        background: RD.paper,
        overflow: 'hidden',
      }}
    >
      <TopBar
        revisionColor={revisionColor}
        setRevisionColor={setRevisionColor}
        viewMode={viewMode}
        setViewMode={setViewMode}
        characterFilter={characterFilter}
        setCharacterFilter={setCharacterFilter}
        pageCount={currentPage}
        totalPages={totalPages}
        title={screenplay.title}
        author={screenplay.author}
        sceneCount={scenes.length}
        characters={characterBible}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ width: sidebarW, flexShrink: 0, overflow: 'hidden' }}>
          <Sidebar
            activeScene={effectiveActiveScene}
            setActiveScene={setActiveScene}
            scenes={scenes}
            beats={beats}
            notes={notes}
          />
        </div>
        <Divider
          direction="vertical"
          onResize={d =>
            setSidebarW(prev => Math.max(180, Math.min(340, prev + d)))
          }
        />

        <div style={{ flex: 1, minWidth: 200, overflow: 'hidden' }}>
          <Screenplay
            activeScene={effectiveActiveScene}
            linkedScenes={linkedScenes}
            screenplay={scenes}
            viewMode={viewMode}
            characterFilter={characterFilter}
            revisionColor={revisionColor}
            onLineAction={handleLineAction}
            title={screenplay.title}
            author={screenplay.author ?? undefined}
          />
        </div>
        <Divider
          direction="vertical"
          onResize={d =>
            setMiddleW(prev => Math.max(300, Math.min(560, prev - d)))
          }
        />

        <div
          ref={middleRef}
          style={{
            width: middleW,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: notesSplit, minHeight: 100, overflow: 'hidden' }}>
            <Notes
              notes={notes}
              patternNotes={[]}
              activeNote={activeNote}
              setActiveNote={handleNoteSelect}
              activeScene={effectiveActiveScene}
            />
          </div>
          <Divider
            direction="horizontal"
            onResize={d => {
              if (middleRef.current) {
                const h = middleRef.current.offsetHeight;
                setNotesSplit(prev =>
                  Math.max(0.25, Math.min(0.75, prev + d / h)),
                );
              }
            }}
          />
          <div
            style={{ flex: 1 - notesSplit, minHeight: 100, overflow: 'hidden' }}
          >
            <Chat
              activeNote={activeNote}
              activeAgent={activeAgent}
              setActiveAgent={setActiveAgent}
              chatTarget={chatTarget}
              setChatTarget={setChatTarget}
              notes={notes}
              patternNotes={[]}
              characters={characterBible}
              openBible={() => setBibleOpen(true)}
            />
          </div>
        </div>
      </div>

      <History revisions={[]} />
      <Bible
        open={bibleOpen}
        onClose={() => setBibleOpen(false)}
        characters={characterBible}
      />
    </div>
  );
}
