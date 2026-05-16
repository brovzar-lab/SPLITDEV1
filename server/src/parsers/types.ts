import type { LineType } from '../models/types.js';

export interface ParsedLine {
  type: LineType;
  text: string;
  character?: string;
  parenthetical?: string;
}

export interface ParsedScene {
  heading: string;
  lines: ParsedLine[];
}

export interface ParsedScreenplay {
  title: string;
  author?: string;
  scenes: ParsedScene[];
}
