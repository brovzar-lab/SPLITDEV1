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
