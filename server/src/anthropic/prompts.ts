import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function interpolate(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, k) => vars[k] ?? '');
}

export function loadAgentPrompt(agentId: string, vars: Record<string, string | undefined>): string {
  const path = join(__dirname, 'prompts', 'agents', `${agentId}.md`);
  if (!existsSync(path)) throw new Error(`No prompt for agent: ${agentId}`);
  return interpolate(readFileSync(path, 'utf8'), vars);
}

export function loadCharacterPrompt(vars: Record<string, string | undefined>): string {
  const path = join(__dirname, 'prompts', 'characters', 'voice.md');
  return interpolate(readFileSync(path, 'utf8'), vars);
}
