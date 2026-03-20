import { describe, it, expect, afterEach } from 'vitest';
import { api, apiJson } from '../helpers';

describe('Notes lifecycle', () => {
  const createdNoteIds: string[] = [];
  const createdChatIds: string[] = [];

  afterEach(async () => {
    for (const id of [...createdNoteIds]) {
      await api(`/api/notes/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    createdNoteIds.length = 0;

    for (const id of [...createdChatIds]) {
      await api(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    createdChatIds.length = 0;
  });

  it('creates a note attached to a chat', async () => {
    const chat = await apiJson<{ id: string }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });
    createdChatIds.push(chat.id);

    const note = await apiJson<{ id: string; chatId: string; content: string }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ chatId: chat.id, content: 'This is a note' })
    });
    createdNoteIds.push(note.id);

    expect(note.id).toBeTruthy();
    expect(note.chatId).toBe(chat.id);
    expect(note.content).toBe('This is a note');
  });

  it('updates a note content', async () => {
    const chat = await apiJson<{ id: string }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });
    createdChatIds.push(chat.id);

    const note = await apiJson<{ id: string; content: string }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ chatId: chat.id, content: 'Original content' })
    });
    createdNoteIds.push(note.id);

    const updated = await apiJson<{ id: string; content: string }>(`/api/notes/${note.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: 'Updated content' })
    });

    expect(updated.content).toBe('Updated content');
  });

  it('deletes a note', async () => {
    const chat = await apiJson<{ id: string }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });
    createdChatIds.push(chat.id);

    const note = await apiJson<{ id: string }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ chatId: chat.id, content: 'To be deleted' })
    });

    const deleteRes = await api(`/api/notes/${note.id}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(204);
  });

  it('deleting a chat cascades to its notes', async () => {
    const chat = await apiJson<{ id: string }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });
    createdChatIds.push(chat.id);

    const _note = await apiJson<{ id: string }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ chatId: chat.id, content: 'Note on chat' })
    });

    // Delete the chat (cascade should remove the note)
    await api(`/api/chats/${chat.id}`, { method: 'DELETE' });
    createdChatIds.splice(createdChatIds.indexOf(chat.id), 1);

    // Fetch notes for that chat — should be empty
    const notesRes = await apiJson<unknown[]>(`/api/notes?chatId=${chat.id}`, {
      method: 'GET'
    });

    expect(notesRes).toHaveLength(0);
  });
});
