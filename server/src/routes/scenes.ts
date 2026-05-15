import { Router } from 'express';
import { updateScene, deleteScene, insertScene } from '../models/scene.js';

const r = Router();

r.patch('/:id', (req, res) => {
  const updated = updateScene(req.app.locals.db, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'not found', code: 'not_found' });
  res.json({ scene: updated });
});

r.post('/', (req, res) => {
  const { screenplayId, position, heading } = req.body as {
    screenplayId: string; position: number; heading: string;
  };
  const scene = insertScene(req.app.locals.db, {
    screenplay_id: screenplayId, position, heading, eighths: null,
  });
  res.status(201).json({ scene });
});

r.delete('/:id', (req, res) => {
  res.status(deleteScene(req.app.locals.db, req.params.id) ? 204 : 404).end();
});

export default r;
