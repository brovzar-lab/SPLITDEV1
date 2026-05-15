import type { Note, NoteOrigin, NoteOriginId, PatternNote } from '../types';

export const NOTE_ORIGINS: Record<NoteOriginId, NoteOrigin> = {
  self:     { label: 'Self',     color: '#9a9a9a', initial: 'M' },
  producer: { label: 'Producer', color: '#7c3aed', initial: 'P' },
  director: { label: 'Director', color: '#2563eb', initial: 'D' },
  exec:     { label: 'Exec',     color: '#c0512d', initial: 'E' },
  reader:   { label: 'Reader',   color: '#16803c', initial: 'R' },
  table:    { label: 'Table',    color: '#a67c00', initial: 'T' },
};

export const NOTES_V2: Note[] = [
  { id: 'n1', title: 'Cabin intro feels slow',          body: 'The opening scene drags. Consider starting mid-action.',                 sceneId: 1, scenes: [1],       priority: 'high',   status: 'discussing', origin: 'exec',     confidence: 0.82 },
  { id: 'n2', title: "Sarah's motivation unclear",      body: "Why does she go to the woods alone? Need a stronger plant in Act 1.",   sceneId: 2, scenes: [1, 2, 3], priority: 'high',   status: 'unread',     origin: 'producer', confidence: 0.91 },
  { id: 'n3', title: 'Lake scene — add tension',        body: 'The lake discovery should feel more ominous.',                           sceneId: 4, scenes: [4],       priority: 'medium', status: 'unread',     origin: 'director', confidence: 0.74 },
  { id: 'n4', title: 'Dialogue too on-the-nose',        body: "Tom's speech about fear is too expository.",                             sceneId: 7, scenes: [7],       priority: 'low',    status: 'applied',    origin: 'table',    confidence: 0.68 },
  { id: 'n5', title: "Sarah's voice slips in Act 2",    body: "She speaks more formally than established. Pull back to her natural cadence.", sceneId: 5, scenes: [5, 6], priority: 'medium', status: 'unread',     origin: 'reader',   confidence: 0.79 },
];

export const PATTERN_NOTES: PatternNote[] = [
  {
    id: 'pn1',
    title: "Tom's dialogue is on-the-nose",
    body: 'Tom over-explains his feelings 4 times. He should show fear, not announce it.',
    pattern: 'character',
    target: 'tom',
    instances: [
      { sceneId: 7, line: 'I just feel scared, you know? Really scared.' },
      { sceneId: 5, line: "I'm worried about you, Sarah. I'm really worried." },
      { sceneId: 3, line: 'This place gives me the creeps. Bad vibes.' },
      { sceneId: 8, line: "Listen, I think we should leave. I'm afraid." },
    ],
    origin: 'reader',
    priority: 'high',
    status: 'unread',
  },
  {
    id: 'pn2',
    title: 'Excessive use of "suddenly"',
    body: 'The word "suddenly" appears 7 times. Trust the action to convey suddenness.',
    pattern: 'language',
    target: null,
    instances: [
      { sceneId: 1, line: 'Suddenly, something CREAKS upstairs.' },
      { sceneId: 3, line: 'Suddenly the bulb flickers.' },
      { sceneId: 4, line: 'Suddenly something BUMPS the dock.' },
    ],
    origin: 'self',
    priority: 'low',
    status: 'unread',
  },
];

export const VOICE_MATCHES: Record<string, number> = {
  c1: 0.87,
  c2: 0.63,
};
