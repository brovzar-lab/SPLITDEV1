import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';

describe('notes routes', () => {
  it('creates and updates a note', async () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
    const app = buildApp({ db });
    const created = await request(app).post(`/api/screenplays/${sp.id}/notes`).send({
      title: 'pacing', body: 'too slow', scenes: [], priority: 'high', status: 'unread', origin: 'exec',
    });
    expect(created.status).toBe(201);
    const id = created.body.note.id;
    const updated = await request(app).patch(`/api/notes/${id}`).send({ status: 'applied' });
    expect(updated.body.note.status).toBe('applied');
  });
});
