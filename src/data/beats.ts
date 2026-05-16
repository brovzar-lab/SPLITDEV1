import type { BeatKind } from '../types';

export interface BeatTemplate {
  id: string;
  name: string;
  pct: number;
  kind: BeatKind;
}

export const SAVE_THE_CAT: BeatTemplate[] = [
  { id: 'opening-image',      name: 'Opening Image',       pct: 0.01, kind: 'minor' },
  { id: 'theme-stated',       name: 'Theme Stated',        pct: 0.05, kind: 'minor' },
  { id: 'catalyst',           name: 'Catalyst',            pct: 0.12, kind: 'major' },
  { id: 'debate',             name: 'Debate',              pct: 0.18, kind: 'minor' },
  { id: 'break-into-two',     name: 'Break Into Two',      pct: 0.25, kind: 'major' },
  { id: 'fun-and-games',      name: 'Fun & Games',         pct: 0.33, kind: 'minor' },
  { id: 'midpoint',           name: 'Midpoint',            pct: 0.50, kind: 'major' },
  { id: 'bad-guys-close-in',  name: 'Bad Guys Close In',   pct: 0.62, kind: 'minor' },
  { id: 'all-is-lost',        name: 'All Is Lost',         pct: 0.72, kind: 'major' },
  { id: 'dark-night',         name: 'Dark Night of Soul',  pct: 0.77, kind: 'minor' },
  { id: 'break-into-three',   name: 'Break Into Three',    pct: 0.80, kind: 'major' },
  { id: 'finale',             name: 'Finale',              pct: 0.92, kind: 'major' },
  { id: 'final-image',        name: 'Final Image',         pct: 0.99, kind: 'minor' },
];

// Act zone breakpoints (Save-the-Cat / Snyder convention):
// Act I  : 0%   – 25%   (ends on Break Into Two)
// Act II : 25%  – 80%   (ends on Break Into Three)
// Act III: 80%  – 100%
export const ACT_BOUNDS: Array<{ act: 'I' | 'II' | 'III'; start: number; end: number }> = [
  { act: 'I',   start: 0.00, end: 0.25 },
  { act: 'II',  start: 0.25, end: 0.80 },
  { act: 'III', start: 0.80, end: 1.00 },
];
