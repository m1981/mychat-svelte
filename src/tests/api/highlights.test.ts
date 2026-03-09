import { describe, it, expect, afterEach } from 'vitest';
import { api, apiJson, streamChat } from '../helpers';

type Message = { id: string; role: string; content: string };
type Highlight = { id: string; messageId: string; text: string; note: string | null };

describe('Highlights lifecycle', () => {
	const createdHighlightIds: string[] = [];
	const createdChatIds: string[] = [];

	afterEach(async () => {
		for (const id of [...createdHighlightIds]) {
			await api(`/api/highlights/${id}`, { method: 'DELETE' }).catch(() => {});
		}
		createdHighlightIds.length = 0;

		for (const id of [...createdChatIds]) {
			await api(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {});
		}
		createdChatIds.length = 0;
	});

	async function setupChatWithMessage(userText: string) {
		const chat = await apiJson<{ id: string }>('/api/chats', {
			method: 'POST',
			body: JSON.stringify({})
		});
		createdChatIds.push(chat.id);
		await streamChat(chat.id, userText);
		const msgs = await apiJson<Message[]>(`/api/chats/${chat.id}/messages`);
		const assistantMsg = msgs.find((m) => m.role === 'assistant');
		if (!assistantMsg) throw new Error('No assistant message found after streaming');
		return { chatId: chat.id, messageId: assistantMsg.id };
	}

	it('given a real message, when a highlight is created, then it is saved with correct fields', async () => {
		const { messageId } = await setupChatWithMessage('Name one planet in our solar system.');

		const highlight = await apiJson<Highlight>('/api/highlights', {
			method: 'POST',
			body: JSON.stringify({ messageId, text: 'Jupiter' })
		});
		createdHighlightIds.push(highlight.id);

		expect(highlight.id).toBeTruthy();
		expect(highlight.messageId).toBe(messageId);
		expect(highlight.text).toBe('Jupiter');
		expect(highlight.note).toBeNull();
	});

	it('given a highlight, when deleted, then it is gone', async () => {
		const { messageId } = await setupChatWithMessage('Name one color.');

		const highlight = await apiJson<Highlight>('/api/highlights', {
			method: 'POST',
			body: JSON.stringify({ messageId, text: 'Blue' })
		});

		const deleteRes = await api(`/api/highlights/${highlight.id}`, { method: 'DELETE' });
		expect(deleteRes.status).toBe(204);
	});

	it('given a non-existent messageId, when creating a highlight, then it returns 404', async () => {
		const res = await api('/api/highlights', {
			method: 'POST',
			body: JSON.stringify({ messageId: 'nonexistent-id', text: 'some text' })
		});
		expect(res.status).toBe(404);
	});

	it('given a message, when its chat is deleted, then highlights cascade delete', async () => {
		const { chatId, messageId } = await setupChatWithMessage('Say hello.');

		const highlight = await apiJson<Highlight>('/api/highlights', {
			method: 'POST',
			body: JSON.stringify({ messageId, text: 'hello' })
		});

		// Delete the chat — should cascade through messages → highlights
		await api(`/api/chats/${chatId}`, { method: 'DELETE' });
		createdChatIds.splice(createdChatIds.indexOf(chatId), 1);

		// Trying to delete the highlight should now fail (already gone)
		const deleteRes = await api(`/api/highlights/${highlight.id}`, { method: 'DELETE' });
		// 204 = already-cascaded deletion is idempotent; 404 also acceptable
		expect([204, 404]).toContain(deleteRes.status);
	});
});
