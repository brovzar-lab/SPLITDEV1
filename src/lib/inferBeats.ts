import { SAVE_THE_CAT, type BeatTemplate } from '../data/beats';
import type { Beat, Scene, Line } from '../api/types';
import type { BeatKind } from '../types';

export interface InferredBeat extends Beat {
  kind: BeatKind;
  pct: number;
}

// When the server returns no beats for a screenplay, project the Save-the-Cat
// 13-beat template onto whatever scenes exist by proportional anchoring.
// Each beat anchors to the scene whose index is round(pct * N).
export function inferBeats(
  scenes: Array<Scene & { lines: Line[] }>,
  template: BeatTemplate[] = SAVE_THE_CAT,
): InferredBeat[] {
  if (scenes.length === 0) return [];
  const N = scenes.length;
  return template.map((b, i) => {
    const idx = Math.max(0, Math.min(N - 1, Math.round(b.pct * (N - 1))));
    return {
      id: `inferred-${b.id}`,
      screenplay_id: scenes[0].screenplay_id,
      position: i,
      name: b.name,
      scenes: [scenes[idx].id],
      kind: b.kind,
      pct: b.pct,
    };
  });
}

// Lift server beats to InferredBeat shape (kind defaults to 'major', pct
// derived from first-scene position so the ribbon can render them).
export function liftBeats(
  serverBeats: Beat[],
  scenes: Array<Scene & { lines: Line[] }>,
): InferredBeat[] {
  if (scenes.length === 0) return [];
  const N = scenes.length;
  const tplByName = new Map(SAVE_THE_CAT.map(t => [t.name.toLowerCase(), t]));
  const idxById = new Map(scenes.map((s, i) => [s.id, i]));
  return serverBeats.map(b => {
    const tpl = tplByName.get(b.name.toLowerCase());
    const firstScene = b.scenes[0];
    const firstIdx = firstScene && idxById.has(firstScene)
      ? idxById.get(firstScene)!
      : 0;
    return {
      ...b,
      kind: tpl?.kind ?? 'major',
      pct: tpl?.pct ?? firstIdx / Math.max(1, N - 1),
    };
  });
}

// Single entry point: server beats if any, otherwise inferred template.
export function resolveBeats(
  serverBeats: Beat[],
  scenes: Array<Scene & { lines: Line[] }>,
): InferredBeat[] {
  return serverBeats.length > 0
    ? liftBeats(serverBeats, scenes)
    : inferBeats(scenes);
}
