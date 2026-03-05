// File: src/routes/api/chat/generate/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { chatServerService } from '$lib/server/services/chat.server.service';
import { AppError } from '$lib/utils/error-handler';
import type { ChatWithRelations } from '$lib/types/models';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = (await request.json()) as ChatWithRelations;

		// Basic HTTP Validation
		if (!body || !body.id || !body.messages || !body.config) {
			throw new AppError('Invalid request body', 'VALIDATION_ERROR', 400);
		}

		// TODO: Get actual user ID from session/locals (e.g., locals.user.id)
		const userId = 1;

		// Delegate all business logic to the Service Layer
		const stream = await chatServerService.processChatGeneration(body, userId);

		// Return the HTTP Response
		return new Response(stream, {
			headers: {
				'Content-Type': 'application/x-ndjson',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});

	} catch (error) {
		console.error('API Error in /api/chat/generate:', error);
		const statusCode = error instanceof AppError ? error.statusCode : 500;
		const message = error instanceof Error ? error.message : 'Internal Server Error';

		return json({ message }, { status: statusCode || 500 });
	}
};