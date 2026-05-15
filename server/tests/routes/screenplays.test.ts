import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb, type DB } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';

describe('GET /api/screenplays', () => {
  let db: DB;
  beforeEach(() => { db = openDb(':memory:'); });

  it('returns empty list initially', async () => {
    const app = buildApp({ db });
    const res = await request(app).get('/api/screenplays');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ screenplays: [] });
  });

  it('returns library entries sorted by updated_at desc', async () => {
    createScreenplay(db, { id: 'a', title: 'A', author: null, source_format: 'fountain', source_text: '' });
    createScreenplay(db, { id: 'b', title: 'B', author: 'X', source_format: 'fdx', source_text: '' });
    const app = buildApp({ db });
    const res = await request(app).get('/api/screenplays');
    expect(res.body.screenplays.map((s: any) => s.id)).toEqual(['b', 'a']);
    expect(res.body.screenplays[0]).not.toHaveProperty('source_text');
  });
});
