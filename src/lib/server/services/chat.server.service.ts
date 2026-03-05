// File: src/lib/server/services/chat.server.service.ts
import { db } from '$lib/server/db';
import { chats, messages as messagesTable } from '$lib/server/db/schema';
import { getAIProvider } from '$lib/server/ai/providers';
import type { ChatWithRelations, Message } from '$lib/types/models';
import { AppError } from '$lib/utils/error-handler';

export class ChatServerService {

	/**
	 * Handles saving the user message, triggering the AI, and saving the AI response.
	 */
	async processChatGeneration(chatData: ChatWithRelations, userId: number): Promise<ReadableStream> {
		const userPrompt = chatData.messages.at(-1);

		if (!userPrompt || userPrompt.role !== 'user') {
			throw new AppError('No user prompt found', 'VALIDATION_ERROR', 400);
		}

		// 1. Upsert the Chat metadata
		await db.insert(chats)
			.values({
				id: chatData.id,
				userId: userId,
				title: chatData.title,
				config: chatData.config,
				folderId: chatData.folderId ?? null
			})
			.onConflictDoUpdate({
				target: chats.id,
				set: {
					title: chatData.title,
					config: chatData.config,
					folderId: chatData.folderId ?? null,
					updatedAt: new Date()
				}
			});

		// 2. Save the User's message
		await db.insert(messagesTable).values({
			chatId: chatData.id,
			role: userPrompt.role,
			content: userPrompt.content
		});

		// 3. Get the AI Stream
		const aiProvider = getAIProvider(chatData.config.provider);
		const rawStream = await aiProvider.generateStream(chatData.messages, chatData.config.modelConfig);

		// 4. Intercept the stream to save the AI's response to the DB when it finishes
		return this.createDbInterceptingStream(rawStream, chatData.id);
	}

	/**
	 * Wraps the AI stream so we can capture the final text and save it to the DB
	 * without blocking the stream to the client.
	 */
	private createDbInterceptingStream(originalStream: ReadableStream, chatId: string): ReadableStream {
		let fullAiResponse = '';
		const reader = originalStream.getReader();

		return new ReadableStream({
			async start(controller) {
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						// Decode the chunk to build the final string for the DB
						const chunkString = new TextDecoder().decode(value);
						try {
							// Parse the ndjson to extract just the text content
							const parsed = JSON.parse(chunkString.trim());
							if (parsed.content) fullAiResponse += parsed.content;
						} catch (e) {
							// Ignore parse errors for partial chunks
						}

						controller.enqueue(value);
					}

					// Stream is done, save to DB asynchronously
					if (fullAiResponse) {
						db.insert(messagesTable).values({
							chatId: chatId,
							role: 'assistant',
							content: fullAiResponse
						}).catch(err => console.error('Failed to save AI message:', err));
					}

					controller.close();
				} catch (error) {
					controller.error(error);
				}
			},
			cancel() {
				reader.cancel();
			}
		});
	}
}

export const chatServerService = new ChatServerService();