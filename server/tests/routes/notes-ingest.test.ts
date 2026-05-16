import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';

vi.mock('../../src/anthropic/client.js', () => ({
  anthropicClient: () => ({
    messages: {
      create: async () => ({
        content: [{
          type: 'text',
          text: JSON.stringify({
            origin: 'producer',
            notes: [
              { title: 'Pacing issue', body: 'Act 2 sags after the midpoint.', priority: 'high', sceneHints: [] },
              { title: 'Sarah motivation', body: "Unclear why she stays.", priority: 'medium', sceneHints: [] },
            ],
          }),
        }],
      }),
    },
  }),
}));

describe('POST /api/screenplays/:id/notes:ingest', () => {
  it('extracts notes from pasted text', async () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
    const app = buildApp({ db });
    const res = await request(app)
      .post(`/api/screenplays/${sp.id}/notes:ingest`)
      .send({ text: 'From the producer: Act 2 sags. And Sarah should have a clearer reason to stay in the cabin after scene 4. This is a longer paragraph with enough words to pass the 20-char minimum check easily.' });
    expect(res.status).toBe(201);
    expect(res.body.notes).toHaveLength(2);
    expect(res.body.notes[0].origin).toBe('producer');
  });

  it('rejects too-short text', async () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
    const app = buildApp({ db });
    const res = await request(app)
      .post(`/api/screenplays/${sp.id}/notes:ingest`)
      .send({ text: 'too short' });
    expect(res.status).toBe(400);
  });
});
