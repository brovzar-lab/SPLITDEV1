import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseFountain } from '../../src/parsers/fountain.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'parsers', '__fixtures__');

describe('parseFountain', () => {
  it('parses minimal screenplay', () => {
    const src = readFileSync(join(fixtureDir, 'minimal.fountain'), 'utf8');
    const ps = parseFountain(src);
    expect(ps.title).toBe('Minimal');
    expect(ps.scenes).toHaveLength(1);
    expect(ps.scenes[0].heading).toBe('INT. ROOM - DAY');
    expect(ps.scenes[0].lines[0]).toEqual({ type: 'action', text: 'A bare room. SARAH paces.' });
    expect(ps.scenes[0].lines[1]).toMatchObject({
      type: 'dialogue',
      character: 'SARAH',
      text: 'Are we starting?',
    });
  });

  it('parses The Cabin fixture into 4 scenes with dialogue + action', () => {
    const src = readFileSync(join(fixtureDir, 'the-cabin.fountain'), 'utf8');
    const ps = parseFountain(src);
    expect(ps.title).toMatch(/cabin/i);
    expect(ps.scenes.length).toBeGreaterThanOrEqual(4);
    const dialogue = ps.scenes.flatMap(s => s.lines).filter(l => l.type === 'dialogue');
    expect(dialogue.some(d => d.character === 'SARAH')).toBe(true);
    expect(dialogue.some(d => d.parenthetical?.includes('into phone'))).toBe(true);
  });
});
