# SPLITDEV1 MVP-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take SPLITDEV1 from a static mock to a working local screenplay app — upload `.fountain`/`.fdx`, parse, edit with autosave, chat with real Anthropic agents, export back to both formats.

**Architecture:** Existing Vite + React 18 client gets paired with a new Node + Express + SQLite backend in `server/`. Parsers run server-side. Editor state binds to API; debounced PATCHes autosave per-line. Anthropic SDK proxied behind the server (no key in the browser); chat streams to the client via SSE.

**Tech Stack:** Node 20 · Express 4 · `better-sqlite3` · `tsx` · TypeScript 5.6 · `fountain-js` · `fast-xml-parser` · `@anthropic-ai/sdk` · React 18 · React Router 6 · Vitest · `supertest` · `concurrently`

**Spec:** [`docs/superpowers/specs/2026-05-14-splitdev1-mvp1-design.md`](../specs/2026-05-14-splitdev1-mvp1-design.md)

**Working directory for every task:** `/Users/quantumcode/CODE/SPLITDEV1/`

---

## File Structure

### Created files

```
server/
├── package.json                              # Backend deps
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── src/
│   ├── index.ts                              # Boot: build app, listen on 127.0.0.1:8787
│   ├── app.ts                                # buildApp() — exported for tests
│   ├── env.ts                                # Typed env loader
│   ├── db/
│   │   ├── index.ts                          # better-sqlite3 connection + migrate()
│   │   └── migrations/
│   │       └── 001_init.sql
│   ├── models/                               # One file per table, typed helpers
│   │   ├── screenplay.ts
│   │   ├── scene.ts
│   │   ├── line.ts
│   │   ├── note.ts
│   │   ├── characterBible.ts
│   │   ├── beat.ts
│   │   ├── revision.ts
│   │   └── chat.ts
│   ├── routes/
│   │   ├── health.ts
│   │   ├── screenplays.ts
│   │   ├── scenes.ts
│   │   ├── lines.ts
│   │   ├── notes.ts
│   │   ├── exportRoute.ts
│   │   └── chat.ts                           # SSE
│   ├── parsers/
│   │   ├── types.ts                          # Shared parser types
│   │   ├── fountain.ts                       # parse + serialize
│   │   ├── fdx.ts                            # parse + serialize
│   │   └── __fixtures__/
│   │       ├── the-cabin.fountain
│   │       ├── the-cabin.fdx
│   │       └── minimal.fountain
│   └── anthropic/
│       ├── client.ts
│       ├── prompts.ts                        # Loader + interpolator
│       └── prompts/
│           ├── agents/
│           │   ├── dialogue.md
│           │   ├── structure.md
│           │   ├── character.md
│           │   ├── horror.md
│           │   ├── conflict.md
│           │   └── theme.md
│           └── characters/
│               └── voice.md
└── tests/                                    # Mirrors src/

src/api/client.ts                              # Typed fetch wrapper
src/api/types.ts                               # Shared API types (mirror server)
src/hooks/useScreenplays.ts                    # Library list
src/hooks/useScreenplay.ts                     # Single screenplay + mutations
src/hooks/useAutosave.ts                       # Debounced PATCH
src/hooks/useChatStream.ts                    # SSE consumer
src/pages/Library.tsx                          # Home: list + upload
src/pages/Editor.tsx                           # Wraps current App body
src/components/Library/UploadCard.tsx
src/components/Library/ScreenplayRow.tsx
src/components/Editor/SaveIndicator.tsx        # Replaces page counter
```

### Modified files

```
package.json                                   # Root scripts, add concurrently
.gitignore                                     # server/data, server/.env
src/main.tsx                                   # Add BrowserRouter
src/App.tsx                                    # Becomes thin router shell
src/components/Sidebar.tsx                     # Beats fallback when empty
src/components/Screenplay.tsx                  # onBlur → autosave PATCH
src/components/Notes.tsx                       # Props from hook, not static
src/components/Chat.tsx                        # useChatStream instead of mock
src/components/TopBar.tsx                      # SaveIndicator slot
src/types.ts                                   # Sync with server data shapes
```

### Removed (mock fixtures become unused once API wires up; keep for tests / fall back to API responses)

```
src/data/screenplay.ts                         # superseded
src/data/notes.ts                              # superseded
src/data/characters.ts                         # superseded (UNDO_HISTORY too)
```

> Kept as-is: `src/data/agents.ts` (agent list is configuration, not data), `src/data/revisions.ts` (revision color palette), `src/data/responses.ts` (only for fallback if AI is offline — used as last-ditch error path).

---

## Phase 1 — Server foundations

### Task 1: Server scaffold + healthcheck

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/.env.example`
- Create: `server/.gitignore`
- Create: `server/src/env.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Create: `server/src/routes/health.ts`
- Create: `server/tests/health.test.ts`
- Modify: `package.json` (root scripts)
- Modify: `.gitignore`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "splitdev1-server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -b",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "better-sqlite3": "^11.3.0",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "fast-xml-parser": "^4.5.0",
    "fountain-js": "^1.2.4",
    "multer": "^1.4.5-lts.1",
    "uuid": "^10.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/express": "^5.0.0",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.7.0",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^10.0.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 4: Create `server/.env.example`**

```
ANTHROPIC_API_KEY=
PORT=8787
DB_PATH=./data/screenplays.db
MODEL=claude-opus-4-7
VOICE_SCORE_MODEL=claude-haiku-4-5-20251001
VOICE_SCORE_ENABLED=true
```

- [ ] **Step 5: Create `server/.gitignore`**

```
node_modules
dist
data/*.db
data/*.db-journal
.env
.env.local
*.tsbuildinfo
```

- [ ] **Step 6: Create `server/src/env.ts`**

```ts
import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  PORT: Number(required('PORT', '8787')),
  DB_PATH: required('DB_PATH', './data/screenplays.db'),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  MODEL: required('MODEL', 'claude-opus-4-7'),
  VOICE_SCORE_MODEL: required('VOICE_SCORE_MODEL', 'claude-haiku-4-5-20251001'),
  VOICE_SCORE_ENABLED: process.env.VOICE_SCORE_ENABLED !== 'false',
};
```

- [ ] **Step 7: Create the failing test `server/tests/health.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: expect.any(String) });
  });
});
```

- [ ] **Step 8: Run test, verify it fails**

```bash
cd server && npm install && npm test
```
Expected: FAIL with "Cannot find module '../src/app.js'".

- [ ] **Step 9: Create `server/src/routes/health.ts`**

```ts
import { Router } from 'express';
const r = Router();
r.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.0.1' });
});
export default r;
```

- [ ] **Step 10: Create `server/src/app.ts`**

```ts
import express from 'express';
import health from './routes/health.js';

export function buildApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', health);
  return app;
}
```

- [ ] **Step 11: Create `server/src/index.ts`**

```ts
import { buildApp } from './app.js';
import { env } from './env.js';

const app = buildApp();
app.listen(env.PORT, '127.0.0.1', () => {
  console.log(`splitdev1 server on http://127.0.0.1:${env.PORT}`);
});
```

- [ ] **Step 12: Run test, verify it passes**

```bash
cd server && npm test
```
Expected: PASS, 1 test.

- [ ] **Step 13: Update root `package.json` scripts and add `concurrently`**

Modify `package.json` to add `concurrently` and chained scripts:

```jsonc
{
  "scripts": {
    "dev":     "concurrently -n web,api -c blue,green \"vite\" \"npm --prefix server run dev\"",
    "dev:web": "vite",
    "dev:api": "npm --prefix server run dev",
    "build":   "tsc -b && vite build && npm --prefix server run build",
    "preview": "vite preview",
    "start":   "concurrently -n web,api \"npm run preview\" \"npm --prefix server start\"",
    "test":    "npm --prefix server test"
  }
}
```

Then in repo root: `npm install --save-dev concurrently`.

- [ ] **Step 14: Update root `.gitignore`**

Append:

```
server/node_modules
server/dist
server/data/*.db
server/data/*.db-journal
server/.env
```

- [ ] **Step 15: Manual smoke test**

In the repo root: `npm run dev`.
Expected: Vite serves on `localhost:5173`, `splitdev1 server on http://127.0.0.1:8787` logged. `curl http://127.0.0.1:8787/api/health` returns `{"status":"ok","version":"0.0.1"}`. Kill with `Ctrl+C`.

- [ ] **Step 16: Commit**

```bash
git add server/ package.json package-lock.json .gitignore
git commit -m "feat(server): scaffold Express + tsx + vitest, healthcheck endpoint"
```

---

### Task 2: SQLite connection + initial migration

**Files:**
- Create: `server/src/db/index.ts`
- Create: `server/src/db/migrations/001_init.sql`
- Create: `server/tests/db.test.ts`
- Create: `server/data/.gitkeep`

- [ ] **Step 1: Create `server/data/.gitkeep`** (empty file so dir tracks)

- [ ] **Step 2: Create the failing test `server/tests/db.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { openDb } from '../src/db/index.js';

describe('db', () => {
  it('opens in-memory db and runs migrations', () => {
    const db = openDb(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const names = tables.map(t => t.name);
    expect(names).toContain('screenplay');
    expect(names).toContain('scene');
    expect(names).toContain('line');
    expect(names).toContain('note');
    expect(names).toContain('character_bible');
    expect(names).toContain('beat');
    expect(names).toContain('revision_entry');
    expect(names).toContain('chat_message');
    db.close();
  });

  it('enforces foreign keys', () => {
    const db = openDb(':memory:');
    expect(() =>
      db.prepare('INSERT INTO scene (id, screenplay_id, position, heading) VALUES (?,?,?,?)').run(
        'x', 'missing', 0, 'INT. X - DAY',
      ),
    ).toThrow(/FOREIGN KEY/);
    db.close();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

```bash
cd server && npm test
```
Expected: FAIL — `openDb` not found.

- [ ] **Step 4: Create `server/src/db/migrations/001_init.sql`** with the full schema from the spec (paste verbatim from the design doc's Data Model section). Include all 8 tables and 4 indexes.

- [ ] **Step 5: Create `server/src/db/index.ts`**

```ts
import Database from 'better-sqlite3';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

export type DB = Database.Database;

export function openDb(path: string): DB {
  if (path !== ':memory:') {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

function migrate(db: DB) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL
  )`);
  const applied = new Set(
    (db.prepare('SELECT id FROM _migrations').all() as Array<{ id: string }>).map(r => r.id),
  );
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  const insert = db.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)');
  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      insert.run(f, Date.now());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
```

- [ ] **Step 6: Run test, verify it passes**

```bash
cd server && npm test
```
Expected: 3 tests pass (1 health + 2 db).

- [ ] **Step 7: Commit**

```bash
git add server/src/db server/tests/db.test.ts server/data/.gitkeep
git commit -m "feat(server): better-sqlite3 connection + initial schema migration"
```

---

### Task 3: Shared data types

**Files:**
- Create: `server/src/models/types.ts`
- Create: `src/api/types.ts` (client mirror)

These types are used across server routes, parsers, and the React client. Keep them in sync; for MVP-1, manual duplication is fine.

- [ ] **Step 1: Create `server/src/models/types.ts`**

```ts
export type SourceFormat = 'fountain' | 'fdx';
export type LineType = 'action' | 'dialogue';
export type NotePriority = 'high' | 'medium' | 'low';
export type NoteStatus = 'unread' | 'discussing' | 'applied';
export type NoteOrigin = 'self' | 'producer' | 'director' | 'exec' | 'reader' | 'table';

export interface Screenplay {
  id: string;
  title: string;
  author: string | null;
  source_format: SourceFormat;
  source_text: string;
  created_at: number;
  updated_at: number;
}

export interface Scene {
  id: string;
  screenplay_id: string;
  position: number;
  heading: string;
  eighths: string | null;
}

export interface Line {
  id: string;
  scene_id: string;
  position: number;
  type: LineType;
  character: string | null;
  parenthetical: string | null;
  text: string;
}

export interface Note {
  id: string;
  screenplay_id: string;
  title: string;
  body: string;
  scenes: string[];           // hydrated from scenes_json
  priority: NotePriority;
  status: NoteStatus;
  origin: NoteOrigin;
  confidence: number | null;
  created_at: number;
}

export interface CharacterBibleEntry {
  id: string;
  screenplay_id: string;
  name: string;
  age: number | null;
  color: string;
  role: string | null;
  want: string | null;
  need: string | null;
  voice: string[];
  appearances: number;
}

export interface Beat {
  id: string;
  screenplay_id: string;
  position: number;
  name: string;
  scenes: string[];
}

export interface RevisionEntry {
  id: string;
  screenplay_id: string;
  action: 'Accepted' | 'Rejected' | 'Note';
  target: string;
  agent: string | null;
  at: number;
}

export interface ChatMessage {
  id: string;
  screenplay_id: string;
  note_id: string | null;
  role: 'user' | 'ai';
  target_kind: 'agent' | 'character';
  target_id: string;
  text: string;
  voice_match: number | null;
  at: number;
}

export interface FullScreenplay {
  screenplay: Screenplay;
  scenes: Array<Scene & { lines: Line[] }>;
  notes: Note[];
  characterBible: CharacterBibleEntry[];
  beats: Beat[];
}
```

- [ ] **Step 2: Create `src/api/types.ts`** — paste the same content (the client uses the same shapes). Drop `source_text` from the client `Screenplay` type — the client never needs the full source blob until export.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/types.ts src/api/types.ts
git commit -m "feat: shared data types for server + client"
```

---

## Phase 2 — Parsers (independent, testable)

### Task 4: Fountain parser

**Files:**
- Create: `server/src/parsers/types.ts`
- Create: `server/src/parsers/fountain.ts`
- Create: `server/src/parsers/__fixtures__/the-cabin.fountain`
- Create: `server/src/parsers/__fixtures__/minimal.fountain`
- Create: `server/tests/parsers/fountain.test.ts`

The parser output is a `ParsedScreenplay` — an in-memory shape that the DB seeder converts into rows.

- [ ] **Step 1: Create `server/src/parsers/types.ts`**

```ts
import type { LineType } from '../models/types.js';

export interface ParsedLine {
  type: LineType;
  text: string;
  character?: string;
  parenthetical?: string;
}

export interface ParsedScene {
  heading: string;
  lines: ParsedLine[];
}

export interface ParsedScreenplay {
  title: string;
  author?: string;
  scenes: ParsedScene[];
}
```

- [ ] **Step 2: Create the failing test `server/tests/parsers/fountain.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseFountain } from '../../src/parsers/fountain.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'parsers', '__fixtures__');

describe('parseFountain', () => {
  it('parses minimal screenplay', () => {
    const src = readFileSync(join(fixtureDir, 'minimal.fountain'), 'utf8');
    const ps = parseFountain(src);
    expect(ps.title).toBe('Minimal');
    expect(ps.scenes).toHaveLength(1);
    expect(ps.scenes[0].heading).toBe('INT. ROOM - DAY');
    expect(ps.scenes[0].lines[0]).toEqual({ type: 'action', text: 'A bare room. SARAH paces.' });
    expect(ps.scenes[0].lines[1]).toMatchObject({
      type: 'dialogue',
      character: 'SARAH',
      text: 'Are we starting?',
    });
  });

  it('parses The Cabin fixture into 4 scenes with dialogue + action', () => {
    const src = readFileSync(join(fixtureDir, 'the-cabin.fountain'), 'utf8');
    const ps = parseFountain(src);
    expect(ps.title).toMatch(/cabin/i);
    expect(ps.scenes.length).toBeGreaterThanOrEqual(4);
    const dialogue = ps.scenes.flatMap(s => s.lines).filter(l => l.type === 'dialogue');
    expect(dialogue.some(d => d.character === 'SARAH')).toBe(true);
    expect(dialogue.some(d => d.parenthetical?.includes('into phone'))).toBe(true);
  });
});
```

- [ ] **Step 3: Create `server/src/parsers/__fixtures__/minimal.fountain`**

```
Title: Minimal
Author: Test

INT. ROOM - DAY

A bare room. SARAH paces.

SARAH
Are we starting?
```

- [ ] **Step 4: Create `server/src/parsers/__fixtures__/the-cabin.fountain`** — derive this from `src/data/screenplay.ts`'s `SCREENPLAY` mock. Format:

```
Title: The Cabin
Author: Maya Reeves

INT. CABIN - DAY

The cabin is old and dusty. Sunlight filters through dirty windows.

Furniture covered in white sheets. A grandfather clock ticks in the corner.

SARAH
I told you, I'll be fine. It's just a weekend.

She sets her bag down. Something CREAKS upstairs.

SARAH
(into phone)
Hold on—

She stares at the ceiling. The creaking stops.

Sarah slowly lowers the phone. Listens. Nothing.

SARAH
(into phone, forced casual)
It's nothing. Old house noises.

EXT. WOODS - DAY

A narrow trail cuts through dense pines. Morning fog clings to the ground.

Sarah walks the trail, earbuds in. She doesn't notice the FIGURE behind the trees.

SARAH
(to herself)
This was supposed to be relaxing...

She stops at a clearing. The woods are silent.

A BRANCH snaps somewhere behind her. She spins around.

SARAH
Hello?

Nothing. Just the trees. She exhales, walks faster.

INT. BASEMENT - NIGHT

Concrete stairs descend into darkness. A bare bulb swings overhead, casting wild shadows.

Sarah reaches the bottom step. Stops. Listens.

SARAH
(whispered)
Hello?

The bulb flickers. In the strobe, something MOVES in the far corner.

Sarah fumbles for her phone flashlight. Hands shaking.

SARAH
(to herself)
Just the boiler. Just the boiler.

EXT. LAKE - DUSK

Golden hour light on still water. The lake is glass-smooth, reflecting the treeline.

Sarah sits on the dock, feet dangling. A moment of peace.

Something BUMPS the underside of the dock. She pulls her feet up.

SARAH
What the...

She peers over the edge. The water is dark, opaque. Another BUMP.
```

This fixture is the Fountain equivalent of the four mock scenes in `src/data/screenplay.ts`. `change` markers from the mock are skipped — those are AI suggestions overlaid on the script, not source content.

- [ ] **Step 5: Run test, verify it fails**

```bash
cd server && npm test parsers/fountain
```
Expected: FAIL — `parseFountain` not found.

- [ ] **Step 6: Create `server/src/parsers/fountain.ts`**

```ts
import { Fountain } from 'fountain-js';
import type { ParsedScreenplay, ParsedScene, ParsedLine } from './types.js';

const SCENE_HEADING = /^(INT|EXT|EST|I\/E|INT\.\/EXT|EXT\.\/INT)[\.\s]/i;

export function parseFountain(source: string): ParsedScreenplay {
  const f = new Fountain();
  const out = f.parse(source);
  const titleMeta = (out.title_page || []).reduce<Record<string, string>>((acc, tok: any) => {
    if (tok.type === 'title') acc.title = tok.text;
    if (tok.type === 'author') acc.author = tok.text;
    return acc;
  }, {});

  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let lastCharacter: string | undefined;
  let lastParenthetical: string | undefined;

  for (const tok of out.tokens as any[]) {
    switch (tok.type) {
      case 'scene_heading': {
        current = { heading: stripBracketSceneNumber(tok.text), lines: [] };
        scenes.push(current);
        break;
      }
      case 'action': {
        if (!current) {
          current = { heading: 'UNTITLED', lines: [] };
          scenes.push(current);
        }
        current.lines.push({ type: 'action', text: tok.text.trim() });
        break;
      }
      case 'character': {
        lastCharacter = tok.text.replace(/\^$/, '').trim();
        lastParenthetical = undefined;
        break;
      }
      case 'parenthetical': {
        lastParenthetical = tok.text.replace(/^\(/, '').replace(/\)$/, '').trim();
        break;
      }
      case 'dialogue': {
        if (!current || !lastCharacter) break;
        const line: ParsedLine = { type: 'dialogue', character: lastCharacter, text: tok.text.trim() };
        if (lastParenthetical) line.parenthetical = lastParenthetical;
        current.lines.push(line);
        lastParenthetical = undefined;
        break;
      }
      // skip boneyards, transitions, notes — round-trip lossiness called out in spec
    }
  }

  return {
    title: titleMeta.title?.trim() || 'Untitled',
    author: titleMeta.author?.trim(),
    scenes,
  };
}

function stripBracketSceneNumber(s: string): string {
  return s.replace(/\s*#\S+#\s*$/, '').trim();
}
```

> **Note for implementer:** `fountain-js` types are loose. The cast `any[]` is intentional. If TS strict complains, add a minimal local interface for tokens at the top of the file.

- [ ] **Step 7: Run test, verify it passes**

```bash
cd server && npm test parsers/fountain
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/parsers/types.ts server/src/parsers/fountain.ts server/src/parsers/__fixtures__ server/tests/parsers
git commit -m "feat(parsers): fountain parser + fixtures + tests"
```

---

### Task 5: Fountain serializer

**Files:**
- Modify: `server/src/parsers/fountain.ts` (add `serializeFountain`)
- Modify: `server/tests/parsers/fountain.test.ts` (round-trip tests)

- [ ] **Step 1: Add a failing round-trip test**

Append to `server/tests/parsers/fountain.test.ts`:

```ts
import { serializeFountain } from '../../src/parsers/fountain.js';

describe('serializeFountain', () => {
  it('round-trips a minimal screenplay', () => {
    const src = readFileSync(join(fixtureDir, 'minimal.fountain'), 'utf8');
    const ps = parseFountain(src);
    const back = serializeFountain(ps);
    const reparsed = parseFountain(back);
    expect(reparsed.title).toBe(ps.title);
    expect(reparsed.scenes).toEqual(ps.scenes);
  });

  it('preserves parentheticals and dialogue across round-trip', () => {
    const src = readFileSync(join(fixtureDir, 'the-cabin.fountain'), 'utf8');
    const ps = parseFountain(src);
    const back = serializeFountain(ps);
    const reparsed = parseFountain(back);
    expect(reparsed.scenes.length).toBe(ps.scenes.length);
    expect(reparsed.scenes[0].lines).toEqual(ps.scenes[0].lines);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd server && npm test parsers/fountain
```
Expected: FAIL — `serializeFountain` not found.

- [ ] **Step 3: Implement `serializeFountain` in `server/src/parsers/fountain.ts`**

Append:

```ts
export function serializeFountain(ps: ParsedScreenplay): string {
  const lines: string[] = [];
  if (ps.title) lines.push(`Title: ${ps.title}`);
  if (ps.author) lines.push(`Author: ${ps.author}`);
  if (lines.length) lines.push('');

  for (const scene of ps.scenes) {
    lines.push('');
    lines.push(scene.heading);
    lines.push('');
    for (const l of scene.lines) {
      if (l.type === 'action') {
        lines.push(l.text);
        lines.push('');
      } else {
        lines.push(l.character ?? 'UNKNOWN');
        if (l.parenthetical) lines.push(`(${l.parenthetical})`);
        lines.push(l.text);
        lines.push('');
      }
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd server && npm test parsers/fountain
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/parsers/fountain.ts server/tests/parsers/fountain.test.ts
git commit -m "feat(parsers): fountain serializer with round-trip tests"
```

---

### Task 6: FDX parser

**Files:**
- Create: `server/src/parsers/fdx.ts`
- Create: `server/src/parsers/__fixtures__/the-cabin.fdx`
- Create: `server/tests/parsers/fdx.test.ts`

- [ ] **Step 1: Create `server/src/parsers/__fixtures__/the-cabin.fdx`**

Produce a minimal valid Final Draft XML file representing the same 4 scenes. Skeleton:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <Paragraph Type="Scene Heading"><Text>INT. CABIN - DAY</Text></Paragraph>
    <Paragraph Type="Action"><Text>The cabin is old and dusty. Sunlight filters through dirty windows.</Text></Paragraph>
    <Paragraph Type="Action"><Text>Furniture covered in white sheets. A grandfather clock ticks in the corner.</Text></Paragraph>
    <Paragraph Type="Character"><Text>SARAH</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>I told you, I'll be fine. It's just a weekend.</Text></Paragraph>
    <Paragraph Type="Action"><Text>She sets her bag down. Something CREAKS upstairs.</Text></Paragraph>
    <Paragraph Type="Character"><Text>SARAH</Text></Paragraph>
    <Paragraph Type="Parenthetical"><Text>(into phone)</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Hold on—</Text></Paragraph>
    <Paragraph Type="Action"><Text>She stares at the ceiling. The creaking stops.</Text></Paragraph>
    <Paragraph Type="Action"><Text>Sarah slowly lowers the phone. Listens. Nothing.</Text></Paragraph>
    <Paragraph Type="Character"><Text>SARAH</Text></Paragraph>
    <Paragraph Type="Parenthetical"><Text>(into phone, forced casual)</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>It's nothing. Old house noises.</Text></Paragraph>

    <Paragraph Type="Scene Heading"><Text>EXT. WOODS - DAY</Text></Paragraph>
    <Paragraph Type="Action"><Text>A narrow trail cuts through dense pines. Morning fog clings to the ground.</Text></Paragraph>
    <Paragraph Type="Action"><Text>Sarah walks the trail, earbuds in. She doesn't notice the FIGURE behind the trees.</Text></Paragraph>
    <Paragraph Type="Character"><Text>SARAH</Text></Paragraph>
    <Paragraph Type="Parenthetical"><Text>(to herself)</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>This was supposed to be relaxing...</Text></Paragraph>
    <Paragraph Type="Action"><Text>She stops at a clearing. The woods are silent.</Text></Paragraph>
    <Paragraph Type="Action"><Text>A BRANCH snaps somewhere behind her. She spins around.</Text></Paragraph>
    <Paragraph Type="Character"><Text>SARAH</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Hello?</Text></Paragraph>
    <Paragraph Type="Action"><Text>Nothing. Just the trees. She exhales, walks faster.</Text></Paragraph>

    <Paragraph Type="Scene Heading"><Text>INT. BASEMENT - NIGHT</Text></Paragraph>
    <Paragraph Type="Action"><Text>Concrete stairs descend into darkness. A bare bulb swings overhead, casting wild shadows.</Text></Paragraph>
    <Paragraph Type="Action"><Text>Sarah reaches the bottom step. Stops. Listens.</Text></Paragraph>
    <Paragraph Type="Character"><Text>SARAH</Text></Paragraph>
    <Paragraph Type="Parenthetical"><Text>(whispered)</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Hello?</Text></Paragraph>
    <Paragraph Type="Action"><Text>The bulb flickers. In the strobe, something MOVES in the far corner.</Text></Paragraph>
    <Paragraph Type="Action"><Text>Sarah fumbles for her phone flashlight. Hands shaking.</Text></Paragraph>
    <Paragraph Type="Character"><Text>SARAH</Text></Paragraph>
    <Paragraph Type="Parenthetical"><Text>(to herself)</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Just the boiler. Just the boiler.</Text></Paragraph>

    <Paragraph Type="Scene Heading"><Text>EXT. LAKE - DUSK</Text></Paragraph>
    <Paragraph Type="Action"><Text>Golden hour light on still water. The lake is glass-smooth, reflecting the treeline.</Text></Paragraph>
    <Paragraph Type="Action"><Text>Sarah sits on the dock, feet dangling. A moment of peace.</Text></Paragraph>
    <Paragraph Type="Action"><Text>Something BUMPS the underside of the dock. She pulls her feet up.</Text></Paragraph>
    <Paragraph Type="Character"><Text>SARAH</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>What the...</Text></Paragraph>
    <Paragraph Type="Action"><Text>She peers over the edge. The water is dark, opaque. Another BUMP.</Text></Paragraph>
  </Content>
  <TitlePage>
    <Content>
      <Paragraph><Text>The Cabin</Text></Paragraph>
      <Paragraph><Text>by Maya Reeves</Text></Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>
```

Write out the full 4-scene version, mirroring the Fountain fixture.

- [ ] **Step 2: Create failing test `server/tests/parsers/fdx.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFdx } from '../../src/parsers/fdx.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'parsers', '__fixtures__');

describe('parseFdx', () => {
  it('parses The Cabin fdx into structured scenes', () => {
    const src = readFileSync(join(fixtureDir, 'the-cabin.fdx'), 'utf8');
    const ps = parseFdx(src);
    expect(ps.title).toMatch(/cabin/i);
    expect(ps.scenes.length).toBeGreaterThanOrEqual(4);
    const firstScene = ps.scenes[0];
    expect(firstScene.heading).toBe('INT. CABIN - DAY');
    const sarahDialogue = firstScene.lines.find(
      l => l.type === 'dialogue' && l.character === 'SARAH',
    );
    expect(sarahDialogue).toBeTruthy();
    const withParen = firstScene.lines.find(l => l.type === 'dialogue' && l.parenthetical);
    expect(withParen?.parenthetical).toContain('into phone');
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

```bash
cd server && npm test parsers/fdx
```
Expected: FAIL — `parseFdx` not found.

- [ ] **Step 4: Create `server/src/parsers/fdx.ts`**

```ts
import { XMLParser } from 'fast-xml-parser';
import type { ParsedScreenplay, ParsedScene, ParsedLine } from './types.js';

interface FdxParagraph {
  '@_Type'?: string;
  Text?: string | string[] | { '#text'?: string };
}

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  isArray: (name) => ['Paragraph'].includes(name),
});

function textOf(t: FdxParagraph['Text']): string {
  if (t == null) return '';
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) return t.map(textOf).join('');
  if (typeof t === 'object' && '#text' in t) return String(t['#text'] ?? '');
  return '';
}

export function parseFdx(source: string): ParsedScreenplay {
  const doc = xml.parse(source);
  const paragraphs: FdxParagraph[] = doc?.FinalDraft?.Content?.Paragraph ?? [];

  const titlePageParas = doc?.FinalDraft?.TitlePage?.Content?.Paragraph ?? [];
  const titleText = textOf(titlePageParas[0]?.Text).trim() || 'Untitled';
  const authorRaw = textOf(titlePageParas[1]?.Text).trim();
  const author = authorRaw.replace(/^by\s+/i, '') || undefined;

  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let lastCharacter: string | undefined;
  let lastParen: string | undefined;

  for (const p of paragraphs) {
    const type = p['@_Type'];
    const text = textOf(p.Text).trim();
    if (!text) continue;
    switch (type) {
      case 'Scene Heading':
        current = { heading: text, lines: [] };
        scenes.push(current);
        break;
      case 'Action':
        if (!current) { current = { heading: 'UNTITLED', lines: [] }; scenes.push(current); }
        current.lines.push({ type: 'action', text });
        break;
      case 'Character':
        lastCharacter = text;
        lastParen = undefined;
        break;
      case 'Parenthetical':
        lastParen = text.replace(/^\(/, '').replace(/\)$/, '');
        break;
      case 'Dialogue':
        if (!current || !lastCharacter) break;
        current.lines.push({
          type: 'dialogue',
          character: lastCharacter,
          text,
          ...(lastParen ? { parenthetical: lastParen } : {}),
        });
        lastParen = undefined;
        break;
      default:
        // Transitions, shots, etc. — preserved in source_text, dropped from structured
        break;
    }
  }

  return { title: titleText, author, scenes };
}
```

- [ ] **Step 5: Run test, verify it passes**

```bash
cd server && npm test parsers/fdx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/parsers/fdx.ts server/src/parsers/__fixtures__/the-cabin.fdx server/tests/parsers/fdx.test.ts
git commit -m "feat(parsers): fdx parser via fast-xml-parser + fixture"
```

---

### Task 7: FDX serializer

**Files:**
- Modify: `server/src/parsers/fdx.ts` (add `serializeFdx`)
- Modify: `server/tests/parsers/fdx.test.ts` (round-trip)

- [ ] **Step 1: Add failing round-trip test**

Append to `server/tests/parsers/fdx.test.ts`:

```ts
import { serializeFdx } from '../../src/parsers/fdx.js';

describe('serializeFdx', () => {
  it('round-trips The Cabin fdx', () => {
    const src = readFileSync(join(fixtureDir, 'the-cabin.fdx'), 'utf8');
    const ps = parseFdx(src);
    const back = serializeFdx(ps);
    const reparsed = parseFdx(back);
    expect(reparsed.title).toBe(ps.title);
    expect(reparsed.scenes.length).toBe(ps.scenes.length);
    for (let i = 0; i < ps.scenes.length; i++) {
      expect(reparsed.scenes[i].heading).toBe(ps.scenes[i].heading);
      expect(reparsed.scenes[i].lines).toEqual(ps.scenes[i].lines);
    }
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd server && npm test parsers/fdx
```
Expected: FAIL — `serializeFdx` not found.

- [ ] **Step 3: Add `serializeFdx` to `server/src/parsers/fdx.ts`**

Append:

```ts
import { XMLBuilder } from 'fast-xml-parser';

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: false,
});

export function serializeFdx(ps: ParsedScreenplay): string {
  const paragraphs: any[] = [];
  for (const scene of ps.scenes) {
    paragraphs.push({ '@_Type': 'Scene Heading', Text: scene.heading });
    for (const l of scene.lines) {
      if (l.type === 'action') {
        paragraphs.push({ '@_Type': 'Action', Text: l.text });
      } else {
        paragraphs.push({ '@_Type': 'Character', Text: l.character ?? 'UNKNOWN' });
        if (l.parenthetical) paragraphs.push({ '@_Type': 'Parenthetical', Text: `(${l.parenthetical})` });
        paragraphs.push({ '@_Type': 'Dialogue', Text: l.text });
      }
    }
  }
  const doc = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8', '@_standalone': 'no' },
    FinalDraft: {
      '@_DocumentType': 'Script',
      '@_Template': 'No',
      '@_Version': '5',
      Content: { Paragraph: paragraphs },
      TitlePage: {
        Content: {
          Paragraph: [
            { Text: ps.title },
            ...(ps.author ? [{ Text: `by ${ps.author}` }] : []),
          ],
        },
      },
    },
  };
  return builder.build(doc);
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd server && npm test parsers/fdx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/parsers/fdx.ts server/tests/parsers/fdx.test.ts
git commit -m "feat(parsers): fdx serializer with round-trip tests"
```

---

## Phase 3 — Screenplay routes

### Task 8: Screenplay model + library route

**Files:**
- Create: `server/src/models/screenplay.ts`
- Create: `server/src/routes/screenplays.ts`
- Modify: `server/src/app.ts`
- Create: `server/tests/routes/screenplays.test.ts`

- [ ] **Step 1: Create failing test `server/tests/routes/screenplays.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb, type DB } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';

describe('GET /api/screenplays', () => {
  let db: DB;
  beforeEach(() => { db = openDb(':memory:'); });

  it('returns empty list initially', async () => {
    const app = buildApp({ db });
    const res = await request(app).get('/api/screenplays');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ screenplays: [] });
  });

  it('returns library entries sorted by updated_at desc', async () => {
    createScreenplay(db, { id: 'a', title: 'A', author: null, source_format: 'fountain', source_text: '' });
    createScreenplay(db, { id: 'b', title: 'B', author: 'X', source_format: 'fdx', source_text: '' });
    const app = buildApp({ db });
    const res = await request(app).get('/api/screenplays');
    expect(res.body.screenplays.map((s: any) => s.id)).toEqual(['b', 'a']);
    expect(res.body.screenplays[0]).not.toHaveProperty('source_text');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd server && npm test routes/screenplays
```
Expected: FAIL — `createScreenplay` and `buildApp({ db })` not implemented.

- [ ] **Step 3: Create `server/src/models/screenplay.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.js';
import type { Screenplay, SourceFormat } from './types.js';

export interface CreateScreenplayInput {
  id?: string;
  title: string;
  author: string | null;
  source_format: SourceFormat;
  source_text: string;
}

export function createScreenplay(db: DB, input: CreateScreenplayInput): Screenplay {
  const now = Date.now();
  const id = input.id ?? randomUUID();
  const row: Screenplay = {
    id,
    title: input.title,
    author: input.author,
    source_format: input.source_format,
    source_text: input.source_text,
    created_at: now,
    updated_at: now,
  };
  db.prepare(`INSERT INTO screenplay
    (id, title, author, source_format, source_text, created_at, updated_at)
    VALUES (@id, @title, @author, @source_format, @source_text, @created_at, @updated_at)`).run(row);
  return row;
}

export function listScreenplays(db: DB): Array<Omit<Screenplay, 'source_text'>> {
  return db.prepare(`SELECT id, title, author, source_format, created_at, updated_at
    FROM screenplay ORDER BY updated_at DESC`).all() as Array<Omit<Screenplay, 'source_text'>>;
}

export function getScreenplay(db: DB, id: string): Screenplay | null {
  return (db.prepare('SELECT * FROM screenplay WHERE id = ?').get(id) as Screenplay | undefined) ?? null;
}

export function updateScreenplay(
  db: DB,
  id: string,
  patch: Partial<Pick<Screenplay, 'title' | 'author'>>,
): Screenplay | null {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id, updated_at: Date.now() };
  if (patch.title !== undefined) { fields.push('title = @title'); params.title = patch.title; }
  if (patch.author !== undefined) { fields.push('author = @author'); params.author = patch.author; }
  if (fields.length === 0) return getScreenplay(db, id);
  fields.push('updated_at = @updated_at');
  db.prepare(`UPDATE screenplay SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getScreenplay(db, id);
}

export function deleteScreenplay(db: DB, id: string): boolean {
  const r = db.prepare('DELETE FROM screenplay WHERE id = ?').run(id);
  return r.changes > 0;
}
```

- [ ] **Step 4: Update `server/src/app.ts` to inject DB**

```ts
import express from 'express';
import health from './routes/health.js';
import screenplays from './routes/screenplays.js';
import { openDb, type DB } from './db/index.js';
import { env } from './env.js';

export interface AppDeps {
  db?: DB;
}

export function buildApp(deps: AppDeps = {}) {
  const db = deps.db ?? openDb(env.DB_PATH);
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.locals.db = db;
  app.use('/api', health);
  app.use('/api/screenplays', screenplays);
  return app;
}
```

- [ ] **Step 5: Create `server/src/routes/screenplays.ts`** (library list only — upload added in Task 9)

```ts
import { Router } from 'express';
import { listScreenplays } from '../models/screenplay.js';

const r = Router();

r.get('/', (req, res) => {
  const db = req.app.locals.db;
  res.json({ screenplays: listScreenplays(db) });
});

export default r;
```

- [ ] **Step 6: Run test, verify it passes**

```bash
cd server && npm test routes/screenplays
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/models/screenplay.ts server/src/routes/screenplays.ts server/src/app.ts server/tests/routes/screenplays.test.ts
git commit -m "feat(server): screenplay model + library list route"
```

---

### Task 9: Upload endpoint

**Files:**
- Create: `server/src/routes/upload.ts` (or extend `screenplays.ts`)
- Modify: `server/src/routes/screenplays.ts`
- Modify: `server/tests/routes/screenplays.test.ts`

- [ ] **Step 1: Add failing upload test**

Append to `server/tests/routes/screenplays.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'parsers', '__fixtures__');

describe('POST /api/screenplays', () => {
  it('uploads and parses a fountain file', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const res = await request(app)
      .post('/api/screenplays')
      .attach('file', fountain, 'the-cabin.fountain');
    expect(res.status).toBe(201);
    expect(res.body.screenplay).toMatchObject({ source_format: 'fountain', title: expect.stringMatching(/cabin/i) });
    const id = res.body.screenplay.id;
    const sceneRows = db.prepare('SELECT COUNT(*) AS c FROM scene WHERE screenplay_id = ?').get(id) as { c: number };
    expect(sceneRows.c).toBeGreaterThanOrEqual(4);
  });

  it('uploads an fdx file', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fdx = readFileSync(join(fixtureDir, 'the-cabin.fdx'));
    const res = await request(app).post('/api/screenplays').attach('file', fdx, 'the-cabin.fdx');
    expect(res.status).toBe(201);
    expect(res.body.screenplay.source_format).toBe('fdx');
  });

  it('rejects unknown extensions', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const res = await request(app).post('/api/screenplays').attach('file', Buffer.from('hi'), 'x.txt');
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd server && npm test routes/screenplays
```
Expected: FAIL — POST not implemented.

- [ ] **Step 3: Create `server/src/models/scene.ts` and `server/src/models/line.ts`** with insert helpers

```ts
// server/src/models/scene.ts
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.js';
import type { Scene } from './types.js';

export function insertScene(db: DB, input: Omit<Scene, 'id'> & { id?: string }): Scene {
  const id = input.id ?? randomUUID();
  const row: Scene = { ...input, id, eighths: input.eighths ?? null };
  db.prepare(`INSERT INTO scene (id, screenplay_id, position, heading, eighths)
    VALUES (@id, @screenplay_id, @position, @heading, @eighths)`).run(row);
  return row;
}

export function listScenes(db: DB, screenplay_id: string): Scene[] {
  return db.prepare('SELECT * FROM scene WHERE screenplay_id = ? ORDER BY position').all(screenplay_id) as Scene[];
}
```

```ts
// server/src/models/line.ts
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.js';
import type { Line } from './types.js';

export function insertLine(db: DB, input: Omit<Line, 'id'> & { id?: string }): Line {
  const id = input.id ?? randomUUID();
  const row: Line = { ...input, id };
  db.prepare(`INSERT INTO line (id, scene_id, position, type, character, parenthetical, text)
    VALUES (@id, @scene_id, @position, @type, @character, @parenthetical, @text)`).run(row);
  return row;
}

export function listLines(db: DB, scene_id: string): Line[] {
  return db.prepare('SELECT * FROM line WHERE scene_id = ? ORDER BY position').all(scene_id) as Line[];
}
```

- [ ] **Step 4: Update `server/src/routes/screenplays.ts`**

```ts
import { Router } from 'express';
import multer from 'multer';
import { listScreenplays, createScreenplay } from '../models/screenplay.js';
import { insertScene } from '../models/scene.js';
import { insertLine } from '../models/line.js';
import { parseFountain } from '../parsers/fountain.js';
import { parseFdx } from '../parsers/fdx.js';
import type { ParsedScreenplay } from '../parsers/types.js';
import type { SourceFormat } from '../models/types.js';

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });
const r = Router();

r.get('/', (req, res) => {
  res.json({ screenplays: listScreenplays(req.app.locals.db) });
});

r.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required', code: 'no_file' });
  const name = req.file.originalname.toLowerCase();
  let format: SourceFormat;
  if (name.endsWith('.fountain') || name.endsWith('.txt')) format = 'fountain';
  else if (name.endsWith('.fdx')) format = 'fdx';
  else return res.status(400).json({ error: 'unsupported extension', code: 'bad_extension' });

  const text = req.file.buffer.toString('utf8');
  let parsed: ParsedScreenplay;
  try {
    parsed = format === 'fountain' ? parseFountain(text) : parseFdx(text);
  } catch (err) {
    return res.status(400).json({ error: 'parse failed', code: 'parse_error', detail: (err as Error).message });
  }

  const db = req.app.locals.db;
  const screenplay = db.transaction(() => {
    const sp = createScreenplay(db, {
      title: parsed.title,
      author: parsed.author ?? null,
      source_format: format,
      source_text: text,
    });
    parsed.scenes.forEach((scene, si) => {
      const sceneRow = insertScene(db, {
        screenplay_id: sp.id, position: si, heading: scene.heading, eighths: null,
      });
      scene.lines.forEach((line, li) => {
        insertLine(db, {
          scene_id: sceneRow.id, position: li, type: line.type,
          character: line.character ?? null, parenthetical: line.parenthetical ?? null, text: line.text,
        });
      });
    });
    return sp;
  })();

  res.status(201).json({
    screenplay: {
      id: screenplay.id, title: screenplay.title, author: screenplay.author,
      source_format: screenplay.source_format, created_at: screenplay.created_at,
      updated_at: screenplay.updated_at,
    },
  });
});

export default r;
```

- [ ] **Step 5: Run test, verify it passes**

```bash
cd server && npm test routes/screenplays
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/models/scene.ts server/src/models/line.ts server/src/routes/screenplays.ts server/tests/routes/screenplays.test.ts
git commit -m "feat(server): screenplay upload + parse + persist (fountain + fdx)"
```

---

### Task 10: GET single screenplay (full payload)

**Files:**
- Modify: `server/src/routes/screenplays.ts`
- Modify: `server/tests/routes/screenplays.test.ts`

- [ ] **Step 1: Add failing test for the full-payload route**

Append to `server/tests/routes/screenplays.test.ts`:

```ts
describe('GET /api/screenplays/:id', () => {
  it('returns 404 when missing', async () => {
    const app = buildApp({ db: openDb(':memory:') });
    const res = await request(app).get('/api/screenplays/missing');
    expect(res.status).toBe(404);
  });

  it('returns the full payload after upload', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const up = await request(app).post('/api/screenplays').attach('file', fountain, 'the-cabin.fountain');
    const id = up.body.screenplay.id;
    const res = await request(app).get(`/api/screenplays/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.screenplay.id).toBe(id);
    expect(res.body.scenes.length).toBeGreaterThanOrEqual(4);
    expect(res.body.scenes[0].lines.length).toBeGreaterThan(0);
    expect(res.body.notes).toEqual([]);
    expect(res.body.characterBible).toEqual([]);
    expect(res.body.beats).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd server && npm test routes/screenplays
```
Expected: FAIL.

- [ ] **Step 3: Update `server/src/routes/screenplays.ts`** — add the GET route

Append below the POST handler:

```ts
import { getScreenplay } from '../models/screenplay.js';
import { listScenes } from '../models/scene.js';
import { listLines } from '../models/line.js';

r.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const sp = getScreenplay(db, req.params.id);
  if (!sp) return res.status(404).json({ error: 'not found', code: 'not_found' });
  const scenes = listScenes(db, sp.id).map(s => ({ ...s, lines: listLines(db, s.id) }));
  res.json({
    screenplay: sp,
    scenes,
    notes: [],
    characterBible: [],
    beats: [],
  });
});
```

- [ ] **Step 4: Run test, verify it passes**

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/screenplays.ts server/tests/routes/screenplays.test.ts
git commit -m "feat(server): GET /api/screenplays/:id full payload"
```

---

### Task 11: Note + Bible + Beat models + GET full payload includes them

**Files:**
- Create: `server/src/models/note.ts`
- Create: `server/src/models/characterBible.ts`
- Create: `server/src/models/beat.ts`
- Modify: `server/src/routes/screenplays.ts`
- Create: `server/tests/models/note.test.ts`

- [ ] **Step 1: Create failing test `server/tests/models/note.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';
import { insertNote, listNotes, updateNote } from '../../src/models/note.js';

describe('note model', () => {
  it('round-trips scenes_json', () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'X', author: null, source_format: 'fountain', source_text: '' });
    const n = insertNote(db, {
      screenplay_id: sp.id, title: 'pace', body: 'too slow',
      scenes: ['s1', 's2'], priority: 'high', status: 'unread', origin: 'exec', confidence: 0.8,
    });
    const fetched = listNotes(db, sp.id);
    expect(fetched[0].scenes).toEqual(['s1', 's2']);
    expect(fetched[0].confidence).toBe(0.8);
    updateNote(db, n.id, { status: 'applied' });
    expect(listNotes(db, sp.id)[0].status).toBe('applied');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

- [ ] **Step 3: Create `server/src/models/note.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.js';
import type { Note } from './types.js';

interface NoteRow {
  id: string; screenplay_id: string; title: string; body: string;
  scenes_json: string; priority: string; status: string; origin: string;
  confidence: number | null; created_at: number;
}

function hydrate(row: NoteRow): Note {
  return { ...row, scenes: JSON.parse(row.scenes_json), priority: row.priority as Note['priority'],
    status: row.status as Note['status'], origin: row.origin as Note['origin'] };
}

export function insertNote(db: DB, input: Omit<Note, 'id' | 'created_at'> & { id?: string }): Note {
  const id = input.id ?? randomUUID();
  const created_at = Date.now();
  db.prepare(`INSERT INTO note (id, screenplay_id, title, body, scenes_json, priority, status, origin, confidence, created_at)
    VALUES (@id, @screenplay_id, @title, @body, @scenes_json, @priority, @status, @origin, @confidence, @created_at)`).run({
    id, screenplay_id: input.screenplay_id, title: input.title, body: input.body,
    scenes_json: JSON.stringify(input.scenes), priority: input.priority, status: input.status,
    origin: input.origin, confidence: input.confidence, created_at,
  });
  return { id, screenplay_id: input.screenplay_id, title: input.title, body: input.body,
    scenes: input.scenes, priority: input.priority, status: input.status, origin: input.origin,
    confidence: input.confidence, created_at };
}

export function listNotes(db: DB, screenplay_id: string): Note[] {
  return (db.prepare('SELECT * FROM note WHERE screenplay_id = ? ORDER BY created_at')
    .all(screenplay_id) as NoteRow[]).map(hydrate);
}

export function getNote(db: DB, id: string): Note | null {
  const row = db.prepare('SELECT * FROM note WHERE id = ?').get(id) as NoteRow | undefined;
  return row ? hydrate(row) : null;
}

export function updateNote(db: DB, id: string, patch: Partial<Omit<Note, 'id' | 'screenplay_id' | 'created_at'>>): Note | null {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const k of ['title','body','priority','status','origin','confidence'] as const) {
    if (patch[k] !== undefined) { fields.push(`${k} = @${k}`); params[k] = patch[k]; }
  }
  if (patch.scenes !== undefined) { fields.push('scenes_json = @scenes_json'); params.scenes_json = JSON.stringify(patch.scenes); }
  if (fields.length === 0) return getNote(db, id);
  db.prepare(`UPDATE note SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getNote(db, id);
}

export function deleteNote(db: DB, id: string): boolean {
  return db.prepare('DELETE FROM note WHERE id = ?').run(id).changes > 0;
}
```

- [ ] **Step 4: Create `server/src/models/characterBible.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.js';
import type { CharacterBibleEntry } from './types.js';

interface BibleRow {
  id: string; screenplay_id: string; name: string; age: number | null; color: string;
  role: string | null; want: string | null; need: string | null;
  voice_json: string; appearances: number;
}
function hydrate(r: BibleRow): CharacterBibleEntry {
  return { ...r, voice: JSON.parse(r.voice_json) };
}

export function insertCharacterBibleEntry(
  db: DB, input: Omit<CharacterBibleEntry, 'id'> & { id?: string },
): CharacterBibleEntry {
  const id = input.id ?? randomUUID();
  db.prepare(`INSERT INTO character_bible
    (id, screenplay_id, name, age, color, role, "want", "need", voice_json, appearances)
    VALUES (@id, @screenplay_id, @name, @age, @color, @role, @want, @need, @voice_json, @appearances)`).run({
    id, screenplay_id: input.screenplay_id, name: input.name, age: input.age, color: input.color,
    role: input.role, want: input.want, need: input.need,
    voice_json: JSON.stringify(input.voice), appearances: input.appearances,
  });
  return { ...input, id };
}

export function listCharacterBible(db: DB, screenplay_id: string): CharacterBibleEntry[] {
  return (db.prepare('SELECT * FROM character_bible WHERE screenplay_id = ? ORDER BY name')
    .all(screenplay_id) as BibleRow[]).map(hydrate);
}

export function getCharacterBibleEntry(db: DB, id: string): CharacterBibleEntry | null {
  const r = db.prepare('SELECT * FROM character_bible WHERE id = ?').get(id) as BibleRow | undefined;
  return r ? hydrate(r) : null;
}

export function updateCharacterBibleEntry(
  db: DB, id: string,
  patch: Partial<Omit<CharacterBibleEntry, 'id' | 'screenplay_id'>>,
): CharacterBibleEntry | null {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const k of ['name','age','color','role','want','need','appearances'] as const) {
    if (patch[k] !== undefined) { fields.push(`"${k}" = @${k}`); params[k] = patch[k]; }
  }
  if (patch.voice !== undefined) { fields.push('voice_json = @voice_json'); params.voice_json = JSON.stringify(patch.voice); }
  if (fields.length === 0) return getCharacterBibleEntry(db, id);
  db.prepare(`UPDATE character_bible SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getCharacterBibleEntry(db, id);
}

export function deleteCharacterBibleEntry(db: DB, id: string): boolean {
  return db.prepare('DELETE FROM character_bible WHERE id = ?').run(id).changes > 0;
}
```

- [ ] **Step 5: Create `server/src/models/beat.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.js';
import type { Beat } from './types.js';

interface BeatRow {
  id: string; screenplay_id: string; position: number; name: string; scenes_json: string;
}
function hydrate(r: BeatRow): Beat { return { ...r, scenes: JSON.parse(r.scenes_json) }; }

export function insertBeat(db: DB, input: Omit<Beat, 'id'> & { id?: string }): Beat {
  const id = input.id ?? randomUUID();
  db.prepare(`INSERT INTO beat (id, screenplay_id, position, name, scenes_json)
    VALUES (@id, @screenplay_id, @position, @name, @scenes_json)`).run({
    id, screenplay_id: input.screenplay_id, position: input.position, name: input.name,
    scenes_json: JSON.stringify(input.scenes),
  });
  return { ...input, id };
}

export function listBeats(db: DB, screenplay_id: string): Beat[] {
  return (db.prepare('SELECT * FROM beat WHERE screenplay_id = ? ORDER BY position')
    .all(screenplay_id) as BeatRow[]).map(hydrate);
}

export function getBeat(db: DB, id: string): Beat | null {
  const r = db.prepare('SELECT * FROM beat WHERE id = ?').get(id) as BeatRow | undefined;
  return r ? hydrate(r) : null;
}

export function updateBeat(db: DB, id: string, patch: Partial<Omit<Beat, 'id' | 'screenplay_id'>>): Beat | null {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  if (patch.position !== undefined) { fields.push('position = @position'); params.position = patch.position; }
  if (patch.name !== undefined) { fields.push('name = @name'); params.name = patch.name; }
  if (patch.scenes !== undefined) { fields.push('scenes_json = @scenes_json'); params.scenes_json = JSON.stringify(patch.scenes); }
  if (fields.length === 0) return getBeat(db, id);
  db.prepare(`UPDATE beat SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getBeat(db, id);
}

export function deleteBeat(db: DB, id: string): boolean {
  return db.prepare('DELETE FROM beat WHERE id = ?').run(id).changes > 0;
}
```

- [ ] **Step 6: Update `server/src/routes/screenplays.ts`** GET handler to include all three:

```ts
import { listNotes } from '../models/note.js';
import { listCharacterBible } from '../models/characterBible.js';
import { listBeats } from '../models/beat.js';

// Replace the existing GET /:id body with:
r.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const sp = getScreenplay(db, req.params.id);
  if (!sp) return res.status(404).json({ error: 'not found', code: 'not_found' });
  const scenes = listScenes(db, sp.id).map(s => ({ ...s, lines: listLines(db, s.id) }));
  res.json({
    screenplay: sp,
    scenes,
    notes: listNotes(db, sp.id),
    characterBible: listCharacterBible(db, sp.id),
    beats: listBeats(db, sp.id),
  });
});
```

- [ ] **Step 7: Run test, verify it passes**

```bash
cd server && npm test models/note
```

- [ ] **Step 8: Commit**

```bash
git add server/src/models/note.ts server/src/models/characterBible.ts server/src/models/beat.ts server/src/routes/screenplays.ts server/tests/models/note.test.ts
git commit -m "feat(server): note/bible/beat models + include in full payload"
```

---

### Task 12: Scene + Line edit routes (autosave PATCH targets)

**Files:**
- Modify: `server/src/models/scene.ts` (add `updateScene`, `deleteScene`)
- Modify: `server/src/models/line.ts` (add `updateLine`, `deleteLine`)
- Create: `server/src/routes/scenes.ts`
- Create: `server/src/routes/lines.ts`
- Modify: `server/src/app.ts`
- Create: `server/tests/routes/lines.test.ts`

- [ ] **Step 1: Failing test `server/tests/routes/lines.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';
import { insertScene } from '../../src/models/scene.js';
import { insertLine } from '../../src/models/line.js';

function seed() {
  const db = openDb(':memory:');
  const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
  const sc = insertScene(db, { screenplay_id: sp.id, position: 0, heading: 'INT. X - DAY', eighths: null });
  const ln = insertLine(db, { scene_id: sc.id, position: 0, type: 'action', text: 'Hello', character: null, parenthetical: null });
  return { db, sp, sc, ln };
}

describe('PATCH /api/lines/:id', () => {
  it('updates text', async () => {
    const { db, ln } = seed();
    const res = await request(buildApp({ db })).patch(`/api/lines/${ln.id}`).send({ text: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.line.text).toBe('Updated');
  });

  it('returns 404 for missing id', async () => {
    const { db } = seed();
    const res = await request(buildApp({ db })).patch('/api/lines/missing').send({ text: 'x' });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

- [ ] **Step 3: Add `updateLine` and `deleteLine` to `server/src/models/line.ts`**

```ts
export function updateLine(db: DB, id: string, patch: Partial<Omit<Line, 'id' | 'scene_id'>>): Line | null {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const k of ['position','type','character','parenthetical','text'] as const) {
    if (patch[k] !== undefined) { fields.push(`${k} = @${k}`); params[k] = patch[k]; }
  }
  if (fields.length === 0) return getLine(db, id);
  db.prepare(`UPDATE line SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getLine(db, id);
}

export function getLine(db: DB, id: string): Line | null {
  return (db.prepare('SELECT * FROM line WHERE id = ?').get(id) as Line | undefined) ?? null;
}

export function deleteLine(db: DB, id: string): boolean {
  return db.prepare('DELETE FROM line WHERE id = ?').run(id).changes > 0;
}
```

- [ ] **Step 4: Create `server/src/routes/lines.ts`**

```ts
import { Router } from 'express';
import { getLine, updateLine, deleteLine, insertLine } from '../models/line.js';
import type { LineType } from '../models/types.js';

const r = Router();

r.patch('/:id', (req, res) => {
  const updated = updateLine(req.app.locals.db, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'not found', code: 'not_found' });
  res.json({ line: updated });
});

r.post('/', (req, res) => {
  const { sceneId, position, type, text, character, parenthetical } = req.body as {
    sceneId: string; position: number; type: LineType; text: string;
    character?: string | null; parenthetical?: string | null;
  };
  const line = insertLine(req.app.locals.db, {
    scene_id: sceneId, position, type, text,
    character: character ?? null, parenthetical: parenthetical ?? null,
  });
  res.status(201).json({ line });
});

r.delete('/:id', (req, res) => {
  res.status(deleteLine(req.app.locals.db, req.params.id) ? 204 : 404).end();
});

export default r;
```

- [ ] **Step 5: Add `updateScene`, `getScene`, `deleteScene` to `server/src/models/scene.ts`**

```ts
export function getScene(db: DB, id: string): Scene | null {
  return (db.prepare('SELECT * FROM scene WHERE id = ?').get(id) as Scene | undefined) ?? null;
}

export function updateScene(db: DB, id: string, patch: Partial<Omit<Scene, 'id' | 'screenplay_id'>>): Scene | null {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const k of ['position','heading','eighths'] as const) {
    if (patch[k] !== undefined) { fields.push(`${k} = @${k}`); params[k] = patch[k]; }
  }
  if (fields.length === 0) return getScene(db, id);
  db.prepare(`UPDATE scene SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getScene(db, id);
}

export function deleteScene(db: DB, id: string): boolean {
  return db.prepare('DELETE FROM scene WHERE id = ?').run(id).changes > 0;
}
```

- [ ] **Step 5b: Create `server/src/routes/scenes.ts`**

```ts
import { Router } from 'express';
import { getScene, updateScene, deleteScene, insertScene } from '../models/scene.js';

const r = Router();

r.patch('/:id', (req, res) => {
  const updated = updateScene(req.app.locals.db, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'not found', code: 'not_found' });
  res.json({ scene: updated });
});

r.post('/', (req, res) => {
  const { screenplayId, position, heading } = req.body as {
    screenplayId: string; position: number; heading: string;
  };
  const scene = insertScene(req.app.locals.db, {
    screenplay_id: screenplayId, position, heading, eighths: null,
  });
  res.status(201).json({ scene });
});

r.delete('/:id', (req, res) => {
  res.status(deleteScene(req.app.locals.db, req.params.id) ? 204 : 404).end();
});

export default r;
```

- [ ] **Step 6: Wire both into `server/src/app.ts`**

```ts
import scenes from './routes/scenes.js';
import lines from './routes/lines.js';
// inside buildApp(), after screenplays:
app.use('/api/scenes', scenes);
app.use('/api/lines', lines);
```

- [ ] **Step 7: Run test, verify it passes**

- [ ] **Step 8: Commit**

```bash
git add server/src/models/scene.ts server/src/models/line.ts server/src/routes/scenes.ts server/src/routes/lines.ts server/src/app.ts server/tests/routes/lines.test.ts
git commit -m "feat(server): scene + line edit routes (PATCH/POST/DELETE)"
```

---

### Task 13: Note routes + revision_entry writer

**Files:**
- Create: `server/src/routes/notes.ts`
- Create: `server/src/models/revision.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/routes/lines.ts` (write revision_entry on AI-suggestion resolution)
- Create: `server/tests/routes/notes.test.ts`

- [ ] **Step 1: Failing test for note routes**

```ts
// server/tests/routes/notes.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';

describe('notes routes', () => {
  it('creates and updates a note', async () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
    const app = buildApp({ db });
    const created = await request(app).post(`/api/screenplays/${sp.id}/notes`).send({
      title: 'pacing', body: 'too slow', scenes: [], priority: 'high', status: 'unread', origin: 'exec',
    });
    expect(created.status).toBe(201);
    const id = created.body.note.id;
    const updated = await request(app).patch(`/api/notes/${id}`).send({ status: 'applied' });
    expect(updated.body.note.status).toBe('applied');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

- [ ] **Step 3: Create `server/src/routes/notes.ts`**

```ts
import { Router } from 'express';
import { insertNote, updateNote, deleteNote } from '../models/note.js';

const r = Router();

r.post('/screenplays/:id/notes', (req, res) => {
  const note = insertNote(req.app.locals.db, { ...req.body, screenplay_id: req.params.id });
  res.status(201).json({ note });
});

r.patch('/notes/:id', (req, res) => {
  const note = updateNote(req.app.locals.db, req.params.id, req.body);
  if (!note) return res.status(404).json({ error: 'not found', code: 'not_found' });
  res.json({ note });
});

r.delete('/notes/:id', (req, res) => {
  res.status(deleteNote(req.app.locals.db, req.params.id) ? 204 : 404).end();
});

export default r;
```

- [ ] **Step 4: Create `server/src/models/revision.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.js';
import type { RevisionEntry } from './types.js';

export function recordRevision(db: DB, input: Omit<RevisionEntry, 'id' | 'at'>): RevisionEntry {
  const id = randomUUID();
  const at = Date.now();
  const row: RevisionEntry = { ...input, id, at };
  db.prepare(`INSERT INTO revision_entry (id, screenplay_id, action, target, agent, at)
    VALUES (@id, @screenplay_id, @action, @target, @agent, @at)`).run(row);
  return row;
}

export function listRevisions(db: DB, screenplay_id: string, limit = 50): RevisionEntry[] {
  return db.prepare('SELECT * FROM revision_entry WHERE screenplay_id = ? ORDER BY at DESC LIMIT ?')
    .all(screenplay_id, limit) as RevisionEntry[];
}
```

- [ ] **Step 5: Wire notes into `server/src/app.ts`**

```ts
import notes from './routes/notes.js';
app.use('/api', notes);   // mount at /api so /screenplays/:id/notes and /notes/:id both resolve
```

- [ ] **Step 6: Run test, verify it passes**

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/notes.ts server/src/models/revision.ts server/src/app.ts server/tests/routes/notes.test.ts
git commit -m "feat(server): note routes + revision_entry model"
```

---

### Task 14: Export route

**Files:**
- Create: `server/src/routes/exportRoute.ts`
- Modify: `server/src/app.ts`
- Create: `server/tests/routes/export.test.ts`

- [ ] **Step 1: Failing test**

```ts
// server/tests/routes/export.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { parseFountain } from '../../src/parsers/fountain.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'parsers', '__fixtures__');

describe('GET /api/screenplays/:id/export', () => {
  it('exports as fountain after upload', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const up = await request(app).post('/api/screenplays').attach('file', fountain, 'the-cabin.fountain');
    const id = up.body.screenplay.id;
    const res = await request(app).get(`/api/screenplays/${id}/export?format=fountain`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.headers['content-disposition']).toMatch(/attachment.*\.fountain/);
    const reparsed = parseFountain(res.text);
    expect(reparsed.scenes.length).toBeGreaterThanOrEqual(4);
  });

  it('exports as fdx', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const up = await request(app).post('/api/screenplays').attach('file', fountain, 'the-cabin.fountain');
    const res = await request(app).get(`/api/screenplays/${up.body.screenplay.id}/export?format=fdx`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    expect(res.text).toContain('<FinalDraft');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

- [ ] **Step 3: Create `server/src/routes/exportRoute.ts`**

```ts
import { Router } from 'express';
import { getScreenplay } from '../models/screenplay.js';
import { listScenes } from '../models/scene.js';
import { listLines } from '../models/line.js';
import { serializeFountain } from '../parsers/fountain.js';
import { serializeFdx } from '../parsers/fdx.js';
import type { ParsedScreenplay } from '../parsers/types.js';

const r = Router();

r.get('/screenplays/:id/export', (req, res) => {
  const db = req.app.locals.db;
  const sp = getScreenplay(db, req.params.id);
  if (!sp) return res.status(404).json({ error: 'not found', code: 'not_found' });
  const format = (req.query.format as string) || sp.source_format;
  if (format !== 'fountain' && format !== 'fdx') {
    return res.status(400).json({ error: 'unsupported format', code: 'bad_format' });
  }
  const scenes = listScenes(db, sp.id).map(s => ({
    heading: s.heading,
    lines: listLines(db, s.id).map(l => ({
      type: l.type, text: l.text,
      ...(l.character ? { character: l.character } : {}),
      ...(l.parenthetical ? { parenthetical: l.parenthetical } : {}),
    })),
  }));
  const parsed: ParsedScreenplay = { title: sp.title, author: sp.author ?? undefined, scenes };
  const filename = `${sp.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.${format}`;
  if (format === 'fountain') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(serializeFountain(parsed));
  } else {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(serializeFdx(parsed));
  }
});

export default r;
```

- [ ] **Step 4: Wire into `server/src/app.ts`**

```ts
import exportRoute from './routes/exportRoute.js';
app.use('/api', exportRoute);
```

- [ ] **Step 5: Run test, verify it passes**

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/exportRoute.ts server/src/app.ts server/tests/routes/export.test.ts
git commit -m "feat(server): export route (fountain + fdx)"
```

---

## Phase 4 — Anthropic integration

### Task 15: Anthropic client + prompt loader

**Files:**
- Create: `server/src/anthropic/client.ts`
- Create: `server/src/anthropic/prompts.ts`
- Create: `server/src/anthropic/prompts/agents/dialogue.md`
- Create: `server/src/anthropic/prompts/agents/structure.md`
- Create: `server/src/anthropic/prompts/agents/character.md`
- Create: `server/src/anthropic/prompts/agents/horror.md`
- Create: `server/src/anthropic/prompts/agents/conflict.md`
- Create: `server/src/anthropic/prompts/agents/theme.md`
- Create: `server/src/anthropic/prompts/characters/voice.md`
- Create: `server/tests/anthropic/prompts.test.ts`

- [ ] **Step 1: Create prompt files**

`server/src/anthropic/prompts/agents/dialogue.md`:

```
You are the Dialogue Agent for a screenplay collaboration tool.

Focus: voice, subtext, rhythm, on-the-nose detection, naturalism.

When the writer asks about a scene, ground every suggestion in what's actually
on the page. Quote the exact line you're reacting to. Keep replies under 200
words unless the writer asks for more. Default to three concrete options when
proposing rewrites.

Current scene context:
{{sceneContext}}

Note in discussion (if any):
{{noteBody}}
```

`server/src/anthropic/prompts/agents/structure.md`:

```
You are the Structure Agent for a screenplay collaboration tool.

Focus: act breaks, pacing, inciting incidents, midpoint reversals, climax setup, scene economy.

When the writer asks, locate the beat under discussion in the broader arc of the screenplay. Be concrete: "your Act 1 break should land by page X" not "your pacing feels off." Quote line/scene to ground your reasoning. Default to one strongest recommendation with reasoning, then alternatives.

Current scene context:
{{sceneContext}}

Note in discussion (if any):
{{noteBody}}
```

`server/src/anthropic/prompts/agents/character.md`:

```
You are the Character Agent for a screenplay collaboration tool.

Focus: want vs need, arc trajectory, motivation legibility, transformation, internal consistency.

Treat every suggestion through the lens of the character's psychology. Push the writer to specify what each character is afraid of, what they want, what they need but resist. Surface inconsistencies — moments where a character acts against their established self without justification.

Current scene context:
{{sceneContext}}

Note in discussion (if any):
{{noteBody}}
```

`server/src/anthropic/prompts/agents/horror.md`:

```
You are the Horror Agent for a screenplay collaboration tool.

Focus: dread, withholding, escalation, the unseen vs the seen, sound design cues in action lines, the rules of the threat.

Bias toward less, not more. Suggest cuts before additions. Identify when the script tells when it should show, when it explains when it should withhold. Be specific about which sense to deny the audience and when.

Current scene context:
{{sceneContext}}

Note in discussion (if any):
{{noteBody}}
```

`server/src/anthropic/prompts/agents/conflict.md`:

```
You are the Conflict Agent for a screenplay collaboration tool.

Focus: stakes (specific and personal, not abstract survival), obstacles, antagonist agency, escalation curve, "what does the protagonist lose if they fail."

Press the writer until the stakes are concrete. Generic stakes ("she could die") read flat; personal stakes ("she might lose the only person who believed her") cut deep. Make sure obstacles have agency, not just bad luck.

Current scene context:
{{sceneContext}}

Note in discussion (if any):
{{noteBody}}
```

`server/src/anthropic/prompts/agents/theme.md`:

```
You are the Theme Agent for a screenplay collaboration tool.

Focus: controlling idea, motif, recurring imagery, the moral argument the script is making.

Theme should never be stated aloud — it should be *enacted* through choice and consequence. Identify where the writer is telling the theme vs showing it. Spot dropped motifs (introduced once, never returned to). Pair internal theme (the character's inner journey) with external theme (the world's stakes).

Current scene context:
{{sceneContext}}

Note in discussion (if any):
{{noteBody}}
```

`server/src/anthropic/prompts/characters/voice.md`:

```
You are the character {{characterName}} from a screenplay.

Role: {{characterRole}}
Want: {{characterWant}}
Need: {{characterNeed}}

Voice rules — adhere strictly:
{{voiceRules}}

The writer is talking to you in-character. Respond as {{characterName}} would
speak, never as an AI. No meta commentary. If the writer asks you a
question, answer it the way the character would. Keep replies under 80 words.

Current scene context (you may or may not appear in it):
{{sceneContext}}
```

- [ ] **Step 2: Failing test `server/tests/anthropic/prompts.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { loadAgentPrompt, loadCharacterPrompt } from '../../src/anthropic/prompts.js';

describe('prompts', () => {
  it('loads + interpolates agent prompt', () => {
    const out = loadAgentPrompt('dialogue', { sceneContext: 'SCENE-A', noteBody: 'NB' });
    expect(out).toContain('Dialogue Agent');
    expect(out).toContain('SCENE-A');
    expect(out).toContain('NB');
    expect(out).not.toContain('{{');
  });

  it('loads + interpolates character prompt', () => {
    const out = loadCharacterPrompt({
      characterName: 'SARAH', characterRole: 'Protagonist',
      characterWant: 'Solitude', characterNeed: 'Connection',
      voiceRules: '- short sentences\n- never swears',
      sceneContext: 'SCENE-X',
    });
    expect(out).toContain('SARAH');
    expect(out).toContain('short sentences');
    expect(out).not.toContain('{{');
  });

  it('throws on unknown agent', () => {
    expect(() => loadAgentPrompt('nope', {})).toThrow();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

- [ ] **Step 4: Create `server/src/anthropic/prompts.ts`**

```ts
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function interpolate(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, k) => vars[k] ?? '');
}

export function loadAgentPrompt(agentId: string, vars: Record<string, string | undefined>): string {
  const path = join(__dirname, 'prompts', 'agents', `${agentId}.md`);
  if (!existsSync(path)) throw new Error(`No prompt for agent: ${agentId}`);
  return interpolate(readFileSync(path, 'utf8'), vars);
}

export function loadCharacterPrompt(vars: Record<string, string | undefined>): string {
  const path = join(__dirname, 'prompts', 'characters', 'voice.md');
  return interpolate(readFileSync(path, 'utf8'), vars);
}
```

- [ ] **Step 5: Create `server/src/anthropic/client.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';

let _client: Anthropic | null = null;

export function anthropicClient(): Anthropic {
  if (_client) return _client;
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export interface AnthropicMessage { role: 'user' | 'assistant'; content: string }
```

- [ ] **Step 6: Run test, verify it passes**

- [ ] **Step 7: Commit**

```bash
git add server/src/anthropic server/tests/anthropic
git commit -m "feat(server): Anthropic client + prompt loader/interpolator"
```

---

### Task 16: Chat SSE endpoint

**Files:**
- Create: `server/src/models/chat.ts`
- Create: `server/src/routes/chat.ts`
- Modify: `server/src/app.ts`
- Create: `server/tests/routes/chat.test.ts`

- [ ] **Step 1: Create `server/src/models/chat.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.js';
import type { ChatMessage } from './types.js';

export function insertChatMessage(db: DB, input: Omit<ChatMessage, 'id' | 'at'>): ChatMessage {
  const id = randomUUID();
  const at = Date.now();
  const row: ChatMessage = { ...input, id, at };
  db.prepare(`INSERT INTO chat_message (id, screenplay_id, note_id, role, target_kind, target_id, text, voice_match, at)
    VALUES (@id, @screenplay_id, @note_id, @role, @target_kind, @target_id, @text, @voice_match, @at)`).run(row);
  return row;
}

export function listChatHistory(db: DB, screenplay_id: string, note_id: string | null, limit = 20): ChatMessage[] {
  const rows = note_id
    ? db.prepare('SELECT * FROM chat_message WHERE screenplay_id = ? AND note_id = ? ORDER BY at DESC LIMIT ?')
        .all(screenplay_id, note_id, limit)
    : db.prepare('SELECT * FROM chat_message WHERE screenplay_id = ? AND note_id IS NULL ORDER BY at DESC LIMIT ?')
        .all(screenplay_id, limit);
  return (rows as ChatMessage[]).reverse();
}
```

- [ ] **Step 2: Failing test `server/tests/routes/chat.test.ts`** — this one mocks the Anthropic SDK to avoid network calls.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';

vi.mock('../../src/anthropic/client.js', () => ({
  anthropicClient: () => ({
    messages: {
      async *stream() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hel' } };
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'lo' } };
        yield { type: 'message_stop' };
      },
    },
  }),
}));

describe('POST /api/chat', () => {
  it('streams an SSE response and persists messages', async () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'X', author: null, source_format: 'fountain', source_text: '' });
    const app = buildApp({ db });
    const res = await request(app).post('/api/chat').send({
      screenplayId: sp.id, target: { kind: 'agent', id: 'dialogue' }, message: 'hi',
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('event: token');
    expect(res.text).toContain('event: done');
    const persisted = db.prepare('SELECT * FROM chat_message WHERE screenplay_id = ?').all(sp.id);
    expect(persisted.length).toBe(2); // user + ai
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

- [ ] **Step 4: Create `server/src/routes/chat.ts`**

```ts
import { Router } from 'express';
import { anthropicClient } from '../anthropic/client.js';
import { loadAgentPrompt, loadCharacterPrompt } from '../anthropic/prompts.js';
import { insertChatMessage, listChatHistory } from '../models/chat.js';
import { getScreenplay } from '../models/screenplay.js';
import { listScenes } from '../models/scene.js';
import { listLines } from '../models/line.js';
import { listCharacterBible } from '../models/characterBible.js';
import { getNote } from '../models/note.js';
import { env } from '../env.js';

const r = Router();

r.post('/chat', async (req, res) => {
  const { screenplayId, noteId = null, target, message } = req.body as {
    screenplayId: string; noteId?: string | null;
    target: { kind: 'agent' | 'character'; id: string };
    message: string;
  };

  const db = req.app.locals.db;
  const sp = getScreenplay(db, screenplayId);
  if (!sp) return res.status(404).json({ error: 'screenplay not found', code: 'not_found' });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const note = noteId ? getNote(db, noteId) : null;
  const allScenes = listScenes(db, sp.id);
  // Pick scene context: first linked scene in note, else first scene
  const targetSceneId = note?.scenes[0] ?? allScenes[0]?.id;
  const sceneLines = targetSceneId ? listLines(db, targetSceneId) : [];
  const sceneContext = sceneLines.map(l =>
    l.type === 'action' ? l.text : `${l.character}${l.parenthetical ? ` (${l.parenthetical})` : ''}: ${l.text}`
  ).join('\n');

  let system: string;
  if (target.kind === 'character') {
    const c = listCharacterBible(db, sp.id).find(c => c.id === target.id);
    if (!c) { res.write('event: error\ndata: {"error":"character not found"}\n\n'); return res.end(); }
    system = loadCharacterPrompt({
      characterName: c.name, characterRole: c.role ?? '',
      characterWant: c.want ?? '', characterNeed: c.need ?? '',
      voiceRules: c.voice.map(v => `- ${v}`).join('\n'),
      sceneContext,
    });
  } else {
    system = loadAgentPrompt(target.id, { sceneContext, noteBody: note?.body ?? '' });
  }

  const history = listChatHistory(db, sp.id, noteId, 10).map(m => ({
    role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
    content: m.text,
  }));

  // Persist the user message before streaming
  insertChatMessage(db, {
    screenplay_id: sp.id, note_id: noteId, role: 'user',
    target_kind: target.kind, target_id: target.id, text: message, voice_match: null,
  });

  let fullText = '';
  try {
    const stream = anthropicClient().messages.stream({
      model: env.MODEL,
      max_tokens: 8192,
      system,
      messages: [...history, { role: 'user', content: message }],
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
    screenplay_id: sp.id, note_id: noteId, role: 'ai',
    target_kind: target.kind, target_id: target.id, text: fullText, voice_match: null,
  });

  res.write(`event: done\ndata: ${JSON.stringify({ messageId: aiRow.id })}\n\n`);
  res.end();
});

export default r;
```

- [ ] **Step 5: Wire into `server/src/app.ts`** — `app.use('/api', chat);`

- [ ] **Step 6: Run test, verify it passes**

- [ ] **Step 7: Commit**

```bash
git add server/src/models/chat.ts server/src/routes/chat.ts server/src/app.ts server/tests/routes/chat.test.ts
git commit -m "feat(server): SSE chat endpoint with Anthropic streaming"
```

---

### Task 17: Voice-match scoring (Haiku, optional)

**Files:**
- Modify: `server/src/routes/chat.ts` (compute voice_match for character / dialogue replies)
- Modify: `server/tests/routes/chat.test.ts` (gated by env)

- [ ] **Step 1: Add a follow-up Anthropic call after stream ends**

After `fullText` is built, before persisting the AI row, when `target.kind === 'character'` (or when the agent's reply contains quoted dialogue — detect via `/^"|"$/` heuristic on lines), make a second call to score it.

```ts
async function scoreVoiceMatch(rules: string, text: string): Promise<number | null> {
  if (!env.VOICE_SCORE_ENABLED) return null;
  try {
    const r = await anthropicClient().messages.create({
      model: env.VOICE_SCORE_MODEL,
      max_tokens: 8,
      messages: [{
        role: 'user',
        content: `Rate 0.0 to 1.0 how well this dialogue matches these voice rules.\n\nRules:\n${rules}\n\nDialogue:\n${text}\n\nReply with just the number.`,
      }],
    });
    const m = r.content?.[0]?.type === 'text' ? r.content[0].text : '';
    const n = parseFloat(m);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
  } catch {
    return null;
  }
}
```

Call it when `target.kind === 'character'` and emit a `meta` event before `done`:

```ts
const voiceMatch = target.kind === 'character'
  ? await scoreVoiceMatch(
      (listCharacterBible(db, sp.id).find(c => c.id === target.id)?.voice ?? []).map(v => `- ${v}`).join('\n'),
      fullText,
    )
  : null;
if (voiceMatch !== null) {
  res.write(`event: meta\ndata: ${JSON.stringify({ voiceMatch })}\n\n`);
}
```

And pass `voice_match: voiceMatch` when calling `insertChatMessage` for the AI row.

- [ ] **Step 2: Add a test that sets `VOICE_SCORE_ENABLED=false` and asserts no meta event**

Use `vi.stubEnv('VOICE_SCORE_ENABLED', 'false')` before importing the module.

- [ ] **Step 3: Run tests, verify they pass**

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/chat.ts server/tests/routes/chat.test.ts
git commit -m "feat(server): voice-match scoring via Haiku, env-gated"
```

---

## Phase 5 — Client integration

### Task 18: Client API layer + types

**Files:**
- Create: `src/api/client.ts`
- Modify: `src/api/types.ts` (already created in Task 3 — verify it matches server)
- Modify: `vite.config.ts` (proxy `/api` to the server in dev)

- [ ] **Step 1: Modify `vite.config.ts`** to proxy API:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
});
```

- [ ] **Step 2: Create `src/api/client.ts`**

```ts
import type { FullScreenplay, Screenplay, Note, Line, Scene } from './types';

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listScreenplays: () =>
    request<{ screenplays: Array<Omit<Screenplay, 'source_text'>> }>('/api/screenplays'),
  getScreenplay: (id: string) => request<FullScreenplay>(`/api/screenplays/${id}`),
  uploadScreenplay: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/screenplays', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ screenplay: Omit<Screenplay, 'source_text'> }>;
  },
  deleteScreenplay: (id: string) =>
    request<void>(`/api/screenplays/${id}`, { method: 'DELETE' }),

  patchLine: (id: string, patch: Partial<Pick<Line, 'text' | 'character' | 'parenthetical' | 'type'>>) =>
    request<{ line: Line }>(`/api/lines/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  patchScene: (id: string, patch: Partial<Pick<Scene, 'heading' | 'position'>>) =>
    request<{ scene: Scene }>(`/api/scenes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  createNote: (screenplayId: string, body: Omit<Note, 'id' | 'screenplay_id' | 'created_at'>) =>
    request<{ note: Note }>(`/api/screenplays/${screenplayId}/notes`, {
      method: 'POST', body: JSON.stringify(body),
    }),
  patchNote: (id: string, patch: Partial<Omit<Note, 'id' | 'screenplay_id' | 'created_at'>>) =>
    request<{ note: Note }>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  exportUrl: (id: string, format: 'fountain' | 'fdx') =>
    `/api/screenplays/${id}/export?format=${format}`,
};
```

- [ ] **Step 3: Commit**

```bash
git add src/api vite.config.ts
git commit -m "feat(client): API client + Vite proxy for /api"
```

---

### Task 19: Library page (list + upload + delete)

**Files:**
- Install: `react-router-dom`
- Create: `src/pages/Library.tsx`
- Create: `src/components/Library/UploadCard.tsx`
- Create: `src/components/Library/ScreenplayRow.tsx`
- Create: `src/hooks/useScreenplays.ts`
- Modify: `src/main.tsx` (BrowserRouter)
- Modify: `src/App.tsx` (Routes)

- [ ] **Step 1: Install `react-router-dom`**

```bash
npm install react-router-dom
npm install --save-dev @types/react-router-dom
```

- [ ] **Step 2: Create `src/hooks/useScreenplays.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Screenplay } from '../api/types';

export function useScreenplays() {
  const [list, setList] = useState<Array<Omit<Screenplay, 'source_text'>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { screenplays } = await api.listScreenplays();
      setList(screenplays);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { screenplays: list, loading, error, refresh };
}
```

- [ ] **Step 3: Create `src/components/Library/UploadCard.tsx`**

```tsx
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { RD } from '../../tokens';

export function UploadCard({ onUploaded }: { onUploaded: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { screenplay } = await api.uploadScreenplay(file);
      onUploaded();
      navigate(`/screenplays/${screenplay.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      style={{
        padding: '32px 24px',
        background: dragging ? RD.copperSoft : RD.card,
        border: `2px dashed ${dragging ? RD.copper : RD.lineDeep}`,
        borderRadius: 4,
        cursor: 'pointer',
        textAlign: 'center',
        fontFamily: RD.display,
        color: RD.inkSoft,
        fontStyle: 'italic',
        fontSize: 15,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".fountain,.txt,.fdx"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {uploading
        ? 'Uploading…'
        : error
        ? <span style={{ color: RD.ruby }}>{error}</span>
        : 'Drop a .fountain or .fdx file here, or click to choose'}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/Library/ScreenplayRow.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { RD } from '../../tokens';
import type { Screenplay } from '../../api/types';

export function ScreenplayRow({
  screenplay,
  onDeleted,
}: {
  screenplay: Omit<Screenplay, 'source_text'>;
  onDeleted: () => void;
}) {
  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`Delete "${screenplay.title}"? This cannot be undone.`)) return;
    await api.deleteScreenplay(screenplay.id);
    onDeleted();
  };
  return (
    <Link
      to={`/screenplays/${screenplay.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 18px',
        background: RD.card, border: `1px solid ${RD.line}`,
        borderLeft: `4px solid ${RD.copper}`,
        textDecoration: 'none', color: RD.ink, borderRadius: 2,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: RD.display, fontSize: 18, fontStyle: 'italic', color: RD.ink }}>
          {screenplay.title}
        </div>
        <div style={{ fontSize: 11, color: RD.inkFade, marginTop: 2 }}>
          {screenplay.author ? `by ${screenplay.author} · ` : ''}
          {screenplay.source_format.toUpperCase()}
          <span style={{ margin: '0 6px' }}>·</span>
          last edited {new Date(screenplay.updated_at).toLocaleString()}
        </div>
      </div>
      <button
        onClick={onDelete}
        style={{
          padding: '6px 12px', fontFamily: RD.display, fontSize: 11,
          fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          background: 'transparent', color: RD.ruby, border: `1px solid ${RD.ruby}50`,
          borderRadius: 1, cursor: 'pointer',
        }}
      >
        Delete
      </button>
    </Link>
  );
}
```

- [ ] **Step 5: Create `src/pages/Library.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useScreenplays } from '../hooks/useScreenplays';
import { RD } from '../tokens';
import { UploadCard } from '../components/Library/UploadCard';
import { ScreenplayRow } from '../components/Library/ScreenplayRow';

export default function Library() {
  const { screenplays, loading, refresh } = useScreenplays();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: RD.sans, background: RD.paper, overflow: 'auto' }}>
      <header style={{ padding: '40px 56px 24px', borderBottom: `1px solid ${RD.line}` }}>
        <div style={{ fontFamily: RD.display, fontSize: 36, fontStyle: 'italic', color: RD.ink }}>Splitdev</div>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: RD.copper, marginTop: 6 }}>Writers Atelier</div>
      </header>
      <main style={{ padding: '32px 56px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <UploadCard onUploaded={refresh} />
        {loading ? (
          <div style={{ color: RD.inkFade, fontStyle: 'italic' }}>Loading library…</div>
        ) : screenplays.length === 0 ? (
          <div style={{ color: RD.inkFade, fontStyle: 'italic' }}>No screenplays yet. Upload one above.</div>
        ) : (
          screenplays.map(s => <ScreenplayRow key={s.id} screenplay={s} onDeleted={refresh} />)
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Update `src/main.tsx`**

```tsx
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
```

- [ ] **Step 7: Update `src/App.tsx`** — becomes a thin Routes shell:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Library from './pages/Library';
import Editor from './pages/Editor';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/screenplays/:id" element={<Editor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 8: Manual QA** — `npm run dev`, visit `localhost:5173`, see the library page, upload `the-cabin.fountain` from the server's fixtures, confirm it appears in the list, click it (next task wires the editor).

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useScreenplays.ts src/pages/Library.tsx src/components/Library src/App.tsx src/main.tsx package.json package-lock.json
git commit -m "feat(client): library page + upload + react-router"
```

---

### Task 20: Editor page wired to API

**Files:**
- Create: `src/pages/Editor.tsx`
- Create: `src/hooks/useScreenplay.ts`
- Modify: `src/components/Sidebar.tsx` (accept scenes via props, fallback when no beats)
- Modify: `src/components/Notes.tsx` (read notes from props instead of static)
- Modify: `src/components/Bible.tsx` (read characters from props)
- Modify: `src/components/History.tsx` (load revisions from API)

The existing `src/App.tsx` body becomes the Editor page. Move state from `App.tsx` into `Editor.tsx`. Components stop importing from `src/data/*` and accept their data as props.

- [ ] **Step 1: Create `src/hooks/useScreenplay.ts`**

```ts
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { FullScreenplay } from '../api/types';

export function useScreenplay(id: string | undefined) {
  const [data, setData] = useState<FullScreenplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api.getScreenplay(id)
      .then(d => { if (!cancelled) { setData(d); setError(null); } })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return { data, setData, loading, error };
}
```

- [ ] **Step 2: Create `src/pages/Editor.tsx`** — copy the body of current `src/App.tsx`, but:

- Use `useParams().id` for the screenplay id
- Replace `import { SCREENPLAY } from '../data/screenplay'` (and the other static imports) with `useScreenplay(id)`
- Pass `data.scenes`, `data.notes`, `data.characterBible`, `data.beats` down as props
- Show a loading state while `loading === true`
- Show a "← Library" back button in the top bar (next to the Splitdev logo)

The state hooks (`activeScene`, `activeNote`, `chatTarget`, `bibleOpen`, etc.) stay in `Editor.tsx`.

- [ ] **Step 3: Modify `src/components/Sidebar.tsx`** to accept `beats: Beat[]` as a prop. If `beats.length === 0`, render a flat scene list with no act headers.

- [ ] **Step 4: Modify `src/components/Notes.tsx`** to accept `notes` and `patternNotes` from props (no default import from `src/data/notes`).

- [ ] **Step 5: Modify `src/components/Bible.tsx`** to accept `characters` from props.

- [ ] **Step 6: Modify `src/components/History.tsx`** to accept a `revisions` array from props (Editor fetches them — add `api.listRevisions(id)` in `useScreenplay` payload, server-side; if not yet, leave empty array for now).

- [ ] **Step 7: Manual QA** — upload, click into a screenplay, see the parsed scenes in the editor, notes panel shows empty state, bible empty.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Editor.tsx src/hooks/useScreenplay.ts src/App.tsx src/components/Sidebar.tsx src/components/Notes.tsx src/components/Bible.tsx src/components/History.tsx
git commit -m "feat(client): editor page loaded from /api/screenplays/:id"
```

---

### Task 21: Autosave hook wired to contentEditable

**Files:**
- Create: `src/hooks/useAutosave.ts`
- Create: `src/components/Editor/SaveIndicator.tsx`
- Modify: `src/components/Screenplay.tsx` (onBlur → patchLine, onInput → debounce)
- Modify: `src/components/TopBar.tsx` (mount SaveIndicator)
- Modify: `src/pages/Editor.tsx` (provide saveStatus context)

- [ ] **Step 1: Create `src/hooks/useAutosave.ts`** — generic debounced mutation manager:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

export function useAutosave<T>(mutationFn: (value: T) => Promise<unknown>, debounceMs = 600) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<T | null>(null);

  const trigger = useCallback((value: T) => {
    latest.current = value;
    setStatus('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await mutationFn(latest.current as T);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, debounceMs);
  }, [mutationFn, debounceMs]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { trigger, status };
}
```

- [ ] **Step 2: Create `src/components/Editor/SaveIndicator.tsx`** — small status pill replacing the page counter:

```tsx
import type { SaveStatus } from '../../hooks/useAutosave';
import { RD } from '../../tokens';

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const label =
    status === 'pending' ? 'Saving…' :
    status === 'saved' ? 'Saved' :
    status === 'error' ? 'Save failed' :
    'Idle';
  const color =
    status === 'pending' ? RD.gold :
    status === 'saved' ? RD.forest :
    status === 'error' ? RD.ruby :
    'rgba(244,237,224,0.6)';
  return (
    <div style={{
      padding: '4px 10px', fontFamily: RD.script, fontSize: 11, fontWeight: 700,
      color, border: `1px solid ${color}50`, borderRadius: 3, letterSpacing: 1,
    }}>{label}</div>
  );
}
```

- [ ] **Step 3: Modify `src/components/Screenplay.tsx`** — replace each contentEditable's lack of handlers with:

```tsx
onBlur={(e) => onLineEdit?.(line.id, { text: e.currentTarget.textContent ?? '' })}
```

(and similar for character / parenthetical / scene heading edits.)

The `onLineEdit` callback is passed in from `Editor.tsx`, which calls `api.patchLine(id, patch)` via the autosave hook.

- [ ] **Step 4: Wire `Editor.tsx`** with autosave callbacks

Inside `Editor.tsx`, alongside the existing state:

```tsx
import { useAutosave } from '../hooks/useAutosave';

// Inside the component:
const lineSave = useAutosave<{ id: string; patch: Partial<Line> }>(
  ({ id, patch }) => api.patchLine(id, patch),
);
const sceneSave = useAutosave<{ id: string; patch: Partial<Scene> }>(
  ({ id, patch }) => api.patchScene(id, patch),
);

const onLineEdit = (id: string, patch: Partial<Line>) => {
  // Optimistic local update — mutate scenes in state
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

// "Any save in progress" — priority order: error > pending > saved > idle
const saveStatus: SaveStatus =
  [lineSave.status, sceneSave.status].includes('error') ? 'error' :
  [lineSave.status, sceneSave.status].includes('pending') ? 'pending' :
  [lineSave.status, sceneSave.status].includes('saved') ? 'saved' : 'idle';
```

Pass `saveStatus` to `<TopBar saveStatus={saveStatus} ... />`, and pass `onLineEdit` / `onSceneEdit` to `<Screenplay ... onLineEdit={onLineEdit} onSceneEdit={onSceneEdit} />`.

- [ ] **Step 5: Manual QA** — open a screenplay, edit a line, blur away. "Saving…" → "Saved" appears in the top bar within ~1s. Refresh. Edit persists.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAutosave.ts src/components/Editor src/components/Screenplay.tsx src/components/TopBar.tsx src/pages/Editor.tsx
git commit -m "feat(client): autosave hook + SaveIndicator + wired line/scene edits"
```

---

### Task 22: Chat panel — real SSE stream

**Files:**
- Create: `src/hooks/useChatStream.ts`
- Modify: `src/components/Chat.tsx`

- [ ] **Step 1: Create `src/hooks/useChatStream.ts`** — POSTs to `/api/chat` and parses SSE manually (browser `fetch` returns a `ReadableStream`):

```ts
import { useCallback, useState } from 'react';

export interface ChatStreamArgs {
  screenplayId: string;
  noteId?: string | null;
  target: { kind: 'agent' | 'character'; id: string };
  message: string;
}

export interface StreamedReply {
  text: string;
  voiceMatch: number | null;
  done: boolean;
  error?: string;
}

export function useChatStream() {
  const [reply, setReply] = useState<StreamedReply>({ text: '', voiceMatch: null, done: false });
  const [streaming, setStreaming] = useState(false);

  const send = useCallback(async (args: ChatStreamArgs) => {
    setStreaming(true);
    setReply({ text: '', voiceMatch: null, done: false });
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args),
    });
    if (!res.body) { setStreaming(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
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
        if (!ev || !data) continue;
        if (ev === 'token') {
          const token = JSON.parse(data) as string;
          setReply(prev => ({ ...prev, text: prev.text + token }));
        } else if (ev === 'meta') {
          const meta = JSON.parse(data) as { voiceMatch?: number };
          if (meta.voiceMatch !== undefined) setReply(prev => ({ ...prev, voiceMatch: meta.voiceMatch! }));
        } else if (ev === 'done') {
          setReply(prev => ({ ...prev, done: true }));
          setStreaming(false);
        } else if (ev === 'error') {
          const e = JSON.parse(data) as { error: string };
          setReply(prev => ({ ...prev, error: e.error, done: true }));
          setStreaming(false);
        }
      }
    }
  }, []);

  return { reply, streaming, send };
}
```

- [ ] **Step 2: Modify `src/components/Chat.tsx`**

- Replace the `getReply()` + `setTimeout` mock with `useChatStream`
- On send: optimistically append the user message, then call `send(...)`, render the streaming reply as it arrives
- When `reply.done`, append the final AI message to local state and reset
- Render `voiceMatch` badge from `reply.voiceMatch` (or the message row)
- Remove the import of `AI_RESPONSES`/`CHARACTER_LINES` from `src/data/responses` (no longer needed unless we want a fallback path)

- [ ] **Step 3: Manual QA** — set `ANTHROPIC_API_KEY` in `server/.env`, restart the dev server, open the editor, send a chat message, watch tokens stream in.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useChatStream.ts src/components/Chat.tsx
git commit -m "feat(client): real-time chat panel via SSE stream from /api/chat"
```

---

### Task 23: Export download buttons

**Files:**
- Modify: `src/components/TopBar.tsx` (add export menu)
- Possibly: `src/components/Editor/ExportMenu.tsx`

- [ ] **Step 1: Add an Export menu to `src/components/TopBar.tsx`**

Receive `screenplayId: string` as a new prop. Add this block to the right-side toolbar (next to the Cast button), styled to match the existing draft-stamp aesthetic:

```tsx
import { api } from '../api/client';

const [exportOpen, setExportOpen] = useState(false);

// Inside the right-side toolbar:
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
```

- [ ] **Step 2: Manual QA** — upload, edit a line, export Fountain, verify the file contains the edit; export FDX, open it in a text editor and confirm the XML reflects the edit.

- [ ] **Step 3: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat(client): export buttons (fountain + fdx)"
```

---

### Task 24: End-to-end manual QA + README update

**Files:**
- Modify: `README.md` (or create `RUN.md`)

- [ ] **Step 1: Manual QA against a real script**

Find a public-domain Fountain script (e.g. one of the samples at https://fountain.io). Upload it. Verify:

1. The library lists it
2. The editor opens with all scenes / dialogue rendered
3. Editing a line + reload preserves the change
4. Chat with the Dialogue agent works and references the actual scene text
5. Chat with a (manually-created) character returns in-character dialogue
6. Voice-match badges appear on character replies when `VOICE_SCORE_ENABLED=true`
7. Export Fountain → file is valid (re-import works)
8. Export FDX → file opens in Final Draft (or at least re-imports into Splitdev)

- [ ] **Step 2: Update `README.md`** with run instructions

```markdown
## Run locally

1. Copy `server/.env.example` to `server/.env` and set `ANTHROPIC_API_KEY`.
2. From the repo root:
   ```bash
   npm install
   npm install --prefix server
   npm run dev
   ```
3. Open http://localhost:5173 — the library page loads.
4. Upload a `.fountain` or `.fdx` file. Click into it to edit.
5. Edits autosave to `server/data/screenplays.db`. Chat hits Anthropic via the server.

## API

See `docs/superpowers/specs/2026-05-14-splitdev1-mvp1-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: MVP-1 run + API docs"
```

---

## Verification Checklist

After all tasks:

- [ ] `npm test` at repo root runs all server tests — they pass
- [ ] `npm run build` succeeds (both client tsc + Vite + server tsc)
- [ ] Manual upload of a Fountain file produces 4+ scenes in the editor
- [ ] Editing a line persists across reload
- [ ] Chat streams tokens in real-time
- [ ] Exported Fountain re-imports cleanly
- [ ] Exported FDX is valid XML

## Spec Coverage Audit (self-review)

| Spec section | Plan task(s) |
|---|---|
| Repo layout / scripts | Task 1 |
| SQLite schema + migrations | Task 2 |
| Shared types | Task 3 |
| Fountain parser + serializer | Tasks 4, 5 |
| FDX parser + serializer | Tasks 6, 7 |
| Screenplay routes (CRUD + upload + GET full) | Tasks 8, 9, 10 |
| Scene/Line edit routes (autosave targets) | Task 12 |
| Note routes + revision_entry | Task 13 |
| Export routes | Task 14 |
| Anthropic client + prompts | Task 15 |
| Chat SSE | Task 16 |
| Voice-match (Haiku, env-gated) | Task 17 |
| Client API layer | Task 18 |
| Library page + upload UI | Task 19 |
| Editor page wired to API | Task 20 |
| Autosave + SaveIndicator | Task 21 |
| Real chat stream in UI | Task 22 |
| Export buttons | Task 23 |
| End-to-end QA + README | Task 24 |
| Single-user, no auth, CORS to localhost | Task 1 (bind 127.0.0.1) — no auth code needed |
| Notes/Bible/Beats start empty on upload | Task 11 (empty by default) |
| `source_text` frozen at upload | Task 9 (insert once, never UPDATE on source_text) |
| Re-serialize from rows on export | Task 14 |

No gaps.
