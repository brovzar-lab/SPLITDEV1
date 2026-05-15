import { describe, it, expect } from 'vitest';
import { openDb } from '../../src/db/index.js';

describe('migration 002', () => {
  it('adds triage_status and triage_error columns', () => {
    const db = openDb(':memory:');
    const cols = db.prepare("PRAGMA table_info(screenplay)").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('triage_status');
    expect(names).toContain('triage_error');
  });

  it('new screenplays default triage_status to pending', () => {
    const db = openDb(':memory:');
    db.prepare(`INSERT INTO screenplay
      (id, title, author, source_format, source_text, created_at, updated_at)
      VALUES ('t1', 'T', null, 'fountain', '', 0, 0)`).run();
    const row = db.prepare('SELECT triage_status, triage_error FROM screenplay WHERE id = ?').get('t1') as { triage_status: string; triage_error: string | null };
    expect(row.triage_status).toBe('pending');
    expect(row.triage_error).toBeNull();
  });
});
