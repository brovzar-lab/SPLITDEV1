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
    triage_status: 'pending',
    triage_error: null,
    created_at: now,
    updated_at: now,
  };
  db.prepare(`INSERT INTO screenplay
    (id, title, author, source_format, source_text, triage_status, triage_error, created_at, updated_at)
    VALUES (@id, @title, @author, @source_format, @source_text, @triage_status, @triage_error, @created_at, @updated_at)`).run(row);
  return row;
}

export function listScreenplays(db: DB): Array<Omit<Screenplay, 'source_text'>> {
  return db.prepare(`SELECT id, title, author, source_format, triage_status, triage_error, created_at, updated_at
    FROM screenplay ORDER BY updated_at DESC, id DESC`).all() as Array<Omit<Screenplay, 'source_text'>>;
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
