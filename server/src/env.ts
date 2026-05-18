import { config as loadDotenv } from 'dotenv';
// override: true so server/.env always wins over already-set env vars.
// Without this, an inherited empty ANTHROPIC_API_KEY (e.g. from a parent
// shell or IDE-injected env) silently blanks the key.
loadDotenv({ override: true });

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  PORT: Number(required('PORT', '8787')),
  DB_PATH: required('DB_PATH', './data/screenplays.db'),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  MODEL: required('MODEL', 'claude-opus-4-7'),
  VOICE_SCORE_MODEL: required('VOICE_SCORE_MODEL', 'claude-haiku-4-5-20251001'),
  VOICE_SCORE_ENABLED: process.env.VOICE_SCORE_ENABLED !== 'false',
};
