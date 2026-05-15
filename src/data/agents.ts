import type { Agent } from '../types';

// Inlined hex codes (from prototype TK tokens)
export const AGENTS: Agent[] = [
  { id: 'structure', name: 'Structure', color: '#2563eb', desc: 'Plot, pacing, act breaks' },
  { id: 'dialogue',  name: 'Dialogue',  color: '#c0512d', desc: 'Voice, subtext, rhythm' },
  { id: 'character', name: 'Character', color: '#16803c', desc: 'Arc, motivation, want/need' },
  { id: 'horror',    name: 'Horror',    color: '#7c3aed', desc: 'Dread, tension, scares' },
  { id: 'conflict',  name: 'Conflict',  color: '#e05d9e', desc: 'Stakes, obstacles, escalation' },
  { id: 'theme',     name: 'Theme',     color: '#a67c00', desc: 'Meaning, motif, resonance' },
];
