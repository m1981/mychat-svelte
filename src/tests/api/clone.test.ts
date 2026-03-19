import { describe, it, expect, afterEach } from 'vitest';
import { api, apiJson, streamChat } from '../helpers';

type Chat = { id: string; title: string; folderId: string | null };
type Message = { id: string; role: string; content: string };

describe('Clone chat', () => {
  const cleanup: string[] = [];

  afterEach(async () => {
    for (const id of [...cleanup]) {
      await api(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    cleanup.length = 0;
  });

  it('clones a chat up to a given message — new chat gets correct title and messages', async () => {
    // Setup: create a chat and stream two round-trips
    const source = await apiJson<Chat>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ title: 'Original Chat' })
    });
    cleanup.push(source.id);

    await streamChat(source.id, 'Say only: first');
    await streamChat(source.id, 'Say only: second');

    // Fetch persisted messages
    const msgs = await apiJson<Message[]>(`/api/chats/${source.id}/messages`);
    expect(msgs.length).toBeGreaterThanOrEqual(2);

    // Clone up to the second message (index 1)
    const upToMessageId = msgs[1].id;

    // Fetch current title (auto-title may have updated it asynchronously)
    const currentSource = await apiJson<Chat>(`/api/chats/${source.id}`);

    const cloneRes = await api(`/api/chats/${source.id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ upToMessageId })
    });
    expect(cloneRes.status).toBe(201);
    const cloned = await cloneRes.json() as Chat;
    cleanup.push(cloned.id);

    // Title should be the current source title suffixed with " (clone)"
    expect(cloned.title).toBe(`${currentSource.title} (clone)`);
    expect(cloned.id).not.toBe(source.id);

    // Cloned chat should have exactly 2 messages (up to index 1 inclusive)
    const clonedMsgs = await apiJson<Message[]>(`/api/chats/${cloned.id}/messages`);
    expect(clonedMsgs.length).toBe(2);
    expect(clonedMsgs[0].role).toBe(msgs[0].role);
    expect(clonedMsgs[0].content).toBe(msgs[0].content);
    expect(clonedMsgs[1].role).toBe(msgs[1].role);
    expect(clonedMsgs[1].content).toBe(msgs[1].content);
  });

  it('cloning up to the first message copies only one message', async () => {
    const source = await apiJson<Chat>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ title: 'Short Chat' })
    });
    cleanup.push(source.id);

    await streamChat(source.id, 'Say only: hello');

    const msgs = await apiJson<Message[]>(`/api/chats/${source.id}/messages`);
    expect(msgs.length).toBeGreaterThanOrEqual(1);

    const cloneRes = await api(`/api/chats/${source.id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ upToMessageId: msgs[0].id })
    });
    expect(cloneRes.status).toBe(201);
    const cloned = await cloneRes.json() as Chat;
    cleanup.push(cloned.id);

    const clonedMsgs = await apiJson<Message[]>(`/api/chats/${cloned.id}/messages`);
    expect(clonedMsgs.length).toBe(1);
  });

  it('clone inherits source folderId', async () => {
    const folder = await apiJson<{ id: string }>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'Clone Test Folder' })
    });

    const source = await apiJson<Chat>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ folderId: folder.id })
    });
    cleanup.push(source.id);

    await streamChat(source.id, 'Say only: yes');
    const msgs = await apiJson<Message[]>(`/api/chats/${source.id}/messages`);

    const cloneRes = await api(`/api/chats/${source.id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ upToMessageId: msgs[0].id })
    });
    const cloned = await cloneRes.json() as Chat;
    cleanup.push(cloned.id);

    expect(cloned.folderId).toBe(folder.id);

    // Cleanup folder (cascades to cloned chat)
    await api(`/api/folders/${folder.id}`, { method: 'DELETE' });
  });

  it('returns 400 when upToMessageId is missing', async () => {
    const source = await apiJson<Chat>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({})
    });
    cleanup.push(source.id);

    const res = await api(`/api/chats/${source.id}/clone`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when source chat does not exist', async () => {
    const res = await api('/api/chats/nonexistent-id/clone', {
      method: 'POST',
      body: JSON.stringify({ upToMessageId: 'any' })
    });
    expect(res.status).toBe(404);
  });
});
