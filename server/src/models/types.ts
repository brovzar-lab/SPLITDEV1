export type SourceFormat = 'fountain' | 'fdx';
export type LineType = 'action' | 'dialogue';
export type NotePriority = 'high' | 'medium' | 'low';
export type NoteStatus = 'unread' | 'discussing' | 'applied';
export type NoteOrigin = 'self' | 'producer' | 'director' | 'exec' | 'reader' | 'table';

export interface Screenplay {
  id: string;
  title: string;
  author: string | null;
  source_format: SourceFormat;
  source_text: string;
  created_at: number;
  updated_at: number;
}

export interface Scene {
  id: string;
  screenplay_id: string;
  position: number;
  heading: string;
  eighths: string | null;
}

export interface Line {
  id: string;
  scene_id: string;
  position: number;
  type: LineType;
  character: string | null;
  parenthetical: string | null;
  text: string;
}

export interface Note {
  id: string;
  screenplay_id: string;
  title: string;
  body: string;
  scenes: string[];           // hydrated from scenes_json
  priority: NotePriority;
  status: NoteStatus;
  origin: NoteOrigin;
  confidence: number | null;
  created_at: number;
}

export interface CharacterBibleEntry {
  id: string;
  screenplay_id: string;
  name: string;
  age: number | null;
  color: string;
  role: string | null;
  want: string | null;
  need: string | null;
  voice: string[];
  appearances: number;
}

export interface Beat {
  id: string;
  screenplay_id: string;
  position: number;
  name: string;
  scenes: string[];
}

export interface RevisionEntry {
  id: string;
  screenplay_id: string;
  action: 'Accepted' | 'Rejected' | 'Note';
  target: string;
  agent: string | null;
  at: number;
}

export interface ChatMessage {
  id: string;
  screenplay_id: string;
  note_id: string | null;
  role: 'user' | 'ai';
  target_kind: 'agent' | 'character';
  target_id: string;
  text: string;
  voice_match: number | null;
  at: number;
}

export interface FullScreenplay {
  screenplay: Screenplay;
  scenes: Array<Scene & { lines: Line[] }>;
  notes: Note[];
  characterBible: CharacterBibleEntry[];
  beats: Beat[];
}
