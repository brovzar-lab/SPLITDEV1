import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { parseFountain } from '../../src/parsers/fountain.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'parsers', '__fixtures__');

describe('GET /api/screenplays/:id/export', () => {
  it('exports as fountain after upload', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const up = await request(app).post('/api/screenplays').attach('file', fountain, 'the-cabin.fountain');
    const id = up.body.screenplay.id;
    const res = await request(app).get(`/api/screenplays/${id}/export?format=fountain`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.headers['content-disposition']).toMatch(/attachment.*\.fountain/);
    const reparsed = parseFountain(res.text);
    expect(reparsed.scenes.length).toBeGreaterThanOrEqual(4);
  });

  it('exports as fdx', async () => {
    const db = openDb(':memory:');
    const app = buildApp({ db });
    const fountain = readFileSync(join(fixtureDir, 'the-cabin.fountain'));
    const up = await request(app).post('/api/screenplays').attach('file', fountain, 'the-cabin.fountain');
    const res = await request(app).get(`/api/screenplays/${up.body.screenplay.id}/export?format=fdx`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    expect(res.text).toContain('<FinalDraft');
  });
});
