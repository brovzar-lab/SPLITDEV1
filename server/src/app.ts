import express from 'express';
import health from './routes/health.js';
import screenplays from './routes/screenplays.js';
import scenes from './routes/scenes.js';
import lines from './routes/lines.js';
import notes from './routes/notes.js';
import exportRoute from './routes/exportRoute.js';
import chat from './routes/chat.js';
import { openDb, type DB } from './db/index.js';
import { env } from './env.js';

export interface AppDeps {
  db?: DB;
}

export function buildApp(deps: AppDeps = {}) {
  const db = deps.db ?? openDb(env.DB_PATH);
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.locals.db = db;
  app.use('/api', health);
  app.use('/api/screenplays', screenplays);
  app.use('/api/scenes', scenes);
  app.use('/api/lines', lines);
  app.use('/api', notes);   // mounts /api/screenplays/:id/notes (POST) and /api/notes/:id (PATCH, DELETE)
  app.use('/api', exportRoute);
  app.use('/api', chat);
  return app;
}
