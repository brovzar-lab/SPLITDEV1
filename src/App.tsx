import { useRef, useState } from 'react';
import { RD } from './tokens';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Screenplay } from './components/Screenplay';
import { Notes } from './components/Notes';
import { Chat } from './components/Chat';
import { Bible } from './components/Bible';
import { History } from './components/History';
import { Divider } from './components/Divider';
import { SCENES, SCREENPLAY } from './data/screenplay';
import { NOTES_V2, PATTERN_NOTES } from './data/notes';
import type {
  ChatTarget,
  LineChangeStatus,
  Note,
  PatternNote,
} from './types';

const allNotes: Array<Note | PatternNote> = [...NOTES_V2, ...PATTERN_NOTES];

function getNoteScenes(note: Note | PatternNote | undefined): number[] {
  if (!note) return [];
  if ('scenes' in note && note.scenes && note.scenes.length) return note.scenes;
  if ('instances' in note && note.instances && note.instances.length) {
    return note.instances.map(i => i.sceneId);
  }
  if ('sceneId' in note && note.sceneId) return [note.sceneId];
  return [];
}

export default function App() {
  const [activeScene, setActiveScene] = useState(1);
  const [activeNote, setActiveNote] = useState('n1');
  const [activeAgent, setActiveAgent] = useState('dialogue');
  const [chatTarget, setChatTarget] = useState<ChatTarget>({
    kind: 'agent',
    id: 'dialogue',
  });
  const [changes, setChanges] = useState<Record<string, LineChangeStatus>>({});
  const [sidebarW, setSidebarW] = useState(230);
  const [middleW, setMiddleW] = useState(380);
  const [notesSplit, setNotesSplit] = useState(0.48);
  const [revisionColor, setRevisionColor] = useState('blue');
  const [viewMode, setViewMode] = useState<'script' | 'cards'>('script');
  const [characterFilter, setCharacterFilter] = useState<string | null>(null);
  const [bibleOpen, setBibleOpen] = useState(false);

  const middleRef = useRef<HTMLDivElement>(null);

  const handleNoteSelect = (id: string) => {
    setActiveNote(id);
    const n = allNotes.find(x => x.id === id);
    const scenes = getNoteScenes(n);
    if (scenes.length) setActiveScene(scenes[0]);
  };

  const activeNoteData = allNotes.find(n => n.id === activeNote);
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

  // Page math
  const totalLines = SCREENPLAY.reduce((sum, s) => sum + s.lines.length + 3, 0);
  const totalPages = Math.max(1, Math.ceil(totalLines / 55));
  const activeIdx = SCREENPLAY.findIndex(s => s.sceneId === activeScene);
  const currentPage = Math.max(
    1,
    Math.ceil(
      activeIdx > 0
        ? SCREENPLAY.slice(0, activeIdx).reduce(
            (sum, s) => sum + s.lines.length + 3,
            0,
          ) / 55
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
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ width: sidebarW, flexShrink: 0, overflow: 'hidden' }}>
          <Sidebar
            activeScene={activeScene}
            setActiveScene={setActiveScene}
            scenes={SCENES}
            notes={NOTES_V2}
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
            activeScene={activeScene}
            linkedScenes={linkedScenes}
            changes={changes}
            setChanges={setChanges}
            screenplay={SCREENPLAY}
            viewMode={viewMode}
            characterFilter={characterFilter}
            revisionColor={revisionColor}
            onLineAction={handleLineAction}
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
              notes={NOTES_V2}
              patternNotes={PATTERN_NOTES}
              activeNote={activeNote}
              setActiveNote={handleNoteSelect}
              activeScene={activeScene}
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
              notes={NOTES_V2}
              patternNotes={PATTERN_NOTES}
              openBible={() => setBibleOpen(true)}
            />
          </div>
        </div>
      </div>

      <History />
      <Bible open={bibleOpen} onClose={() => setBibleOpen(false)} />
    </div>
  );
}
