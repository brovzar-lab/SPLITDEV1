import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb, type DB } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'parsers', '__fixtures__');

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

describe('POST /api/screenplays', () => {
  it('uploads and parses a fountain file', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const res = await request(app)
      .post('/api/screenplays')
      .attach('file', fountain, 'the-cabin.fountain');
    expect(res.status).toBe(201);
    expect(res.body.screenplay).toMatchObject({ source_format: 'fountain', title: expect.stringMatching(/cabin/i) });
    const id = res.body.screenplay.id;
    const sceneRows = db.prepare('SELECT COUNT(*) AS c FROM scene WHERE screenplay_id = ?').get(id) as { c: number };
    expect(sceneRows.c).toBeGreaterThanOrEqual(4);
  });

  it('uploads an fdx file', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fdx = readFileSync(join(fixtureDir, 'the-cabin.fdx'));
    const res = await request(app).post('/api/screenplays').attach('file', fdx, 'the-cabin.fdx');
    expect(res.status).toBe(201);
    expect(res.body.screenplay.source_format).toBe('fdx');
  });

  it('rejects unknown extensions', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const res = await request(app).post('/api/screenplays').attach('file', Buffer.from('hi'), 'x.pdf');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/screenplays/:id', () => {
  it('returns 404 when missing', async () => {
    const app = buildApp({ db: openDb(':memory:') });
    const res = await request(app).get('/api/screenplays/missing');
    expect(res.status).toBe(404);
  });

  it('returns the full payload after upload', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const up = await request(app).post('/api/screenplays').attach('file', fountain, 'the-cabin.fountain');
    const id = up.body.screenplay.id;
    const res = await request(app).get(`/api/screenplays/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.screenplay.id).toBe(id);
    expect(res.body.scenes.length).toBeGreaterThanOrEqual(4);
    expect(res.body.scenes[0].lines.length).toBeGreaterThan(0);
    expect(res.body.notes).toEqual([]);
    expect(res.body.characterBible).toEqual([]);
    expect(res.body.beats).toEqual([]);
  });
});

describe('PATCH /api/screenplays/:id', () => {
  it('updates title and author', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const up = await request(app).post('/api/screenplays').attach('file', fountain, 'the-cabin.fountain');
    const id = up.body.screenplay.id;
    const res = await request(app).patch(`/api/screenplays/${id}`).send({ title: 'Renamed', author: 'New Author' });
    expect(res.status).toBe(200);
    expect(res.body.screenplay.title).toBe('Renamed');
    expect(res.body.screenplay.author).toBe('New Author');
    expect(res.body.screenplay).not.toHaveProperty('source_text');
  });

  it('returns 404 on missing id', async () => {
    const app = buildApp({ db: openDb(':memory:') });
    const res = await request(app).patch('/api/screenplays/missing').send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/screenplays/:id', () => {
  it('deletes a screenplay and cascades', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const up = await request(app).post('/api/screenplays').attach('file', fountain, 'the-cabin.fountain');
    const id = up.body.screenplay.id;
    const del = await request(app).delete(`/api/screenplays/${id}`);
    expect(del.status).toBe(204);
    const get = await request(app).get(`/api/screenplays/${id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 on missing id', async () => {
    const app = buildApp({ db: openDb(':memory:') });
    const res = await request(app).delete('/api/screenplays/missing');
    expect(res.status).toBe(404);
  });
});
