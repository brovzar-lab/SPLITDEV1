import type { Beat, Character, UndoEntry } from '../types';

export const BEATS: Beat[] = [
  { id: 'b1', name: 'Opening Image',     scenes: [1],    color: '#9a9a9a' },
  { id: 'b2', name: 'Set-Up',            scenes: [2],    color: '#9a9a9a' },
  { id: 'b3', name: 'Catalyst',          scenes: [3],    color: '#2563eb' },
  { id: 'b4', name: 'Debate',            scenes: [4],    color: '#2563eb' },
  { id: 'b5', name: 'Break Into Two',    scenes: [5],    color: '#a67c00' },
  { id: 'b6', name: 'Fun & Games',       scenes: [6, 7], color: '#a67c00' },
  { id: 'b7', name: 'Bad Guys Close In', scenes: [8],    color: '#c0512d' },
  { id: 'b8', name: 'All Is Lost',       scenes: [9],    color: '#c0512d' },
];

export const CHARACTER_BIBLE: Character[] = [
  {
    id: 'sarah', name: 'SARAH', age: 28, color: '#c0512d', role: 'Protagonist',
    want: 'Solitude to grieve her mother',
    need: 'To accept help / reconnect',
    voice: [
      'Uses contractions, never formal speech',
      'Deflects with dry humor when scared',
      'Never swears in front of family',
      'Speaks in short sentences when stressed',
      'Asks questions instead of stating fear',
    ],
    appearances: 9,
  },
  {
    id: 'tom', name: 'TOM', age: 32, color: '#2563eb', role: 'Brother',
    want: 'To bring Sarah home',
    need: 'To forgive their shared past',
    voice: [
      'Over-explains when nervous',
      'Uses "look," and "listen," as openers',
      'Quotes their mother frequently',
      'Speaks slowly, deliberately',
    ],
    appearances: 4,
  },
  {
    id: 'figure', name: 'THE FIGURE', age: null, color: '#7c3aed', role: 'Antagonist',
    want: 'Unknown / sinister',
    need: 'N/A — symbolic',
    voice: [
      'Never speaks aloud',
      'Communicates via environment / sound',
    ],
    appearances: 6,
  },
];

export const UNDO_HISTORY: UndoEntry[] = [
  { id: 'u1', action: 'Accepted', target: 'Scene 1 opening',   agent: 'Dialogue', time: '2 min ago'  },
  { id: 'u2', action: 'Rejected', target: 'Tom speech cut',    agent: 'Dialogue', time: '8 min ago'  },
  { id: 'u3', action: 'Accepted', target: 'Lake ambient',      agent: 'Horror',   time: '14 min ago' },
  { id: 'u4', action: 'Note',     target: 'Cabin intro slow',  agent: null,       time: '22 min ago' },
];
