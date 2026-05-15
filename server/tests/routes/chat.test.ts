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
});
