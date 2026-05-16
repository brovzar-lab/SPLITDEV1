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
