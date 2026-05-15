import express from 'express';
import health from './routes/health.js';
import screenplays from './routes/screenplays.js';
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
  return app;
}
