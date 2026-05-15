import { Fountain } from 'fountain-js';
import type { ParsedScreenplay, ParsedScene, ParsedLine } from './types.js';

// fountain-js Token interface (kept minimal to avoid importing loose types)
interface FountainToken {
  type: string;
  text?: string;
  scene_number?: string;
  dual?: string;
  is_title?: boolean;
}

export function parseFountain(source: string): ParsedScreenplay {
  const f = new Fountain();
  // Pass `true` to request the token array — required by fountain-js API
  const out = f.parse(source, true);

  // `out.title` is already the clean string extracted from the title page
  const title = out.title?.trim() || 'Untitled';

  // Scan the full token list for the author token (title page tokens come first)
  let author: string | undefined;
  for (const tok of out.tokens as FountainToken[]) {
    if (tok.type === 'author' || tok.type === 'authors') {
      author = tok.text?.trim();
      break;
    }
  }

  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let lastCharacter: string | undefined;
  let lastParenthetical: string | undefined;

  for (const tok of out.tokens as FountainToken[]) {
    switch (tok.type) {
      case 'scene_heading': {
        current = { heading: stripBracketSceneNumber(tok.text ?? ''), lines: [] };
        scenes.push(current);
        lastCharacter = undefined;
        lastParenthetical = undefined;
        break;
      }
      case 'action': {
        if (!current) {
          current = { heading: 'UNTITLED', lines: [] };
          scenes.push(current);
        }
        const text = (tok.text ?? '').trim();
        if (text) {
          current.lines.push({ type: 'action', text });
        }
        break;
      }
      case 'character': {
        lastCharacter = (tok.text ?? '').replace(/\^$/, '').trim();
        lastParenthetical = undefined;
        break;
      }
      case 'parenthetical': {
        lastParenthetical = (tok.text ?? '')
          .replace(/^\(/, '')
          .replace(/\)$/, '')
          .trim();
        break;
      }
      case 'dialogue': {
        if (!current || !lastCharacter) break;
        const line: ParsedLine = {
          type: 'dialogue',
          character: lastCharacter,
          text: (tok.text ?? '').trim(),
        };
        if (lastParenthetical) line.parenthetical = lastParenthetical;
        current.lines.push(line);
        lastParenthetical = undefined;
        break;
      }
      // dialogue_begin, dialogue_end, dual_dialogue_begin, dual_dialogue_end,
      // transition, note, spaces, page_break, title, author — intentionally skipped
    }
  }

  return {
    title,
    author,
    scenes,
  };
}

function stripBracketSceneNumber(s: string): string {
  return s.replace(/\s*#\S+#\s*$/, '').trim();
}
