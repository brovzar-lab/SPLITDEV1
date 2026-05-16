export type LineChangeStatus = 'pending' | 'accepted' | 'rejected';

export interface LineChange {
  id: string;
  status: LineChangeStatus;
  agent: string;
  deleted: string;
  inserted: string;
}

export interface ActionLine {
  type: 'action';
  text: string;
  change?: LineChange;
}

export interface DialogueLine {
  type: 'dialogue';
  character: string;
  line: string;
  parenthetical?: string;
  change?: LineChange;
}

export type ScreenplayLine = ActionLine | DialogueLine;

export interface Scene {
  id: number;
  heading: string;
  hasNotes: boolean;
}

export interface ScreenplayScene {
  sceneId: number;
  heading: string;
  lines: ScreenplayLine[];
}

export interface Agent {
  id: string;
  name: string;
  color: string;
  desc: string;
  glyph: string;
}

export interface NoteOrigin {
  label: string;
  color: string;
  initial: string;
}

export type NoteOriginId =
  | 'self'
  | 'producer'
  | 'director'
  | 'exec'
  | 'reader'
  | 'table';

export type NotePriority = 'high' | 'medium' | 'low';
export type NoteStatus = 'unread' | 'discussing' | 'applied';

export interface Note {
  id: string;
  title: string;
  body: string;
  sceneId: number;
  scenes?: number[];
  priority: NotePriority;
  status: NoteStatus;
  origin: NoteOriginId;
  confidence: number;
}

export interface PatternInstance {
  sceneId: number;
  line: string;
}

export interface PatternNote {
  id: string;
  title: string;
  body: string;
  pattern: string;
  target: string | null;
  instances: PatternInstance[];
  origin: NoteOriginId;
  priority: NotePriority;
  status: NoteStatus;
}

export interface RevisionColor {
  id: string;
  name: string;
  bg: string;
  fg: string;
  border: string;
}

export type BeatKind = 'major' | 'minor';

export interface Beat {
  id: string;
  name: string;
  scenes: number[];
  color: string;
}

export interface Character {
  id: string;
  name: string;
  age: number | null;
  color: string;
  role: string;
  want: string;
  need: string;
  voice: string[];
  appearances: number;
}

export interface UndoEntry {
  id: string;
  action: 'Accepted' | 'Rejected' | 'Note';
  target: string;
  agent: string | null;
  time: string;
}

export type ChatTarget =
  | { kind: 'agent'; id: string }
  | { kind: 'character'; id: string };

export type AgentCardState = 'rest' | 'composing' | 'streaming' | 'done';

export type AgentReplyStatus = 'streaming' | 'done' | 'graduated';

export interface AgentReply {
  id: string;
  agentId: string;
  sceneId: string;
  prompt: string;
  body: string;
  status: AgentReplyStatus;
  createdAt: number;
}

export type LineActionGroup = 'ask' | 'rewrite' | 'capture' | 'utility';

export interface LineMenuContext {
  text: string;
  lineId: string;
  sceneId: string;
  lineType: 'action' | 'dialogue';
  character: string | null;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  respondent?: string;
  respondentColor?: string;
  inCharacter?: boolean;
  showApply?: boolean;
  voiceMatch?: number | null;
}

export interface PinnedMessage {
  id: string;
  text: string;
  agent: string;
  sceneId: number | null;
  color: string;
}
