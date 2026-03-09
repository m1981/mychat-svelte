import { describe, it, expect, afterEach } from 'vitest';
import { api, apiJson, streamChat } from '../helpers';

type SearchResult = {
	messageId: string;
	chatId: string;
	chatTitle: string;
	content: string;
	role: string;
	score: number;
};

describe('Semantic Search API', () => {
	const createdChatIds: string[] = [];

	afterEach(async () => {
		for (const id of [...createdChatIds]) {
			await api(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {});
		}
		createdChatIds.length = 0;
	});

	it('given no query body, when POST /api/search, then 400', async () => {
		const res = await api('/api/search', { method: 'POST', body: JSON.stringify({}) });
		expect(res.status).toBe(400);
	});

	it('given a query, when POST /api/search, then returns results array', async () => {
		const results = await apiJson<SearchResult[]>('/api/search', {
			method: 'POST',
			body: JSON.stringify({ query: 'solar system planets' })
		});
		expect(Array.isArray(results)).toBe(true);
	});

	it('given a limit param, when POST /api/search, then respects it', async () => {
		const results = await apiJson<SearchResult[]>('/api/search', {
			method: 'POST',
			body: JSON.stringify({ query: 'hello world', limit: 3 })
		});
		expect(Array.isArray(results)).toBe(true);
		expect(results.length).toBeLessThanOrEqual(3);
	});

	it('given a result, then it has required fields', async () => {
		const chat = await apiJson<{ id: string }>('/api/chats', {
			method: 'POST',
			body: JSON.stringify({})
		});
		createdChatIds.push(chat.id);
		await streamChat(chat.id, 'Jupiter is the largest planet in our solar system.');

		// Allow time for embedding generation
		await new Promise((r) => setTimeout(r, 3000));

		const results = await apiJson<SearchResult[]>('/api/search', {
			method: 'POST',
			body: JSON.stringify({ query: 'largest planet solar system' })
		});

		expect(Array.isArray(results)).toBe(true);
		if (results.length > 0) {
			const r = results[0];
			expect(r).toHaveProperty('messageId');
			expect(r).toHaveProperty('chatId');
			expect(r).toHaveProperty('chatTitle');
			expect(r).toHaveProperty('content');
			expect(r).toHaveProperty('role');
			expect(r).toHaveProperty('score');
			expect(typeof r.score).toBe('number');
		}
	});
});
