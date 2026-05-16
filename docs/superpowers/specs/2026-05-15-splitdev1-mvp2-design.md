# SPLITDEV1 MVP-2 — Design Spec

**Date:** 2026-05-15
**Repo:** [brovzar-lab/SPLITDEV1](https://github.com/brovzar-lab/SPLITDEV1)
**Status:** Approved via autonomous-mode (user said "MVP 2 now")

---

## Goal

Transform SPLITDEV1's first-session experience from "stare at a disabled textarea" into "upload a screenplay and get an AI working partner that says 'here's what I'd look at first, let's go.'"

After this slice ships, a writer's first session should be:

1. Drop a Fountain or FDX file on the library page
2. **Auto-triage** runs in the background — reads the full script, writes 5-7 priority notes to the DB
3. Editor opens with the Notes panel already populated
4. **Session opener** chat message greets the writer: "I've read [Title]. I noticed [N high-priority concerns]. Want to start with [topic]?"
5. Writer types back immediately — chat works **without selecting a note** (script-level conversation)
6. Writer can **paste or upload producer notes** (PDF/.docx/text), AI extracts them into structured Note rows in the panel
7. Writer can click "★ Ask AI" on any scene heading to get instant scene-level feedback

## Out of Scope (deferred to MVP-3)

- "Apply ▸" / "Preview" buttons that mutate the screenplay from chat suggestions
- Revision tracking (`revision_entry` writes still deferred)
- Multi-character ensemble chat (one character at a time stays the model)
- Real-time collaboration
- Export to PDF
- Mobile / responsive

## Problem Statement

MVP-1 was correct as a feature list but wrong as a UX flow. Real user behavior:

- A writer opens a tool, doesn't know what to type first
- Wants to be told "here's what I see, what do you want to fix"
- Wants notes from producers/readers ingested as actionable items, not retyped manually
- Doesn't want to think "do I need to make a note before I can chat?"

MVP-2 fixes the framing.

---

## Features

### F1: Auto-triage on upload

When a Fountain/FDX upload completes, the server fires an Anthropic call that returns structured triage. Result: 5-7 `Note` rows written to the DB with `origin: 'self'`, `status: 'unread'`, varying priorities.

**Backend changes**
- `POST /api/screenplays` returns immediately with the parsed screenplay. Triage runs **async after the response** (fire-and-forget, doesn't block the redirect to the editor).
- New `server/src/triage/runner.ts` — exports `runTriageOnUpload(db, screenplayId)`. Reads full screenplay text, calls Anthropic with a fixed-output JSON schema, validates result, inserts notes in a transaction.
- New prompt: `server/src/anthropic/prompts/triage/intake.md`.
- New `triage_status` column on `screenplay` table (`'pending' | 'running' | 'done' | 'failed'`).
- New `GET /api/screenplays/:id/triage` returns `{ status, error? }` for polling.

**Frontend changes**
- `Library.tsx` upload flow shows "Reading your script…" while waiting; transitions to editor after a triage status of `'done'`. If triage takes > 8s, transition anyway with a "Still reading…" banner in the Notes panel.
- `useTriageStatus(id)` hook polls `/api/screenplays/:id/triage` every 1s while pending.

**Prompt shape**
```
You're a senior screenplay analyst. Read this screenplay and return JSON:

{
  "summary": "1-sentence elevator pitch you'd give the writer",
  "notes": [
    { "title": "...", "body": "1-2 sentences", "priority": "high|medium|low", "sceneHints": ["INT. CABIN - DAY"] }
  ]
}

Return 5-7 notes ordered by priority. Mix structural, character, and dialogue concerns.
```

Validation: zod schema. Failed parse → log + mark `triage_status='failed'`, user sees a banner "AI triage couldn't run" but the editor still loads.

### F2: Remove note gate from chat / script-level conversation

The chat panel works without an active note. When no note is selected, the chat is "script-level" — context includes the screenplay outline (scene headings + first 2 action lines of each) rather than a single scene.

**Backend changes**
- `POST /api/chat` accepts `noteId: null` (already works). When null, the system prompt context shifts from "current scene" to "screenplay outline".
- New prompt path in `server/src/anthropic/prompts/agents/dialogue.md` etc. — interpolated variable `{{outlineContext}}` for script-level mode, `{{sceneContext}}` for note-scoped mode. Implementer picks one based on `noteId` presence.

**Frontend changes**
- `Chat.tsx`:
  - Remove `disabled={!note}` on textarea + send button
  - Placeholder shifts: with note → "Compose to [Agent]…" (today's behavior); without note → "Talk about your script…"
  - Empty-state graphic ("Select a note to begin correspondence") is replaced by the session-opener (F3) when no note is selected
- The note-target picker still works for switching agents / characters

### F3: Conversational session opener

When the editor first loads a screenplay, the AI fires an unprompted opening message. Tone: a working creative partner, not a chatbot.

**Backend changes**
- New endpoint `POST /api/screenplays/:id/session/open` → returns SSE stream of the opening message.
- Server builds context: title, author, scene count, top 3 triage notes (by priority), recent revision history.
- Opening message persisted as `chat_message` row with `role: 'ai'`, `note_id: null`, `target_kind: 'agent'`, `target_id: 'dialogue'`.

**Frontend changes**
- `Editor.tsx` calls `/session/open` on first mount if there's no existing script-level chat history.
- Streams into the Chat panel as the first message.
- Editor.tsx fetches existing chat history (new endpoint: `GET /api/screenplays/:id/chat?noteId=`) on load to support session continuity.

**Opening message style**
The system prompt should produce:
- First sentence: orient ("Welcome back" or "Just finished reading [Title]")
- Second sentence: 1-2 specific observations from triage
- Question: "Where do you want to start?" with 2-3 concrete options

Example output:
> "Just finished reading 'The Cabin.' Two things jumped out — Sarah's motivation in the opening is thin, and the basement scene drops tension halfway through. Where do you want to start? We could rework the cold open, tighten the basement beat, or zoom out on the act structure."

### F4: Producer notes ingestion

Writer pastes or uploads producer notes (PDF / .docx / .txt / .md / plain text). Server extracts structured Note rows.

**Backend changes**
- New `POST /api/screenplays/:id/notes:ingest` accepts:
  - JSON `{ text: string }` for paste flow
  - multipart `file` for upload flow
- File types: `.txt`, `.md`, `.docx` (via `mammoth` lib), `.pdf` (via `pdf-parse` lib). Skip `.pages` (Apple proprietary).
- Server runs Anthropic call to extract structured notes:
  ```
  {
    "origin": "producer|director|exec|reader|table|self",
    "notes": [
      { "title": "...", "body": "...", "priority": "...", "sceneHints": [...] }
    ]
  }
  ```
- Origin detected from prompt header keywords ("from [Producer Name]", "EXEC NOTES:", "Coverage from [Reader]") — defaults to `'reader'` if unclear.
- Inserts as new note rows. Returns the inserted notes.
- Add deps: `mammoth ^1.8.0`, `pdf-parse ^1.1.1`.

**Frontend changes**
- `Notes.tsx` gets two new UI affordances:
  - "📋 Paste notes" button → opens a modal with a large textarea + origin dropdown + submit button
  - "📎 Upload notes file" button → file picker accepting `.txt,.md,.docx,.pdf`
- New `IngestModal.tsx` component for the paste flow
- After ingestion, new notes appear in the Notes panel with a brief "+N notes added" flash

### F5: "Add note" + delete note in Notes panel

Foundational gap from MVP-1: there's no way to manually create or delete notes through the UI.

**Frontend changes**
- `Notes.tsx`: Add a "+ New note" button in the header
- Clicking it inline-expands a small form: title input, body textarea, priority + status dropdowns
- Submit calls `api.createNote`. New note appears in the list, becomes active.
- Each note row gets a small ⋯ menu with "Delete" action

### F6: Inline scene AI trigger ("★ Ask AI")

Each scene heading in the screenplay view gets a small "★ Ask AI" button. Clicking it:
1. Sets the active scene to that scene
2. Opens (or focuses) the chat panel
3. Pre-fills a templated question: "Tell me what's working and what isn't in this scene. Focus on [structure/dialogue/character based on agent selected]."
4. Auto-sends the message — user gets immediate feedback without typing.

**Frontend changes**
- `Screenplay.tsx`: Add `<button class="ask-ai">★ Ask AI</button>` next to each scene heading (subtle, brand-aligned)
- On click: triggers an `onAskScene(sceneId)` callback prop
- `Editor.tsx`: callback sets active scene + fires `useChatStream.send({ ... })` with a pre-built message

## Data Model Changes

```sql
-- Migration 002_mvp2.sql:
ALTER TABLE screenplay ADD COLUMN triage_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE screenplay ADD COLUMN triage_error TEXT;
```

## New API Endpoints

```
POST   /api/screenplays/:id/session/open     SSE — opening message stream
GET    /api/screenplays/:id/triage           { status, error? }
GET    /api/screenplays/:id/chat?noteId=     [{ role, text, target, at }, ...]
POST   /api/screenplays/:id/notes:ingest     JSON or multipart → { notes: [...] }
```

(`POST /api/screenplays` keeps current shape but now triggers async triage as a side effect.)

## Implementation Order (preview)

1. DB migration 002 + triage status column
2. Triage runner + intake prompt + tests (mocked Anthropic)
3. Triage status endpoint
4. Async triage trigger in upload route
5. Frontend: useTriageStatus hook + Library upload-with-triage flow
6. Backend: chat history GET endpoint
7. Backend: script-level chat (remove note gate, swap outline context for scene context)
8. Frontend: Chat.tsx remove note gate, add script-level placeholder
9. Backend: session opener SSE endpoint + prompt
10. Frontend: Editor session-opener auto-fire on first mount
11. Frontend: Notes "+ New note" + delete UI
12. Backend: notes ingestion endpoint + mammoth/pdf-parse deps
13. Backend: extraction prompt + tests
14. Frontend: IngestModal + Notes panel paste/upload UI
15. Frontend: Screenplay.tsx "★ Ask AI" button + Editor callback
16. End-to-end manual QA

## Risks & Mitigations

- **Anthropic latency on auto-triage** — Risk: writer waits 8+ seconds staring at the upload card. Mitigation: server returns 201 immediately, triage runs after; Library transitions to editor after 5s or when triage status flips to 'done'. Triage notes appear in the panel as they arrive (single transaction).
- **Cost of running Anthropic on every upload + every session open** — User pays. Auto-triage is ~1 Opus call. Session opener is ~1 Opus call. Acceptable for MVP-2, but worth a "disable AI" toggle in MVP-3.
- **PDF parsing fidelity** — `pdf-parse` returns plain text, no layout. Some PDF notes (image scans, multi-column) will produce garbage. Document this in error message: "Couldn't read this PDF — try pasting the text instead."
- **`.docx` only** — `.pages` is closed-format. Users with Apple Pages files will have to "Export to .docx" first. Add a small note in the upload UI.

## Known Limitations Carried Over

- Editor's Log (`revision_entry`) still not populated (continues to be deferred — needs the chat Apply flow)
- No auth, single-user local
- No real-time collab
