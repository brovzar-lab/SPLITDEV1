import { Router } from 'express';
const r = Router();
r.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.0.1' });
});
export default r;
