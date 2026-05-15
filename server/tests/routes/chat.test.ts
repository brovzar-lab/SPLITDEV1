import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';

vi.mock('../../src/anthropic/client.js', () => ({
  anthropicClient: () => ({
    messages: {
      async *stream() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hel' } };
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'lo' } };
        yield { type: 'message_stop' };
      },
      // Voice-match scoring path (Task 17)
      create: async () => ({
        content: [{ type: 'text', text: '0.85' }],
      }),
    },
  }),
}));

describe('POST /api/chat', () => {
  it('streams an SSE response and persists messages', async () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'X', author: null, source_format: 'fountain', source_text: '' });
    const app = buildApp({ db });
    const res = await request(app).post('/api/chat').send({
      screenplayId: sp.id, target: { kind: 'agent', id: 'dialogue' }, message: 'hi',
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('event: token');
    expect(res.text).toContain('event: done');
    const persisted = db.prepare('SELECT * FROM chat_message WHERE screenplay_id = ?').all(sp.id);
    expect(persisted.length).toBe(2); // user + ai
  });

  it('handles script-level chat (no noteId) with outline context', async () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'Test', author: null, source_format: 'fountain', source_text: '' });
    db.prepare(`INSERT INTO scene (id, screenplay_id, position, heading) VALUES ('s1', ?, 0, 'INT. CABIN - DAY')`).run(sp.id);
    db.prepare(`INSERT INTO line (id, scene_id, position, type, character, parenthetical, text)
      VALUES ('l1', 's1', 0, 'action', null, null, 'Sarah enters.')`).run();
    const app = buildApp({ db });
    const res = await request(app).post('/api/chat').send({
      screenplayId: sp.id,
      target: { kind: 'agent', id: 'dialogue' },
      message: 'what should I work on?',
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('event: token');
    expect(res.text).toContain('event: done');
  });
});
