import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';
import { insertScene } from '../../src/models/scene.js';
import { insertLine } from '../../src/models/line.js';

function seed() {
  const db = openDb(':memory:');
  const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
  const sc = insertScene(db, { screenplay_id: sp.id, position: 0, heading: 'INT. X - DAY', eighths: null });
  const ln = insertLine(db, { scene_id: sc.id, position: 0, type: 'action', text: 'Hello', character: null, parenthetical: null });
  return { db, sp, sc, ln };
}

describe('PATCH /api/lines/:id', () => {
  it('updates text', async () => {
    const { db, ln } = seed();
    const res = await request(buildApp({ db })).patch(`/api/lines/${ln.id}`).send({ text: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.line.text).toBe('Updated');
  });

  it('returns 404 for missing id', async () => {
    const { db } = seed();
    const res = await request(buildApp({ db })).patch('/api/lines/missing').send({ text: 'x' });
    expect(res.status).toBe(404);
  });
});
