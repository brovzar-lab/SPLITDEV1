import type { FullScreenplay, Screenplay, Note, Line, Scene } from './types';

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listScreenplays: () =>
    request<{ screenplays: Array<Omit<Screenplay, 'source_text'>> }>('/api/screenplays'),
  getScreenplay: (id: string) => request<FullScreenplay>(`/api/screenplays/${id}`),
  uploadScreenplay: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/screenplays', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ screenplay: Omit<Screenplay, 'source_text'> }>;
  },
  deleteScreenplay: (id: string) =>
    request<void>(`/api/screenplays/${id}`, { method: 'DELETE' }),

  patchLine: (id: string, patch: Partial<Pick<Line, 'text' | 'character' | 'parenthetical' | 'type'>>) =>
    request<{ line: Line }>(`/api/lines/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  patchScene: (id: string, patch: Partial<Pick<Scene, 'heading' | 'position'>>) =>
    request<{ scene: Scene }>(`/api/scenes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  createNote: (screenplayId: string, body: Omit<Note, 'id' | 'screenplay_id' | 'created_at'>) =>
    request<{ note: Note }>(`/api/screenplays/${screenplayId}/notes`, {
      method: 'POST', body: JSON.stringify(body),
    }),
  patchNote: (id: string, patch: Partial<Omit<Note, 'id' | 'screenplay_id' | 'created_at'>>) =>
    request<{ note: Note }>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  exportUrl: (id: string, format: 'fountain' | 'fdx') =>
    `/api/screenplays/${id}/export?format=${format}`,
};
