import { describe, it, expect } from 'vitest';
import { loadAgentPrompt, loadCharacterPrompt } from '../../src/anthropic/prompts.js';

describe('prompts', () => {
  it('loads + interpolates agent prompt', () => {
    const out = loadAgentPrompt('dialogue', { sceneContext: 'SCENE-A', noteBody: 'NB' });
    expect(out).toContain('Dialogue Agent');
    expect(out).toContain('SCENE-A');
    expect(out).toContain('NB');
    expect(out).not.toContain('{{');
  });

  it('loads + interpolates character prompt', () => {
    const out = loadCharacterPrompt({
      characterName: 'SARAH', characterRole: 'Protagonist',
      characterWant: 'Solitude', characterNeed: 'Connection',
      voiceRules: '- short sentences\n- never swears',
      sceneContext: 'SCENE-X',
    });
    expect(out).toContain('SARAH');
    expect(out).toContain('short sentences');
    expect(out).not.toContain('{{');
  });

  it('throws on unknown agent', () => {
    expect(() => loadAgentPrompt('nope', {})).toThrow();
  });
});
