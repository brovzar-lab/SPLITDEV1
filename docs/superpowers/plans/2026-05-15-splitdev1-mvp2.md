# SPLITDEV1 MVP-2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Transform SPLITDEV1's first-session UX from "stare at a disabled textarea" to "AI working partner that greets you, surfaces priority concerns, and accepts producer notes via paste/upload."

**Architecture:** Add an auto-triage runner that fires Anthropic after every upload. Remove the per-note gate from chat so script-level conversation works. Add a session-opener SSE endpoint that streams an unprompted greeting on editor load. Add producer notes ingestion (paste / file upload of PDF/.docx/.txt/.md) that extracts structured Notes via Anthropic. Add "+ New note" UI and inline scene-level AI triggers.

**Tech additions:** `mammoth` (.docx), `pdf-parse` (.pdf), `zod` (already in deps — used for structured Anthropic responses).

**Spec:** [`docs/superpowers/specs/2026-05-15-splitdev1-mvp2-design.md`](../specs/2026-05-15-splitdev1-mvp2-design.md)

**Working directory for every task:** `/Users/quantumcode/CODE/SPLITDEV1/`

---

## Phase 1 — Foundation: DB migration + script-level chat unblock

### Task 1: DB migration 002 + script triage_status column

**Files:**
- Create: `server/src/db/migrations/002_mvp2.sql`
- Modify: `server/src/models/types.ts` (add `triage_status`, `triage_error` to `Screenplay`)
- Create: `server/tests/migrations/002_mvp2.test.ts`

- [ ] **Step 1: Create `server/src/db/migrations/002_mvp2.sql`**

```sql
ALTER TABLE screenplay ADD COLUMN triage_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE screenplay ADD COLUMN triage_error TEXT;
```

- [ ] **Step 2: Update `server/src/models/types.ts`** — add to `Screenplay` interface:

```ts
export type TriageStatus = 'pending' | 'running' | 'done' | 'failed';

export interface Screenplay {
  id: string;
  title: string;
  author: string | null;
  source_format: SourceFormat;
  source_text: string;
  triage_status: TriageStatus;
  triage_error: string | null;
  created_at: number;
  updated_at: number;
}
```

Mirror in `src/api/types.ts`.

- [ ] **Step 3: Failing test `server/tests/migrations/002_mvp2.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { openDb } from '../../src/db/index.js';

describe('migration 002', () => {
  it('adds triage columns to screenplay', () => {
    const db = openDb(':memory:');
    const cols = db.prepare("PRAGMA table_info(screenplay)").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('triage_status');
    expect(names).toContain('triage_error');
  });

  it('new screenplays default to triage_status=pending', () => {
    const db = openDb(':memory:');
    db.prepare(`INSERT INTO screenplay (id, title, author, source_format, source_text, created_at, updated_at)
      VALUES ('t1', 'T', null, 'fountain', '', 0, 0)`).run();
    const row = db.prepare('SELECT triage_status, triage_error FROM screenplay WHERE id = ?').get('t1') as { triage_status: string; triage_error: string | null };
    expect(row.triage_status).toBe('pending');
    expect(row.triage_error).toBeNull();
  });
});
```

- [ ] **Step 4: Run test, verify passing** — `cd server && npm test migrations`

- [ ] **Step 5: Update `createScreenplay` in `server/src/models/screenplay.ts`** to include the new columns:

```ts
db.prepare(`INSERT INTO screenplay
  (id, title, author, source_format, source_text, triage_status, triage_error, created_at, updated_at)
  VALUES (@id, @title, @author, @source_format, @source_text, @triage_status, @triage_error, @created_at, @updated_at)`).run({
  ...row,
  triage_status: 'pending',
  triage_error: null,
});
```

Also update the `Screenplay` return value to include `triage_status: 'pending'` and `triage_error: null`.

- [ ] **Step 6: Update `listScreenplays`** to select the new columns:

```ts
return db.prepare(`SELECT id, title, author, source_format, triage_status, triage_error, created_at, updated_at
  FROM screenplay ORDER BY updated_at DESC, id DESC`).all() as Array<Omit<Screenplay, 'source_text'>>;
```

- [ ] **Step 7: Verify all server tests still pass** — `npm test` returns 32/32 (was 30/30, +2 new).

- [ ] **Step 8: Commit**

```bash
git add server/src/db/migrations/002_mvp2.sql server/src/models/types.ts server/src/models/screenplay.ts src/api/types.ts server/tests/migrations/002_mvp2.test.ts
git commit -m "feat(db): migration 002 — triage_status + triage_error on screenplay"
```

---

### Task 2: Script-level chat (remove note gate)

**Files:**
- Modify: `server/src/routes/chat.ts` — when noteId is null, build outline context instead of scene context
- Modify: `src/components/Chat.tsx` — remove `disabled={!note}` gates
- Modify: `server/tests/routes/chat.test.ts` — add null-noteId test

- [ ] **Step 1: Failing test for noteId-null path** — append to `server/tests/routes/chat.test.ts`:

```ts
it('handles script-level chat (no noteId) with outline context', async () => {
  const db = openDb(':memory:');
  const sp = createScreenplay(db, { title: 'Test', author: null, source_format: 'fountain', source_text: '' });
  // Insert a scene + line so outline has content
  const sc = db.prepare(`INSERT INTO scene (id, screenplay_id, position, heading) VALUES ('s1', ?, 0, 'INT. CABIN - DAY')`).run(sp.id);
  db.prepare(`INSERT INTO line (id, scene_id, position, type, character, parenthetical, text)
    VALUES ('l1', 's1', 0, 'action', null, null, 'Sarah enters.')`).run();
  const app = buildApp({ db });
  const res = await request(app).post('/api/chat').send({
    screenplayId: sp.id,
    // noteId omitted entirely
    target: { kind: 'agent', id: 'dialogue' },
    message: 'what should I work on?',
  });
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  expect(res.text).toContain('event: token');
});
```

- [ ] **Step 2: Run test, verify it passes** (it should already pass since the server route accepts null noteId — but verify outline context is being built, not just the first scene).

- [ ] **Step 3: Modify `server/src/routes/chat.ts`** — when `noteId == null`, build a true outline context:

Replace the section that computes `sceneContext` with:

```ts
const note = noteId ? getNote(db, noteId) : null;
const allScenes = listScenes(db, sp.id);

let context: string;
if (note) {
  // Note-scoped: full text of the linked scene
  const targetSceneId = note.scenes[0] ?? allScenes[0]?.id;
  const sceneLines = targetSceneId ? listLines(db, targetSceneId) : [];
  context = sceneLines.map(l =>
    l.type === 'action' ? l.text : `${l.character}${l.parenthetical ? ` (${l.parenthetical})` : ''}: ${l.text}`
  ).join('\n');
} else {
  // Script-level: outline of all scenes (heading + first 2 action lines each)
  context = allScenes.map(s => {
    const lines = listLines(db, s.id);
    const headerActions = lines.filter(l => l.type === 'action').slice(0, 2);
    return `${s.heading}\n${headerActions.map(l => l.text).join('\n')}`;
  }).join('\n\n');
}
```

Pass `context` (renamed from `sceneContext`) into the prompt as `{{sceneContext}}` — same variable, the prompt template stays unchanged. The prompt now reads "Current scene context" but it's actually outline content when noteId is null. That's acceptable for MVP-2; if it becomes confusing in production, split the prompts in MVP-3.

- [ ] **Step 4: Modify `src/components/Chat.tsx`**

- Remove `disabled={!note || streaming}` from textarea → leave only `disabled={streaming}`
- Remove `!note` from button disabled check → leave only `!inputVal.trim() || streaming || !screenplayId`
- Change placeholder logic: 
  - if `note` → "Compose to [Agent]…" or "Speak to [Character]…" (existing)
  - else → "Talk about your script…"
- Empty-state graphic (the ✒ icon + "Select a note to begin correspondence") is now shown only when there are zero messages AND zero notes pulled at all. When there's an active screenplay but no note selected, show nothing — wait for the session opener (F3) to populate.
- Keep the textarea enabled and ready

- [ ] **Step 5: Verify TS + tests** — `cd /Users/quantumcode/CODE/SPLITDEV1 && npx tsc -b && cd server && npm test`

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/chat.ts server/tests/routes/chat.test.ts src/components/Chat.tsx
git commit -m "feat(chat): script-level conversation (no note required)

Chat input is enabled as soon as a screenplay is loaded. When noteId
is null, the system prompt is built from a screenplay outline (heading
+ first 2 action lines per scene) instead of a single scene's full text."
```

---

## Phase 2 — Foundation: chat history + Notes UI

### Task 3: GET chat history endpoint

**Files:**
- Modify: `server/src/routes/chat.ts` — add GET handler
- Modify: `server/tests/routes/chat.test.ts` — add history test
- Modify: `src/api/client.ts` — add `getChatHistory` method

- [ ] **Step 1: Failing test**

```ts
it('returns chat history for a screenplay (null noteId default)', async () => {
  const db = openDb(':memory:');
  const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
  // Insert chat messages directly
  db.prepare(`INSERT INTO chat_message (id, screenplay_id, note_id, role, target_kind, target_id, text, voice_match, at)
    VALUES ('m1', ?, null, 'user', 'agent', 'dialogue', 'hi', null, 100),
           ('m2', ?, null, 'ai', 'agent', 'dialogue', 'hello', null, 200)`).run(sp.id, sp.id);
  const app = buildApp({ db });
  const res = await request(app).get(`/api/screenplays/${sp.id}/chat`);
  expect(res.status).toBe(200);
  expect(res.body.messages).toHaveLength(2);
  expect(res.body.messages[0].text).toBe('hi');
  expect(res.body.messages[1].text).toBe('hello');
});
```

- [ ] **Step 2: Run test, verify it fails**

- [ ] **Step 3: Add GET handler to `server/src/routes/chat.ts`**

```ts
import { listChatHistory } from '../models/chat.js';

r.get('/screenplays/:id/chat', (req, res) => {
  const db = req.app.locals.db;
  const noteId = req.query.noteId as string | undefined;
  const messages = listChatHistory(db, req.params.id, noteId ?? null, 100);
  res.json({ messages });
});
```

- [ ] **Step 4: Add `getChatHistory` to `src/api/client.ts`**

```ts
getChatHistory: (screenplayId: string, noteId?: string | null) => {
  const q = noteId ? `?noteId=${encodeURIComponent(noteId)}` : '';
  return request<{ messages: ChatMessage[] }>(`/api/screenplays/${screenplayId}/chat${q}`);
},
```

Add `ChatMessage` to imports from `./types`.

- [ ] **Step 5: Run tests, verify 33/33**

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/chat.ts server/tests/routes/chat.test.ts src/api/client.ts
git commit -m "feat(chat): GET /api/screenplays/:id/chat for history"
```

---

### Task 4: "+ New note" + delete note UI

**Files:**
- Modify: `src/components/Notes.tsx`
- Modify: `src/pages/Editor.tsx` (pass screenplayId; refresh data after note ops)

- [ ] **Step 1: Modify `src/components/Notes.tsx`** to accept new props:

```tsx
interface NotesProps {
  // existing:
  notes: Note[];
  patternNotes: PatternNote[];
  activeNote: string;
  setActiveNote: (id: string) => void;
  activeScene: string;
  // NEW:
  screenplayId: string;
  onNoteCreated: (note: Note) => void;
  onNoteDeleted: (id: string) => void;
}
```

- [ ] **Step 2: Add a "+ New note" button** to the Notes header (top-right of the panel, near the existing density toggle). Clicking it inline-expands a small form:

```tsx
const [newNoteOpen, setNewNoteOpen] = useState(false);
const [newTitle, setNewTitle] = useState('');
const [newBody, setNewBody] = useState('');
const [newPriority, setNewPriority] = useState<'high'|'medium'|'low'>('medium');

const handleCreate = async () => {
  if (!newTitle.trim()) return;
  const { note } = await api.createNote(screenplayId, {
    title: newTitle.trim(),
    body: newBody.trim(),
    scenes: activeScene ? [activeScene] : [],
    priority: newPriority,
    status: 'unread',
    origin: 'self',
    confidence: null,
  });
  onNoteCreated(note);
  setNewTitle(''); setNewBody(''); setNewOpen(false);
};
```

Render the form inline below the header. Style using `RD` tokens. Submit + Cancel buttons.

- [ ] **Step 3: Add delete affordance to each note row**

Inline ⋯ menu icon at the right edge of each sticky/list/sheet row. On click, opens a tiny popover with "Delete" action. On confirm, calls `api.patchNote` no — calls a new `api.deleteNote(id)` (add to client.ts: `request<void>(\`/api/notes/${id}\`, { method: 'DELETE' })`). Then `onNoteDeleted(id)`.

- [ ] **Step 4: Wire `Editor.tsx`**:

```tsx
const handleNoteCreated = (note: Note) => {
  setData(prev => prev ? { ...prev, notes: [...prev.notes, note] } : prev);
  setActiveNote(note.id);
};
const handleNoteDeleted = (id: string) => {
  setData(prev => prev ? { ...prev, notes: prev.notes.filter(n => n.id !== id) } : prev);
  if (activeNote === id) setActiveNote('');
};

// Pass to <Notes ...> alongside the existing props:
screenplayId={data.screenplay.id}
onNoteCreated={handleNoteCreated}
onNoteDeleted={handleNoteDeleted}
```

- [ ] **Step 5: Add `deleteNote` to `src/api/client.ts`**:

```ts
deleteNote: (id: string) => request<void>(`/api/notes/${id}`, { method: 'DELETE' }),
```

- [ ] **Step 6: Verify TS** — `npx tsc -b` returns clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/Notes.tsx src/pages/Editor.tsx src/api/client.ts
git commit -m "feat(notes): manual create + delete via Notes panel UI"
```

---

## Phase 3 — Auto-triage on upload

### Task 5: Triage runner + intake prompt

**Files:**
- Create: `server/src/anthropic/prompts/triage/intake.md`
- Create: `server/src/triage/runner.ts`
- Modify: `server/package.json` build script (copy `prompts/triage/` to dist)
- Create: `server/tests/triage/runner.test.ts`

- [ ] **Step 1: Create the prompt file**

`server/src/anthropic/prompts/triage/intake.md`:

```
You are a senior screenplay analyst doing a first-read triage. The writer just uploaded their script and wants a working punch list — the 5-7 most important things to address.

Read the entire screenplay below. Then return JSON with this exact shape:

{
  "summary": "<one-sentence elevator pitch of the script you'd give the writer>",
  "notes": [
    {
      "title": "<short, punchy title — what the issue is>",
      "body": "<1-2 sentences of specific actionable critique>",
      "priority": "high" | "medium" | "low",
      "sceneHints": ["<scene heading where this surfaces, e.g. 'INT. CABIN - DAY'>"]
    }
  ]
}

Rules:
- Return 5-7 notes, ordered by priority (high first)
- Mix structural ("Act 2 break is late"), character ("protagonist's want is unclear"), and dialogue ("Tom over-explains in scene 4") concerns
- Reference specific scene headings in `sceneHints` when applicable; empty array if script-wide
- Be specific, not generic. "Pacing is off" is bad. "Three consecutive scenes lack a forward driver after the inciting incident" is good.
- Tone: working creative partner, not a critic. The notes should feel like things to *do*, not faults to *fix*.

Return ONLY the JSON, no preamble.

---

Screenplay:

{{screenplay}}
```

- [ ] **Step 2: Create `server/src/triage/runner.ts`**

```ts
import { z } from 'zod';
import type { DB } from '../db/index.js';
import { anthropicClient } from '../anthropic/client.js';
import { loadPromptFile } from '../anthropic/prompts.js';
import { getScreenplay } from '../models/screenplay.js';
import { listScenes } from '../models/scene.js';
import { listLines } from '../models/line.js';
import { insertNote } from '../models/note.js';
import { env } from '../env.js';

const TriageResponse = z.object({
  summary: z.string(),
  notes: z.array(z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(1000),
    priority: z.enum(['high', 'medium', 'low']),
    sceneHints: z.array(z.string()).default([]),
  })).min(1).max(10),
});

export type TriageResult = z.infer<typeof TriageResponse>;

export async function runTriageOnUpload(db: DB, screenplayId: string): Promise<void> {
  // Mark running
  db.prepare(`UPDATE screenplay SET triage_status = 'running', triage_error = null WHERE id = ?`).run(screenplayId);

  try {
    const sp = getScreenplay(db, screenplayId);
    if (!sp) throw new Error('screenplay not found');

    // Reconstruct screenplay text from structured rows
    const scenes = listScenes(db, sp.id);
    const screenplayText = scenes.map(s => {
      const lines = listLines(db, s.id);
      const sceneBody = lines.map(l =>
        l.type === 'action' ? l.text : `${l.character}${l.parenthetical ? ` (${l.parenthetical})` : ''}: ${l.text}`
      ).join('\n');
      return `${s.heading}\n\n${sceneBody}`;
    }).join('\n\n---\n\n');

    const prompt = loadPromptFile('triage/intake', { screenplay: screenplayText });

    const result = await anthropicClient().messages.create({
      model: env.MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = result.content?.[0];
    const text = block && block.type === 'text' ? block.text : '';
    // Strip possible markdown code fences
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = TriageResponse.parse(JSON.parse(cleaned));

    // Map sceneHints to scene IDs where possible
    const sceneByHeading = new Map(scenes.map(s => [s.heading.toUpperCase(), s.id]));

    db.transaction(() => {
      for (const n of parsed.notes) {
        const matchedScenes = n.sceneHints
          .map(h => sceneByHeading.get(h.toUpperCase()))
          .filter((id): id is string => Boolean(id));
        insertNote(db, {
          screenplay_id: sp.id,
          title: n.title,
          body: n.body,
          scenes: matchedScenes,
          priority: n.priority,
          status: 'unread',
          origin: 'self',
          confidence: null,
        });
      }
      db.prepare(`UPDATE screenplay SET triage_status = 'done' WHERE id = ?`).run(screenplayId);
    })();
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    db.prepare(`UPDATE screenplay SET triage_status = 'failed', triage_error = ? WHERE id = ?`).run(msg, screenplayId);
  }
}
```

- [ ] **Step 3: Add `loadPromptFile` helper to `server/src/anthropic/prompts.ts`**

Existing `loadAgentPrompt` only handles `agents/<id>.md`. Add a generic version:

```ts
export function loadPromptFile(relativePath: string, vars: Record<string, string | undefined>): string {
  const path = join(__dirname, 'prompts', `${relativePath}.md`);
  if (!existsSync(path)) throw new Error(`No prompt: ${relativePath}`);
  return interpolate(readFileSync(path, 'utf8'), vars);
}
```

- [ ] **Step 4: Update `server/package.json` build script** to copy the entire `prompts/` directory:

Current:
```
"build": "tsc -b && cp -R src/db/migrations dist/db/migrations && cp -R src/anthropic/prompts dist/anthropic/prompts"
```

Already copies the whole `prompts/` dir, so `prompts/triage/*.md` will be included. No change needed — verify.

- [ ] **Step 5: Failing test `server/tests/triage/runner.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';
import { insertScene } from '../../src/models/scene.js';
import { insertLine } from '../../src/models/line.js';
import { listNotes } from '../../src/models/note.js';

vi.mock('../../src/anthropic/client.js', () => ({
  anthropicClient: () => ({
    messages: {
      create: async () => ({
        content: [{
          type: 'text',
          text: JSON.stringify({
            summary: 'A test screenplay.',
            notes: [
              { title: 'Opening too slow', body: 'The cold open drags. Consider starting mid-action.', priority: 'high', sceneHints: ['INT. CABIN - DAY'] },
              { title: 'Sarah motivation unclear', body: 'Why is she here?', priority: 'high', sceneHints: [] },
            ],
          }),
        }],
      }),
    },
  }),
}));

describe('runTriageOnUpload', () => {
  it('writes notes and marks status done', async () => {
    const { runTriageOnUpload } = await import('../../src/triage/runner.js');
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
    const sc = insertScene(db, { screenplay_id: sp.id, position: 0, heading: 'INT. CABIN - DAY', eighths: null });
    insertLine(db, { scene_id: sc.id, position: 0, type: 'action', text: 'Sarah enters.', character: null, parenthetical: null });
    await runTriageOnUpload(db, sp.id);
    const status = (db.prepare('SELECT triage_status FROM screenplay WHERE id = ?').get(sp.id) as { triage_status: string }).triage_status;
    expect(status).toBe('done');
    const notes = listNotes(db, sp.id);
    expect(notes).toHaveLength(2);
    expect(notes[0].title).toMatch(/opening/i);
    expect(notes[0].scenes).toEqual([sc.id]);  // matched via sceneHints
  });
});
```

- [ ] **Step 6: Run test, verify passing**

- [ ] **Step 7: Commit**

```bash
git add server/src/triage server/src/anthropic/prompts/triage server/src/anthropic/prompts.ts server/tests/triage
git commit -m "feat(triage): runner + intake prompt + zod-validated parse"
```

---

### Task 6: Triage status endpoint + async trigger from upload

**Files:**
- Modify: `server/src/routes/screenplays.ts`
- Modify: `server/tests/routes/screenplays.test.ts`

- [ ] **Step 1: Failing test**

```ts
it('triage status endpoint returns pending after upload', async () => {
  const db = openDb(':memory:');
  const app = buildApp({ db });
  const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
  const up = await request(app).post('/api/screenplays').attach('file', fountain, 'the-cabin.fountain');
  const id = up.body.screenplay.id;
  const status = await request(app).get(`/api/screenplays/${id}/triage`);
  expect(status.status).toBe(200);
  // Triage status may be 'pending', 'running', 'done', or 'failed' depending on timing
  expect(['pending', 'running', 'done', 'failed']).toContain(status.body.status);
});
```

- [ ] **Step 2: Add GET handler to `server/src/routes/screenplays.ts`**

```ts
r.get('/:id/triage', (req, res) => {
  const db = req.app.locals.db;
  const row = db.prepare('SELECT triage_status, triage_error FROM screenplay WHERE id = ?')
    .get(req.params.id) as { triage_status: string; triage_error: string | null } | undefined;
  if (!row) return res.status(404).json({ error: 'not found', code: 'not_found' });
  res.json({ status: row.triage_status, error: row.triage_error });
});
```

- [ ] **Step 3: Modify upload handler in `server/src/routes/screenplays.ts`** to fire triage after response:

Inside the POST handler, after the response is sent, call `runTriageOnUpload` without awaiting. Wrap in setImmediate to ensure it runs after response.send completes:

```ts
// After res.status(201).json({...}):
import { runTriageOnUpload } from '../triage/runner.js';
// ...
setImmediate(() => {
  runTriageOnUpload(db, screenplay.id).catch(err => {
    console.error('Triage failed:', err);
  });
});
```

- [ ] **Step 4: Run tests, verify passing** — 36/36 (was 33/33; +1 triage runner +1 history +1 status)

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/screenplays.ts server/tests/routes/screenplays.test.ts
git commit -m "feat(triage): async fire on upload + GET /:id/triage status endpoint"
```

---

### Task 7: Frontend triage polling + Library upload-with-triage flow

**Files:**
- Create: `src/hooks/useTriageStatus.ts`
- Modify: `src/components/Library/UploadCard.tsx`
- Modify: `src/api/client.ts` (add `getTriageStatus`)

- [ ] **Step 1: Add to `src/api/client.ts`**

```ts
getTriageStatus: (id: string) =>
  request<{ status: 'pending' | 'running' | 'done' | 'failed'; error: string | null }>(`/api/screenplays/${id}/triage`),
```

- [ ] **Step 2: Create `src/hooks/useTriageStatus.ts`**

```ts
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export type TriageStatus = 'pending' | 'running' | 'done' | 'failed';

export function useTriageStatus(id: string | null) {
  const [status, setStatus] = useState<TriageStatus>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await api.getTriageStatus(id);
        if (cancelled) return;
        setStatus(res.status);
        setError(res.error);
        if (res.status === 'pending' || res.status === 'running') {
          setTimeout(poll, 1000);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [id]);

  return { status, error };
}
```

- [ ] **Step 3: Modify `src/components/Library/UploadCard.tsx`**

Replace the simple "Uploading…" state with a richer flow that waits for triage. After `api.uploadScreenplay` completes:

```tsx
async function handleFile(file: File) {
  setUploading(true);
  setStage('uploading');
  setError(null);
  try {
    const { screenplay } = await api.uploadScreenplay(file);
    setStage('reading');
    // Wait up to 8s for triage to finish, then go either way
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const s = await api.getTriageStatus(screenplay.id);
      if (s.status === 'done' || s.status === 'failed') break;
      await new Promise(r => setTimeout(r, 800));
    }
    onUploaded();
    navigate(`/screenplays/${screenplay.id}`);
  } catch (e) {
    setError((e as Error).message);
    setStage('uploading');
  } finally {
    setUploading(false);
  }
}

// Add stage state:
const [stage, setStage] = useState<'idle' | 'uploading' | 'reading'>('idle');

// Card label changes:
{uploading
  ? (stage === 'reading' ? 'Reading your screenplay…' : 'Uploading…')
  : error ? <span style={{ color: RD.ruby }}>{error}</span>
  : 'Drop a .fountain or .fdx file here, or click to choose'}
```

- [ ] **Step 4: Verify TS** — `npx tsc -b` clean.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTriageStatus.ts src/components/Library/UploadCard.tsx src/api/client.ts
git commit -m "feat(client): triage polling on upload, 'Reading your screenplay…' state"
```

---

## Phase 4 — Session opener

### Task 8: Session opener endpoint + prompt

**Files:**
- Create: `server/src/anthropic/prompts/session-opener.md`
- Modify: `server/src/routes/chat.ts` (add `POST /screenplays/:id/session/open`)
- Modify: `server/tests/routes/chat.test.ts`

- [ ] **Step 1: Create `server/src/anthropic/prompts/session-opener.md`**

```
You are a working creative partner — a script consultant the writer trusts. You've just finished reading their screenplay. They've opened the editor for the first time (or returned to it), and you're about to greet them.

Style:
- Direct and warm. Working tone. Not a chatbot.
- 80-160 words total.
- Open with what you've read ("Just finished reading [Title]" or "Welcome back to [Title]").
- Pick 1-2 of the most important triage notes and reference them specifically — by content, not by ID.
- Close with a question that offers 2-3 concrete options for where to start.
- No bullet lists. Flowing prose.

Script:
- Title: {{title}}
- Author: {{author}}
- Scene count: {{sceneCount}}

Top triage concerns (use these to inform the greeting):
{{triageNotes}}

Now write the greeting. Address the writer directly. No preamble like "Sure, here's the greeting" — just the greeting itself.
```

- [ ] **Step 2: Add SSE endpoint to `server/src/routes/chat.ts`**

```ts
r.post('/screenplays/:id/session/open', async (req, res) => {
  const db = req.app.locals.db;
  const sp = getScreenplay(db, req.params.id);
  if (!sp) return res.status(404).json({ error: 'not found', code: 'not_found' });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Build top-3 triage notes
  const notes = listNotes(db, sp.id);
  const sorted = notes
    .filter(n => n.status === 'unread')
    .sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 3);

  const triageNotesText = sorted.length === 0
    ? '(No triage notes yet — this is the first time you\'re seeing this script.)'
    : sorted.map(n => `- [${n.priority}] ${n.title}: ${n.body}`).join('\n');

  const scenes = listScenes(db, sp.id);
  const system = loadPromptFile('session-opener', {
    title: sp.title,
    author: sp.author ?? 'unknown',
    sceneCount: String(scenes.length),
    triageNotes: triageNotesText,
  });

  let fullText = '';
  try {
    const stream = anthropicClient().messages.stream({
      model: env.MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: 'Open the session.' }],
    });
    for await (const event of stream as AsyncIterable<any>) {
      if (event?.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const t: string = event.delta.text;
        fullText += t;
        res.write(`event: token\ndata: ${JSON.stringify(t)}\n\n`);
      }
      if (event?.type === 'message_stop') break;
    }
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    res.end();
    return;
  }

  const aiRow = insertChatMessage(db, {
    screenplay_id: sp.id, note_id: null, role: 'ai',
    target_kind: 'agent', target_id: 'dialogue', text: fullText, voice_match: null,
  });
  res.write(`event: done\ndata: ${JSON.stringify({ messageId: aiRow.id })}\n\n`);
  res.end();
});
```

- [ ] **Step 3: Failing test** — append to `server/tests/routes/chat.test.ts`:

```ts
it('streams a session opener and persists the AI message', async () => {
  const db = openDb(':memory:');
  const sp = createScreenplay(db, { title: 'The Cabin', author: 'Maya', source_format: 'fountain', source_text: '' });
  const app = buildApp({ db });
  const res = await request(app).post(`/api/screenplays/${sp.id}/session/open`).send({});
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  expect(res.text).toContain('event: token');
  expect(res.text).toContain('event: done');
  const messages = db.prepare('SELECT * FROM chat_message WHERE screenplay_id = ? AND role = ?').all(sp.id, 'ai');
  expect(messages.length).toBe(1);
});
```

- [ ] **Step 4: Run tests, verify** — 37/37

- [ ] **Step 5: Commit**

```bash
git add server/src/anthropic/prompts/session-opener.md server/src/routes/chat.ts server/tests/routes/chat.test.ts
git commit -m "feat(session): opener SSE endpoint + system prompt"
```

---

### Task 9: Frontend session opener auto-fire on editor mount

**Files:**
- Modify: `src/pages/Editor.tsx`
- Modify: `src/components/Chat.tsx`
- Modify: `src/api/client.ts` (add `openSession`)

- [ ] **Step 1: Add `openSession` to client** — returns a Response with a streaming body, similar to send:

Actually skip the API client method — call `fetch('/api/screenplays/:id/session/open')` directly inside a new hook.

- [ ] **Step 2: Create `src/hooks/useSessionOpener.ts`** that:
- Takes `screenplayId`
- On mount, checks `api.getChatHistory(screenplayId)` — if there's already chat history, skip
- Otherwise POSTs to `/api/screenplays/:id/session/open` and streams tokens
- Exposes `{ greeting: { text, done }, hasHistory }`

```ts
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

interface Greeting { text: string; done: boolean; }

export function useSessionOpener(screenplayId: string | null) {
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const [history, setHistory] = useState<any[] | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!screenplayId || fired.current) return;
    fired.current = true;
    (async () => {
      const { messages } = await api.getChatHistory(screenplayId, null);
      setHistory(messages);
      if (messages.length > 0) return;  // session already open

      const res = await fetch(`/api/screenplays/${screenplayId}/session/open`, { method: 'POST' });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let text = '';
      setGreeting({ text: '', done: false });
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const block of events) {
          const lines = block.split('\n');
          const ev = lines.find(l => l.startsWith('event: '))?.slice(7).trim();
          const data = lines.find(l => l.startsWith('data: '))?.slice(6);
          if (ev === 'token' && data) {
            text += JSON.parse(data) as string;
            setGreeting({ text, done: false });
          } else if (ev === 'done') {
            setGreeting({ text, done: true });
          }
        }
      }
    })();
  }, [screenplayId]);

  return { greeting, history };
}
```

- [ ] **Step 3: Modify `src/components/Chat.tsx`** to display existing history + the streaming greeting:

Receive `initialHistory: ChatMessage[]` and `greeting?: Greeting` as new props.

On mount, set `messages` from `initialHistory`.

When `greeting` is provided and `greeting.done === false`, render a live "streaming" message at the bottom (similar to the existing `reply.text` pattern). When `greeting.done === true`, append to `messages` and clear.

- [ ] **Step 4: Wire `Editor.tsx`**:

```tsx
const { greeting, history } = useSessionOpener(id ?? null);

// Pass to <Chat ...>:
initialHistory={history ?? []}
greeting={greeting}
```

- [ ] **Step 5: Verify TS** — clean

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSessionOpener.ts src/components/Chat.tsx src/pages/Editor.tsx
git commit -m "feat(session): auto-fire opener message on editor mount

When the editor loads a screenplay with no existing script-level chat
history, fires the session opener and streams the AI greeting into the
Chat panel. If there's existing history, just hydrate it instead."
```

---

## Phase 5 — Producer notes ingestion

### Task 10: Backend notes ingestion endpoint + deps

**Files:**
- Modify: `server/package.json` (add deps: `mammoth`, `pdf-parse`)
- Create: `server/src/anthropic/prompts/notes-extract.md`
- Modify: `server/src/routes/notes.ts` — add POST `/screenplays/:id/notes:ingest`
- Create: `server/tests/routes/notes-ingest.test.ts`

- [ ] **Step 1: Add deps** — `cd server && npm install mammoth@^1.8.0 pdf-parse@^1.1.1 && npm install --save-dev @types/pdf-parse@^1.1.4`

- [ ] **Step 2: Create extraction prompt**

`server/src/anthropic/prompts/notes-extract.md`:

```
A writer pasted producer/development notes about their screenplay. Extract them into structured items.

For each distinct note (each is a separate concern, not a single long paragraph), return:
- title: short, punchy (under 60 chars)
- body: the actual critique (1-3 sentences)
- priority: high|medium|low (high = blocking, medium = should address, low = minor)
- origin: producer|director|exec|reader|table|self — detect from header text like "From the producer:" or default to "reader"
- sceneHints: scene headings referenced, e.g. ["INT. CABIN - DAY"] — empty if script-wide

Available scene headings in this screenplay (for matching):
{{sceneHeadings}}

Return JSON only:
{
  "origin": "<dominant origin across all notes>",
  "notes": [{ "title": "...", "body": "...", "priority": "...", "sceneHints": [...] }]
}

Notes from user:

{{text}}
```

- [ ] **Step 3: Add ingestion endpoint** — modify `server/src/routes/notes.ts`:

```ts
import multer from 'multer';
import { z } from 'zod';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { anthropicClient } from '../anthropic/client.js';
import { loadPromptFile } from '../anthropic/prompts.js';
import { listScenes } from '../models/scene.js';
import { env } from '../env.js';

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

const Extracted = z.object({
  origin: z.enum(['producer','director','exec','reader','table','self']).default('reader'),
  notes: z.array(z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000),
    priority: z.enum(['high','medium','low']).default('medium'),
    sceneHints: z.array(z.string()).default([]),
  })).min(1).max(30),
});

async function extractText(file: Express.Multer.File): Promise<string> {
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return file.buffer.toString('utf8');
  }
  if (name.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  if (name.endsWith('.pdf')) {
    const result = await pdfParse(file.buffer);
    return result.text;
  }
  throw new Error(`unsupported file type: ${name}`);
}

r.post('/screenplays/:id/notes:ingest', upload.single('file'), async (req, res) => {
  const db = req.app.locals.db;
  const screenplayId = req.params.id;
  let text: string;
  try {
    if (req.file) {
      text = await extractText(req.file);
    } else if (req.body?.text) {
      text = String(req.body.text);
    } else {
      return res.status(400).json({ error: 'file or text required', code: 'no_input' });
    }
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message, code: 'extract_failed' });
  }
  if (text.trim().length < 20) {
    return res.status(400).json({ error: 'too little content to ingest', code: 'too_short' });
  }

  const scenes = listScenes(db, screenplayId);
  const sceneHeadings = scenes.map(s => `- ${s.heading}`).join('\n') || '(none)';

  const prompt = loadPromptFile('notes-extract', { text, sceneHeadings });
  let extracted;
  try {
    const result = await anthropicClient().messages.create({
      model: env.MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = result.content?.[0];
    const raw = block && block.type === 'text' ? block.text : '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    extracted = Extracted.parse(JSON.parse(cleaned));
  } catch (err) {
    return res.status(500).json({ error: 'extraction failed', code: 'ai_extract_failed', detail: (err as Error).message });
  }

  const sceneByHeading = new Map(scenes.map(s => [s.heading.toUpperCase(), s.id]));
  const inserted = db.transaction(() => {
    return extracted.notes.map(n => insertNote(db, {
      screenplay_id: screenplayId,
      title: n.title,
      body: n.body,
      scenes: n.sceneHints.map(h => sceneByHeading.get(h.toUpperCase())).filter((id): id is string => !!id),
      priority: n.priority,
      status: 'unread',
      origin: extracted.origin,
      confidence: null,
    }));
  })();

  res.status(201).json({ notes: inserted });
});
```

- [ ] **Step 4: Failing test `server/tests/routes/notes-ingest.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';

vi.mock('../../src/anthropic/client.js', () => ({
  anthropicClient: () => ({
    messages: {
      create: async () => ({
        content: [{
          type: 'text',
          text: JSON.stringify({
            origin: 'producer',
            notes: [
              { title: 'Pacing issue', body: 'Act 2 sags after the midpoint.', priority: 'high', sceneHints: [] },
              { title: 'Sarah motivation', body: "Unclear why she stays.", priority: 'medium', sceneHints: [] },
            ],
          }),
        }],
      }),
    },
  }),
}));

describe('POST /api/screenplays/:id/notes:ingest', () => {
  it('extracts notes from pasted text', async () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
    const app = buildApp({ db });
    const res = await request(app)
      .post(`/api/screenplays/${sp.id}/notes:ingest`)
      .send({ text: 'From the producer: Act 2 sags. And Sarah should have a clearer reason to stay in the cabin after scene 4. This is a longer paragraph with enough words to pass the 20-char minimum check easily.' });
    expect(res.status).toBe(201);
    expect(res.body.notes).toHaveLength(2);
    expect(res.body.notes[0].origin).toBe('producer');
  });

  it('rejects too-short text', async () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
    const app = buildApp({ db });
    const res = await request(app)
      .post(`/api/screenplays/${sp.id}/notes:ingest`)
      .send({ text: 'too short' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 5: Verify tests** — 39/39 (37+2)

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/src/anthropic/prompts/notes-extract.md server/src/routes/notes.ts server/tests/routes/notes-ingest.test.ts
git commit -m "feat(notes): paste/upload producer notes, AI-extract to structured rows

Endpoint POST /api/screenplays/:id/notes:ingest accepts either JSON {text}
or multipart file (.txt/.md/.docx/.pdf via mammoth + pdf-parse). Sends
through Anthropic with a structured-output prompt and zod validation.
Inserts the extracted notes with detected origin."
```

---

### Task 11: Frontend ingest modal + Notes panel buttons

**Files:**
- Create: `src/components/Library/IngestModal.tsx` (named for component co-location, but it's used in the Notes panel)
- Modify: `src/components/Notes.tsx` (add ingest buttons in header)
- Modify: `src/api/client.ts` (add `ingestNotes`)

- [ ] **Step 1: Add to client**

```ts
ingestNotesText: (screenplayId: string, text: string) =>
  request<{ notes: Note[] }>(`/api/screenplays/${screenplayId}/notes:ingest`, {
    method: 'POST', body: JSON.stringify({ text }),
  }),
ingestNotesFile: async (screenplayId: string, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api/screenplays/${screenplayId}/notes:ingest`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ notes: Note[] }>;
},
```

- [ ] **Step 2: Create `src/components/Notes/IngestModal.tsx`** (put under Notes/ not Library/ — fix the path)

Modal with:
- Textarea for paste (large, ~12 rows)
- "Or upload file: [file picker]" — accepts .txt,.md,.docx,.pdf
- Origin dropdown (advisory — the AI also auto-detects)
- "Extract notes" submit button
- Loading state during AI extraction
- Error state if extraction fails

Use `RD` tokens for styling.

- [ ] **Step 3: Modify `src/components/Notes.tsx`** — add an "📋 Ingest notes" button next to the existing "+ New note" button:

```tsx
const [ingestOpen, setIngestOpen] = useState(false);
// ...header buttons:
<button onClick={() => setIngestOpen(true)}>📋 Ingest notes</button>
{ingestOpen && (
  <IngestModal
    screenplayId={screenplayId}
    onClose={() => setIngestOpen(false)}
    onIngested={(notes) => { notes.forEach(n => onNoteCreated(n)); setIngestOpen(false); }}
  />
)}
```

- [ ] **Step 4: Verify TS** — clean

- [ ] **Step 5: Commit**

```bash
git add src/components/Notes/IngestModal.tsx src/components/Notes.tsx src/api/client.ts
git commit -m "feat(client): IngestModal for pasting/uploading producer notes"
```

---

## Phase 6 — Scene-level AI trigger

### Task 12: "★ Ask AI" button on scene headings

**Files:**
- Modify: `src/components/Screenplay.tsx` (add button next to scene headings)
- Modify: `src/pages/Editor.tsx` (handler that fires a templated chat)

- [ ] **Step 1: Modify `Screenplay.tsx`** — add to each scene heading render block:

```tsx
{onAskScene && (
  <button
    onClick={(e) => { e.stopPropagation(); onAskScene(scene.id); }}
    style={{
      padding: '2px 8px', fontFamily: RD.display, fontSize: 10, fontStyle: 'italic',
      color: RD.copper, background: 'transparent', border: `1px solid ${RD.copper}40`,
      borderRadius: 2, cursor: 'pointer', letterSpacing: 1,
    }}
  >
    ★ Ask AI
  </button>
)}
```

Add `onAskScene?: (sceneId: string) => void` to the component's prop type.

- [ ] **Step 2: Wire `Editor.tsx`** — the handler builds a templated message and fires via `useChatStream`:

```tsx
const handleAskScene = (sceneId: string) => {
  setActiveScene(sceneId);
  // Find scene heading
  const scene = data?.scenes.find(s => s.id === sceneId);
  if (!scene) return;
  const message = `What's working and what isn't in this scene: "${scene.heading}"? Focus on the dialogue agent's domain.`;
  // Fire via the chat stream hook — Chat component owns the hook, so we need a ref or callback API
  // Simplest: pass message + sceneId via state, and let Chat.tsx auto-send if `pendingMessage` is set
  setPendingChatMessage(message);
};
```

Add state: `const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);`

Pass to Chat: `pendingMessage={pendingChatMessage} onPendingConsumed={() => setPendingChatMessage(null)}`

- [ ] **Step 3: Modify `Chat.tsx`** — accept `pendingMessage` prop. On change, if non-null and a screenplayId exists, call `send()` with the message and call `onPendingConsumed()`.

```tsx
useEffect(() => {
  if (pendingMessage && screenplayId) {
    send({ screenplayId, noteId: null, target, message: pendingMessage });
    onPendingConsumed?.();
  }
}, [pendingMessage, screenplayId]);
```

- [ ] **Step 4: Verify TS** — clean

- [ ] **Step 5: Commit**

```bash
git add src/components/Screenplay.tsx src/pages/Editor.tsx src/components/Chat.tsx
git commit -m "feat(editor): ★ Ask AI button on each scene heading

Click fires a templated 'what's working/what isn't' chat about the
specific scene through the existing useChatStream pipeline."
```

---

## Phase 7 — End-to-end QA + docs

### Task 13: Update README + manual QA walk

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README's "Known limitations" + "Run locally" + add a "First session" walkthrough** section that describes the new auto-triage + session opener behavior.

- [ ] **Step 2: Manual E2E QA** (user runs):
  1. Drop a .fountain file on Library
  2. See "Reading your screenplay…" for ~3-8s
  3. Editor opens with 5-7 notes already in the Notes panel
  4. Session opener message streams into Chat ("Just finished reading…")
  5. Type a reply, watch tokens stream
  6. Click "★ Ask AI" on a scene heading, watch templated message fire
  7. Click "📋 Ingest notes", paste some producer feedback, see new notes appear
  8. Add a manual note via "+ New note"
  9. Delete a note via the ⋯ menu
  10. Export Fountain, confirm content matches

- [ ] **Step 3: Commit + tag**

```bash
git add README.md
git commit -m "docs(mvp-2): updated run + first-session walkthrough"
git tag mvp-2-complete
```

---

## Verification Checklist

After all tasks:

- [ ] `npm test` (server) — 39+ tests pass
- [ ] `npm run build` succeeds end-to-end
- [ ] Fresh upload → 5-7 notes populate the panel within ~8s
- [ ] Editor opens with session-opener greeting streaming
- [ ] Chat works without any note selected
- [ ] "+ New note" creates a note manually
- [ ] "📋 Ingest notes" extracts structured notes from pasted text
- [ ] "📋 Ingest notes" from a .docx / .pdf file works
- [ ] "★ Ask AI" on a scene fires a templated chat
- [ ] Manual deletion of notes works
- [ ] Existing MVP-1 features (autosave, export, chat with character) still work

## Spec Coverage Audit

| Spec feature | Task(s) |
|---|---|
| F1: Auto-triage on upload | Tasks 5, 6, 7 |
| F2: Remove note gate / script-level chat | Task 2 |
| F3: Conversational session opener | Tasks 8, 9 |
| F4: Producer notes ingestion | Tasks 10, 11 |
| F5: "+ New note" / delete note UI | Task 4 |
| F6: Inline scene AI trigger | Task 12 |
| DB migration (triage_status) | Task 1 |
| Chat history endpoint | Task 3 |
| README update | Task 13 |
