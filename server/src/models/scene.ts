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
