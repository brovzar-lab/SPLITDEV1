import type { Scene, Line } from '../api/types';

export interface LocationGroup {
  base: string;
  scenes: Array<Scene & { lines: Line[]; sub: string; time: string }>;
}

// Wide net for any Unicode dash that might appear in a slugline:
// hyphen-minus, en-dash, em-dash, figure dash, horizontal bar, minus sign,
// hyphen, non-breaking hyphen.
const DASH_SPLIT = /\s*[-–—‒―−‐‑]\s*/;

// Extract base location from a slugline: everything before the first separator.
// "INT. SUPERMERCADO – ALMACÉN - NIGHT" → base=SUPERMERCADO, sub=ALMACÉN, time=NIGHT.
// Strips INT./EXT./I/E. prefix first, normalizes NBSP to space, and tolerates
// dashes with or without surrounding whitespace.
export function parseLocation(heading: string): {
  base: string;
  sub: string;
  time: string;
} {
  const normalized = heading.replace(/ /g, ' ').trim();
  // Strip the INT./EXT./I/E. prefix — accept period-with-no-space ("INT.HACIENDA")
  // or no-period-with-space ("INT HACIENDA").
  const stripped = normalized.replace(/^(?:INT|EXT|I\/E)(?:\.\s*|\s+)/i, '');
  const parts = stripped.split(DASH_SPLIT).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return { base: '', sub: '', time: '' };
  if (parts.length === 1) return { base: parts[0], sub: '', time: '' };
  if (parts.length === 2) return { base: parts[0], sub: '', time: parts[1] };
  return {
    base: parts[0],
    sub: parts.slice(1, -1).join(' – '),
    time: parts[parts.length - 1],
  };
}

// Canonical group key: uppercase + collapsed-whitespace + accent-normalized.
// Without this, "GRUPO SERRANO" and "Grupo serrano" land in two separate
// groups; with it they merge.
function canonicalKey(base: string): string {
  return base
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Preserve the screenplay order of first appearance for each base location.
// The displayed `base` uses the canonical-cased form (uppercase, accents kept)
// of whichever casing appeared *first*, so subsequent variants merge into it.
export function groupByLocation(
  scenes: Array<Scene & { lines: Line[] }>,
): LocationGroup[] {
  const groups = new Map<string, LocationGroup>();
  scenes.forEach(s => {
    const { base, sub, time } = parseLocation(s.heading);
    const key = canonicalKey(base);
    if (!groups.has(key)) {
      // Show the base UPPERCASED for display (screenplay convention) but
      // keep the original accents so "SERRANÒ" stays "SERRANÒ" not "SERRANO".
      groups.set(key, { base: base.toUpperCase(), scenes: [] });
    }
    groups.get(key)!.scenes.push({ ...s, sub, time });
  });
  return Array.from(groups.values());
}
