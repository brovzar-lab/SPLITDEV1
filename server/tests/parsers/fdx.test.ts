import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFdx } from '../../src/parsers/fdx.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'parsers', '__fixtures__');

describe('parseFdx', () => {
  it('parses The Cabin fdx into structured scenes', () => {
    const src = readFileSync(join(fixtureDir, 'the-cabin.fdx'), 'utf8');
    const ps = parseFdx(src);
    expect(ps.title).toMatch(/cabin/i);
    expect(ps.scenes.length).toBeGreaterThanOrEqual(4);
    const firstScene = ps.scenes[0];
    expect(firstScene.heading).toBe('INT. CABIN - DAY');
    const sarahDialogue = firstScene.lines.find(
      l => l.type === 'dialogue' && l.character === 'SARAH',
    );
    expect(sarahDialogue).toBeTruthy();
    const withParen = firstScene.lines.find(l => l.type === 'dialogue' && l.parenthetical);
    expect(withParen?.parenthetical).toContain('into phone');
  });
});
