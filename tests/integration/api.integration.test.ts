import {test, expect} from '@playwright/test';

/**
 * API Integration Tests
 *
 * REFACTOR: Each test is now fully independent.
 * - No more top-level variables like `testChatId`.
 * - Each test creates the specific data it needs and cleans up after itself.
 * - This makes tests robust, runnable in any order, and parallel-safe.
 */

const API_BASE = '/api';

// REFACTOR: Centralize common test data to avoid "magic strings".
const CHAT_PAYLOAD = {
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
};

const FOLDER_PAYLOAD = {
    name: 'API Test Folder',
    type: 'STANDARD',
    color: '#3b82f6'
};

test.describe('API Integration Tests', () => {
    test.describe('Chats API', () => {
        // REFACTOR: Use an array to track created resources for cleanup.
        const createdChatIds: string[] = [];

        test.afterEach(async ({request}) => {
            // Cleanup any chats created in the tests below.
            for (const chatId of createdChatIds) {
                await request.delete(`${API_BASE}/chats/${chatId}`);
            }
            createdChatIds.length = 0; // Clear the array for the next test
        });

        test('POST /api/chats - should create a new chat', async ({request}) => {
            const response = await request.post(`${API_BASE}/chats`, {data: CHAT_PAYLOAD});

            expect(response.ok()).toBeTruthy();
            expect(response.status()).toBe(201);

            const chat = await response.json();
            expect(chat).toHaveProperty('id');
            expect(chat.title).toBe(CHAT_PAYLOAD.title);

            createdChatIds.push(chat.id); // Add to cleanup list
        });

        test('GET /api/chats/:id - should retrieve chat by ID', async ({request}) => {
            // ARRANGE: Create the chat needed for this specific test.
            const createResponse = await request.post(`${API_BASE}/chats`, {data: CHAT_PAYLOAD});
            expect(createResponse.ok()).toBeTruthy();
            const chat = await createResponse.json();
            createdChatIds.push(chat.id);

            // ACT
            const response = await request.get(`${API_BASE}/chats/${chat.id}`);

            // ASSERT
            expect(response.ok()).toBeTruthy();
            const retrievedChat = await response.json();
            expect(retrievedChat.id).toBe(chat.id);
            expect(retrievedChat.title).toBe(CHAT_PAYLOAD.title);
        });

        test('PATCH /api/chats/:id - should update chat', async ({request}) => {
            // ARRANGE
            const createResponse = await request.post(`${API_BASE}/chats`, {data: CHAT_PAYLOAD});
            expect(createResponse.ok()).toBeTruthy();
            const chat = await createResponse.json();
            createdChatIds.push(chat.id);

            // ACT
            const updatedTitle = 'Updated Chat Title';
            const response = await request.patch(`${API_BASE}/chats/${chat.id}`, {
                data: {title: updatedTitle}
            });

            // ASSERT
            expect(response.ok()).toBeTruthy();
            const updatedChat = await response.json();
            expect(updatedChat.title).toBe(updatedTitle);
        });

        test('DELETE /api/chats/:id - should delete chat', async ({request}) => {
            // ARRANGE
            const createResponse = await request.post(`${API_BASE}/chats`, {data: CHAT_PAYLOAD});
            expect(createResponse.ok()).toBeTruthy();
            const chat = await createResponse.json();
            // No need to add to cleanup array, as this test's purpose is to delete it.

            // ACT
            const response = await request.delete(`${API_BASE}/chats/${chat.id}`);

            // ASSERT
            expect(response.status()).toBe(204);

            // Verify deletion
            const getResponse = await request.get(`${API_BASE}/chats/${chat.id}`);
            expect(getResponse.status()).toBe(404);
        });
    });

    // REFACTOR: Apply the same isolation pattern to all other API tests.
    test.describe('Folders API', () => {
        const createdFolderIds: string[] = [];
        const createdChatIds: string[] = [];

        test.afterEach(async ({request}) => {
            // Clean up in reverse order of creation dependency
            for (const chatId of createdChatIds) {
                await request.delete(`${API_BASE}/chats/${chatId}`);
            }
            for (const folderId of createdFolderIds) {
                await request.delete(`${API_BASE}/folders/${folderId}?cascade=true`);
            }
            createdChatIds.length = 0;
            createdFolderIds.length = 0;
        });

        test('POST /api/folders - should create folder', async ({request}) => {
            const response = await request.post(`${API_BASE}/folders`, {data: FOLDER_PAYLOAD});

            expect(response.ok()).toBeTruthy();
            expect(response.status()).toBe(201);

            const folder = await response.json();
            expect(folder).toHaveProperty('id');
            expect(folder.name).toBe(FOLDER_PAYLOAD.name);

            createdFolderIds.push(folder.id);
        });

        test('PATCH /api/folders/:id - should update folder', async ({request}) => {
            // ARRANGE
            const createResponse = await request.post(`${API_BASE}/folders`, {data: FOLDER_PAYLOAD});
            expect(createResponse.ok()).toBeTruthy();
            const folder = await createResponse.json();
            createdFolderIds.push(folder.id);

            // ACT
            const response = await request.patch(`${API_BASE}/folders/${folder.id}`, {
                data: {name: 'Updated Folder', color: '#10b981'}
            });

            // ASSERT
            expect(response.ok()).toBeTruthy();
            const updatedFolder = await response.json();
            expect(updatedFolder.name).toBe('Updated Folder');
            expect(updatedFolder.color).toBe('#10b981');
        });

        test('DELETE /api/folders/:id - should soft delete a folder by default', async ({request}) => {
            // ARRANGE
            const createResponse = await request.post(`${API_BASE}/folders`, {data: FOLDER_PAYLOAD});
            const folder = await createResponse.json();
            createdFolderIds.push(folder.id);

            // ACT: Call DELETE without any params
            const deleteResponse = await request.delete(`${API_BASE}/folders/${folder.id}`);

            // ASSERT 1: The request was successful
            expect(deleteResponse.status()).toBe(204);

            // ASSERT 2: The folder can no longer be fetched by the standard GET endpoint (which should filter deleted)
            // This depends on your GET /api/folders implementation. Assuming it filters.
            // If not, we assert that the GET response has a `deletedAt` property.
            const getResponse = await request.get(`${API_BASE}/folders/${folder.id}`);
            expect(getResponse.status()).toBe(404); // Assuming GET filters deleted items.
        });

        test('DELETE /api/folders/:id?permanent=true - should permanently delete a folder', async ({request}) => {
            // ARRANGE
            const createResponse = await request.post(`${API_BASE}/folders`, {data: FOLDER_PAYLOAD});
            const folder = await createResponse.json();
            // We don't add to createdFolderIds because a successful test will delete it.

            // ACT: Call DELETE with permanent=true
            const deleteResponse = await request.delete(`${API_BASE}/folders/${folder.id}?permanent=true`);
            expect(deleteResponse.status()).toBe(204);

            // ASSERT: The folder is truly gone. A direct DB check would be the ultimate proof,
            // but for an API test, checking that it's not retrievable is sufficient.
            const getResponse = await request.get(`${API_BASE}/folders/${folder.id}`);
            expect(getResponse.status()).toBe(404);
        });

        test.describe('Notes API', () => {
            const createdChatIds: string[] = [];
            const createdNoteIds: string[] = [];

            test.afterEach(async ({request}) => {
                // Cleanup notes first, then chats
                for (const noteId of createdNoteIds) {
                    await request.delete(`${API_BASE}/notes/${noteId}`);
                }
                for (const chatId of createdChatIds) {
                    await request.delete(`${API_BASE}/chats/${chatId}`);
                }
                createdNoteIds.length = 0;
                createdChatIds.length = 0;
            });

            test('POST /api/notes - should create a note for a chat', async ({request}) => {
                // ARRANGE: Create a chat to associate the note with
                const chatResponse = await request.post(`${API_BASE}/chats`, {data: CHAT_PAYLOAD});
                expect(chatResponse.ok()).toBeTruthy();
                const chat = await chatResponse.json();
                createdChatIds.push(chat.id);

                // ACT
                const noteContent = 'This is a test note.';
                const response = await request.post(`${API_BASE}/notes`, {
                    data: {chatId: chat.id, type: 'SCRATCH', content: noteContent}
                });

                // ASSERT
                expect(response.ok()).toBeTruthy();
                expect(response.status()).toBe(201);
                const note = await response.json();
                expect(note.content).toBe(noteContent);
                expect(note.chatId).toBe(chat.id);
                createdNoteIds.push(note.id);
            });

            test('PATCH /api/notes/:id - should update a note', async ({request}) => {
                // ARRANGE: Create a chat and a note
                const chatResponse = await request.post(`${API_BASE}/chats`, {data: CHAT_PAYLOAD});
                const chat = await chatResponse.json();
                createdChatIds.push(chat.id);

                const noteResponse = await request.post(`${API_BASE}/notes`, {
                    data: {chatId: chat.id, type: 'SCRATCH', content: 'Original content'}
                });
                const note = await noteResponse.json();
                createdNoteIds.push(note.id);

                // ACT
                const updatedContent = 'Updated note content';
                const response = await request.patch(`${API_BASE}/notes/${note.id}`, {
                    data: {content: updatedContent, type: 'TODO'}
                });

                // ASSERT
                expect(response.ok()).toBeTruthy();
                const updatedNote = await response.json();
                expect(updatedNote.content).toBe(updatedContent);
                expect(updatedNote.type).toBe('TODO');
            });
        });

        // REFACTOR: Highlights API tests are now self-contained.
        // CRITICAL: Removed direct database interaction. Assumes an API exists to create messages.
        // If `POST /api/messages` doesn't exist, this highlights the need for a testable API surface.
        test.describe('Highlights API', () => {
            const createdChatIds: string[] = [];
            const createdHighlightIds: string[] = [];

            // Helper function to create prerequisites for highlight tests
            async function createMessageForTest(request: any) {
                const chatResponse = await request.post(`${API_BASE}/chats`, {data: CHAT_PAYLOAD});
                const chat = await chatResponse.json();
                createdChatIds.push(chat.id);

                // This assumes an endpoint exists to create a message.
                // If not, this is the place to add a call to a test-support endpoint.
                const messageContent = 'This is a test message with some highlighted text.';
                const messageResponse = await request.post(`${API_BASE}/messages`, {
                    data: {
                        chatId: chat.id,
                        role: 'user',
                        content: messageContent
                    }
                });
                expect(messageResponse.ok(), 'Test setup failed: Could not create a message via API').toBeTruthy();
                const message = await messageResponse.json();
                return message;
            }

            test.afterEach(async ({request}) => {
                for (const highlightId of createdHighlightIds) {
                    await request.delete(`${API_BASE}/highlights/${highlightId}`);
                }
                for (const chatId of createdChatIds) {
                    await request.delete(`${API_BASE}/chats/${chatId}`);
                }
                createdHighlightIds.length = 0;
                createdChatIds.length = 0;
            });

            test('POST /api/highlights - should create a highlight', async ({request}) => {
                // ARRANGE
                const message = await createMessageForTest(request);

                // ACT
                const response = await request.post(`${API_BASE}/highlights`, {
                    data: {
                        messageId: message.id,
                        text: 'highlighted text',
                        startOffset: 33,
                        endOffset: 49,
                        color: '#FFFF00'
                    }
                });

                // ASSERT
                expect(response.ok()).toBeTruthy();
                expect(response.status()).toBe(201);
                const highlight = await response.json();
                expect(highlight.text).toBe('highlighted text');
                createdHighlightIds.push(highlight.id);
            });
        });

        test.describe('Search API', () => {
            test('POST /api/search - should search with text mode', async ({request}) => {
                // This test is self-contained as it doesn't create data.
                const response = await request.post(`${API_BASE}/search`, {
                    data: {
                        query: 'test',
                        mode: 'text',
                        filters: {},
                        pagination: {page: 0, limit: 20}
                    }
                });

                expect(response.ok()).toBeTruthy();
                const result = await response.json();
                expect(result).toHaveProperty('results');
                expect(Array.isArray(result.results)).toBeTruthy();
            });

            test('POST /api/search - should validate required fields', async ({request}) => {
                // This test is also self-contained.
                const response = await request.post(`${API_BASE}/search`, {
                    data: {query: 'test'} // Missing 'mode'
                });

                expect(response.status()).toBe(400);
                const error = await response.json();
                expect(error.message).toContain('mode');
            });
        });

        test.describe('Error Handling', () => {
            test('should return 404 for non-existent resources', async ({request}) => {
                const response = await request.get(`${API_BASE}/chats/non-existent-id-12345`);
                expect(response.status()).toBe(404);
            });

            test('should return 400 for invalid data on create', async ({request}) => {
                const response = await request.post(`${API_BASE}/chats`, {
                    data: {title: 'Invalid Chat without config'} // Missing required 'config' field
                });
                expect(response.status()).toBe(400);
            });
        });
    });