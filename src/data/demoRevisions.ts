import type { Scene, Line, LineRevisionState } from '../api/types';

// T3.4 — until the server stores a real revision history, we paint a demo
// onto a handful of lines so the diff overlay has something to display.
// Three scenes get tagged; each tagged scene gets up to two changed lines —
// one line-level replacement (uses deletedText) and one inline change.
export function applyDemoRevisions(
  scenes: Array<Scene & { lines: Line[] }>,
): Array<Scene & { lines: Line[] }> {
  const N = scenes.length;
  if (N === 0) return scenes;
  const targetPositions = [
    Math.max(0, Math.round(N * 0.3) - 1),
    Math.max(0, Math.round(N * 0.5) - 1),
    Math.max(0, Math.round(N * 0.7) - 1),
  ];
  const targetSceneIds = new Set(
    targetPositions
      .map(i => scenes[Math.min(N - 1, i)])
      .filter(Boolean)
      .map(s => s.id),
  );

  return scenes.map(s => {
    if (!targetSceneIds.has(s.id)) return s;
    let lineChangeApplied = false;
    let inlineChangeApplied = false;
    return {
      ...s,
      lines: s.lines.map(l => {
        if (lineChangeApplied && inlineChangeApplied) return l;
        if (l.type === 'action' && !lineChangeApplied && l.text.length > 10) {
          lineChangeApplied = true;
          const rev: LineRevisionState = {
            revisionId: 'blue',
            changedSince: 'white',
            deletedText: l.text.replace(/\.$/, '').slice(0, Math.max(8, l.text.length - 8)) + '.',
          };
          return { ...l, revision: rev };
        }
        if (l.type === 'dialogue' && !inlineChangeApplied && l.text.length > 20) {
          inlineChangeApplied = true;
          // Tint the trailing third of the dialogue as a "rewritten" insertion.
          const split = Math.floor(l.text.length * 0.66);
          const rev: LineRevisionState = {
            revisionId: 'blue',
            changedSince: 'white',
            insertions: [
              { from: split, to: l.text.length, text: l.text.slice(split) },
            ],
          };
          return { ...l, revision: rev };
        }
        return l;
      }),
    };
  });
}
