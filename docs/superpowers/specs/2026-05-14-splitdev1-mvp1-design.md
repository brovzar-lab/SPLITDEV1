# SPLITDEV1 MVP-1 — Design Spec

**Date:** 2026-05-14
**Repo:** [brovzar-lab/SPLITDEV1](https://github.com/brovzar-lab/SPLITDEV1)
**Status:** Approved by user, ready for implementation planning

---

## Goal

Take SPLITDEV1 from a static-mock prototype to a working local screenplay app.
After this slice ships, a writer should be able to:

1. Upload a real `.fountain` or `.fdx` screenplay
2. See it parsed into the existing editor UI (scenes / lines / notes)
3. Edit it inline — edits persist to a local SQLite database
4. Chat with the AI agents (real Anthropic API calls, streaming)
5. Re-open the app later and find their edits intact
6. Export the edited script back to Fountain or FDX

No auth, no hosting, no collaboration. One user, one machine, multiple
screenplays in a local library.

## Out of Scope (deferred to later slices)

- User accounts, sign-in, hosting
- Real-time collaboration / multi-user editing
- PDF import/export
- Revision color tracking (the production-color stamp stays a visual element only)
- Comments / threaded discussion (chat is per-note, not threaded)
- Settings UI for model selection (model is fixed for MVP-1)
- Mobile / responsive layout
- Tests for the React UI (manual QA only)

## Stack Decisions

| Layer | Choice | Why |
|---|---|---|
| Client | Existing Vite + React 18 + TS | No change |
| Backend runtime | Node | Already on user's machine; one fewer install |
| Backend framework | Express | Stable, well-known, minimal cognitive load |
| Backend language | TypeScript via `tsx` | Match client; zero-config TS runner |
| DB | SQLite via `better-sqlite3` | Single file, synchronous, no ORM needed |
| Fountain parse | `fountain-js` | Battle-tested parser, MIT licensed |
| Fountain serialize | In-house (~150 LOC) | No reliable serializer lib, format is simple |
| FDX parse/serialize | In-house using `fast-xml-parser` | No good lib; format is XML and well-documented |
| AI | `@anthropic-ai/sdk` | Official SDK, supports streaming |
| Default model | `claude-opus-4-7` | Highest quality for creative writing tasks |
| Dev orchestration | `concurrently` | Run `vite` + `tsx watch server/index.ts` together |

## Repo Layout

```
SPLITDEV1/
├── src/                      # existing React client (unchanged shape)
├── server/                   # NEW
│   ├── package.json          # backend deps live here
│   ├── tsconfig.json
│   ├── index.ts              # Express bootstrap
│   ├── db/
│   │   ├── index.ts          # better-sqlite3 connection + helpers
│   │   ├── migrations/       # numbered .sql files, applied on boot
│   │   │   └── 001_init.sql
│   │   └── models/           # one file per table, typed query helpers
│   ├── routes/
│   │   ├── screenplays.ts
│   │   ├── scenes.ts
│   │   ├── lines.ts
│   │   ├── notes.ts
│   │   ├── export.ts
│   │   └── chat.ts           # SSE streaming endpoint
│   ├── parsers/
│   │   ├── fountain.ts       # parse + serialize
│   │   ├── fdx.ts            # parse + serialize
│   │   └── __fixtures__/     # golden files for tests
│   ├── anthropic/
│   │   ├── client.ts
│   │   └── prompts/
│   │       ├── agents/       # one per agent (dialogue, structure, …)
│   │       └── characters/   # generic character prompt template
│   └── data/                 # screenplays.db lives here (gitignored)
├── docs/superpowers/         # specs + plans
├── package.json              # root: dev/build/start scripts
└── …
```

Root `package.json` scripts:

```jsonc
{
  "scripts": {
    "dev":     "concurrently -n web,api -c blue,green \"vite\" \"npm --prefix server run dev\"",
    "build":   "tsc -b && vite build && npm --prefix server run build",
    "start":   "concurrently -n web,api \"npm run preview\" \"npm --prefix server start\"",
    "test":    "npm --prefix server test"
  }
}
```

## Data Model

SQLite tables (numbered migration `001_init.sql`):

```sql
CREATE TABLE screenplay (
  id              TEXT PRIMARY KEY,         -- uuid
  title           TEXT NOT NULL,
  author          TEXT,
  source_format   TEXT NOT NULL,            -- 'fountain' | 'fdx'
  source_text     TEXT NOT NULL,            -- original upload, never mutated
  created_at      INTEGER NOT NULL,         -- unix ms
  updated_at      INTEGER NOT NULL
);

CREATE TABLE scene (
  id              TEXT PRIMARY KEY,
  screenplay_id   TEXT NOT NULL REFERENCES screenplay(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,         -- 0-indexed order within screenplay
  heading         TEXT NOT NULL,
  eighths         TEXT                       -- "1 5/8" etc, optional
);

CREATE TABLE line (
  id              TEXT PRIMARY KEY,
  scene_id        TEXT NOT NULL REFERENCES scene(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,         -- 0-indexed order within scene
  type            TEXT NOT NULL,            -- 'action' | 'dialogue'
  character       TEXT,                     -- only for dialogue
  parenthetical   TEXT,                     -- only for dialogue
  text            TEXT NOT NULL
);

CREATE TABLE note (
  id              TEXT PRIMARY KEY,
  screenplay_id   TEXT NOT NULL REFERENCES screenplay(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  scenes_json     TEXT NOT NULL,            -- JSON array of scene ids
  priority        TEXT NOT NULL,            -- 'high' | 'medium' | 'low'
  status          TEXT NOT NULL,            -- 'unread' | 'discussing' | 'applied'
  origin          TEXT NOT NULL,            -- 'self' | 'producer' | 'director' | …
  confidence      REAL,                     -- 0..1
  created_at      INTEGER NOT NULL
);

CREATE TABLE character_bible (
  id              TEXT PRIMARY KEY,
  screenplay_id   TEXT NOT NULL REFERENCES screenplay(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  age             INTEGER,
  color           TEXT NOT NULL,
  role            TEXT,
  "want"          TEXT,
  "need"          TEXT,
  voice_json      TEXT NOT NULL,            -- JSON array of voice rules
  appearances     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE beat (
  id              TEXT PRIMARY KEY,
  screenplay_id   TEXT NOT NULL REFERENCES screenplay(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,
  name            TEXT NOT NULL,
  scenes_json     TEXT NOT NULL             -- JSON array of scene ids
);

CREATE TABLE revision_entry (
  id              TEXT PRIMARY KEY,
  screenplay_id   TEXT NOT NULL REFERENCES screenplay(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,            -- 'Accepted' | 'Rejected' | 'Note'
  target          TEXT NOT NULL,
  agent           TEXT,
  at              INTEGER NOT NULL
);

CREATE TABLE chat_message (
  id              TEXT PRIMARY KEY,
  screenplay_id   TEXT NOT NULL REFERENCES screenplay(id) ON DELETE CASCADE,
  note_id         TEXT REFERENCES note(id) ON DELETE SET NULL,
  role            TEXT NOT NULL,            -- 'user' | 'ai'
  target_kind     TEXT NOT NULL,            -- 'agent' | 'character'
  target_id       TEXT NOT NULL,            -- agent id or character id
  text            TEXT NOT NULL,
  voice_match     REAL,
  at              INTEGER NOT NULL
);

CREATE INDEX idx_scene_screenplay ON scene(screenplay_id, position);
CREATE INDEX idx_line_scene       ON line(scene_id, position);
CREATE INDEX idx_note_screenplay  ON note(screenplay_id);
CREATE INDEX idx_chat_note        ON chat_message(note_id, at);
```

### Source-of-truth rules

- `screenplay.source_text` is **frozen at upload time**. It is the user's
  original file, never edited.
- `scene` and `line` rows are the **live editable model**. The React editor
  binds to these.
- On export, the server **re-serializes from `scene`/`line` rows**, not from
  `source_text`. This means non-modeled features (Fountain `[[notes]]`,
  boneyards, FDX transitions, dual dialogue) are lost on round-trip. This is a
  documented limitation; users can always download `source_text` separately.
- Notes / character bible / beats are **not derived from the source file** — a
  fresh upload starts with empty notes/bible/beats. Users add them through
  the UI; the API has POST endpoints for each. The mock data we currently
  ship for "The Cabin" is removed; the upload flow replaces it.
- The editor must tolerate a screenplay with zero notes, an empty bible, and
  no beats. The sidebar's beat-grouped scene list falls back to a flat list
  if `beats.length === 0`.

## API Contract

All endpoints return JSON unless noted. Errors use `{ error: string, code: string }`.

### Screenplays

```
GET    /api/screenplays
       → { screenplays: [{ id, title, author, source_format, updated_at }] }

POST   /api/screenplays
       Content-Type: multipart/form-data
       Body: file (.fountain or .fdx), optional title override
       → { screenplay: { id, title, author, source_format } }
       Side effect: parses file, seeds defaults for notes/bible/beats,
                    writes all rows in a single transaction.

GET    /api/screenplays/:id
       → { screenplay, scenes: [{ …, lines: [...] }], notes, characterBible, beats }
       Full payload — what the editor loads on open.

PATCH  /api/screenplays/:id
       Body: { title?, author? }
       → { screenplay }

DELETE /api/screenplays/:id
       → 204
```

### Scenes & Lines (autosave PATCHes)

```
PATCH  /api/scenes/:id              Body: { heading?, position? } → 204
POST   /api/scenes                  Body: { screenplayId, position, heading } → { scene }
DELETE /api/scenes/:id              → 204

PATCH  /api/lines/:id               Body: { text?, character?, parenthetical?, type? } → 204
POST   /api/lines                   Body: { sceneId, position, type, text, … } → { line }
DELETE /api/lines/:id               → 204
```

### Notes

```
POST   /api/screenplays/:id/notes   Body: full note → { note }
PATCH  /api/notes/:id               Body: partial note → { note }
DELETE /api/notes/:id               → 204
```

### Export

```
GET    /api/screenplays/:id/export?format=fountain
       → text/plain, Content-Disposition: attachment; filename="<title>.fountain"

GET    /api/screenplays/:id/export?format=fdx
       → application/xml, Content-Disposition: attachment; filename="<title>.fdx"
```

### Chat (streaming)

```
POST   /api/chat
       Body: {
         screenplayId,
         noteId?,                 // null = generic chat
         target: { kind: 'agent'|'character', id: string },
         message: string
       }
       → text/event-stream
       Events:
         event: token   data: "<token text>"
         event: meta    data: {"voiceMatch":0.83}
         event: done    data: {"messageId":"…"}
         event: error   data: {"error":"…"}
       Side effect: writes user + ai message rows to chat_message table.
```

## Editor Persistence Model

**Optimistic + debounced autosave.**

- Local state updates instantly (existing component state).
- A small `useAutosave(value, mutationFn)` hook fires the PATCH 600ms after
  the last change. Multiple edits to the same line within the debounce window
  collapse into one request.
- A "Saved · just now" indicator replaces the page counter when an autosave
  succeeds. On error: "Save failed — retrying…", retries with exponential
  backoff (3 attempts).
- On reload, GET `/api/screenplays/:id` rehydrates the editor from the DB,
  so a user always sees the latest persisted state.
- No undo/redo persistence in MVP-1 — undo is in-memory only for the session.
- `revision_entry` rows are written by the server in three cases:
  1. When a PATCH on a line resolves an AI suggestion (`action='Accepted'`
     or `'Rejected'`, with the agent name).
  2. When a note is created (`action='Note'`, target = note title).
  3. Manual line edits do **not** create revision entries — only AI-driven
     changes do, to keep the Editor's Log focused on signal.

## AI Integration

### Key handling

- API key in `server/.env` as `ANTHROPIC_API_KEY`.
- `.env` is gitignored. A `server/.env.example` documents the required key.
- The client **never** sees the key. All Anthropic calls go through the server.

### Model

- Fixed to `claude-opus-4-7` for MVP-1. Constant in `server/anthropic/client.ts`.
- A `MODEL` env override is supported for testing with cheaper models.

### Chat flow

1. Client POSTs `/api/chat` with screenplayId, noteId, target, message.
2. Server loads context: note body, target prompt template, active scene
   text, character bible entry (if target is a character), last ~10 messages
   in this note's chat history.
3. Server constructs the Anthropic request:
   - System prompt: agent role description OR character voice rules
   - Messages: prior chat history + new user message
   - Max tokens: 8192
   - Stream: true
4. Server proxies the stream as SSE events to the client.
5. On `message_stop`, server writes both user and AI message rows to
   `chat_message` and emits `event: done`.

### Voice-match scoring

Two places voice-match appears in the UI:

1. **AI suggestions on screenplay lines** (the sticky-note "Dialogue's
   suggestion" cards) — server scores the suggestion against the speaking
   character's voice rules.
2. **Inline chat messages from an Agent** (badge: "voice 87%") — server
   scores the agent's response if it contains dialogue for a known character;
   if no character is referenced, no badge is shown.

Both use a second, cheap Anthropic call:

- Model: `claude-haiku-4-5-20251001` (fast, cheap for scoring)
- Prompt: `"Rate 0.0 to 1.0 how well this dialogue matches these voice rules:
  {{rules}}. Dialogue: {{text}}. Reply with just the number."`
- Result is a `number` between 0 and 1, returned in the SSE `meta` event for
  chat, or in the response body for line suggestions.

Gated behind `VOICE_SCORE_ENABLED` env flag — defaults to `true`. Disable to
save cost. When disabled, no badges render on the client.

### Prompt templates

- One file per agent under `server/anthropic/prompts/agents/<id>.md` —
  loaded at server boot, hot-reload not required.
- `server/anthropic/prompts/characters/voice.md` is the character prompt
  template; the character's `voice_json` rules are interpolated in.
- Each prompt is a Markdown file with a single `{{contextVar}}` placeholder
  syntax. Simple string replace, no template engine.

### Cost guardrails

- Max 8K output tokens per request (Anthropic-enforced).
- 30s wall-clock timeout on the streaming connection.
- No per-user rate limit (single-user local app).

## Auth

**None.** Single-user local. CORS allows `http://localhost:5173` and
`http://localhost:4173` (vite preview port) only. Server binds to
`127.0.0.1`, never `0.0.0.0`, so it's not reachable from the LAN by default.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Parsers | Fountain + FDX, parse + serialize | Vitest + golden file fixtures. For each format: import → assert structured shape, then serialize → assert equivalent re-parse. |
| DB models | CRUD + transactions | Vitest against `:memory:` SQLite, migration applied per test. |
| Routes | All endpoints | `supertest` against an Express app instance with an in-memory DB. |
| Anthropic client | Wire-format + streaming parse | Mock `fetch`; assert request shape and event handling. |
| React client | None | Manual QA only for MVP-1. Add Vitest + Testing Library in a later slice. |

Goldens live under `server/parsers/__fixtures__/` and include the existing
"The Cabin" mock as a reference Fountain file, plus a real industry sample
that we'll source (e.g. one of the public Fountain examples).

## Known Limitations

1. **Round-trip loss**: features the structured model doesn't capture
   (FDX transitions, dual dialogue, in-script ScriptNotes, Fountain
   boneyards) are preserved only in `screenplay.source_text`. Re-exported
   files drop them. The user can always re-download the original.
2. **No conflict resolution**: if two browser tabs edit the same screenplay,
   last write wins. Acceptable for single-user local.
3. **No offline-first sync**: backend must be running. If the server is
   down, the editor shows a banner; edits queue in memory and flush on
   reconnect (basic retry, not full offline support).
4. **AI cost is on the user**: every chat message hits Anthropic. No
   caching, no rate limiting, no usage display in MVP-1.

## Implementation Order (preview — full plan in writing-plans output)

1. Server scaffold (Express + tsx + TypeScript, healthcheck endpoint)
2. SQLite + migrations + db helpers
3. Fountain parser + serializer + tests
4. FDX parser + serializer + tests
5. Screenplay routes (CRUD + upload + GET full)
6. Scene/line routes (autosave PATCHes)
7. Note routes
8. Export routes
9. Client: hook up to `/api/screenplays` library + open
10. Client: replace static `SCREENPLAY` data with real `useScreenplay(id)` hook
11. Client: wire contentEditable handlers to autosave PATCHes
12. Client: library home screen + upload UI
13. Client: export download buttons
14. Server: Anthropic client + prompt templates
15. Server: `/api/chat` SSE endpoint
16. Client: real chat panel wired to SSE
17. Client: voice-match scoring (optional, env-gated)
18. End-to-end manual QA against a real screenplay

## Risks & Mitigations

- **FDX serializer fidelity** — Risk: writing back malformed XML breaks
  Final Draft. Mitigation: golden tests against real `.fdx` files, validate
  against the public FDX schema, ship a "download source_text" escape hatch.
- **Anthropic latency** — Risk: slow first-token times feel broken.
  Mitigation: stream from the first event; show "composing…" until first
  token arrives.
- **Editor state ↔ server drift** — Risk: autosave fails silently, user
  loses work. Mitigation: visible save status indicator, retry with
  backoff, surface persistent failures as a banner.
- **contentEditable quirks** — Risk: complex inline editing is notoriously
  buggy. Mitigation: in MVP-1, edits are line-level (one line = one
  contentEditable element), not full document. Keep it simple.
