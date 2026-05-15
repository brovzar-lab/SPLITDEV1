import { Router } from 'express';
import multer from 'multer';
import { listScreenplays, createScreenplay, getScreenplay } from '../models/screenplay.js';
import { insertScene, listScenes } from '../models/scene.js';
import { insertLine, listLines } from '../models/line.js';
import { parseFountain } from '../parsers/fountain.js';
import { parseFdx } from '../parsers/fdx.js';
import type { ParsedScreenplay } from '../parsers/types.js';
import type { SourceFormat } from '../models/types.js';

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });
const r = Router();

r.get('/', (req, res) => {
  const db = req.app.locals.db;
  res.json({ screenplays: listScreenplays(db) });
});

r.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required', code: 'no_file' });
  const name = req.file.originalname.toLowerCase();
  let format: SourceFormat;
  if (name.endsWith('.fountain') || name.endsWith('.txt')) format = 'fountain';
  else if (name.endsWith('.fdx')) format = 'fdx';
  else return res.status(400).json({ error: 'unsupported extension', code: 'bad_extension' });

  const text = req.file.buffer.toString('utf8');
  let parsed: ParsedScreenplay;
  try {
    parsed = format === 'fountain' ? parseFountain(text) : parseFdx(text);
  } catch (err) {
    return res.status(400).json({ error: 'parse failed', code: 'parse_error', detail: (err as Error).message });
  }

  const db = req.app.locals.db;
  const screenplay = db.transaction(() => {
    const sp = createScreenplay(db, {
      title: parsed.title,
      author: parsed.author ?? null,
      source_format: format,
      source_text: text,
    });
    parsed.scenes.forEach((scene, si) => {
      const sceneRow = insertScene(db, {
        screenplay_id: sp.id, position: si, heading: scene.heading, eighths: null,
      });
      scene.lines.forEach((line, li) => {
        insertLine(db, {
          scene_id: sceneRow.id, position: li, type: line.type,
          character: line.character ?? null, parenthetical: line.parenthetical ?? null, text: line.text,
        });
      });
    });
    return sp;
  })();

  res.status(201).json({
    screenplay: {
      id: screenplay.id, title: screenplay.title, author: screenplay.author,
      source_format: screenplay.source_format, created_at: screenplay.created_at,
      updated_at: screenplay.updated_at,
    },
  });
});

r.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const sp = getScreenplay(db, req.params.id);
  if (!sp) return res.status(404).json({ error: 'not found', code: 'not_found' });
  const scenes = listScenes(db, sp.id).map(s => ({ ...s, lines: listLines(db, s.id) }));
  res.json({
    screenplay: sp,
    scenes,
    notes: [],
    characterBible: [],
    beats: [],
  });
});

export default r;
