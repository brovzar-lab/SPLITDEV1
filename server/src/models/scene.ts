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
