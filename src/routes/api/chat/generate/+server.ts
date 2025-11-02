import { json, type RequestHandler } from '@sveltejs/kit';
import { getAIProvider } from '$lib/server/ai/providers';
import { AppError } from '$lib/utils/error-handler';
import type { Chat } from '$lib/types/chat';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as Partial<Chat>;

		// Validate the incoming request
		if (!body.messages || !body.config) {
			throw new AppError('Invalid request body', 'VALIDATION_ERROR', 400);
		}

		const { provider } = body.config;
		const aiProvider = getAIProvider(provider);

		// Generate the streaming response
		const stream = aiProvider.generate(body.messages, body.config.modelConfig);

		// Return the stream directly to the client
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream', // or 'application/x-ndjson'
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive'
			}
		});

	} catch (error) {
		console.error('API Error in /api/chat/generate:', error);
		const statusCode = error instanceof AppError ? error.statusCode : 500;
		const message = error instanceof Error ? error.message : 'Internal Server Error';
		return json({ message }, { status: statusCode || 500 });
	}
};