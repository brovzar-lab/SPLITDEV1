import type { RevisionColor } from '../types';

// Industry-standard production revision color sequence.
export const REVISION_COLORS: RevisionColor[] = [
  { id: 'white',     name: 'White Draft',     bg: '#ffffff', fg: '#1a1a1a', border: '#d0d0d0' },
  { id: 'blue',      name: 'Blue Revision',   bg: '#cfe2f3', fg: '#1a3d5c', border: '#6fa8d3' },
  { id: 'pink',      name: 'Pink Revision',   bg: '#f4cccc', fg: '#5c1a1a', border: '#e06666' },
  { id: 'yellow',    name: 'Yellow Revision', bg: '#fff2cc', fg: '#5c4a1a', border: '#f1c232' },
  { id: 'green',     name: 'Green Revision',  bg: '#d9ead3', fg: '#2a5c1a', border: '#6aa84f' },
  { id: 'goldenrod', name: 'Goldenrod',       bg: '#f5e8b8', fg: '#5c4a1a', border: '#bf9000' },
  { id: 'buff',      name: 'Buff',            bg: '#f0e8d4', fg: '#4a3d1a', border: '#a8946a' },
  { id: 'salmon',    name: 'Salmon',          bg: '#fde4d3', fg: '#5c3a1a', border: '#e89878' },
];
