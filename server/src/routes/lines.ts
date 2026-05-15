import { Router } from 'express';
import { updateLine, deleteLine, insertLine } from '../models/line.js';
import type { LineType } from '../models/types.js';

const r = Router();

r.patch('/:id', (req, res) => {
  const updated = updateLine(req.app.locals.db, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'not found', code: 'not_found' });
  res.json({ line: updated });
});

r.post('/', (req, res) => {
  const { sceneId, position, type, text, character, parenthetical } = req.body as {
    sceneId: string; position: number; type: LineType; text: string;
    character?: string | null; parenthetical?: string | null;
  };
  const line = insertLine(req.app.locals.db, {
    scene_id: sceneId, position, type, text,
    character: character ?? null, parenthetical: parenthetical ?? null,
  });
  res.status(201).json({ line });
});

r.delete('/:id', (req, res) => {
  res.status(deleteLine(req.app.locals.db, req.params.id) ? 204 : 404).end();
});

export default r;
