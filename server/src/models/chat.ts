import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.js';
import type { ChatMessage } from './types.js';

export function insertChatMessage(db: DB, input: Omit<ChatMessage, 'id' | 'at'>): ChatMessage {
  const id = randomUUID();
  const at = Date.now();
  const row: ChatMessage = { ...input, id, at };
  db.prepare(`INSERT INTO chat_message (id, screenplay_id, note_id, role, target_kind, target_id, text, voice_match, at)
    VALUES (@id, @screenplay_id, @note_id, @role, @target_kind, @target_id, @text, @voice_match, @at)`).run(row);
  return row;
}

export function listChatHistory(db: DB, screenplay_id: string, note_id: string | null, limit = 20): ChatMessage[] {
  const rows = note_id
    ? db.prepare('SELECT * FROM chat_message WHERE screenplay_id = ? AND note_id = ? ORDER BY at DESC LIMIT ?')
        .all(screenplay_id, note_id, limit)
    : db.prepare('SELECT * FROM chat_message WHERE screenplay_id = ? AND note_id IS NULL ORDER BY at DESC LIMIT ?')
        .all(screenplay_id, limit);
  return (rows as ChatMessage[]).reverse();
}
