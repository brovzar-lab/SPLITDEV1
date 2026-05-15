import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';

let _client: Anthropic | null = null;

export function anthropicClient(): Anthropic {
  if (_client) return _client;
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export interface AnthropicMessage { role: 'user' | 'assistant'; content: string }
