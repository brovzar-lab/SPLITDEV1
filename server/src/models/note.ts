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
