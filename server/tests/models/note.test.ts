import { describe, it, expect } from 'vitest';
import { openDb } from '../../src/db/index.js';
import { createScreenplay } from '../../src/models/screenplay.js';
import { insertNote, listNotes, updateNote } from '../../src/models/note.js';

describe('note model', () => {
  it('round-trips scenes_json', () => {
    const db = openDb(':memory:');
    const sp = createScreenplay(db, { title: 'X', author: null, source_format: 'fountain', source_text: '' });
    const n = insertNote(db, {
      screenplay_id: sp.id, title: 'pace', body: 'too slow',
      scenes: ['s1', 's2'], priority: 'high', status: 'unread', origin: 'exec', confidence: 0.8,
    });
    const fetched = listNotes(db, sp.id);
    expect(fetched[0].scenes).toEqual(['s1', 's2']);
    expect(fetched[0].confidence).toBe(0.8);
    updateNote(db, n.id, { status: 'applied' });
    expect(listNotes(db, sp.id)[0].status).toBe('applied');
  });
});
