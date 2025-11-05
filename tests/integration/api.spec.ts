import { test, expect } from '@playwright/test';

/**
 * API Integration Tests
 *
 * Tests API endpoints directly without UI interaction
 */

const API_BASE = '/api';
let testChatId: string;
let testFolderId: string;

test.describe('API Integration Tests', () => {
	test.describe('Chats API', () => {
		test('POST /api/chats - should create a new chat', async ({ request }) => {
			const response = await request.post(`${API_BASE}/chats`, {
				data: {
					title: 'API Test Chat',
					config: {
						provider: 'anthropic',
						modelConfig: {
							model: 'claude-3-7-sonnet-20250219',
							max_tokens: 4096,
							temperature: 0.7,
							top_p: 1,
							presence_penalty: 0,
							frequency_penalty: 0
						}
					}
				}
			});

			expect(response.ok()).toBeTruthy();
			expect(response.status()).toBe(201);

			const chat = await response.json();
			expect(chat).toHaveProperty('id');
			expect(chat.title).toBe('API Test Chat');

			testChatId = chat.id;
		});

		test('GET /api/chats/:id - should retrieve chat by ID', async ({ request }) => {
			const response = await request.get(`${API_BASE}/chats/${testChatId}`);

			expect(response.ok()).toBeTruthy();
			const chat = await response.json();
			expect(chat.id).toBe(testChatId);
			expect(chat.title).toBe('API Test Chat');
		});

		test('PATCH /api/chats/:id - should update chat', async ({ request }) => {
			const response = await request.patch(`${API_BASE}/chats/${testChatId}`, {
				data: {
					title: 'Updated Chat Title'
				}
			});

			expect(response.ok()).toBeTruthy();
			const chat = await response.json();
			expect(chat.title).toBe('Updated Chat Title');
		});

		test('GET /api/chats - should list all chats with pagination', async ({ request }) => {
			const response = await request.get(`${API_BASE}/chats?page=0&limit=10`);

			expect(response.ok()).toBeTruthy();
			const result = await response.json();

			expect(result).toHaveProperty('data');
			expect(result).toHaveProperty('pagination');
			expect(Array.isArray(result.data)).toBeTruthy();
			expect(result.pagination.page).toBe(0);
			expect(result.pagination.limit).toBe(10);
		});

		test('DELETE /api/chats/:id - should delete chat', async ({ request }) => {
			const response = await request.delete(`${API_BASE}/chats/${testChatId}`);

			expect(response.status()).toBe(204);

			// Verify deletion
			const getResponse = await request.get(`${API_BASE}/chats/${testChatId}`);
			expect(getResponse.status()).toBe(404);
		});
	});

	test.describe('Folders API', () => {
		test('POST /api/folders - should create folder', async ({ request }) => {
			const response = await request.post(`${API_BASE}/folders`, {
				data: {
					name: 'Test Folder',
					type: 'STANDARD',
					color: '#3b82f6'
				}
			});

			expect(response.ok()).toBeTruthy();
			expect(response.status()).toBe(201);

			const folder = await response.json();
			expect(folder).toHaveProperty('id');
			expect(folder.name).toBe('Test Folder');

			testFolderId = folder.id;
		});

		test('GET /api/folders - should list all folders', async ({ request }) => {
			const response = await request.get(`${API_BASE}/folders`);

			expect(response.ok()).toBeTruthy();
			const result = await response.json();
			expect(Array.isArray(result.data)).toBeTruthy();
		});

		test('GET /api/folders?tree=true - should return folder tree', async ({ request }) => {
			const response = await request.get(`${API_BASE}/folders?tree=true`);

			expect(response.ok()).toBeTruthy();
			const result = await response.json();
			expect(result).toHaveProperty('data');
			expect(Array.isArray(result.data)).toBeTruthy();
		});

		test('PATCH /api/folders/:id - should update folder', async ({ request }) => {
			const response = await request.patch(`${API_BASE}/folders/${testFolderId}`, {
				data: {
					name: 'Updated Folder',
					color: '#10b981'
				}
			});

			expect(response.ok()).toBeTruthy();
			const folder = await response.json();
			expect(folder.name).toBe('Updated Folder');
			expect(folder.color).toBe('#10b981');
		});

		test('DELETE /api/folders/:id - should require cascade for non-empty folder', async ({
			request
		}) => {
			// Create chat in folder
			const chatResponse = await request.post(`${API_BASE}/chats`, {
				data: {
					title: 'Chat in Folder',
					folderId: testFolderId,
					config: {
						provider: 'anthropic',
						modelConfig: {
							model: 'claude-3-7-sonnet-20250219',
							max_tokens: 4096,
							temperature: 0.7,
							top_p: 1,
							presence_penalty: 0,
							frequency_penalty: 0
						}
					}
				}
			});
			const chat = await chatResponse.json();

			// Try to delete without cascade
			const response = await request.delete(`${API_BASE}/folders/${testFolderId}`);
			expect(response.status()).toBe(400);

			// Delete with cascade
			const cascadeResponse = await request.delete(
				`${API_BASE}/folders/${testFolderId}?cascade=true`
			);
			expect(cascadeResponse.status()).toBe(204);

			// Verify chat was moved/deleted
			const chatCheck = await request.get(`${API_BASE}/chats/${chat.id}`);
			expect(chatCheck.status()).toBe(404);
		});
	});

	test.describe('Notes API', () => {
		let testNoteId: string;

		test.beforeAll(async ({ request }) => {
			// Create test chat
			const chatResponse = await request.post(`${API_BASE}/chats`, {
				data: {
					title: 'Chat for Notes Test',
					config: {
						provider: 'anthropic',
						modelConfig: {
							model: 'claude-3-7-sonnet-20250219',
							max_tokens: 4096,
							temperature: 0.7,
							top_p: 1,
							presence_penalty: 0,
							frequency_penalty: 0
						}
					}
				}
			});
			const chat = await chatResponse.json();
			testChatId = chat.id;
		});

		test('POST /api/notes - should create note', async ({ request }) => {
			const response = await request.post(`${API_BASE}/notes`, {
				data: {
					chatId: testChatId,
					type: 'SCRATCH',
					content: 'Test note content'
				}
			});

			expect(response.ok()).toBeTruthy();
			expect(response.status()).toBe(201);

			const note = await response.json();
			expect(note).toHaveProperty('id');
			expect(note.content).toBe('Test note content');

			testNoteId = note.id;
		});

		test('GET /api/notes?chatId=:id - should retrieve notes for chat', async ({ request }) => {
			const response = await request.get(`${API_BASE}/notes?chatId=${testChatId}`);

			expect(response.ok()).toBeTruthy();
			const result = await response.json();
			expect(Array.isArray(result.data)).toBeTruthy();
			expect(result.data.length).toBeGreaterThan(0);
		});

		test('PATCH /api/notes/:id - should update note', async ({ request }) => {
			const response = await request.patch(`${API_BASE}/notes/${testNoteId}`, {
				data: {
					content: 'Updated note content',
					type: 'TODO'
				}
			});

			expect(response.ok()).toBeTruthy();
			const note = await response.json();
			expect(note.content).toBe('Updated note content');
			expect(note.type).toBe('TODO');
		});

		test('DELETE /api/notes/:id - should delete note', async ({ request }) => {
			const response = await request.delete(`${API_BASE}/notes/${testNoteId}`);
			expect(response.status()).toBe(204);

			// Verify deletion
			const getResponse = await request.get(`${API_BASE}/notes/${testNoteId}`);
			expect(getResponse.status()).toBe(404);
		});
	});

	test.describe('Highlights API', () => {
		let testMessageId: string;
		let testHighlightId: string;

		test.beforeAll(async ({ request }) => {
			// Create chat and message for highlights
			const chatResponse = await request.post(`${API_BASE}/chats`, {
				data: {
					title: 'Chat for Highlights Test',
					config: {
						provider: 'anthropic',
						modelConfig: {
							model: 'claude-3-7-sonnet-20250219',
							max_tokens: 4096,
							temperature: 0.7,
							top_p: 1,
							presence_penalty: 0,
							frequency_penalty: 0
						}
					}
				}
			});
			const chat = await chatResponse.json();
			testChatId = chat.id;

			// Note: In real scenario, messageId would come from sending messages
			// For this test, we'll mock a messageId
			testMessageId = '1'; // Replace with actual message creation
		});

		test('POST /api/highlights - should create highlight', async ({ request }) => {
			const response = await request.post(`${API_BASE}/highlights`, {
				data: {
					messageId: testMessageId,
					text: 'highlighted text',
					startOffset: 0,
					endOffset: 16,
					color: '#FFFF00'
				}
			});

			expect(response.ok()).toBeTruthy();
			expect(response.status()).toBe(201);

			const highlight = await response.json();
			expect(highlight).toHaveProperty('id');
			expect(highlight.text).toBe('highlighted text');

			testHighlightId = highlight.id;
		});

		test('GET /api/highlights?messageId=:id - should retrieve highlights', async ({
			request
		}) => {
			const response = await request.get(
				`${API_BASE}/highlights?messageId=${testMessageId}`
			);

			expect(response.ok()).toBeTruthy();
			const result = await response.json();
			expect(Array.isArray(result.data)).toBeTruthy();
		});

		test('PATCH /api/highlights/:id - should update highlight', async ({ request }) => {
			const response = await request.patch(`${API_BASE}/highlights/${testHighlightId}`, {
				data: {
					color: '#00FF00',
					note: 'Important highlight'
				}
			});

			expect(response.ok()).toBeTruthy();
			const highlight = await response.json();
			expect(highlight.color).toBe('#00FF00');
			expect(highlight.note).toBe('Important highlight');
		});

		test('DELETE /api/highlights/:id - should delete highlight', async ({ request }) => {
			const response = await request.delete(`${API_BASE}/highlights/${testHighlightId}`);
			expect(response.status()).toBe(204);
		});
	});

	test.describe('Search API', () => {
		test('POST /api/search - should search with text mode', async ({ request }) => {
			const response = await request.post(`${API_BASE}/search`, {
				data: {
					query: 'test',
					mode: 'text',
					filters: {},
					pagination: { page: 0, limit: 20 }
				}
			});

			expect(response.ok()).toBeTruthy();
			const result = await response.json();

			expect(result).toHaveProperty('results');
			expect(result).toHaveProperty('pagination');
			expect(result).toHaveProperty('took');
			expect(Array.isArray(result.results)).toBeTruthy();
		});

		test('POST /api/search - should validate required fields', async ({ request }) => {
			const response = await request.post(`${API_BASE}/search`, {
				data: {
					// Missing 'mode' field
					query: 'test'
				}
			});

			expect(response.status()).toBe(400);
			const error = await response.json();
			expect(error.message).toContain('mode');
		});
	});

	test.describe('Error Handling', () => {
		test('should return 404 for non-existent resources', async ({ request }) => {
			const response = await request.get(`${API_BASE}/chats/non-existent-id`);
			expect(response.status()).toBe(404);
		});

		test('should return 400 for invalid data', async ({ request }) => {
			const response = await request.post(`${API_BASE}/chats`, {
				data: {
					// Missing required config field
					title: 'Invalid Chat'
				}
			});

			expect(response.status()).toBe(400);
		});

		test('should handle malformed JSON', async ({ request }) => {
			const response = await request.post(`${API_BASE}/chats`, {
				data: 'invalid json'
			});

			expect(response.status()).toBe(400);
		});
	});
});

/**
 * Performance Tests
 */
test.describe('API Performance', () => {
	test('should handle concurrent requests', async ({ request }) => {
		const promises = Array.from({ length: 10 }, (_, i) =>
			request.post(`${API_BASE}/chats`, {
				data: {
					title: `Concurrent Chat ${i}`,
					config: {
						provider: 'anthropic',
						modelConfig: {
							model: 'claude-3-7-sonnet-20250219',
							max_tokens: 4096,
							temperature: 0.7,
							top_p: 1,
							presence_penalty: 0,
							frequency_penalty: 0
						}
					}
				}
			})
		);

		const responses = await Promise.all(promises);

		responses.forEach(response => {
			expect(response.ok()).toBeTruthy();
		});
	});

	test('should respond within acceptable time', async ({ request }) => {
		const start = Date.now();

		await request.get(`${API_BASE}/chats`);

		const duration = Date.now() - start;
		expect(duration).toBeLessThan(1000); // Should respond within 1 second
	});
});