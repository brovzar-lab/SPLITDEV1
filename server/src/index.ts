import { buildApp } from './app.js';
import { env } from './env.js';

const app = buildApp();
app.listen(env.PORT, '127.0.0.1', () => {
  console.log(`splitdev1 server on http://127.0.0.1:${env.PORT}`);
});
