# SPLITDEV — The Writer's Atelier
## V1
<img width="2034" height="1042" alt="SPLITDEV — The Writer's Atelier" src="https://github.com/user-attachments/assets/784ac6e5-0f20-4d99-8871-1ce109d85368" />

A local-first screenplay editor that pairs a writer with named AI agents. Upload a real `.fountain` or `.fdx`, edit it inline with autosave, chat with Dialogue / Structure / Character / Horror / Conflict / Theme agents, and export back.
## V2
<img width="2053" height="1057" alt="Screenshot 2026-05-16 at 2 56 05 PM" src="https://github.com/user-attachments/assets/51ba523a-0db0-4924-bb5b-3cf7271b850d" />

Originally a static-mock prototype (`SPLITDEV_.zip` → `redesign/*.jsx`). MVP-1 ships a real Node + Express + SQLite backend and wires the existing React UI to it.

## Architecture

```
SPLITDEV1/
├── src/                            # React 18 + TS client (Vite)
│   ├── pages/
│   │   ├── Library.tsx             # Home: upload + list of screenplays
│   │   └── Editor.tsx              # The editor, loaded from /api/screenplays/:id
│   ├── components/                 # TopBar, Sidebar, Screenplay, Notes, Chat, Bible, History, …
│   ├── hooks/
│   │   ├── useScreenplays.ts       # Library list
│   │   ├── useScreenplay.ts        # Single screenplay + setData for optimistic edits
│   │   ├── useAutosave.ts          # Debounced PATCH
│   │   └── useChatStream.ts        # SSE consumer for /api/chat
│   ├── api/
│   │   ├── client.ts               # Typed fetch wrapper
│   │   └── types.ts                # Shared types (mirror of server)
│   └── tokens.ts                   # `RD` design tokens
└── server/                         # Node + Express + better-sqlite3
    ├── src/
    │   ├── app.ts                  # buildApp() — Express factory (injectable DB)
    │   ├── index.ts                # Boots on 127.0.0.1:8787
    │   ├── db/
    │   │   ├── index.ts            # openDb() + migration runner
    │   │   └── migrations/001_init.sql
    │   ├── models/                 # screenplay, scene, line, note, characterBible, beat, revision, chat
    │   ├── routes/                 # screenplays, scenes, lines, notes, exportRoute, chat, health
    │   ├── parsers/                # fountain.ts, fdx.ts (parse + serialize)
    │   └── anthropic/
    │       ├── client.ts           # Lazy-init Anthropic SDK
    │       ├── prompts.ts          # File loader + {{var}} interpolator
    │       └── prompts/            # agents/*.md + characters/voice.md
    └── tests/                      # vitest + supertest (28 tests, 11 files)
```

## Run locally

1. Copy `server/.env.example` to `server/.env` and set `ANTHROPIC_API_KEY` (chat doesn't work without it).
2. From the repo root:

```bash
npm install
npm install --prefix server
npm run dev
```

Two processes start via `concurrently`:
- Vite at `http://localhost:5173/` (with `/api` proxied to the server)
- Express at `http://127.0.0.1:8787/`

Open `http://localhost:5173/`. Upload a `.fountain` or `.fdx` from the library page, click it, edit in place. Edits autosave to `server/data/screenplays.db`.

## First session (MVP-2)

1. **Upload** a Fountain or FDX file. The card shows "Reading your screenplay…" for a few seconds.
2. **Auto-triage** runs — the AI reads the full script and writes 5–7 priority notes to your Notes panel.
3. **Editor opens** with the Notes panel already populated.
4. The **AI greets you** in the chat: "Just finished reading [Title]. Two things jumped out — [X] and [Y]. Where do you want to start?"
5. **Chat just works** — no need to select a note first. Talk to the script as a whole, or click a note in the panel to scope the conversation.
6. **Producer notes?** Click "📋 Ingest notes" in the Notes panel. Paste an email or upload a `.txt` / `.md` / `.docx` / `.pdf`. The AI extracts each distinct concern into its own structured note row.
7. **Want feedback on a specific scene?** Click "★ Ask AI" next to any scene heading. A templated question fires automatically.
8. **Add your own notes** via "+ New note" in the panel.
9. **Export** the edited script back to Fountain or FDX via the Export menu in the top bar.

## Other scripts

```bash
npm run build        # type-check client + Vite build + server tsc (with prompt/migration copy)
npm run preview      # serve the production build
npm test             # run server vitest suite
```

## API

- `GET    /api/screenplays`                          — library list (no `source_text`)
- `POST   /api/screenplays`                          — multipart upload (`file` field)
- `GET    /api/screenplays/:id`                      — full payload (screenplay + scenes/lines + notes + bible + beats)
- `DELETE /api/screenplays/:id`                      — cascading delete
- `PATCH  /api/scenes/:id`, `POST /api/scenes`, `DELETE /api/scenes/:id`
- `PATCH  /api/lines/:id`,  `POST /api/lines`,  `DELETE /api/lines/:id`
- `POST   /api/screenplays/:id/notes`, `PATCH /api/notes/:id`, `DELETE /api/notes/:id`
- `GET    /api/screenplays/:id/export?format=fountain|fdx`
- `POST   /api/chat`                                 — SSE stream of token / meta / done / error events
- `POST   /api/screenplays/:id/session/open`         — SSE stream of the unprompted AI greeting on editor open
- `GET    /api/screenplays/:id/chat?noteId=`         — chat history (default: script-level, noteId=null)
- `GET    /api/screenplays/:id/triage`               — auto-triage status (`pending` | `running` | `done` | `failed`)
- `POST   /api/screenplays/:id/notes:ingest`         — paste text or upload `.txt/.md/.docx/.pdf` → AI-extracted note rows
- `GET    /api/health`

Full design + decisions: [`docs/superpowers/specs/2026-05-14-splitdev1-mvp1-design.md`](docs/superpowers/specs/2026-05-14-splitdev1-mvp1-design.md).
Implementation plan: [`docs/superpowers/plans/2026-05-14-splitdev1-mvp1.md`](docs/superpowers/plans/2026-05-14-splitdev1-mvp1.md).

## Known limitations (MVP-2)

- **Lossy round-trip**: features the structured model doesn't capture (FDX transitions, dual dialogue, in-script script-notes, Fountain boneyards) survive only in `screenplay.source_text` and are dropped on re-export. The original upload is preserved in the DB if you ever need to recover it.
- **No auth**: server binds to `127.0.0.1` only, single-user local.
- **PDF ingestion fidelity** depends on the PDF. Text-based PDFs work well. Scanned or image-based PDFs return garbage — paste the text into the modal instead.
- **`.pages` files are not supported.** Apple Pages is a closed format; export to `.docx` first.
- **AI cost on the user**: every upload triggers auto-triage (1 Opus call), every editor open triggers a session greeting (1 Opus call), every chat message hits Anthropic. No caching, no rate limit.
- **Editor's Log (`revision_entry`)** is wired in the DB but the "Apply ▸" chat suggestion flow that would write to it is still deferred to MVP-3.
- **Character Bible / Beats start empty** on upload — those are still added through the UI manually (Notes are now auto-populated by triage).

## Tech stack

- **Client**: React 18.3, React Router 7, TypeScript 5.6, Vite 5, inline styles via `RD` token object, no CSS framework
- **Server**: Node 20+, Express 4, `better-sqlite3` 11, `tsx` (dev), TypeScript 5.6
- **Parsers**: `fountain-js` (parse) + in-house Fountain serializer, in-house FDX parser + serializer using `fast-xml-parser`
- **Note ingestion**: `mammoth` (.docx → text), `pdf-parse` (.pdf → text), Anthropic for structured extraction (zod-validated)
- **AI**: `@anthropic-ai/sdk`, default model `claude-opus-4-7`, voice-match scoring via `claude-haiku-4-5-20251001`
- **Testing**: Vitest + supertest, 40 tests across server (React UI is manual QA)
