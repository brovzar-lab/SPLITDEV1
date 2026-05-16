import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFdx, serializeFdx } from '../../src/parsers/fdx.js';

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

describe('serializeFdx', () => {
  it('round-trips The Cabin fdx', () => {
    const src = readFileSync(join(fixtureDir, 'the-cabin.fdx'), 'utf8');
    const ps = parseFdx(src);
    const back = serializeFdx(ps);
    const reparsed = parseFdx(back);
    expect(reparsed.title).toBe(ps.title);
    expect(reparsed.scenes.length).toBe(ps.scenes.length);
    for (let i = 0; i < ps.scenes.length; i++) {
      expect(reparsed.scenes[i].heading).toBe(ps.scenes[i].heading);
      expect(reparsed.scenes[i].lines).toEqual(ps.scenes[i].lines);
    }
  });
});
