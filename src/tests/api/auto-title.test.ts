import { describe, it, expect, afterEach } from 'vitest';
import { api, apiJson, streamChat } from '../helpers';

describe('Auto-title', () => {
  const createdChatIds: string[] = [];

  afterEach(async () => {
    for (const id of [...createdChatIds]) {
      await api(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    createdChatIds.length = 0;
  });

  it('updates chat title after first AI response', async () => {
    const chat = await apiJson<{ id: string; title: string }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });
    createdChatIds.push(chat.id);

    expect(chat.title).toBe('New Chat');

    // Stream a message to trigger auto-titling
    await streamChat(chat.id, 'What is 2+2?');

    // Fetch the chat again and check that the title has been updated
    const updatedChat = await apiJson<{ id: string; title: string }>(`/api/chats/${chat.id}`, {
      method: 'GET'
    });

    expect(updatedChat.title).not.toBe('New Chat');
    expect(updatedChat.title.length).toBeGreaterThan(0);
  });
});
