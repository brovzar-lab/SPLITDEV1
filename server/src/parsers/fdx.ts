import { XMLParser } from 'fast-xml-parser';
import type { ParsedScreenplay, ParsedScene, ParsedLine } from './types.js';

interface FdxParagraph {
  '@_Type'?: string;
  Text?: string | string[] | { '#text'?: string };
}

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  isArray: (name) => ['Paragraph'].includes(name),
});

function textOf(t: FdxParagraph['Text']): string {
  if (t == null) return '';
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) return t.map(textOf).join('');
  if (typeof t === 'object' && '#text' in t) return String(t['#text'] ?? '');
  return '';
}

export function parseFdx(source: string): ParsedScreenplay {
  const doc = xml.parse(source);
  const paragraphs: FdxParagraph[] = doc?.FinalDraft?.Content?.Paragraph ?? [];

  const titlePageParas = doc?.FinalDraft?.TitlePage?.Content?.Paragraph ?? [];
  const titleText = textOf(titlePageParas[0]?.Text).trim() || 'Untitled';
  const authorRaw = textOf(titlePageParas[1]?.Text).trim();
  const author = authorRaw.replace(/^by\s+/i, '') || undefined;

  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let lastCharacter: string | undefined;
  let lastParen: string | undefined;

  for (const p of paragraphs) {
    const type = p['@_Type'];
    const text = textOf(p.Text).trim();
    if (!text) continue;
    switch (type) {
      case 'Scene Heading':
        current = { heading: text, lines: [] };
        scenes.push(current);
        break;
      case 'Action':
        if (!current) { current = { heading: 'UNTITLED', lines: [] }; scenes.push(current); }
        current.lines.push({ type: 'action', text });
        break;
      case 'Character':
        lastCharacter = text;
        lastParen = undefined;
        break;
      case 'Parenthetical':
        lastParen = text.replace(/^\(/, '').replace(/\)$/, '');
        break;
      case 'Dialogue':
        if (!current || !lastCharacter) break;
        current.lines.push({
          type: 'dialogue',
          character: lastCharacter,
          text,
          ...(lastParen ? { parenthetical: lastParen } : {}),
        });
        lastParen = undefined;
        break;
      default:
        // Transitions, shots, etc. — preserved in source_text, dropped from structured
        break;
    }
  }

  return { title: titleText, author, scenes };
}
