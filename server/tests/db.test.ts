import { describe, it, expect } from 'vitest';
import { openDb } from '../src/db/index.js';

describe('db', () => {
  it('opens in-memory db and runs migrations', () => {
    const db = openDb(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const names = tables.map(t => t.name);
    expect(names).toContain('screenplay');
    expect(names).toContain('scene');
    expect(names).toContain('line');
    expect(names).toContain('note');
    expect(names).toContain('character_bible');
    expect(names).toContain('beat');
    expect(names).toContain('revision_entry');
    expect(names).toContain('chat_message');
    db.close();
  });

  it('enforces foreign keys', () => {
    const db = openDb(':memory:');
    expect(() =>
      db.prepare('INSERT INTO scene (id, screenplay_id, position, heading) VALUES (?,?,?,?)').run(
        'x', 'missing', 0, 'INT. X - DAY',
      ),
    ).toThrow(/FOREIGN KEY/);
    db.close();
  });
});
