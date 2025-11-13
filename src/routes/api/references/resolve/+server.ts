// src/routes/api/references/resolve/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { chatService } from '$lib/server/services/chat.service';
import type { Reference } from '$lib/types/chat';

interface ResolveRequest {
	references: Reference[];
}

interface SourcePreview {
	chatId: string;
	chatTitle: string;
	messageCount: number;
	preview: string; // First 200 chars
	totalChars: number;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		// TODO: Get userId from session
		const userId = 1;

		const body: ResolveRequest = await request.json();

		if (!body.references || !Array.isArray(body.references)) {
			return json({ message: 'Invalid references array' }, { status: 400 });
		}

		// Build context string
		const context = await chatService.buildContextFromReferences(body.references, userId);

		// Calculate token estimate (rough: 1 token ≈ 4 chars)
		const estimatedTokens = Math.ceil(context.length / 4);

		// Build source previews
		const sources: SourcePreview[] = [];

		for (const ref of body.references) {
			if (ref.type === 'CHAT') {
				try {
					const chat = await chatService.getChat(ref.targetId, userId);
					sources.push({
						chatId: chat.id,
						chatTitle: chat.title,
						messageCount: chat.messages.length,
						preview: chat.messages.map(m => m.content).join(' ').substring(0, 200),
						totalChars: chat.messages.reduce((sum, m) => sum + m.content.length, 0)
					});
				} catch (error) {
					// Skip if chat not found
					console.warn(`Chat ${ref.targetId} not found during reference resolution`);
				}
			}
			// TODO: Handle FOLDER, MESSAGE, NOTE types
		}

		return json({
			context,
			tokenCount: estimatedTokens,
			sources
		});
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};