import { z } from 'zod';
import type { DB } from '../db/index.js';
import { anthropicClient } from '../anthropic/client.js';
import { loadPromptFile } from '../anthropic/prompts.js';
import { getScreenplay } from '../models/screenplay.js';
import { listScenes } from '../models/scene.js';
import { listLines } from '../models/line.js';
import { insertNote } from '../models/note.js';
import { env } from '../env.js';
import { extractJsonObject } from '../anthropic/extractJson.js';

const MAX_TRIAGE_CHARS = 200_000; // a ~300-page script max

const TriageResponse = z.object({
  summary: z.string(),
  notes: z.array(z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(1000),
    priority: z.enum(['high', 'medium', 'low']),
    sceneHints: z.array(z.string()).default([]),
  })).min(1).max(10),
});

export type TriageResult = z.infer<typeof TriageResponse>;

export async function runTriageOnUpload(db: DB, screenplayId: string): Promise<void> {
  // Mark running
  db.prepare(`UPDATE screenplay SET triage_status = 'running', triage_error = null WHERE id = ?`).run(screenplayId);

  try {
    const sp = getScreenplay(db, screenplayId);
    if (!sp) throw new Error('screenplay not found');

    const scenes = listScenes(db, sp.id);
    const screenplayText = scenes.map(s => {
      const lines = listLines(db, s.id);
      const sceneBody = lines.map(l =>
        l.type === 'action' ? l.text : `${l.character}${l.parenthetical ? ` (${l.parenthetical})` : ''}: ${l.text}`
      ).join('\n');
      return `${s.heading}\n\n${sceneBody}`;
    }).join('\n\n---\n\n');

    let truncatedText = screenplayText;
    if (screenplayText.length > MAX_TRIAGE_CHARS) {
      truncatedText = screenplayText.slice(0, MAX_TRIAGE_CHARS) + '\n\n[... truncated for triage ...]';
    }
    const prompt = loadPromptFile('triage/intake', { screenplay: truncatedText });

    const result = await anthropicClient().messages.create({
      model: env.MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = result.content?.[0];
    const text = block && block.type === 'text' ? block.text : '';
    const parsed = TriageResponse.parse(JSON.parse(extractJsonObject(text)));

    const sceneByHeading = new Map(scenes.map(s => [s.heading.toUpperCase(), s.id]));

    db.transaction(() => {
      for (const n of parsed.notes) {
        const matchedScenes = n.sceneHints
          .map(h => sceneByHeading.get(h.toUpperCase()))
          .filter((id): id is string => Boolean(id));
        insertNote(db, {
          screenplay_id: sp.id,
          title: n.title,
          body: n.body,
          scenes: matchedScenes,
          priority: n.priority,
          status: 'unread',
          origin: 'self',
          confidence: null,
        });
      }
      db.prepare(`UPDATE screenplay SET triage_status = 'done' WHERE id = ?`).run(screenplayId);
    })();
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    db.prepare(`UPDATE screenplay SET triage_status = 'failed', triage_error = ? WHERE id = ?`).run(msg, screenplayId);
  }
}
