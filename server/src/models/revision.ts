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
