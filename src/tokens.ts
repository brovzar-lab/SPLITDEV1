/*
 * SPLITDEV — Redesign tokens ("The Writer's Atelier")
 * Warm parchment + ink palette, editorial serif + screenwriter's Courier,
 * tactile paper-craft, cinematic touches.
 */
export const RD = {
  // Type
  display: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
  script: "'Courier Prime', 'Courier New', monospace",

  // Atelier palette
  paper: '#f4ede0',
  paperDeep: '#e8dfc9',
  card: '#fdfaf0',
  manuscript: '#fbf6e7',
  ink: '#1a1612',
  inkSoft: '#5c4f3f',
  inkFade: '#8a7e6a',
  line: '#d8ccb0',
  lineDeep: '#b8a989',

  // Accents
  copper: '#c25e1c',
  copperSoft: '#f4d9c4',
  blue: '#2c4a6b',
  blueSoft: '#dde7f0',
  gold: '#b8893a',
  goldSoft: '#f5e6c3',
  forest: '#3e6e3e',
  forestSoft: '#e0ecdd',
  ruby: '#8c2828',
  rubySoft: '#f3dada',

  // Sticky note paper colors
  stickyYellow: '#fef3c0',
  stickyPink: '#fcdada',
  stickyBlue: '#dceaf2',
  stickyGreen: '#ddebd0',

  // Misc
  shadowCard:
    '0 1px 2px rgba(60,40,20,0.06), 0 4px 12px rgba(60,40,20,0.05)',
  shadowSticky:
    '0 1px 1px rgba(60,40,20,0.08), 0 3px 6px rgba(60,40,20,0.1)',
  shadowDeep: '0 8px 32px rgba(40,28,16,0.18)',
  paperTexture:
    'radial-gradient(circle at 25% 35%, rgba(0,0,0,0.012) 0.5px, transparent 1px), radial-gradient(circle at 75% 65%, rgba(0,0,0,0.01) 0.5px, transparent 1px)',
  paperGrain:
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Cfilter id=%27a%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.85%27 numOctaves=%272%27/%3E%3CfeColorMatrix values=%270 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 0.04 0%27/%3E%3C/filter%3E%3Crect width=%27120%27 height=%27120%27 filter=%27url(%23a)%27 opacity=%270.3%27/%3E%3C/svg%3E")',
} as const;

export type RDToken = typeof RD;
