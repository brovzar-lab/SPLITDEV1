import { Router } from 'express';
import { insertNote, updateNote, deleteNote } from '../models/note.js';

const r = Router();

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

export default r;
