import { describe, it, expect, vi } from 'vitest';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';
import { insertScene } from '../../src/models/scene.js';
import { insertLine } from '../../src/models/line.js';
import { listNotes } from '../../src/models/note.js';

vi.mock('../../src/anthropic/client.js', () => ({
  anthropicClient: () => ({
    messages: {
      create: async () => ({
        content: [{
          type: 'text',
          text: JSON.stringify({
            summary: 'A test screenplay.',
            notes: [
              { title: 'Opening too slow', body: 'The cold open drags. Consider starting mid-action.', priority: 'high', sceneHints: ['INT. CABIN - DAY'] },
              { title: 'Sarah motivation unclear', body: 'Why is she here?', priority: 'high', sceneHints: [] },
            ],
          }),
        }],
      }),
    },
  }),
}));

describe('runTriageOnUpload', () => {
  it('writes notes and marks status done', async () => {
    const { runTriageOnUpload } = await import('../../src/triage/runner.js');
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'T', author: null, source_format: 'fountain', source_text: '' });
    const sc = insertScene(db, { screenplay_id: sp.id, position: 0, heading: 'INT. CABIN - DAY', eighths: null });
    insertLine(db, { scene_id: sc.id, position: 0, type: 'action', text: 'Sarah enters.', character: null, parenthetical: null });
    await runTriageOnUpload(db, sp.id);
    const status = (db.prepare('SELECT triage_status FROM screenplay WHERE id = ?').get(sp.id) as { triage_status: string }).triage_status;
    expect(status).toBe('done');
    const notes = listNotes(db, sp.id);
    expect(notes).toHaveLength(2);
    expect(notes[0].title).toMatch(/opening/i);
    expect(notes[0].scenes).toEqual([sc.id]);
  });
});
