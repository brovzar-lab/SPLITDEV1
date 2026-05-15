import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { insertNote, updateNote, deleteNote } from '../models/note.js';
import { anthropicClient } from '../anthropic/client.js';
import { loadPromptFile } from '../anthropic/prompts.js';
import { listScenes } from '../models/scene.js';
import { env } from '../env.js';
import { extractJsonObject } from '../anthropic/extractJson.js';

const MAX_INGEST_CHARS = 50_000; // ~12k tokens — safe + bounded cost

const r = Router();

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

const Extracted = z.object({
  origin: z.enum(['producer','director','exec','reader','table','self']).default('reader'),
  notes: z.array(z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000),
    priority: z.enum(['high','medium','low']).default('medium'),
    sceneHints: z.array(z.string()).default([]),
  })).min(1).max(30),
});

async function extractText(file: Express.Multer.File): Promise<string> {
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return file.buffer.toString('utf8');
  }
  if (name.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  if (name.endsWith('.pdf')) {
    const result = await pdfParse(file.buffer);
    return result.text;
  }
  throw new Error(`unsupported file type: ${name}`);
}

r.post('/screenplays/:id/notes', (req, res) => {
  const note = insertNote(req.app.locals.db, { ...req.body, screenplay_id: req.params.id });
  res.status(201).json({ note });
});

r.patch('/notes/:id', (req, res) => {
  const note = updateNote(req.app.locals.db, req.params.id, req.body);
  if (!note) return res.status(404).json({ error: 'not found', code: 'not_found' });
  res.json({ note });
});

r.delete('/notes/:id', (req, res) => {
  res.status(deleteNote(req.app.locals.db, req.params.id) ? 204 : 404).end();
});

r.post('/screenplays/:id/notes:ingest', upload.single('file'), async (req, res) => {
  const db = req.app.locals.db;
  const screenplayId = req.params.id;
  let text: string;
  try {
    if (req.file) {
      text = await extractText(req.file);
    } else if (req.body?.text) {
      text = String(req.body.text);
    } else {
      return res.status(400).json({ error: 'file or text required', code: 'no_input' });
    }
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message, code: 'extract_failed' });
  }
  if (text.trim().length < 80) {
    return res.status(400).json({ error: 'too little content to ingest', code: 'too_short' });
  }

  if (text.length > MAX_INGEST_CHARS) {
    text = text.slice(0, MAX_INGEST_CHARS) + '\n\n[... truncated; additional content omitted ...]';
  }

  const scenes = listScenes(db, screenplayId);
  const sceneHeadings = scenes.map(s => `- ${s.heading}`).join('\n') || '(none)';

  const prompt = loadPromptFile('notes-extract', { text, sceneHeadings });
  let extracted;
  try {
    const result = await anthropicClient().messages.create({
      model: env.MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = result.content?.[0];
    const raw = block && block.type === 'text' ? block.text : '';
    extracted = Extracted.parse(JSON.parse(extractJsonObject(raw)));
  } catch (err) {
    return res.status(500).json({ error: 'extraction failed', code: 'ai_extract_failed', detail: (err as Error).message });
  }

  const sceneByHeading = new Map(scenes.map(s => [s.heading.toUpperCase(), s.id]));
  const inserted = db.transaction(() => {
    return extracted.notes.map(n => insertNote(db, {
      screenplay_id: screenplayId,
      title: n.title,
      body: n.body,
      scenes: n.sceneHints.map(h => sceneByHeading.get(h.toUpperCase())).filter((id): id is string => !!id),
      priority: n.priority,
      status: 'unread',
      origin: extracted.origin,
      confidence: null,
    }));
  })();

  res.status(201).json({ notes: inserted });
});

export default r;
