import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RD } from '../tokens';
import { TopBar } from '../components/TopBar';
import { Sidebar } from '../components/Sidebar';
import { TimelineRibbon } from '../components/TimelineRibbon';
import { OutlineDrawer } from '../components/OutlineDrawer';
import { Screenplay } from '../components/Screenplay';
import { Notes } from '../components/Notes';
import { Chat } from '../components/Chat';
import { Bible } from '../components/Bible';
import { History } from '../components/History';
import { Divider } from '../components/Divider';
import { useScreenplay } from '../hooks/useScreenplay';
import { useAutosave, type SaveStatus } from '../hooks/useAutosave';
import { useSessionOpener } from '../hooks/useSessionOpener';
import { useTriageStatus } from '../hooks/useTriageStatus';
import { api } from '../api/client';
import type { Line, Note, Scene } from '../api/types';
import type { AgentReply, ChatTarget, LineMenuContext } from '../types';
import { REVISION_COLORS } from '../data/revisions';
import { Toast, type ToastTone } from '../components/Toast';
import { FindSimilarDrawer } from '../components/FindSimilarDrawer';

function getNoteScenes(note: { scenes?: string[] } | undefined): string[] {
  if (!note) return [];
  return note.scenes || [];
}

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const { data, setData, loading, error } = useScreenplay(id);
  const { greeting, history } = useSessionOpener(id ?? null);
  const triage = useTriageStatus(id ?? null);

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
  const [outlineOpen, setOutlineOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('splitdev.outline.open') === '1';
    } catch {
      return false;
    }
  });
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);
  const [revisionTaggedLineIds, setRevisionTaggedLineIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [findSimilarCtx, setFindSimilarCtx] = useState<LineMenuContext | null>(null);
  const [highlightLineId, setHighlightLineId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: ToastTone } | null>(null);
  const showToast = (text: string, tone: ToastTone = 'info') =>
    setToast({ text, tone });

  // T2.2 — agent replies: streaming/done lives in chat cards, graduated
  // lives as a gutter pin on the script. 4s after a reply lands as 'done',
  // it auto-graduates unless the user keeps it in the card.
  const [agentReplies, setAgentReplies] = useState<AgentReply[]>([]);
  const graduateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearGraduateTimer = (id: string) => {
    const t = graduateTimers.current.get(id);
    if (t) {
      clearTimeout(t);
      graduateTimers.current.delete(id);
    }
  };

  useEffect(() => () => {
    graduateTimers.current.forEach(t => clearTimeout(t));
    graduateTimers.current.clear();
  }, []);

  // T3.1 — ⌘O / Ctrl+O toggles the outline drawer; persist across reloads.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdO = (e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O');
      if (!isCmdO) return;
      // Don't hijack browser "Open file" inside an input/contenteditable.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      setOutlineOpen(prev => {
        const next = !prev;
        try { localStorage.setItem('splitdev.outline.open', next ? '1' : '0'); } catch {}
        return next;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleAgentReplyDone = (input: {
    agentId: string;
    sceneId: string;
    prompt: string;
    body: string;
  }) => {
    const id = `ar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const reply: AgentReply = {
      id,
      agentId: input.agentId,
      sceneId: input.sceneId,
      prompt: input.prompt,
      body: input.body,
      status: 'done',
      createdAt: Date.now(),
    };
    setAgentReplies(prev => {
      // Cap at most one 'done' per agent in the chat panel — earlier dones
      // graduate immediately so the card stack stays clean.
      const next = prev.map(r =>
        r.agentId === input.agentId && r.status === 'done'
          ? { ...r, status: 'graduated' as const }
          : r,
      );
      return [...next, reply];
    });
    const timer = setTimeout(() => {
      setAgentReplies(prev =>
        prev.map(r => (r.id === id ? { ...r, status: 'graduated' as const } : r)),
      );
      graduateTimers.current.delete(id);
    }, 4000);
    graduateTimers.current.set(id, timer);
  };

  const handleAgentReplyGraduate = (replyId: string) => {
    clearGraduateTimer(replyId);
    setAgentReplies(prev =>
      prev.map(r => (r.id === replyId ? { ...r, status: 'graduated' as const } : r)),
    );
  };

  const handleAgentReplyBackToChat = (replyId: string) => {
    clearGraduateTimer(replyId);
    setAgentReplies(prev =>
      prev.map(r =>
        r.id === replyId
          ? { ...r, status: 'done' as const, createdAt: Date.now() }
          : r.agentId ===
            prev.find(x => x.id === replyId)?.agentId &&
            r.status === 'done'
          ? { ...r, status: 'graduated' as const }
          : r,
      ),
    );
  };

  const graduatedReplies = agentReplies.filter(r => r.status === 'graduated');

  const lineSave = useAutosave<{ id: string; patch: Partial<Line> }>(
    ({ id, patch }) => api.patchLine(id, patch),
    { getKey: ({ id }) => `line:${id}` },
  );
  const sceneSave = useAutosave<{ id: string; patch: Partial<Scene> }>(
    ({ id, patch }) => api.patchScene(id, patch),
    { getKey: ({ id }) => `scene:${id}` },
  );

  const onLineEdit = (id: string, patch: Partial<Line>) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.map(s => ({
          ...s,
          lines: s.lines.map(l => (l.id === id ? { ...l, ...patch } : l)),
        })),
      };
    });
    lineSave.trigger({ id, patch });
  };

  const onSceneEdit = (id: string, patch: Partial<Scene>) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.map(s => (s.id === id ? { ...s, ...patch } : s)),
      };
    });
    sceneSave.trigger({ id, patch });
  };

  const saveStatus: SaveStatus =
    [lineSave.status, sceneSave.status].includes('error') ? 'error' :
    [lineSave.status, sceneSave.status].includes('pending') ? 'pending' :
    [lineSave.status, sceneSave.status].includes('saved') ? 'saved' : 'idle';

  const prevTriageStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!id) return;
    if (triage.status === 'done' && prevTriageStatus.current !== 'done') {
      // Refetch screenplay to pull the new triage-generated notes
      api.getScreenplay(id).then(d => setData(d)).catch(() => {});
    }
    prevTriageStatus.current = triage.status;
  }, [triage.status, id]);

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

  const handleLineAction = (action: string, ctx: LineMenuContext) => {
    if (!data) return;

    if (action.startsWith('ask-')) {
      const agentId = action.slice(4);
      setActiveAgent(agentId);
      setChatTarget({ kind: 'agent', id: agentId });
      return;
    }

    if (action === 'rewrite') {
      setActiveAgent('dialogue');
      setChatTarget({ kind: 'agent', id: 'dialogue' });
      setPendingChatMessage(`Rewrite this line: "${ctx.text}"`);
      return;
    }

    if (action === 'compress-expand') {
      const mode = ctx.text.length > 80 ? 'shorter' : 'longer';
      setActiveAgent('dialogue');
      setChatTarget({ kind: 'agent', id: 'dialogue' });
      setPendingChatMessage(`Make this ${mode}: "${ctx.text}"`);
      return;
    }

    if (action === 'find-similar') {
      if (!ctx.text.trim()) {
        showToast('Select some text first', 'error');
        return;
      }
      setFindSimilarCtx(ctx);
      return;
    }

    if (action === 'note-this') {
      if (!ctx.text.trim()) {
        showToast('Select some text first', 'error');
        return;
      }
      api
        .createNote(data.screenplay.id, {
          title: ctx.text.slice(0, 60),
          body: ctx.text,
          scenes: ctx.sceneId ? [ctx.sceneId] : [],
          priority: 'medium',
          status: 'unread',
          origin: 'self',
          confidence: 1.0,
        })
        .then(({ note }) => {
          handleNoteCreated(note);
          showToast('Note pinned to scene', 'success');
        })
        .catch(err => {
          console.error('[note-this]', err);
          showToast('Could not create note', 'error');
        });
      return;
    }

    if (action === 'tag-for-revision') {
      setRevisionTaggedLineIds(prev => {
        const next = new Set(prev);
        if (next.has(ctx.lineId)) next.delete(ctx.lineId);
        else next.add(ctx.lineId);
        return next;
      });
      const rev =
        REVISION_COLORS.find(r => r.id === revisionColor) || REVISION_COLORS[0];
      const wasTagged = revisionTaggedLineIds.has(ctx.lineId);
      showToast(
        wasTagged ? `Untagged from ${rev.name}` : `Tagged for ${rev.name} revision`,
        'success',
      );
      return;
    }

    if (action === 'voice-exemplar') {
      if (ctx.lineType !== 'dialogue' || !ctx.character) {
        showToast('Voice exemplar only works on dialogue lines', 'error');
        return;
      }
      const char = data.characterBible.find(
        c => c.name.toLowerCase() === ctx.character!.toLowerCase(),
      );
      if (!char) {
        showToast(
          `${ctx.character} not in bible — add them first`,
          'error',
        );
        setBibleOpen(true);
        return;
      }
      setData(prev =>
        prev
          ? {
              ...prev,
              characterBible: prev.characterBible.map(c =>
                c.id === char.id ? { ...c, voice: [...c.voice, ctx.text] } : c,
              ),
            }
          : prev,
      );
      showToast(`Added to ${char.name}'s voice`, 'success');
      return;
    }

    if (action === 'read') {
      showToast('Read aloud isn’t wired yet', 'info');
      return;
    }

    if (action === 'cut') {
      showToast('Cut isn’t wired yet', 'info');
      return;
    }
  };

  const handleFindSimilarJump = (sceneId: string, lineId: string) => {
    setActiveScene(sceneId);
    setHighlightLineId(lineId);
    setFindSimilarCtx(null);
    setTimeout(() => {
      setHighlightLineId(prev => (prev === lineId ? null : prev));
    }, 2100);
  };

  const handleNoteCreated = (note: Note) => {
    setData(prev => prev ? { ...prev, notes: [...prev.notes, note] } : prev);
    setActiveNote(note.id);
  };

  const handleNoteDeleted = (id: string) => {
    setData(prev => prev ? { ...prev, notes: prev.notes.filter(n => n.id !== id) } : prev);
    if (activeNote === id) setActiveNote('');
  };

  const handleAskScene = (sceneId: string) => {
    setActiveScene(sceneId);
    const scene = data?.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const message = `What's working and what isn't in this scene: "${scene.heading}"? Focus on the strongest beat and the weakest one.`;
    setPendingChatMessage(message);
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
        screenplayId={data.screenplay.id}
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
        saveStatus={saveStatus}
      />

      <TimelineRibbon
        scenes={scenes}
        beats={beats}
        notes={notes}
        activeScene={effectiveActiveScene}
        setActiveScene={setActiveScene}
        currentPage={currentPage}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ width: sidebarW, flexShrink: 0, overflow: 'hidden' }}>
          {outlineOpen ? (
            <OutlineDrawer
              scenes={scenes}
              beats={beats}
              notes={notes}
              activeScene={effectiveActiveScene}
              setActiveScene={setActiveScene}
            />
          ) : (
            <Sidebar
              activeScene={effectiveActiveScene}
              setActiveScene={setActiveScene}
              scenes={scenes}
              beats={beats}
              notes={notes}
            />
          )}
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
            onLineEdit={onLineEdit}
            onSceneEdit={onSceneEdit}
            onAskScene={handleAskScene}
            title={screenplay.title}
            author={screenplay.author ?? undefined}
            revisionTaggedLineIds={revisionTaggedLineIds}
            highlightLineId={highlightLineId}
            graduatedReplies={graduatedReplies}
            onBackToChat={handleAgentReplyBackToChat}
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
            position: 'relative',
          }}
        >
          <div style={{ flex: notesSplit, minHeight: 100, overflow: 'hidden' }}>
            <Notes
              notes={notes}
              patternNotes={[]}
              activeNote={activeNote}
              setActiveNote={handleNoteSelect}
              activeScene={effectiveActiveScene}
              screenplayId={data.screenplay.id}
              onNoteCreated={handleNoteCreated}
              onNoteDeleted={handleNoteDeleted}
              triageStatus={triage.status}
              triageError={triage.error}
              activeSceneLabel={
                scenes.find(s => s.id === effectiveActiveScene)?.position?.toString()
              }
              scenes={scenes}
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
              screenplayId={screenplay.id}
              noteId={activeNote || null}
              activeNote={activeNote}
              activeAgent={activeAgent}
              setActiveAgent={setActiveAgent}
              chatTarget={chatTarget}
              setChatTarget={setChatTarget}
              notes={notes}
              patternNotes={[]}
              characters={characterBible}
              openBible={() => setBibleOpen(true)}
              initialHistory={history ?? undefined}
              greeting={greeting}
              pendingMessage={pendingChatMessage}
              onPendingConsumed={() => setPendingChatMessage(null)}
              activeSceneId={effectiveActiveScene}
              agentReplies={agentReplies}
              onAgentReplyDone={handleAgentReplyDone}
              onAgentReplyGraduate={handleAgentReplyGraduate}
            />
          </div>

          {findSimilarCtx && (
            <FindSimilarDrawer
              ctx={findSimilarCtx}
              scenes={scenes}
              onClose={() => setFindSimilarCtx(null)}
              onJump={handleFindSimilarJump}
            />
          )}
        </div>
      </div>

      <History revisions={[]} />
      <Bible
        open={bibleOpen}
        onClose={() => setBibleOpen(false)}
        characters={characterBible}
      />
      {toast && (
        <Toast
          text={toast.text}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
