import { Router } from 'express';
import { getScreenplay } from '../models/screenplay.js';
import { listScenes } from '../models/scene.js';
import { listLines } from '../models/line.js';
import { serializeFountain } from '../parsers/fountain.js';
import { serializeFdx } from '../parsers/fdx.js';
import type { ParsedScreenplay } from '../parsers/types.js';

const r = Router();

r.get('/screenplays/:id/export', (req, res) => {
  const db = req.app.locals.db;
  const sp = getScreenplay(db, req.params.id);
  if (!sp) return res.status(404).json({ error: 'not found', code: 'not_found' });
  const format = (req.query.format as string) || sp.source_format;
  if (format !== 'fountain' && format !== 'fdx') {
    return res.status(400).json({ error: 'unsupported format', code: 'bad_format' });
  }
  const scenes = listScenes(db, sp.id).map(s => ({
    heading: s.heading,
    lines: listLines(db, s.id).map(l => ({
      type: l.type, text: l.text,
      ...(l.character ? { character: l.character } : {}),
      ...(l.parenthetical ? { parenthetical: l.parenthetical } : {}),
    })),
  }));
  const parsed: ParsedScreenplay = { title: sp.title, author: sp.author ?? undefined, scenes };
  const filename = `${sp.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.${format}`;
  if (format === 'fountain') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(serializeFountain(parsed));
  } else {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(serializeFdx(parsed));
  }
});

export default r;
