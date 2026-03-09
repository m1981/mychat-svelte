import { describe, it, expect, afterEach } from 'vitest';
import { api, apiJson } from '../helpers';

describe('Folder lifecycle', () => {
  const createdFolderIds: string[] = [];
  const createdChatIds: string[] = [];

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

  it('creates a folder with the given name', async () => {
    const folder = await apiJson<{ id: string; name: string; userId: string }>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'Work' })
    });
    createdFolderIds.push(folder.id);

    expect(folder.id).toBeTruthy();
    expect(folder.name).toBe('Work');
    expect(folder.userId).toBeTruthy();
  });

  it('renames a folder', async () => {
    const folder = await apiJson<{ id: string; name: string }>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'Old Name' })
    });
    createdFolderIds.push(folder.id);

    const updated = await apiJson<{ id: string; name: string }>(`/api/folders/${folder.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' })
    });

    expect(updated.name).toBe('New Name');
  });

  it('deleting a folder sets its chats folderId to null', async () => {
    const folder = await apiJson<{ id: string }>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'To Delete' })
    });
    createdFolderIds.push(folder.id);

    const chat = await apiJson<{ id: string; folderId: string | null }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ folderId: folder.id })
    });
    createdChatIds.push(chat.id);

    expect(chat.folderId).toBe(folder.id);

    // Delete the folder
    const deleteRes = await api(`/api/folders/${folder.id}`, { method: 'DELETE' });
    expect(deleteRes.ok).toBe(true);
    createdFolderIds.splice(createdFolderIds.indexOf(folder.id), 1);

    // The chat should now have folderId = null
    const updatedChat = await apiJson<{ id: string; folderId: string | null }>(`/api/chats/${chat.id}`, {
      method: 'GET'
    });
    expect(updatedChat.folderId).toBeNull();
  });
});
