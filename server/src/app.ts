import express from 'express';
import health from './routes/health.js';

export function buildApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', health);
  return app;
}
