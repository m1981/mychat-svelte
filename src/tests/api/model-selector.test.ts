import { describe, it, expect, afterEach } from 'vitest';
import { api, apiJson } from '../helpers';

type Chat = { id: string; modelId: string; title: string };

const SUPPORTED_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-6'
];

describe('Multi-model selection', () => {
  const cleanup: string[] = [];

  afterEach(async () => {
    for (const id of [...cleanup]) {
      await api(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    cleanup.length = 0;
  });

  it('new chat defaults to claude-sonnet-4-6', async () => {
    const chat = await apiJson<Chat>('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    cleanup.push(chat.id);
    expect(chat.modelId).toBe('claude-sonnet-4-6');
  });

  it('PATCH updates modelId and persists', async () => {
    const chat = await apiJson<Chat>('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    cleanup.push(chat.id);

    const updated = await apiJson<Chat>(`/api/chats/${chat.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ modelId: 'claude-haiku-4-5-20251001' })
    });

    expect(updated.modelId).toBe('claude-haiku-4-5-20251001');

    // Verify persistence via GET
    const fetched = await apiJson<Chat>(`/api/chats/${chat.id}`);
    expect(fetched.modelId).toBe('claude-haiku-4-5-20251001');
  });

  it('rejects unknown model IDs', async () => {
    const chat = await apiJson<Chat>('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    cleanup.push(chat.id);

    const res = await api(`/api/chats/${chat.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ modelId: 'gpt-99-ultra' })
    });

    expect(res.status).toBe(400);
  });

  it.each(SUPPORTED_MODELS)('accepts supported model: %s', async (modelId) => {
    const chat = await apiJson<Chat>('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    cleanup.push(chat.id);

    const updated = await apiJson<Chat>(`/api/chats/${chat.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ modelId })
    });

    expect(updated.modelId).toBe(modelId);
  });
});
