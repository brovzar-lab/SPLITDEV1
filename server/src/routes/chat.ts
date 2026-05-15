import { Router } from 'express';
import { anthropicClient } from '../anthropic/client.js';
import { loadAgentPrompt, loadCharacterPrompt } from '../anthropic/prompts.js';
import { insertChatMessage, listChatHistory } from '../models/chat.js';
import { getScreenplay } from '../models/screenplay.js';
import { listScenes } from '../models/scene.js';
import { listLines } from '../models/line.js';
import { listCharacterBible } from '../models/characterBible.js';
import { getNote } from '../models/note.js';
import { env } from '../env.js';

const r = Router();

async function scoreVoiceMatch(rules: string, text: string): Promise<number | null> {
  if (!env.VOICE_SCORE_ENABLED) return null;
  try {
    const result = await anthropicClient().messages.create({
      model: env.VOICE_SCORE_MODEL,
      max_tokens: 8,
      messages: [{
        role: 'user',
        content: `Rate 0.0 to 1.0 how well this dialogue matches these voice rules.\n\nRules:\n${rules}\n\nDialogue:\n${text}\n\nReply with just the number.`,
      }],
    });
    const block = result.content?.[0];
    const m = block && block.type === 'text' ? block.text : '';
    const n = parseFloat(m);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
  } catch {
    return null;
  }
}

r.post('/chat', async (req, res) => {
  const { screenplayId, noteId = null, target, message } = req.body as {
    screenplayId: string; noteId?: string | null;
    target: { kind: 'agent' | 'character'; id: string };
    message: string;
  };

  const db = req.app.locals.db;
  const sp = getScreenplay(db, screenplayId);
  if (!sp) return res.status(404).json({ error: 'screenplay not found', code: 'not_found' });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const note = noteId ? getNote(db, noteId) : null;
  const allScenes = listScenes(db, sp.id);
  const targetSceneId = note?.scenes[0] ?? allScenes[0]?.id;
  const sceneLines = targetSceneId ? listLines(db, targetSceneId) : [];
  const sceneContext = sceneLines.map(l =>
    l.type === 'action' ? l.text : `${l.character}${l.parenthetical ? ` (${l.parenthetical})` : ''}: ${l.text}`
  ).join('\n');

  let system: string;
  if (target.kind === 'character') {
    const c = listCharacterBible(db, sp.id).find(c => c.id === target.id);
    if (!c) { res.write('event: error\ndata: {"error":"character not found"}\n\n'); return res.end(); }
    system = loadCharacterPrompt({
      characterName: c.name, characterRole: c.role ?? '',
      characterWant: c.want ?? '', characterNeed: c.need ?? '',
      voiceRules: c.voice.map(v => `- ${v}`).join('\n'),
      sceneContext,
    });
  } else {
    system = loadAgentPrompt(target.id, { sceneContext, noteBody: note?.body ?? '' });
  }

  const history = listChatHistory(db, sp.id, noteId, 10).map(m => ({
    role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
    content: m.text,
  }));

  insertChatMessage(db, {
    screenplay_id: sp.id, note_id: noteId, role: 'user',
    target_kind: target.kind, target_id: target.id, text: message, voice_match: null,
  });

  let fullText = '';
  try {
    const stream = anthropicClient().messages.stream({
      model: env.MODEL,
      max_tokens: 8192,
      system,
      messages: [...history, { role: 'user', content: message }],
    });
    for await (const event of stream as AsyncIterable<any>) {
      if (event?.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const t: string = event.delta.text;
        fullText += t;
        res.write(`event: token\ndata: ${JSON.stringify(t)}\n\n`);
      }
      if (event?.type === 'message_stop') break;
    }
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    res.end();
    return;
  }

  let voiceMatch: number | null = null;
  if (target.kind === 'character') {
    const c = listCharacterBible(db, sp.id).find(c => c.id === target.id);
    const rules = (c?.voice ?? []).map(v => `- ${v}`).join('\n');
    voiceMatch = await scoreVoiceMatch(rules, fullText);
    if (voiceMatch !== null) {
      res.write(`event: meta\ndata: ${JSON.stringify({ voiceMatch })}\n\n`);
    }
  }

  const aiRow = insertChatMessage(db, {
    screenplay_id: sp.id, note_id: noteId, role: 'ai',
    target_kind: target.kind, target_id: target.id, text: fullText, voice_match: voiceMatch,
  });

  res.write(`event: done\ndata: ${JSON.stringify({ messageId: aiRow.id })}\n\n`);
  res.end();
});

export default r;
