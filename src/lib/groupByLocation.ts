import type { Scene, Line } from '../api/types';

export interface LocationGroup {
  base: string;
  scenes: Array<Scene & { lines: Line[]; sub: string; time: string }>;
}

// Extract base location from a slugline: everything before the first separator
// (" - ", " – ", " — "). "INT. SUPERMERCADO – ALMACÉN - NIGHT" → "SUPERMERCADO".
// Strips INT./EXT./I/E. prefix first.
export function parseLocation(heading: string): {
  base: string;
  sub: string;
  time: string;
} {
  const stripped = heading.replace(/^(INT|EXT|I\/E)\.?\s+/i, '');
  const parts = stripped.split(/\s+[–—-]\s+/);
  if (parts.length === 1) return { base: parts[0], sub: '', time: '' };
  if (parts.length === 2) return { base: parts[0], sub: '', time: parts[1] };
  // 3+ parts: first = base, last = time, middle = sub
  return {
    base: parts[0],
    sub: parts.slice(1, -1).join(' – '),
    time: parts[parts.length - 1],
  };
}

// Preserve the screenplay order of first appearance for each base location.
export function groupByLocation(
  scenes: Array<Scene & { lines: Line[] }>,
): LocationGroup[] {
  const groups = new Map<string, LocationGroup>();
  scenes.forEach(s => {
    const { base, sub, time } = parseLocation(s.heading);
    if (!groups.has(base)) groups.set(base, { base, scenes: [] });
    groups.get(base)!.scenes.push({ ...s, sub, time });
  });
  return Array.from(groups.values());
}
