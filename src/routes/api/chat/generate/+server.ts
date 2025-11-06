import { json, type RequestHandler } from '@sveltejs/kit';
import { getAIProvider } from '$lib/server/ai/providers';
import { AppError } from '$lib/utils/error-handler';
import type { Chat } from '$lib/types/chat';
import { db } from '$lib/server/db';
import { chats, messages as messagesTable } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// --- The request body is the full Chat object ---
		const body = (await request.json()) as Chat;

		console.log('📥 Received generate request:', {
			chatId: body?.id,
			messageCount: body?.messages?.length,
			config: body?.config?.provider
		});

		// 1. --- Validate Input ---
		if (!body || !body.id || !body.messages || !body.config) {
			console.error('❌ Validation failed: Invalid request body', {
				hasBody: !!body,
				hasId: !!body?.id,
				hasMessages: !!body?.messages,
				hasConfig: !!body?.config
			});
			throw new AppError('Invalid request body', 'VALIDATION_ERROR', 400);
		}
		const userPrompt = body.messages.at(-1);
		if (!userPrompt || userPrompt.role !== 'user') {
			console.error('❌ Validation failed: No user prompt', {
				lastMessage: userPrompt,
				messageCount: body.messages.length
			});
			throw new AppError('No user prompt found', 'VALIDATION_ERROR', 400);
		}

		console.log('✅ Validation passed. Last user message:', userPrompt.content.substring(0, 50));

		// 2. --- Persist User's Prompt and Upsert Chat ---
		await db.insert(chats)
			.values({
				id: body.id,
				userId: body.userId,
				title: body.title,
				folderId: body.folderId,
				config: body.config,
				metadata: body.metadata || {}
			})
			.onConflictDoUpdate({
				target: chats.id,
				set: {
					title: body.title,
					config: body.config,
					folderId: body.folderId,
					metadata: body.metadata || {},
					updatedAt: new Date()
				}
			});

		await db.insert(messagesTable).values({
			chatId: body.id,
			role: userPrompt.role,
			content: userPrompt.content
		});

		// 3. --- Delegate to the Correct AI Provider ---
		const { provider } = body.config;
		const aiProvider = getAIProvider(provider);

		// FIX: Await the promise returned by the generate method
		const stream = await aiProvider.generate(body.id, body.messages, body.config.modelConfig);

		// Return Stream to Client
		return new Response(stream, {
			headers: {
				'Content-Type': 'application/x-ndjson',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});

	} catch (error) {
		console.error('🚨 API Error in /api/chat/generate:', error);
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

		const statusCode = error instanceof AppError ? error.statusCode : 500;
		const message = error instanceof Error ? error.message : 'Internal Server Error';
		const errorType = error instanceof AppError ? error.type : 'UNKNOWN_ERROR';

		// --- Ensure the error response is valid JSON ---
		return json({
			message: message,
			type: errorType,
			details: error instanceof Error ? error.message : String(error)
		}, { status: statusCode || 500 });
	}
};