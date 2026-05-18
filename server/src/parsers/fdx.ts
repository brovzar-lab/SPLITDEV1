import { XMLParser, XMLBuilder } from 'fast-xml-parser';
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

// Collapse whitespace runs (including newlines from multi-line FDX <Text>
// or wrapped paragraphs) to a single space, then trim. Without this, hard
// line breaks in the source vanish during HTML render and adjacent words
// collide ("que hablar de" → "quehablarde").
function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
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
    const text = normalizeWhitespace(textOf(p.Text));
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

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: false,
});

export function serializeFdx(ps: ParsedScreenplay): string {
  const paragraphs: Array<{ '@_Type': string; Text: string }> = [];
  for (const scene of ps.scenes) {
    paragraphs.push({ '@_Type': 'Scene Heading', Text: scene.heading });
    for (const l of scene.lines) {
      if (l.type === 'action') {
        paragraphs.push({ '@_Type': 'Action', Text: l.text });
      } else {
        paragraphs.push({ '@_Type': 'Character', Text: l.character ?? 'UNKNOWN' });
        if (l.parenthetical) paragraphs.push({ '@_Type': 'Parenthetical', Text: `(${l.parenthetical})` });
        paragraphs.push({ '@_Type': 'Dialogue', Text: l.text });
      }
    }
  }
  const doc = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8', '@_standalone': 'no' },
    FinalDraft: {
      '@_DocumentType': 'Script',
      '@_Template': 'No',
      '@_Version': '5',
      Content: { Paragraph: paragraphs },
      TitlePage: {
        Content: {
          Paragraph: [
            { Text: ps.title },
            ...(ps.author ? [{ Text: `by ${ps.author}` }] : []),
          ],
        },
      },
    },
  };
  return builder.build(doc);
}
