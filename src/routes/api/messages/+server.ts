import { db } from '$lib/server/db';
import { chats, messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { LLMService } from '$lib/server/llm';
import type { RequestHandler } from './$types';

/**
 * POST /api/messages
 * Send a message and get a streaming response from the LLM
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { chatId, content, role = 'user' } = body;

		// Validate required fields
		if (!chatId || !content) {
			return new Response(JSON.stringify({ error: 'Missing required fields: chatId, content' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const chatIdNum = parseInt(chatId);

		// Fetch the chat with its configuration
		const chat = await db.query.chats.findFirst({
			where: eq(chats.id, chatIdNum),
			with: {
				messages: {
					orderBy: (messages, { asc }) => [asc(messages.createdAt)]
				}
			}
		});

		if (!chat) {
			return new Response(JSON.stringify({ error: 'Chat not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Save the user's message to the database
		const [userMessage] = await db
			.insert(messages)
			.values({
				chatId: chatIdNum,
				role,
				content
			})
			.returning();

		// Prepare messages for LLM (include conversation history)
		const conversationMessages = [
			...chat.messages.map((m) => ({
				role: m.role as 'user' | 'assistant' | 'system',
				content: m.content
			})),
			{
				role: role as 'user' | 'assistant' | 'system',
				content
			}
		];

		// Create a streaming response
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				let fullResponse = '';

				try {
					// Stream the LLM response
					const llmStream = LLMService.streamCompletion(
						chat.provider as 'openai' | 'anthropic',
						conversationMessages,
						chat.modelConfig as any
					);

					for await (const chunk of llmStream) {
						fullResponse += chunk;
						// Send chunk to client in SSE format
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
					}

					// Save the assistant's complete response to the database
					const [assistantMessage] = await db
						.insert(messages)
						.values({
							chatId: chatIdNum,
							role: 'assistant',
							content: fullResponse
						})
						.returning();

					// Update chat's updatedAt timestamp
					await db
						.update(chats)
						.set({ updatedAt: new Date() })
						.where(eq(chats.id, chatIdNum));

					// Send completion signal with message IDs
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								done: true,
								userMessageId: userMessage.id,
								assistantMessageId: assistantMessage.id,
								fullResponse
							})}\n\n`
						)
					);

					controller.close();
				} catch (error) {
					console.error('Error streaming LLM response:', error);
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								error: 'Failed to get LLM response',
								details: error instanceof Error ? error.message : 'Unknown error'
							})}\n\n`
						)
					);
					controller.close();
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		console.error('Error processing message:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to process message',
				details: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};

/**
 * GET /api/messages?chatId=123
 * Get all messages for a specific chat
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const chatId = url.searchParams.get('chatId');

		if (!chatId) {
			return new Response(JSON.stringify({ error: 'Missing chatId parameter' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const chatIdNum = parseInt(chatId);

		const chatMessages = await db.query.messages.findMany({
			where: eq(messages.chatId, chatIdNum),
			orderBy: (messages, { asc }) => [asc(messages.createdAt)]
		});

		const transformedMessages = chatMessages.map((msg) => ({
			id: msg.id,
			role: msg.role,
			content: msg.content,
			createdAt: msg.createdAt
		}));

		return new Response(JSON.stringify(transformedMessages), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching messages:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch messages',
				details: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
