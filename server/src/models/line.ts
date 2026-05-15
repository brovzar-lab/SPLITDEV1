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
