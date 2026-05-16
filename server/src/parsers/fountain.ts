import { Fountain, type Token } from 'fountain-js';
import type { ParsedScreenplay, ParsedScene, ParsedLine } from './types.js';

export function parseFountain(source: string): ParsedScreenplay {
  const f = new Fountain();
  // Pass `true` to request the token array — required by fountain-js API
  const out = f.parse(source, true);

  // `out.title` is already the clean string extracted from the title page
  const title = out.title?.trim() || 'Untitled';

  // Scan the full token list for the author token (title page tokens come first)
  let author: string | undefined;
  for (const tok of out.tokens) {
    if (tok.type === 'author' || tok.type === 'authors') {
      author = tok.text?.trim();
      break;
    }
  }

  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let lastCharacter: string | undefined;
  let lastParenthetical: string | undefined;

  for (const tok of out.tokens) {
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
        const text = normalizeWhitespace(tok.text ?? '');
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
          text: normalizeWhitespace(tok.text ?? ''),
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

// Collapse all whitespace runs (including newlines from multi-line dialogue
// or wrapped action paragraphs) to a single space, then trim. Without this,
// `\n` characters survive into the DB and HTML rendering eats them with no
// space replacement — "que hablar de" renders as "quehablarde".
function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function serializeFountain(ps: ParsedScreenplay): string {
  const lines: string[] = [];
  if (ps.title) lines.push(`Title: ${ps.title}`);
  if (ps.author) lines.push(`Author: ${ps.author}`);
  if (lines.length) lines.push('');

  for (const scene of ps.scenes) {
    lines.push('');
    lines.push(scene.heading);
    lines.push('');
    for (const l of scene.lines) {
      if (l.type === 'action') {
        lines.push(l.text);
        lines.push('');
      } else {
        lines.push(l.character ?? 'UNKNOWN');
        if (l.parenthetical) lines.push(`(${l.parenthetical})`);
        lines.push(l.text);
        lines.push('');
      }
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
