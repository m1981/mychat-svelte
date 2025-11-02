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

		// 1. --- Validate Input ---
		if (!body || !body.id || !body.messages || !body.config) {
			throw new AppError('Invalid request body', 'VALIDATION_ERROR', 400);
		}
		const userPrompt = body.messages.at(-1);
		if (!userPrompt || userPrompt.role !== 'user') {
			throw new AppError('No user prompt found', 'VALIDATION_ERROR', 400);
		}

		// 2. --- Persist User's Prompt and Upsert Chat ---
		await db.insert(chats)
			.values({
				id: body.id,
				title: body.title,
				config: body.config,
				folder: body.folder
			})
			.onConflictDoUpdate({
				target: chats.id,
				set: { title: body.title, config: body.config, folder: body.folder }
			});

		await db.insert(messagesTable).values({
			chatId: body.id,
			role: userPrompt.role,
			content: userPrompt.content
		});

		// 3. --- Delegate to the Correct AI Provider ---
		const { provider } = body.config;
		const aiProvider = getAIProvider(provider);

		// --- FIX: Pass arguments in the correct order: (chatId, messages, modelConfig) ---
		const stream = await aiProvider.generate(body.id, body.messages, body.config.modelConfig);

		// 4. --- Return Stream to Client ---
		return new Response(stream, {
			headers: {
				'Content-Type': 'application/x-ndjson', // Use x-ndjson for newline delimited JSON
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});

	} catch (error) {
		console.error('API Error in /api/chat/generate:', error);
		const statusCode = error instanceof AppError ? error.statusCode : 500;
		const message = error instanceof Error ? error.message : 'Internal Server Error';
		// --- Ensure the error response is valid JSON ---
		return json({ message: message }, { status: statusCode || 500 });
	}
};