import type { Scene, Line, CharacterBibleEntry } from '../api/types';

// Scan dialogue lines and return a map of characterId → sorted list of scene
// IDs they appear in (by speaking). Names match case-insensitively against
// the bible. Characters with no appearances get an empty array, never missing.
export function deriveCharacterScenes(
  characters: CharacterBibleEntry[],
  scenes: Array<Scene & { lines: Line[] }>,
): Map<string, string[]> {
  const byName = new Map(
    characters.map(c => [c.name.toUpperCase().trim(), c.id]),
  );
  const out = new Map<string, Set<string>>();
  characters.forEach(c => out.set(c.id, new Set()));
  scenes.forEach(s => {
    const speakers = new Set<string>();
    s.lines.forEach(l => {
      if (l.type !== 'dialogue' || !l.character) return;
      const cid = byName.get(l.character.toUpperCase().trim());
      if (cid) speakers.add(cid);
    });
    speakers.forEach(cid => out.get(cid)!.add(s.id));
  });
  const result = new Map<string, string[]>();
  const orderIndex = new Map(scenes.map((s, i) => [s.id, i]));
  out.forEach((set, cid) => {
    result.set(
      cid,
      Array.from(set).sort(
        (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0),
      ),
    );
  });
  return result;
}
