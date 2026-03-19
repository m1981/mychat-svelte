import { describe, it, expect, afterEach } from 'vitest';
import { api, apiJson, streamChat } from '../helpers';

type Chat = { id: string; title: string };
type Message = { id: string; role: string; content: string };

describe('Destructive Regeneration — DELETE messages after', () => {
  const cleanup: string[] = [];

  afterEach(async () => {
    for (const id of [...cleanup]) {
      await api(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    cleanup.length = 0;
  });

  it('deletes all messages after the given messageId (exclusive)', async () => {
    const chat = await apiJson<Chat>('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    cleanup.push(chat.id);

    // 2 round-trips → 4 messages: user1, assistant1, user2, assistant2
    await streamChat(chat.id, 'Say only: first');
    await streamChat(chat.id, 'Say only: second');

    const msgs = await apiJson<Message[]>(`/api/chats/${chat.id}/messages`);
    expect(msgs.length).toBeGreaterThanOrEqual(4);

    // Delete everything after the second message (assistant1)
    const cutId = msgs[1].id;
    const res = await api(`/api/chats/${chat.id}/messages/after`, {
      method: 'DELETE',
      body: JSON.stringify({ messageId: cutId })
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { deleted: number };
    expect(body.deleted).toBeGreaterThanOrEqual(2); // user2 + assistant2

    const remaining = await apiJson<Message[]>(`/api/chats/${chat.id}/messages`);
    expect(remaining.length).toBe(2);
    expect(remaining[0].id).toBe(msgs[0].id);
    expect(remaining[1].id).toBe(msgs[1].id);
  });

  it('deleting after the last message removes nothing', async () => {
    const chat = await apiJson<Chat>('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    cleanup.push(chat.id);

    await streamChat(chat.id, 'Say only: hello');

    const msgs = await apiJson<Message[]>(`/api/chats/${chat.id}/messages`);
    const lastId = msgs[msgs.length - 1].id;

    const res = await api(`/api/chats/${chat.id}/messages/after`, {
      method: 'DELETE',
      body: JSON.stringify({ messageId: lastId })
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { deleted: number };
    expect(body.deleted).toBe(0);

    const remaining = await apiJson<Message[]>(`/api/chats/${chat.id}/messages`);
    expect(remaining.length).toBe(msgs.length);
  });

  it('returns 400 when messageId is missing', async () => {
    const chat = await apiJson<Chat>('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    cleanup.push(chat.id);

    const res = await api(`/api/chats/${chat.id}/messages/after`, {
      method: 'DELETE',
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });

  it('inclusive=true deletes the pivot message and everything after', async () => {
    const chat = await apiJson<Chat>('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    cleanup.push(chat.id);

    await streamChat(chat.id, 'Say only: first');
    await streamChat(chat.id, 'Say only: second');

    const msgs = await apiJson<Message[]>(`/api/chats/${chat.id}/messages`);
    expect(msgs.length).toBeGreaterThanOrEqual(4);

    // Delete FROM assistant1 onwards (inclusive) → keeps only user1
    const pivotId = msgs[1].id; // assistant1
    const res = await api(`/api/chats/${chat.id}/messages/after`, {
      method: 'DELETE',
      body: JSON.stringify({ messageId: pivotId, inclusive: true })
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { deleted: number };
    expect(body.deleted).toBeGreaterThanOrEqual(3); // assistant1 + user2 + assistant2

    const remaining = await apiJson<Message[]>(`/api/chats/${chat.id}/messages`);
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(msgs[0].id); // only user1 remains
  });

  it('returns 404 when messageId does not belong to the chat', async () => {
    const chat = await apiJson<Chat>('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    cleanup.push(chat.id);

    const res = await api(`/api/chats/${chat.id}/messages/after`, {
      method: 'DELETE',
      body: JSON.stringify({ messageId: 'nonexistent-id' })
    });
    expect(res.status).toBe(404);
  });
});
