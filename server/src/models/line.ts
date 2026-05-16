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

export function getLine(db: DB, id: string): Line | null {
  return (db.prepare('SELECT * FROM line WHERE id = ?').get(id) as Line | undefined) ?? null;
}

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

export function deleteLine(db: DB, id: string): boolean {
  return db.prepare('DELETE FROM line WHERE id = ?').run(id).changes > 0;
}
