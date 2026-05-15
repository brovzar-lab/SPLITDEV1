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
