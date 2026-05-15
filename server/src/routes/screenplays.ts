import { Router } from 'express';
import { listScreenplays } from '../models/screenplay.js';

const r = Router();

r.get('/', (req, res) => {
  const db = req.app.locals.db;
  res.json({ screenplays: listScreenplays(db) });
});

export default r;
