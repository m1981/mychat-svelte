// src/routes/api/sync/highlights/+server.ts
/**
 * Sync endpoint for highlights
 * Returns highlights that have been modified since lastSyncTime
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { highlights, messages, chats } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const userId = 1; // TODO: Get from session

		const body = await request.json();
		const lastSyncTime = body.lastSyncTime ? new Date(body.lastSyncTime) : null;

		// Get all highlights for user's chats
		const results = await db
			.select({
				id: highlights.id,
				messageId: highlights.messageId,
				text: highlights.text,
				startOffset: highlights.startOffset,
				endOffset: highlights.endOffset,
				color: highlights.color,
				note: highlights.note,
				createdAt: highlights.createdAt
			})
			.from(highlights)
			.innerJoin(messages, eq(messages.id, highlights.messageId))
			.innerJoin(chats, eq(chats.id, messages.chatId))
			.where(eq(chats.userId, userId));

		// Filter by lastSyncTime if provided
		const syncedHighlights = lastSyncTime
			? results.filter((h) => h.createdAt > lastSyncTime)
			: results;

		return json({
			highlights: syncedHighlights.map(h => ({
				...h,
				messageId: h.messageId.toString()
			})),
			total: syncedHighlights.length,
			syncTime: new Date().toISOString()
		});
	} catch (error) {
		console.error('Sync Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Sync failed' },
			{ status: 500 }
		);
	}
};