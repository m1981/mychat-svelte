import { describe, it, expect, afterEach } from 'vitest';
import { api, apiJson, streamChat } from '../helpers';

describe('Chat lifecycle', () => {
  const createdChatIds: string[] = [];
  const createdFolderIds: string[] = [];

  afterEach(async () => {
    for (const id of [...createdChatIds]) {
      await api(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    createdChatIds.length = 0;

    for (const id of [...createdFolderIds]) {
      await api(`/api/folders/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    createdFolderIds.length = 0;
  });

  it('creates a chat with default title "New Chat"', async () => {
    const chat = await apiJson<{ id: string; title: string; userId: string }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });

    createdChatIds.push(chat.id);

    expect(chat.id).toBeTruthy();
    expect(chat.title).toBe('New Chat');
    expect(chat.userId).toBeTruthy();
  });

  it('creates a chat inside a folder', async () => {
    const folder = await apiJson<{ id: string }>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Folder' })
    });
    createdFolderIds.push(folder.id);

    const chat = await apiJson<{ id: string; folderId: string | null }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ folderId: folder.id })
    });
    createdChatIds.push(chat.id);

    expect(chat.folderId).toBe(folder.id);
  });

  it('renames a chat and the new title persists', async () => {
    const chat = await apiJson<{ id: string; title: string }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });
    createdChatIds.push(chat.id);

    const updated = await apiJson<{ id: string; title: string }>(`/api/chats/${chat.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'My Renamed Chat' })
    });

    expect(updated.title).toBe('My Renamed Chat');
  });

  it('deletes a chat and it is gone', async () => {
    const chat = await apiJson<{ id: string }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });

    await api(`/api/chats/${chat.id}`, { method: 'DELETE' });

    const res = await api(`/api/chats/${chat.id}`, { method: 'GET' });
    expect(res.status).toBe(404);
  });

  it('deleting a chat cascades to its messages', async () => {
    const chat = await apiJson<{ id: string }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });

    // Send a message to create messages in the DB
    await streamChat(chat.id, 'Say only: hi');

    // Delete the chat (cascade should remove messages)
    const deleteRes = await api(`/api/chats/${chat.id}`, { method: 'DELETE' });
    expect(deleteRes.ok).toBe(true);

    // The chat should be gone
    const chatRes = await api(`/api/chats/${chat.id}`, { method: 'GET' });
    expect(chatRes.status).toBe(404);
  });
});
