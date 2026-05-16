import type { Line, Scene } from '../api/types';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'of', 'to', 'in', 'that', 'it', 'is', 'i', 'you',
  'on', 'for', 'with', 'as', 'at', 'by', 'be', 'this', 'are', 'was', 'or',
  'de', 'la', 'el', 'que', 'y', 'en', 'un', 'una', 'los', 'las', 'es', 'se',
  'no', 'lo', 'le', 'su', 'por', 'con', 'para', 'al', 'del', 'me', 'te',
]);

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

export interface SimilarMatch {
  sceneId: string;
  sceneHeading: string;
  scenePosition: number;
  lineId: string;
  text: string;
  score: number;
}

export function findSimilarLines(
  query: string,
  excludeLineId: string,
  scenes: Array<Scene & { lines: Line[] }>,
  opts: { minScore?: number; max?: number } = {},
): SimilarMatch[] {
  const { minScore = 0.3, max = 5 } = opts;
  const aTokens = tokenize(query);
  if (aTokens.length === 0) return [];
  const aSet = new Set(aTokens);

  const matches: SimilarMatch[] = [];
  for (const scene of scenes) {
    for (const line of scene.lines) {
      if (line.id === excludeLineId) continue;
      const text = line.text || '';
      if (!text) continue;
      const bSet = new Set(tokenize(text));
      if (bSet.size === 0) continue;
      let inter = 0;
      aSet.forEach(t => {
        if (bSet.has(t)) inter++;
      });
      const score = inter / aSet.size;
      if (score >= minScore) {
        matches.push({
          sceneId: scene.id,
          sceneHeading: scene.heading,
          scenePosition: scene.position,
          lineId: line.id,
          text,
          score,
        });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, max);
}
